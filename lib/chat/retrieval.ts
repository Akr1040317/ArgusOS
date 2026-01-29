import { adminDb } from "@/lib/firebase/admin"

export interface RetrievedThread {
  threadId: string
  subject: string
  summaryBullets?: string[]
  extractedAsk?: string
  status?: string
  priority?: string
  lastMessageAt: string
  snippet?: string
}

export interface RetrievedEvent {
  eventId: string
  title: string
  startISO: string
  prepPack?: {
    contextSummary: string
    openLoops: string[]
    suggestedAgenda: string[]
  }
  relatedThreadIds?: string[]
}

export interface RetrievalOptions {
  maxThreads?: number
  maxEvents?: number
  importantThreshold?: number
  daysBack?: number
}

/**
 * Retrieve relevant threads and events for chat context
 * Retrieval v1: last N important threads + recent events + keyword match
 */
export async function retrieveContext(
  uid: string,
  query: string,
  options: RetrievalOptions = {}
): Promise<{
  threads: RetrievedThread[]
  events: RetrievedEvent[]
}> {
  const {
    maxThreads = 10,
    maxEvents = 5,
    importantThreshold = 0.7,
    daysBack = 7,
  } = options

  const now = new Date()
  const cutoffDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000)

  // Extract keywords from query
  const keywords = extractKeywords(query)

  // 1. Get last N important threads
  const importantThreadsSnapshot = await adminDb
    .collection("emailThreads")
    .doc(uid)
    .collection("threads")
    .where("lastMessageAt", ">=", cutoffDate.toISOString())
    .orderBy("lastMessageAt", "desc")
    .limit(50) // Fetch more to filter
    .get()

  // Filter by importance and keyword match
  const threads = importantThreadsSnapshot.docs
    .map((doc) => {
      const data = doc.data()
      return {
        threadId: doc.id,
        subject: data.subject || "",
        summaryBullets: data.summaryBullets || [],
        extractedAsk: data.extractedAsk || undefined,
        status: data.status || undefined,
        priority: data.priority || undefined,
        lastMessageAt: data.lastMessageAt || "",
        snippet: data.snippet || "",
        importanceScore: data.importanceScore || 0,
      }
    })
    .filter((thread) => {
      // Must be important OR match keywords
      const isImportant = thread.importanceScore >= importantThreshold
      const matchesKeywords = keywords.some((keyword) => {
        const searchText = `${thread.subject} ${thread.snippet} ${thread.summaryBullets?.join(" ") || ""}`.toLowerCase()
        return searchText.includes(keyword.toLowerCase())
      })
      return isImportant || matchesKeywords
    })
    .sort((a, b) => {
      // Sort by importance score first, then by keyword matches
      const aScore = a.importanceScore + (keywords.some((k) => a.subject.toLowerCase().includes(k.toLowerCase())) ? 0.2 : 0)
      const bScore = b.importanceScore + (keywords.some((k) => b.subject.toLowerCase().includes(k.toLowerCase())) ? 0.2 : 0)
      return bScore - aScore
    })
    .slice(0, maxThreads)
    .map(({ importanceScore, ...rest }) => rest) // Remove importanceScore from result

  // 2. Get recent events (next 7 days)
  const eventsSnapshot = await adminDb
    .collection("calendarEvents")
    .doc(uid)
    .collection("events")
    .where("startISO", ">=", now.toISOString())
    .orderBy("startISO", "asc")
    .limit(maxEvents * 2) // Fetch more to filter
    .get()

  // Filter events by keyword match or relevance
  const events = eventsSnapshot.docs
    .map((doc) => {
      const data = doc.data()
      return {
        eventId: doc.id,
        title: data.title || "",
        startISO: data.startISO || "",
        prepPack: data.prepPack || undefined,
        relatedThreadIds: data.relatedThreadIds || undefined,
      }
    })
    .filter((event) => {
      // Include if matches keywords OR is in next 24 hours
      const matchesKeywords = keywords.some((keyword) => {
        const searchText = `${event.title} ${event.prepPack?.contextSummary || ""}`.toLowerCase()
        return searchText.includes(keyword.toLowerCase())
      })
      const eventDate = new Date(event.startISO)
      const hoursUntil = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60)
      const isUpcoming = hoursUntil <= 24 && hoursUntil >= 0
      return matchesKeywords || isUpcoming
    })
    .slice(0, maxEvents)

  return { threads, events }
}

/**
 * Extract keywords from query (simple implementation)
 */
function extractKeywords(query: string): string[] {
  const lowerQuery = query.toLowerCase()
  const words = lowerQuery
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2) // Only words longer than 2 chars

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
    "what",
    "when",
    "where",
    "who",
    "why",
    "how",
    "did",
    "do",
    "does",
    "is",
    "are",
    "was",
    "were",
    "have",
    "has",
    "had",
    "will",
    "would",
    "can",
    "could",
    "should",
    "may",
    "might",
    "must",
  ])

  const keywords = words.filter((w) => !stopWords.has(w))
  return [...new Set(keywords)].slice(0, 10) // Return unique keywords, max 10
}
