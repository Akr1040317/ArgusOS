import { NextRequest, NextResponse } from "next/server"
import { adminAuth } from "@/lib/firebase/admin"
import { adminDb } from "@/lib/firebase/admin"
import { generatePrepPack } from "@/lib/ai/prepPack"
import { findRelatedThreads } from "@/lib/calendar/relatedThreads"
import { FieldValue } from "firebase-admin/firestore"

/**
 * Generate prep pack for a calendar event
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

    const { eventId } = await request.json()

    if (!eventId) {
      return NextResponse.json({ error: "eventId required" }, { status: 400 })
    }

    // Fetch event
    const eventDoc = await adminDb
      .collection("calendarEvents")
      .doc(uid)
      .collection("events")
      .doc(eventId)
      .get()

    if (!eventDoc.exists) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 })
    }

    const eventData = eventDoc.data()
    if (!eventData) {
      return NextResponse.json({ error: "Event data not found" }, { status: 404 })
    }

    // Find related threads
    const relatedThreads = await findRelatedThreads(uid, {
      title: eventData.title || "",
      description: eventData.description || "",
      attendees: eventData.attendees || [],
      startISO: eventData.startISO || "",
    })

    // Generate prep pack
    const prepPack = await generatePrepPack(
      {
        title: eventData.title || "",
        description: eventData.description || undefined,
        startISO: eventData.startISO || "",
        endISO: eventData.endISO || undefined,
        attendees: eventData.attendees || [],
        location: eventData.location || undefined,
        organizer: eventData.organizer || undefined,
      },
      relatedThreads
    )

    // Update event with prep pack
    await adminDb
      .collection("calendarEvents")
      .doc(uid)
      .collection("events")
      .doc(eventId)
      .update({
        prepPack: {
          contextSummary: prepPack.contextSummary,
          openLoops: prepPack.openLoops,
          suggestedAgenda: prepPack.suggestedAgenda,
          relatedThreadIds: prepPack.relatedThreadIds,
          generatedAt: FieldValue.serverTimestamp(),
        },
      })

    return NextResponse.json({
      success: true,
      prepPack,
    })
  } catch (error: any) {
    console.error("Prep pack generation error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
