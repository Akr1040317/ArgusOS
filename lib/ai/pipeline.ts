import { chatCompletion, parseJSONResponse } from "./client"
import { getClassifyPrompt, getSummarizePrompt, getExtractPrompt, getDraftPrompt } from "./prompts"
import { validateClassification, validateExtraction, ClassificationResult, ExtractionResult } from "./schemas"
import { adminDb } from "@/lib/firebase/admin"
import { FieldValue } from "firebase-admin/firestore"

export interface ThreadData {
  subject: string
  participants: Array<{ name: string; email: string }>
  lastInboundAt: string | null
  lastOutboundAt: string | null
  messages: Array<{
    fromEmail: string
    dateISO: string
    bodyText: string
    direction: "INBOUND" | "OUTBOUND"
  }>
  snippet: string
}

export interface UserProfile {
  vipEmails: string[]
  vipDomains: string[]
  importantKeywords: string[]
}

/**
 * Classify a thread using AI
 */
export async function classifyThread(
  thread: ThreadData,
  userProfile: UserProfile = { vipEmails: [], vipDomains: [], importantKeywords: [] }
): Promise<ClassificationResult> {
  const prompt = getClassifyPrompt()
  
  // Split prompt into system and user parts
  const parts = prompt.split("USER:")
  const systemPrompt = parts[0].replace("SYSTEM:", "").trim()
  let userPrompt = parts[1] || prompt
  
  // Prepare thread data for prompt
  const threadData = {
    subject: thread.subject,
    participants: thread.participants,
    lastInboundAt: thread.lastInboundAt,
    lastOutboundAt: thread.lastOutboundAt,
    messages: thread.messages.map((msg) => ({
      fromEmail: msg.fromEmail,
      dateISO: msg.dateISO,
      bodyText: msg.bodyText.substring(0, 2000), // Limit token usage
    })),
  }

  // Replace placeholders in user prompt
  userPrompt = userPrompt.replace("{userProfile}", JSON.stringify(userProfile))
  userPrompt = userPrompt.replace("{thread}", JSON.stringify(threadData))

  try {
    const response = await chatCompletion(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      "gpt-4o-mini", // Fast model for classification
      0.2, // Low temperature for consistency
      500
    )

    const result = await parseJSONResponse<ClassificationResult>(
      response,
      "Fix the JSON. Return only valid JSON with keys: importanceScore, priority, split, status, reasons"
    )

    return validateClassification(result)
  } catch (error: any) {
    console.error("Classification error:", error)
    // Return default classification on error
    return {
      importanceScore: 0.5,
      priority: "P2",
      split: "OTHER",
      status: "FYI",
      reasons: ["Classification failed"],
    }
  }
}

/**
 * Summarize a thread using AI
 */
export async function summarizeThread(thread: ThreadData): Promise<{
  bullets: string[]
  ask: string
  openLoops: string[]
}> {
  const prompt = getSummarizePrompt()
  
  // Split prompt into system and user parts
  const parts = prompt.split("USER:")
  const systemPrompt = parts[0].replace("SYSTEM:", "").trim()
  let userPrompt = parts[1] || prompt
  
  const threadData = {
    subject: thread.subject,
    participants: thread.participants,
    messages: thread.messages.map((msg) => ({
      from: msg.fromEmail,
      date: msg.dateISO,
      text: msg.bodyText.substring(0, 1500), // Limit tokens
    })),
    snippet: thread.snippet,
  }

  // Replace placeholder
  userPrompt = userPrompt.replace("{thread}", JSON.stringify(threadData))

  try {
    const response = await chatCompletion(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      "gpt-4o-mini",
      0.3,
      800
    )

    // Parse the summary format: bullets, Ask:, Open loops:
    const lines = response.split("\n").filter((l) => l.trim())
    const bullets: string[] = []
    let ask = ""
    const openLoops: string[] = []
    let currentSection: "bullets" | "ask" | "loops" = "bullets"

    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed.toLowerCase().startsWith("ask:")) {
        currentSection = "ask"
        ask = trimmed.substring(4).trim()
      } else if (trimmed.toLowerCase().startsWith("open loops:")) {
        currentSection = "loops"
        const loops = trimmed.substring(11).trim()
        if (loops) openLoops.push(loops)
      } else if (trimmed.startsWith("-") || trimmed.startsWith("•")) {
        if (currentSection === "bullets") {
          bullets.push(trimmed.substring(1).trim())
        } else if (currentSection === "loops") {
          openLoops.push(trimmed.substring(1).trim())
        }
      } else if (currentSection === "ask" && trimmed && !ask) {
        ask = trimmed
      } else if (currentSection === "bullets" && trimmed) {
        bullets.push(trimmed)
      }
    }

    return {
      bullets: bullets.length > 0 ? bullets : [thread.snippet.substring(0, 200)],
      ask: ask || "",
      openLoops: openLoops.length > 0 ? openLoops : [],
    }
  } catch (error: any) {
    console.error("Summarization error:", error)
    return {
      bullets: [thread.snippet.substring(0, 200)],
      ask: "",
      openLoops: [],
    }
  }
}

