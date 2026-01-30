import { unifiedChatCompletion } from "./unifiedClient"
import { AIFeature } from "./providers/types"

export interface PrepPack {
  contextSummary: string
  openLoops: string[]
  suggestedAgenda: string[]
  relatedThreadIds: string[]
}

export interface EventData {
  title: string
  description?: string
  startISO: string
  endISO?: string
  attendees: Array<{ email: string; name?: string }>
  location?: string
  organizer?: { email: string; name?: string }
}

/**
 * Generate a prep pack for an upcoming event
 */
export async function generatePrepPack(
  uid: string | null,
  event: EventData,
  relatedThreads: Array<{ id: string; subject: string; participants: Array<{ email: string }> }> = []
): Promise<PrepPack> {
  try {
    // Build context from event and related threads
    const context = {
      event: {
        title: event.title,
        description: event.description || "",
        start: event.startISO,
        attendees: event.attendees.map((a) => ({ email: a.email, name: a.name })),
        location: event.location || "",
      },
      relatedThreads: relatedThreads.map((t) => ({
        id: t.id,
        subject: t.subject,
        participants: t.participants.map((p) => p.email),
      })),
    }

    const prompt = `You are a meeting preparation assistant. Generate a concise prep pack for this event.

Event:
- Title: ${event.title}
- Time: ${new Date(event.startISO).toLocaleString()}
- Attendees: ${event.attendees.map((a) => a.name || a.email).join(", ")}
${event.description ? `- Description: ${event.description}` : ""}
${event.location ? `- Location: ${event.location}` : ""}

${relatedThreads.length > 0 ? `Related Email Threads:\n${relatedThreads.map((t) => `- ${t.subject}`).join("\n")}` : ""}

Generate a prep pack with:
1. Context Summary (2-3 sentences about what this meeting is about)
2. Open Loops (any questions or action items to discuss)
3. Suggested Agenda (3-5 bullet points)

Return JSON:
{
  "contextSummary": string,
  "openLoops": string[],
  "suggestedAgenda": string[]
}`

    const response = await unifiedChatCompletion(
      uid,
      [
        {
          role: "system",
          content: "You are a meeting preparation assistant. Return valid JSON only.",
        },
        { role: "user", content: prompt },
      ],
      {
        feature: "prep_pack" as AIFeature,
        model: "gpt-4o-mini",
        temperature: 0.3,
        maxTokens: 800,
      }
    )

    // Parse JSON response
    const jsonMatch = response.match(/(\{[\s\S]*\})/)
    const jsonString = jsonMatch ? jsonMatch[1] : response
    const result = JSON.parse(jsonString)

    return {
      contextSummary: result.contextSummary || "",
      openLoops: result.openLoops || [],
      suggestedAgenda: result.suggestedAgenda || [],
      relatedThreadIds: relatedThreads.map((t) => t.id),
    }
  } catch (error: any) {
    console.error("Prep pack generation error:", error)
    // Return default prep pack
    return {
      contextSummary: `Meeting: ${event.title}`,
      openLoops: [],
      suggestedAgenda: [],
      relatedThreadIds: relatedThreads.map((t) => t.id),
    }
  }
}
