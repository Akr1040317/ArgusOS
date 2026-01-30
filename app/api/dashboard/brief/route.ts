import { NextRequest, NextResponse } from "next/server"
import { adminAuth } from "@/lib/firebase/admin"
import { adminDb } from "@/lib/firebase/admin"
import { unifiedChatCompletion } from "@/lib/ai/unifiedClient"
import { AIFeature } from "@/lib/ai/providers/types"

/**
 * GET /api/dashboard/brief - Generate AI-powered dashboard brief
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decodedToken = await adminAuth.verifyIdToken(token)
    const uid = decodedToken.uid

    // Fetch latest digest
    const digestSnapshot = await adminDb
      .collection("digests")
      .doc(uid)
      .collection("runs")
      .orderBy("runAt", "desc")
      .limit(1)
      .get()

    const latestDigest = digestSnapshot.docs[0]?.data()

    // Fetch recent high-priority threads (last 24 hours)
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    
    const threadsSnapshot = await adminDb
      .collection("emailThreads")
      .doc(uid)
      .collection("threads")
      .where("lastMessageAt", ">=", yesterday.toISOString())
      .orderBy("lastMessageAt", "desc")
      .limit(10)
      .get()

    const recentThreads = threadsSnapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        subject: data.subject || "(No subject)",
        priority: data.priority || "P2",
        status: data.status || "UNKNOWN",
        importanceScore: data.importanceScore || 0,
        summaryBullets: data.summaryBullets || [],
      }
    })

    // Fetch upcoming events (next 24 hours)
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    const eventsSnapshot = await adminDb
      .collection("calendarEvents")
      .doc(uid)
      .collection("events")
      .where("startISO", ">=", new Date().toISOString())
      .where("startISO", "<=", tomorrow.toISOString())
      .orderBy("startISO", "asc")
      .limit(5)
      .get()

    const upcomingEvents = eventsSnapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        title: data.title || "(No title)",
        startISO: data.startISO,
        hasPrepPack: !!data.prepPack,
      }
    })

    // Build context for AI
    const digestSummary = latestDigest
      ? {
          importantNew: latestDigest.importantNew?.length || 0,
          needsReplyOverdue: latestDigest.needsReplyOverdue?.length || 0,
          followUpsDue: latestDigest.followUpsDue?.length || 0,
          upcomingMeetings: latestDigest.upcomingMeetings?.length || 0,
          prepGaps: latestDigest.prepGaps?.length || 0,
        }
      : null

    const urgentThreads = recentThreads.filter(
      (t) => (t.priority === "P0" || t.priority === "P1") && t.status === "NEEDS_REPLY"
    )

    // Generate AI brief
    const prompt = `You are a helpful productivity assistant. Generate a concise, actionable brief (max 150 words) for the user's dashboard based on this context:

${digestSummary ? `Digest Summary:
- ${digestSummary.importantNew} new important emails
- ${digestSummary.needsReplyOverdue} overdue replies
- ${digestSummary.followUpsDue} follow-ups due
- ${digestSummary.upcomingMeetings} upcoming meetings
- ${digestSummary.prepGaps} meetings missing prep packs

` : ""}${urgentThreads.length > 0 ? `Urgent Items:
${urgentThreads.slice(0, 3).map((t, i) => `${i + 1}. ${t.subject} (${t.priority})`).join("\n")}

` : ""}${upcomingEvents.length > 0 ? `Upcoming Events Today:
${upcomingEvents.map((e, i) => `${i + 1}. ${e.title}${e.hasPrepPack ? " (prep ready)" : " (needs prep)"}`).join("\n")}

` : ""}

Generate a brief that:
1. Highlights what needs immediate attention (if anything urgent)
2. Mentions what's coming up today
3. Provides actionable next steps
4. Uses a friendly, conversational tone
5. Is concise and scannable

Return only the brief text, no markdown formatting.`

    try {
      const brief = await unifiedChatCompletion(
        uid,
        [
          {
            role: "system",
            content: "You are a helpful productivity assistant. Generate concise, actionable briefs for users.",
          },
          { role: "user", content: prompt },
        ],
        {
          feature: "chat" as AIFeature,
          model: "gpt-4o-mini",
          temperature: 0.7,
          maxTokens: 200,
        }
      )

      return NextResponse.json({
        success: true,
        brief: brief.trim(),
        generatedAt: new Date().toISOString(),
      })
    } catch (aiError: any) {
      console.error("[Dashboard Brief API] AI call error:", aiError)
      console.error("[Dashboard Brief API] Error details:", {
        message: aiError.message,
        stack: aiError.stack,
        uid,
      })
      
      // Provide more helpful error messages
      let errorMessage = aiError.message || "Failed to generate brief"
      if (errorMessage.includes("API key") || errorMessage.includes("401") || errorMessage.includes("Incorrect API key") || errorMessage.includes("Invalid API key")) {
        errorMessage = "Invalid API key configured. Please go to Settings → AI Settings and ensure your OpenAI API key is correct and the provider is enabled."
      } else if (errorMessage.includes("not configured") || errorMessage.includes("not enabled")) {
        errorMessage = "AI provider not configured or disabled. Please check your AI settings and enable OpenAI."
      }
      
      throw new Error(errorMessage)
    }
  } catch (error: any) {
    console.error("[Dashboard Brief API] Error generating brief:", error)
    
    // Provide more helpful error messages
    let errorMessage = error.message || "Failed to generate brief"
    if (errorMessage.includes("API key") || errorMessage.includes("401") || errorMessage.includes("Incorrect API key") || errorMessage.includes("Invalid API key")) {
      errorMessage = "Invalid API key configured. Please go to Settings → AI Settings and ensure your OpenAI API key is correct and the provider is enabled."
    } else if (errorMessage.includes("not configured") || errorMessage.includes("not enabled")) {
      errorMessage = "AI provider not configured or disabled. Please check your AI settings and enable OpenAI."
    }
    
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
