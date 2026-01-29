import { NextRequest, NextResponse } from "next/server"
import { adminAuth } from "@/lib/firebase/admin"
import { adminDb } from "@/lib/firebase/admin"
import { FieldValue } from "firebase-admin/firestore"

/**
 * GET: List chat sessions
 * POST: Create new chat session
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

    const sessionsSnapshot = await adminDb
      .collection("chatSessions")
      .doc(uid)
      .collection("sessions")
      .orderBy("updatedAt", "desc")
      .limit(50)
      .get()

    const sessions = sessionsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    return NextResponse.json({ sessions })
  } catch (error: any) {
    console.error("Error fetching sessions:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decodedToken = await adminAuth.verifyIdToken(token)
    const uid = decodedToken.uid

    const sessionRef = adminDb
      .collection("chatSessions")
      .doc(uid)
      .collection("sessions")
      .doc()

    await sessionRef.set({
      title: "New Chat",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })

    return NextResponse.json({
      success: true,
      sessionId: sessionRef.id,
    })
  } catch (error: any) {
    console.error("Error creating session:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
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

    // Delete all messages in the session first
    const messagesSnapshot = await adminDb
      .collection("chatSessions")
      .doc(uid)
      .collection("sessions")
      .doc(sessionId)
      .collection("messages")
      .get()

    const batch = adminDb.batch()
    messagesSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref)
    })

    // Delete the session
    const sessionRef = adminDb
      .collection("chatSessions")
      .doc(uid)
      .collection("sessions")
      .doc(sessionId)

    batch.delete(sessionRef)

    await batch.commit()

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error deleting session:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
