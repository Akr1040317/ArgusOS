import { NextRequest, NextResponse } from "next/server"
import { adminAuth } from "@/lib/firebase/admin"
import { adminDb } from "@/lib/firebase/admin"
import { retrieveContext } from "@/lib/chat/retrieval"
import { processChatQuery } from "@/lib/chat/process"
import { FieldValue } from "firebase-admin/firestore"

/**
 * Process a chat query
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decodedToken = await adminAuth.verifyIdToken(token)
    const uid = decodedToken.uid

    const { sessionId, query } = await request.json()

    if (!query || !sessionId) {
      return NextResponse.json({ error: "sessionId and query required" }, { status: 400 })
    }

    // Store user message
    const userMessageRef = adminDb
      .collection("chatSessions")
      .doc(uid)
      .collection("sessions")
      .doc(sessionId)
      .collection("messages")
      .doc()

    await userMessageRef.set({
      role: "user",
      content: query,
      sources: [],
      createdAt: FieldValue.serverTimestamp(),
    })

    // Retrieve context
    const { threads, events } = await retrieveContext(uid, query)

    // Process query
    const response = await processChatQuery(query, threads, events)

    // Store assistant message
    const assistantMessageRef = adminDb
      .collection("chatSessions")
      .doc(uid)
      .collection("sessions")
      .doc(sessionId)
      .collection("messages")
      .doc()

    await assistantMessageRef.set({
      role: "assistant",
      content: response.answer,
      sources: response.sources,
      actions: response.actions,
      createdAt: FieldValue.serverTimestamp(),
    })

    // Update session title if it's the first message
    const sessionRef = adminDb
      .collection("chatSessions")
      .doc(uid)
      .collection("sessions")
      .doc(sessionId)

    const sessionDoc = await sessionRef.get()
    if (!sessionDoc.exists || !sessionDoc.data()?.title) {
      // Generate title from first query
      const title = query.length > 50 ? query.substring(0, 50) + "..." : query
      await sessionRef.set(
        {
          title,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      )
    } else {
      await sessionRef.update({
        updatedAt: FieldValue.serverTimestamp(),
      })
    }

    return NextResponse.json({
      success: true,
      response,
    })
  } catch (error: any) {
    console.error("Chat query error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
