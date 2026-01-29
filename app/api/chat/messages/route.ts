import { NextRequest, NextResponse } from "next/server"
import { adminAuth } from "@/lib/firebase/admin"
import { adminDb } from "@/lib/firebase/admin"

/**
 * GET: Get messages for a session
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

    const searchParams = request.nextUrl.searchParams
    const sessionId = searchParams.get("sessionId")

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId required" }, { status: 400 })
    }

    const messagesSnapshot = await adminDb
      .collection("chatSessions")
      .doc(uid)
      .collection("sessions")
      .doc(sessionId)
      .collection("messages")
      .orderBy("createdAt", "asc")
      .get()

    const messages = messagesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    return NextResponse.json({ messages })
  } catch (error: any) {
    console.error("Error fetching messages:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
