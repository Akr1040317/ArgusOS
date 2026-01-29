import { adminDb } from "@/lib/firebase/admin"
import { Timestamp } from "firebase-admin/firestore"

export interface DigestItem {
  threadId?: string
  eventId?: string
  blurb: string
}

export interface Digest {
  runAt: Timestamp
  importantNew: DigestItem[]
  needsReplyOverdue: DigestItem[]
  followUpsDue: DigestItem[]
  upcomingMeetings: DigestItem[]
  prepGaps: DigestItem[]
  fullText: string
}

export interface UserPreferences {
  importantThreshold?: number
  overdueThresholds?: {
    P0Hours?: number
    P1Hours?: number
    P2Hours?: number
  }
  followUpAfterHours?: number
}

/**
 * Compute digest for a user
 */
export async function computeDigest(uid: string): Promise<Digest> {
  const now = new Date()
  const runAt = Timestamp.now()

  // Get user preferences
  const userDoc = await adminDb.collection("users").doc(uid).get()
  const userData = userDoc.data()
  const preferences: UserPreferences = userData?.preferences || {}
  
  const importantThreshold = preferences.importantThreshold || 0.7
  const overdueThresholds = preferences.overdueThresholds || {
    P0Hours: 2,
    P1Hours: 24,
    P2Hours: 72,
  }
  const followUpAfterHours = preferences.followUpAfterHours || 72

  // Get last digest time
  const lastDigestSnapshot = await adminDb
    .collection("digests")
    .doc(uid)
    .collection("runs")
    .orderBy("runAt", "desc")
    .limit(1)
    .get()

  const lastDigest = lastDigestSnapshot.docs[0]?.data()
  const lastDigestTime = lastDigest?.runAt?.toDate() || new Date(now.getTime() - 24 * 60 * 60 * 1000) // Default to 24h ago

  // 1. New important emails since last digest
  const importantNew = await findNewImportantEmails(uid, lastDigestTime, importantThreshold)

  // 2. Needs reply overdue by P0/P1/P2 thresholds
  const needsReplyOverdue = await findOverdueReplies(uid, overdueThresholds)

  // 3. Follow-ups due (outbound no response after 72h)
  const followUpsDue = await findFollowUpsDue(uid, followUpAfterHours)

  // 4. Next meetings + prep gaps
  const { upcomingMeetings, prepGaps } = await findUpcomingMeetingsAndPrepGaps(uid)

  // Generate full text summary
  const fullText = generateFullTextDigest({
    importantNew,
    needsReplyOverdue,
    followUpsDue,
    upcomingMeetings,
    prepGaps,
  })

  return {
    runAt,
    importantNew,
    needsReplyOverdue,
    followUpsDue,
    upcomingMeetings,
    prepGaps,
    fullText,
  }
}

/**
 * Find new important emails since last digest
 */
async function findNewImportantEmails(
  uid: string,
  since: Date,
  threshold: number
): Promise<DigestItem[]> {
  // Get threads with last message after since date
  const threadsSnapshot = await adminDb
    .collection("emailThreads")
    .doc(uid)
    .collection("threads")
    .where("lastMessageAt", ">=", since.toISOString())
    .orderBy("lastMessageAt", "desc")
    .limit(100)
    .get()

  // Filter by importance score and inbound direction
  const importantThreads = threadsSnapshot.docs
    .filter((doc) => {
      const data = doc.data()
      return (
        data.importanceScore >= threshold &&
        data.lastInboundAt && // Has inbound message
        (!data.lastOutboundAt || new Date(data.lastInboundAt) > new Date(data.lastOutboundAt)) // Most recent is inbound
      )
    })
    .slice(0, 20)

  return importantThreads.map((doc) => {
    const data = doc.data()
    return {
      threadId: doc.id,
      blurb: `${data.subject || "(No Subject)"} - ${data.summaryBullets?.[0] || data.snippet || ""}`.substring(0, 200),
    }
  })
}

/**
 * Find threads that need reply and are overdue
 */
async function findOverdueReplies(
  uid: string,
  thresholds: { P0Hours?: number; P1Hours?: number; P2Hours?: number }
): Promise<DigestItem[]> {
  const now = new Date()
  const overdue: DigestItem[] = []

  // Get threads that need reply
  const threadsSnapshot = await adminDb
    .collection("emailThreads")
    .doc(uid)
    .collection("threads")
    .where("status", "==", "NEEDS_REPLY")
    .get()

  for (const doc of threadsSnapshot.docs) {
    const data = doc.data()
    const priority = data.priority || "P2"
    const lastInboundAt = data.lastInboundAt ? new Date(data.lastInboundAt) : null

    if (!lastInboundAt) continue

    const hoursSince = (now.getTime() - lastInboundAt.getTime()) / (1000 * 60 * 60)
    const threshold = thresholds[`${priority}Hours` as keyof typeof thresholds] || thresholds.P2Hours || 72

    if (hoursSince > threshold) {
      overdue.push({
        threadId: doc.id,
        blurb: `${priority} - ${data.subject || "(No Subject)"} - ${hoursSince.toFixed(0)}h overdue`,
      })
    }
  }

  return overdue.sort((a, b) => {
    // Sort by priority (P0 first)
    const aPriority = a.blurb.startsWith("P0") ? 0 : a.blurb.startsWith("P1") ? 1 : 2
    const bPriority = b.blurb.startsWith("P0") ? 0 : b.blurb.startsWith("P1") ? 1 : 2
    return aPriority - bPriority
  })
}

