import { chatCompletion } from "@/lib/ai/client"
import { loadPrompt } from "@/lib/ai/prompts"
import { RetrievedThread, RetrievedEvent } from "./retrieval"

export interface ChatResponse {
  answer: string
  actions: Array<{
    label: string
    type: "OPEN_THREAD" | "OPEN_EVENT" | "GENERATE_DRAFT" | "RUN_AGENT" | "CREATE_FOLLOWUP"
    targetId: string | null
  }>
  sources: Array<{
    type: "thread" | "event"
    id: string
    reason: string
  }>
}

/**
 * Process chat query with RAG retrieval
 */
export async function processChatQuery(
  uid: string | null,
  query: string,
  threads: RetrievedThread[],
  events: RetrievedEvent[]
): Promise<ChatResponse> {
  const prompt = loadPrompt("chat.md")

  // Format threads for prompt
  const threadsText = threads
    .map(
      (t) =>
        `- Thread ${t.threadId}: "${t.subject}" (${t.priority || "P2"}, ${t.status || "UNKNOWN"}) - ${t.summaryBullets?.[0] || t.snippet || ""}`
    )
    .join("\n")

  // Format events for prompt
  const eventsText = events
    .map(
      (e) =>
        `- Event ${e.eventId}: "${e.title}" at ${new Date(e.startISO).toLocaleString()} - ${e.prepPack?.contextSummary || ""}`
    )
    .join("\n")

  // Replace placeholders in prompt
  let userPrompt = prompt.replace("{question}", query)
  
  // Format threads as JSON array for the prompt
  const threadsJson = JSON.stringify(
    threads.map((t) => ({
      threadId: t.threadId,
      subject: t.subject,
      summaryBullets: t.summaryBullets || [],
      extractedAsk: t.extractedAsk || "",
      status: t.status || "",
      priority: t.priority || "",
      lastMessageAt: t.lastMessageAt,
    }))
  )
  
  // Format events as JSON array for the prompt
  const eventsJson = JSON.stringify(
    events.map((e) => ({
      eventId: e.eventId,
      title: e.title,
      startISO: e.startISO,
      prepPack: e.prepPack || null,
      relatedThreadIds: e.relatedThreadIds || [],
    }))
  )
  
  userPrompt = userPrompt.replace("{threads[]", threadsJson)
  userPrompt = userPrompt.replace("{events[]", eventsJson)

  try {
    const response = await unifiedChatCompletion(
      uid,
      [
        {
          role: "system",
          content: "You are a helpful email and calendar assistant. Return valid JSON only.",
        },
        { role: "user", content: userPrompt },
      ],
      {
        feature: "chat" as AIFeature,
        model: "gpt-4o-mini",
        temperature: 0.7,
        maxTokens: 1500,
      }
    )

    // Parse JSON response
    const jsonMatch = response.match(/(\{[\s\S]*\})/)
    const jsonString = jsonMatch ? jsonMatch[1] : response
    const result = JSON.parse(jsonString)

    return {
      answer: result.answer || "I couldn't find relevant information to answer your question.",
      actions: result.actions || [],
      sources: result.sources || [],
    }
  } catch (error: any) {
    console.error("Chat processing error:", error)
    // Return default response
    return {
      answer: "I encountered an error processing your query. Please try rephrasing it.",
      actions: [],
      sources: [],
    }
  }
}