/**
 * Extract actions from a thread using AI
 */
export async function extractActions(thread: ThreadData): Promise<ExtractionResult> {
  const prompt = getExtractPrompt()
  
  // Split prompt into system and user parts
  const parts = prompt.split("USER:")
  const systemPrompt = parts[0].replace("SYSTEM:", "").trim()
  let userPrompt = parts[1] || prompt
  
  const threadData = {
    subject: thread.subject,
    participants: thread.participants,
    messages: thread.messages.map((msg) => ({
      from: msg.fromEmail,
      date: msg.dateISO,
      text: msg.bodyText.substring(0, 1500),
    })),
  }

  // Replace placeholder
  userPrompt = userPrompt.replace("{thread}", JSON.stringify(threadData))

  try {
    const response = await chatCompletion(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      "gpt-4o-mini",
      0.2,
      1000
    )

    const result = await parseJSONResponse<ExtractionResult>(
      response,
      "Fix the JSON. Return only valid JSON with keys: extractedAsk, openLoops, deadlines, tasks"
    )

    return validateExtraction(result)
  } catch (error: any) {
    console.error("Extraction error:", error)
    return {
      extractedAsk: "",
      openLoops: [],
      deadlines: [],
      tasks: [],
    }
  }
}

/**
 * Generate a draft reply for a thread
 */
export async function generateDraft(
  thread: ThreadData,
  tone: "concise" | "warm" | "assertive" | "formal" = "concise",
  userStyle?: {
    name: string
    signoff: string
    toneHints: string[]
    bannedPatterns: string[]
  }
): Promise<{ subject: string; body: string }> {
  const prompt = getDraftPrompt()
  
  // Default user style if not provided
  const style = userStyle || {
    name: "Akshat",
    signoff: "Best,\nAkshat",
    toneHints: ["concise", "direct", "friendly-professional"],
    bannedPatterns: ["em dash"],
  }

  // Split prompt into system and user parts
  const parts = prompt.split("USER:")
  const systemPrompt = parts[0].replace("SYSTEM:", "").trim()
  let userPrompt = parts[1] || prompt

  // Prepare thread data - limit to most recent 5 messages and shorter text for faster generation
  const recentMessages = thread.messages.slice(0, 5) // Only use most recent 5 messages
  const threadData = {
    subject: thread.subject,
    messages: recentMessages.map((msg) => ({
      from: msg.fromEmail,
      date: msg.dateISO,
      text: msg.bodyText.substring(0, 1000), // Limit to 1000 chars per message for speed
      direction: msg.direction,
    })),
  }

  // Replace placeholders
  userPrompt = userPrompt.replace("{originalSubject}", thread.subject)
  userPrompt = userPrompt.replace("{thread}", JSON.stringify(threadData))
  userPrompt = userPrompt.replace("{userStyle}", JSON.stringify(style))
  userPrompt = userPrompt.replace("{desiredTone}", tone)

  try {
    const response = await chatCompletion(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      "gpt-4o-mini", // Using fast model for drafts
      0.7, // Higher temperature for more natural language
      800 // Reduced max tokens for faster generation (drafts should be concise)
    )

    // Parse the draft format: Subject: ... \n <body>
    const lines = response.split("\n")
    let subject = `Re: ${thread.subject}`
    let body = ""

    if (lines[0].toLowerCase().startsWith("subject:")) {
      subject = lines[0].substring(8).trim()
      body = lines.slice(1).join("\n").trim()
    } else {
      body = response.trim()
    }

    return { subject, body }
  } catch (error: any) {
    console.error("Draft generation error:", error)
    throw new Error(`Failed to generate draft: ${error.message}`)
  }
}

