import { adminDb } from "@/lib/firebase/admin"
import { runAIPipeline, ThreadData } from "./pipeline"

/**
 * Trigger AI pipeline for a thread after it's been stored
 * This runs asynchronously and doesn't block the sync/ingest process
 */
export async function triggerAIPipeline(
  uid: string,
  threadId: string
): Promise<void> {
  try {
    // Fetch thread and messages from Firestore
    const threadDoc = await adminDb
      .collection("emailThreads")
      .doc(uid)
      .collection("threads")
      .doc(threadId)
      .get()

    if (!threadDoc.exists) {
      console.warn(`Thread ${threadId} not found for AI pipeline`)
      return
    }

    const threadData = threadDoc.data()
    if (!threadData) return

    // Fetch messages
    const messagesSnapshot = await adminDb
      .collection("emailThreads")
      .doc(uid)
      .collection("threads")
      .doc(threadId)
      .collection("messages")
      .orderBy("dateISO", "desc")
      .get()

    const messages = messagesSnapshot.docs.map((doc) => {
      const msg = doc.data()
      return {
        fromEmail: msg.from?.email || "",
        dateISO: msg.dateISO || "",
        bodyText: msg.bodyText || "",
        direction: msg.direction || "INBOUND",
      }
    })

    // Build ThreadData for AI pipeline
    const thread: ThreadData = {
      subject: threadData.subject || "",
      participants: threadData.participants || [],
      lastInboundAt: threadData.lastInboundAt || null,
      lastOutboundAt: threadData.lastOutboundAt || null,
      messages,
      snippet: threadData.snippet || "",
    }

    // Fetch user profile (if exists)
    const userDoc = await adminDb.collection("users").doc(uid).get()
    const userData = userDoc.data()
    const userProfile = {
      vipEmails: userData?.vipEmails || [],
      vipDomains: userData?.vipDomains || [],
      importantKeywords: userData?.importantKeywords || [],
    }

    // Run AI pipeline (non-blocking)
    console.log(`[AITrigger] Triggering AI pipeline for thread ${threadId}, uid: ${uid}`)
    runAIPipeline(uid, threadId, thread, userProfile).catch((error) => {
      console.error(`[AITrigger] AI pipeline failed for thread ${threadId}, uid: ${uid}:`, {
        error: error.message,
        stack: error.stack,
        threadId,
        uid,
      })
    })
  } catch (error: any) {
    console.error(`[AITrigger] Failed to trigger AI pipeline for thread ${threadId}, uid: ${uid}:`, {
      error: error.message,
      stack: error.stack,
      threadId,
      uid,
    })
    // Don't throw - we don't want to break sync/ingest if AI fails
  }
}
