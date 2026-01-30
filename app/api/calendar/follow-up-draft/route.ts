import { NextRequest, NextResponse } from "next/server"
import { adminAuth } from "@/lib/firebase/admin"
import { adminDb } from "@/lib/firebase/admin"
import { generateFollowUpDraft } from "@/lib/ai/followUpDraft"
import { FieldValue } from "firebase-admin/firestore"

/**
 * Generate follow-up email draft for a calendar event
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

    // Fetch user style profile
    const userDoc = await adminDb.collection("users").doc(uid).get()
    const userData = userDoc.data()
    const userStyle = userData?.styleProfile
      ? {
          name: userData.styleProfile.name || "User",
          signoff: userData.styleProfile.signoff || "Best regards",
          toneHints: userData.styleProfile.toneHints || [],
          bannedPatterns: userData.styleProfile.bannedPatterns || [],
        }
      : undefined

    // Generate follow-up draft
    const draft = await generateFollowUpDraft(
      uid,
      {
        title: eventData.title || "",
        description: eventData.description || undefined,
        startISO: eventData.startISO || "",
        endISO: eventData.endISO || undefined,
        attendees: eventData.attendees || [],
        location: eventData.location || undefined,
        organizer: eventData.organizer || undefined,
      },
      userStyle
    )

    // Update event with follow-up draft
    await adminDb
      .collection("calendarEvents")
      .doc(uid)
      .collection("events")
      .doc(eventId)
      .update({
        followUpDraft: {
          subject: draft.subject,
          text: draft.text,
          tone: draft.tone,
          generatedAt: FieldValue.serverTimestamp(),
        },
      })

    return NextResponse.json({
      success: true,
      draft,
    })
  } catch (error: any) {
    console.error("Follow-up draft generation error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
