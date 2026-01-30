import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase/admin"
import { generateDraft } from "@/lib/ai/pipeline"
import { FieldValue } from "firebase-admin/firestore"

/**
 * Regenerate draft for a thread with a specific tone
 */
export async function POST(request: NextRequest) {
  try {
    const { uid, threadId, tone } = await request.json()

    if (!uid || !threadId) {
      return NextResponse.json({ error: "UID and threadId required" }, { status: 400 })
    }

    const validTones = ["concise", "warm", "assertive", "formal"]
    const draftTone = validTones.includes(tone) ? tone : "concise"

    // Fetch thread and messages in parallel for speed
    const [threadDoc, messagesSnapshot] = await Promise.all([
      adminDb
        .collection("emailThreads")
        .doc(uid)
        .collection("threads")
        .doc(threadId)
        .get(),
      adminDb
        .collection("emailThreads")
        .doc(uid)
        .collection("threads")
        .doc(threadId)
        .collection("messages")
        .orderBy("dateISO", "desc")
        .limit(5) // Only fetch most recent 5 messages for faster processing
        .get(),
    ])

    if (!threadDoc.exists) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 })
    }

    const threadData = threadDoc.data()
    if (!threadData) {
      return NextResponse.json({ error: "Thread data not found" }, { status: 404 })
    }

    const messages = messagesSnapshot.docs.map((doc) => {
      const msg = doc.data()
      return {
        fromEmail: msg.from?.email || "",
        dateISO: msg.dateISO || "",
        bodyText: msg.bodyText || "",
        direction: msg.direction || "INBOUND",
      }
    })

    // Build ThreadData for draft generation
    const thread = {
      subject: threadData.subject || "",
      participants: threadData.participants || [],
      lastInboundAt: threadData.lastInboundAt || null,
      lastOutboundAt: threadData.lastOutboundAt || null,
      messages,
      snippet: threadData.snippet || "",
    }

    // Fetch user style profile
    const userDoc = await adminDb.collection("users").doc(uid).get()
    const userData = userDoc.data()
    const userStyle = userData?.styleProfile

    // Generate draft
    const draftResult = await generateDraft(uid, thread, draftTone as any, userStyle)

    // Update thread with new draft
    await adminDb
      .collection("emailThreads")
      .doc(uid)
      .collection("threads")
      .doc(threadId)
      .update({
        draftReply: {
          text: draftResult.body,
          subject: draftResult.subject,
          tone: draftTone,
          generatedAt: FieldValue.serverTimestamp(),
          model: "gpt-4o-mini",
        },
        draftState: "READY",
        draftError: FieldValue.delete(),
      })

    return NextResponse.json({
      success: true,
      draft: {
        subject: draftResult.subject,
        body: draftResult.body,
        tone: draftTone,
      },
    })
  } catch (error: any) {
    console.error("Draft regeneration error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