/**
 * Find follow-ups due (outbound no response after threshold)
 */
async function findFollowUpsDue(uid: string, thresholdHours: number): Promise<DigestItem[]> {
  const now = new Date()
  const thresholdTime = new Date(now.getTime() - thresholdHours * 60 * 60 * 1000)

  // Get threads with outbound messages
  // Note: We can't filter by lastOutboundAt directly if it's null, so we get all threads
  const threadsSnapshot = await adminDb
    .collection("emailThreads")
    .doc(uid)
    .collection("threads")
    .get()

  const followUps: DigestItem[] = []

  for (const doc of threadsSnapshot.docs) {
    const data = doc.data()
    const lastOutboundAt = data.lastOutboundAt ? new Date(data.lastOutboundAt) : null
    const lastInboundAt = data.lastInboundAt ? new Date(data.lastInboundAt) : null

    // If last inbound is before last outbound, or no inbound at all, it needs follow-up
    if (!lastInboundAt || (lastOutboundAt && lastOutboundAt > lastInboundAt)) {
      const hoursSince = lastOutboundAt
        ? (now.getTime() - lastOutboundAt.getTime()) / (1000 * 60 * 60)
        : 0

      if (hoursSince >= thresholdHours) {
        followUps.push({
          threadId: doc.id,
          blurb: `${data.subject || "(No Subject)"} - No response after ${hoursSince.toFixed(0)}h`,
        })
      }
    }
  }

  return followUps.slice(0, 20) // Limit to 20
}

/**
 * Find upcoming meetings and prep gaps
 */
async function findUpcomingMeetingsAndPrepGaps(uid: string): Promise<{
  upcomingMeetings: DigestItem[]
  prepGaps: DigestItem[]
}> {
  const now = new Date()
  const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000)

  const eventsSnapshot = await adminDb
    .collection("calendarEvents")
    .doc(uid)
    .collection("events")
    .where("startISO", ">=", now.toISOString())
    .where("startISO", "<=", next24Hours.toISOString())
    .orderBy("startISO", "asc")
    .limit(20)
    .get()

  const upcomingMeetings: DigestItem[] = []
  const prepGaps: DigestItem[] = []

  for (const doc of eventsSnapshot.docs) {
    const data = doc.data()
    const startTime = new Date(data.startISO)
    const hoursUntil = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60)

    upcomingMeetings.push({
      eventId: doc.id,
      blurb: `${data.title || "(No Title)"} - ${hoursUntil.toFixed(0)}h away`,
    })

    // Check for prep gaps (no prep pack)
    if (!data.prepPack) {
      prepGaps.push({
        eventId: doc.id,
        blurb: `${data.title || "(No Title)"} - Missing prep pack`,
      })
    }
  }

  return { upcomingMeetings, prepGaps }
}

/**
 * Generate full text digest
 */
function generateFullTextDigest(digest: {
  importantNew: DigestItem[]
  needsReplyOverdue: DigestItem[]
  followUpsDue: DigestItem[]
  upcomingMeetings: DigestItem[]
  prepGaps: DigestItem[]
}): string {
  const sections: string[] = []

  if (digest.importantNew.length > 0) {
    sections.push(`📧 New Important Emails (${digest.importantNew.length}):`)
    digest.importantNew.forEach((item, idx) => {
      sections.push(`${idx + 1}. ${item.blurb}`)
    })
  }

  if (digest.needsReplyOverdue.length > 0) {
    sections.push(`\n⚠️ Overdue Replies (${digest.needsReplyOverdue.length}):`)
    digest.needsReplyOverdue.forEach((item, idx) => {
      sections.push(`${idx + 1}. ${item.blurb}`)
    })
  }

  if (digest.followUpsDue.length > 0) {
    sections.push(`\n📬 Follow-ups Due (${digest.followUpsDue.length}):`)
    digest.followUpsDue.forEach((item, idx) => {
      sections.push(`${idx + 1}. ${item.blurb}`)
    })
  }

  if (digest.upcomingMeetings.length > 0) {
    sections.push(`\n📅 Upcoming Meetings (${digest.upcomingMeetings.length}):`)
    digest.upcomingMeetings.forEach((item, idx) => {
      sections.push(`${idx + 1}. ${item.blurb}`)
    })
  }

  if (digest.prepGaps.length > 0) {
    sections.push(`\n📋 Prep Gaps (${digest.prepGaps.length}):`)
    digest.prepGaps.forEach((item, idx) => {
      sections.push(`${idx + 1}. ${item.blurb}`)
    })
  }

  if (sections.length === 0) {
    return "✅ All clear! No urgent items."
  }

  return sections.join("\n")
}