/**
 * Run full AI pipeline on a thread
 */
export async function runAIPipeline(
  uid: string,
  threadId: string,
  thread: ThreadData,
  userProfile?: UserProfile,
  importanceThreshold: number = 0.7
): Promise<void> {
  try {
    // Fetch user preferences for threshold and style
    const userDoc = await adminDb.collection("users").doc(uid).get()
    const userData = userDoc.data()
    const threshold = userData?.preferences?.importantThreshold || importanceThreshold
    const userStyle = userData?.styleProfile

    // Run all AI steps in parallel for speed
    const [classification, summarization, extraction] = await Promise.all([
      classifyThread(thread, userProfile),
      summarizeThread(thread),
      extractActions(thread),
    ])

    // Check if we should generate a draft
    const shouldGenerateDraft =
      classification.importanceScore >= threshold &&
      classification.status === "NEEDS_REPLY"

    let draftResult: { subject: string; body: string } | null = null
    let draftState: "READY" | "FAILED" | "NONE" = "NONE"
    let draftError: string | null = null

    if (shouldGenerateDraft) {
      try {
        draftResult = await generateDraft(thread, "concise", userStyle)
        draftState = "READY"
      } catch (error: any) {
        console.error("Draft generation failed:", error)
        draftState = "FAILED"
        draftError = error.message
      }
    }

    // Update thread document with AI results
    const updateData: any = {
      // Classification
      importanceScore: classification.importanceScore,
      priority: classification.priority,
      split: classification.split,
      status: classification.status,
      importanceReasons: classification.reasons,

      // Summarization
      summaryBullets: summarization.bullets,
      extractedAsk: extraction.extractedAsk || summarization.ask,
      openLoops: [...summarization.openLoops, ...extraction.openLoops],

      // Extraction
      deadlines: extraction.deadlines,
      tasks: extraction.tasks.map((task) => ({
        ...task,
        status: "PENDING", // Default status
      })),

      // Draft
      draftState,
      draftError: draftError || FieldValue.delete(),

      // Metadata
      aiVersion: 1,
      updatedAt: FieldValue.serverTimestamp(),
    }

    if (draftResult) {
      updateData.draftReply = {
        text: draftResult.body,
        subject: draftResult.subject,
        tone: "concise",
        generatedAt: FieldValue.serverTimestamp(),
        model: "gpt-4o-mini",
      }
    }

    await adminDb
      .collection("emailThreads")
      .doc(uid)
      .collection("threads")
      .doc(threadId)
      .update(updateData)

    // Log success
    await logAudit(
      uid,
      "AI_PIPELINE",
      threadId,
      true,
      `Classification, summarization, extraction completed${draftState === "READY" ? ", draft generated" : ""}`
    )
  } catch (error: any) {
    console.error("AI pipeline error:", error)
    await logAudit(uid, "AI_PIPELINE", threadId, false, error.message)
    throw error
  }
}

async function logAudit(
  uid: string,
  type: string,
  targetId: string,
  ok: boolean,
  detail: string
): Promise<void> {
  try {
    await adminDb.collection("auditLogs").doc(uid).collection("items").add({
      at: FieldValue.serverTimestamp(),
      type,
      targetId,
      ok,
      detail,
      latencyMs: 0, // Could track this if needed
    })
  } catch (error) {
    console.error("Failed to log audit:", error)
    // Don't throw - audit logging shouldn't break the pipeline
  }
}
