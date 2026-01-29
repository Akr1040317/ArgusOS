import { NextRequest, NextResponse } from "next/server"
import { adminDb, adminAuth } from "@/lib/firebase/admin"

/**
 * Safely convert Firestore timestamp to ISO string or null
 */
function toISOStringOrNull(timestamp: any): string | null {
  if (!timestamp) return null
  
  // Firestore Timestamp object
  if (timestamp.seconds !== undefined) {
    return new Date(timestamp.seconds * 1000).toISOString()
  }
  
  // Already a string
  if (typeof timestamp === "string") {
    return timestamp
  }
  
  // Date object
  if (timestamp instanceof Date) {
    return timestamp.toISOString()
  }
  
  // Has toDate method
  if (typeof timestamp.toDate === "function") {
    return timestamp.toDate().toISOString()
  }
  
  return null
}

/**
 * Safely get timestamp as number (milliseconds) for comparison
 */
function toTimestampMs(timestamp: any): number {
  if (!timestamp) return 0
  
  // Firestore Timestamp object
  if (timestamp.seconds !== undefined) {
    return timestamp.seconds * 1000
  }
  
  // Already a number (milliseconds)
  if (typeof timestamp === "number") {
    return timestamp
  }
  
  // String ISO date
  if (typeof timestamp === "string") {
    const date = new Date(timestamp)
    return isNaN(date.getTime()) ? 0 : date.getTime()
  }
  
  // Date object
  if (timestamp instanceof Date) {
    return timestamp.getTime()
  }
  
  // Has toDate method
  if (typeof timestamp.toDate === "function") {
    return timestamp.toDate().getTime()
  }
  
  return 0
}

