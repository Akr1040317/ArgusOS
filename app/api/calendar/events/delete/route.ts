import { NextRequest, NextResponse } from "next/server"
import { adminAuth } from "@/lib/firebase/admin"
import { getCalendarTokens } from "@/lib/calendar/tokenStore"
import { CalendarClient } from "@/lib/calendar/client"
import { adminDb } from "@/lib/firebase/admin"

/**
 * Delete a calendar event
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

    const { accountId, calendarId = "primary", eventId } = await request.json()

    if (!accountId || !eventId) {
      return NextResponse.json(
        { error: "accountId and eventId are required" },
        { status: 400 }
      )
    }

    // Get Calendar tokens
    const tokens = await getCalendarTokens(uid, accountId)
    if (!tokens) {
      return NextResponse.json({ error: "Calendar account not connected" }, { status: 404 })
    }

    // Refresh token if needed
    let accessToken = tokens.accessToken
    if (tokens.expiresAt < Date.now()) {
      const client = new CalendarClient(tokens.accessToken, tokens.refreshToken)
      accessToken = await client.refreshAccessToken()
    }

    // Create Calendar client and delete event
    const client = new CalendarClient(accessToken, tokens.refreshToken)
    await client.deleteEvent(calendarId, eventId)

    // Remove from Firestore
    try {
      await adminDb
        .collection("calendarEvents")
        .doc(uid)
        .collection("events")
        .doc(eventId)
        .delete()
    } catch (firestoreError) {
      console.error("Error deleting event from Firestore:", firestoreError)
      // Don't fail the request if Firestore delete fails
    }

    return NextResponse.json({
      success: true,
    })
  } catch (error: any) {
    console.error("Error deleting calendar event:", error)
    return NextResponse.json(
      { error: error.message || "Failed to delete event" },
      { status: 500 }
    )
  }
}
