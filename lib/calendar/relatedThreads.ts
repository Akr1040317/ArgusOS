import { adminDb } from "@/lib/firebase/admin"

export interface RelatedThread {
  id: string
  subject: string
  participants: Array<{ email: string }>
  lastMessageAt: string
}

/**
 * Find threads related to a calendar event
 * Uses heuristics: attendee email overlap + keyword matching
 */
export async function findRelatedThreads(
  uid: string,
  event: {
    title: string
    description?: string
    attendees: Array<{ email: string }>
    startISO: string
  },
  limit: number = 10
): Promise<RelatedThread[]> {
  const attendeeEmails = event.attendees.map((a) => a.email.toLowerCase())
  const eventKeywords = extractKeywords(event.title + " " + (event.description || ""))

  // Get threads from the last 30 days
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const cutoffDate = thirtyDaysAgo.toISOString()

  // Fetch threads
  const threadsSnapshot = await adminDb
    .collection("emailThreads")
    .doc(uid)
    .collection("threads")
    .where("lastMessageAt", ">=", cutoffDate)
    .limit(100) // Fetch more to filter
    .get()

  const threads = threadsSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }))

  // Score threads by relevance
  const scoredThreads = threads.map((thread) => {
    let score = 0

    // Check attendee email overlap
    const threadParticipants = (thread.participants || []).map((p: any) =>
      (p.email || "").toLowerCase()
    )
    const emailMatches = attendeeEmails.filter((email) => threadParticipants.includes(email)).length
    score += emailMatches * 10 // High weight for email matches

    // Check keyword overlap
    const threadText = `${thread.subject || ""} ${thread.snippet || ""}`.toLowerCase()
    const keywordMatches = eventKeywords.filter((keyword) => threadText.includes(keyword)).length
    score += keywordMatches * 2 // Lower weight for keyword matches

    // Boost recent threads
    const daysSinceLastMessage =
      (Date.now() - new Date(thread.lastMessageAt || 0).getTime()) / (1000 * 60 * 60 * 24)
    if (daysSinceLastMessage < 7) {
      score += 5
    }

    return { thread, score }
  })

  // Sort by score and return top results
  return scoredThreads
    .filter((item) => item.score > 0) // Only threads with some relevance
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => ({
      id: item.thread.id,
      subject: item.thread.subject || "",
      participants: item.thread.participants || [],
      lastMessageAt: item.thread.lastMessageAt || "",
    }))
}

/**
 * Extract keywords from text (simple implementation)
 */
function extractKeywords(text: string): string[] {
  const lowerText = text.toLowerCase()
  const words = lowerText
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3) // Only words longer than 3 chars

  // Remove common stop words
  const stopWords = new Set([
    "the",
    "a",
    "an",
    "and",
    "or",
    "but",
    "in",
    "on",
    "at",
    "to",
    "for",
    "of",
    "with",
    "from",
    "this",
    "that",
    "these",
    "those",
    "meeting",
    "call",
    "email",
    "thread",
  ])

  const keywords = words.filter((w) => !stopWords.has(w))
  return [...new Set(keywords)].slice(0, 10) // Return unique keywords, max 10
}