/**
 * GET /api/tasks
 * Fetch all tasks: reply tasks, follow-ups, and commitments
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decodedToken = await adminAuth.verifyIdToken(token)
    const uid = decodedToken.uid

    const threadsRef = adminDb.collection("emailThreads").doc(uid).collection("threads")
    
    // Fetch all threads
    const threadsSnapshot = await threadsRef.get()
    
    console.log(`[Tasks API] Found ${threadsSnapshot.docs.length} threads for user ${uid}`)
    
    const replyTasks: Array<{
      threadId: string
      subject: string
      participants: Array<{ name: string; email: string }>
      priority: string
      lastInboundAt: string | null
      extractedAsk?: string
      summaryBullets?: string[]
      draftState?: string
    }> = []
    
    const followUps: Array<{
      threadId: string
      subject: string
      participants: Array<{ name: string; email: string }>
      priority: string
      lastOutboundAt: string | null
      lastInboundAt: string | null
      summaryBullets?: string[]
    }> = []
    
    const commitments: Array<{
      threadId: string
      subject: string
      participants: Array<{ name: string; email: string }>
      task: {
        type: string
        label: string
        dueISO: string | null
        status: string
        confidence: number
      }
      priority: string
    }> = []

    const now = new Date()
    const followUpThresholdMs = 72 * 60 * 60 * 1000 // 72 hours

    threadsSnapshot.docs.forEach((doc) => {
      const data = doc.data()
      const threadId = doc.id

      // Debug: log thread status
      if (!data.status) {
        console.log(`[Tasks API] Thread ${threadId} has no status field`)
      }

      // Reply tasks: threads that need a reply
      // 1. Explicitly marked as NEEDS_REPLY by AI
      // 2. Have inbound message but no outbound reply yet (not yet classified)
      const lastInboundMs = toTimestampMs(data.lastInboundAt)
      const lastOutboundMs = toTimestampMs(data.lastOutboundAt)
      const hasInbound = lastInboundMs > 0
      const hasOutbound = lastOutboundMs > 0
      
      const needsReply = data.status === "NEEDS_REPLY" || 
                        (hasInbound && !hasOutbound) ||
                        (hasInbound && hasOutbound && lastInboundMs > lastOutboundMs)
      
      if (needsReply && data.status !== "WAITING" && data.status !== "FYI") {
        replyTasks.push({
          threadId,
          subject: data.subject || "(No subject)",
          participants: data.participants || [],
          priority: data.priority || "P2",
          lastInboundAt: toISOStringOrNull(data.lastInboundAt),
          extractedAsk: data.extractedAsk,
          summaryBullets: data.summaryBullets,
          draftState: data.draftState || "NONE",
        })
      }

      // Follow-ups: threads where we're waiting on them
      // 1. Explicitly marked as WAITING by AI
      // 2. Have outbound message, and either no inbound since, or inbound is older than outbound
      const hasOutboundForFollowUp = lastOutboundMs > 0
      const outboundIsNewer = hasOutboundForFollowUp && 
        (!hasInbound || lastOutboundMs > lastInboundMs)
      
      if (data.status === "WAITING" || (hasOutboundForFollowUp && outboundIsNewer)) {
        const timeSinceOutbound = now.getTime() - lastOutboundMs
        
        // Only include if it's been more than 72 hours since last outbound
        if (timeSinceOutbound >= followUpThresholdMs) {
          followUps.push({
            threadId,
            subject: data.subject || "(No subject)",
            participants: data.participants || [],
            priority: data.priority || "P2",
            lastOutboundAt: toISOStringOrNull(data.lastOutboundAt),
            lastInboundAt: toISOStringOrNull(data.lastInboundAt),
            summaryBullets: data.summaryBullets,
          })
        }
      }

      // Commitments: threads with extracted tasks
      if (data.tasks && Array.isArray(data.tasks) && data.tasks.length > 0) {
        data.tasks.forEach((task: any) => {
          // Include tasks that are not completed
          if (task.status !== "COMPLETED" && task.status !== "DONE") {
            commitments.push({
              threadId,
              subject: data.subject || "(No subject)",
              participants: data.participants || [],
              task: {
                type: task.type || "OTHER",
                label: task.label || "Untitled task",
                dueISO: task.dueISO || null,
                status: task.status || "PENDING",
                confidence: task.confidence || 0.5,
              },
              priority: data.priority || "P2",
            })
          }
        })
      }
    })

    // Sort reply tasks by priority (P0 > P1 > P2) then by lastInboundAt (newest first)
    replyTasks.sort((a, b) => {
      const priorityOrder = { P0: 0, P1: 1, P2: 2 }
      const priorityDiff = (priorityOrder[a.priority as keyof typeof priorityOrder] || 2) - 
                          (priorityOrder[b.priority as keyof typeof priorityOrder] || 2)
      if (priorityDiff !== 0) return priorityDiff
      
      const aTime = a.lastInboundAt ? toTimestampMs(a.lastInboundAt) : 0
      const bTime = b.lastInboundAt ? toTimestampMs(b.lastInboundAt) : 0
      return bTime - aTime
    })

    // Sort follow-ups by priority then by lastOutboundAt (oldest first - most overdue first)
    followUps.sort((a, b) => {
      const priorityOrder = { P0: 0, P1: 1, P2: 2 }
      const priorityDiff = (priorityOrder[a.priority as keyof typeof priorityOrder] || 2) - 
                          (priorityOrder[b.priority as keyof typeof priorityOrder] || 2)
      if (priorityDiff !== 0) return priorityDiff
      
      const aTime = a.lastOutboundAt ? toTimestampMs(a.lastOutboundAt) : 0
      const bTime = b.lastOutboundAt ? toTimestampMs(b.lastOutboundAt) : 0
      return aTime - bTime // Oldest first
    })

    // Sort commitments by due date (overdue first, then by priority)
    commitments.sort((a, b) => {
      const aDue = a.task.dueISO ? toTimestampMs(a.task.dueISO) : Infinity
      const bDue = b.task.dueISO ? toTimestampMs(b.task.dueISO) : Infinity
      
      // Overdue tasks first
      const nowTime = now.getTime()
      const aOverdue = aDue < nowTime ? 0 : 1
      const bOverdue = bDue < nowTime ? 0 : 1
      if (aOverdue !== bOverdue) return aOverdue - bOverdue
      
      // Then by due date (earliest first)
      if (aDue !== bDue) return aDue - bDue
      
      // Then by priority
      const priorityOrder = { P0: 0, P1: 1, P2: 2 }
      return (priorityOrder[a.priority as keyof typeof priorityOrder] || 2) - 
             (priorityOrder[b.priority as keyof typeof priorityOrder] || 2)
    })

    console.log(`[Tasks API] Returning: ${replyTasks.length} reply tasks, ${followUps.length} follow-ups, ${commitments.length} commitments`)

    return NextResponse.json({
      replyTasks,
      followUps,
      commitments,
    })
  } catch (error: any) {
    console.error("Error fetching tasks:", error)
    console.error("Error stack:", error?.stack)
    return NextResponse.json(
      { error: "Failed to fetch tasks", details: error?.message },
      { status: 500 }
    )
  }
}
