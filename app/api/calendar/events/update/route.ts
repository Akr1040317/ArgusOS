import { NextRequest, NextResponse } from "next/server"
import { adminAuth, adminDb } from "@/lib/firebase/admin"
import { getCalendarTokens } from "@/lib/calendar/tokenStore"
import { CalendarClient } from "@/lib/calendar/client"
import { syncCalendarEvents } from "@/lib/calendar/sync"
import { FieldValue } from "firebase-admin/firestore"

/**
 * Update an existing calendar event
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

    const {
      accountId,
      calendarId = "primary",
      eventId,
      title,
      description,
      startISO,
      endISO,
      location,
      attendees,
      allDay,
    } = await request.json()

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

    // Create Calendar client and update event
    const client = new CalendarClient(accessToken, tokens.refreshToken)
    const event = await client.updateEvent(calendarId, eventId, {
      title,
      description,
      startISO,
      endISO,
      location,
      attendees,
      allDay,
    })

    // Immediately update Firestore so it appears in UI right away
    try {
      const startDate = event.start.dateTime ? new Date(event.start.dateTime) : new Date(event.start.date!)
      const endDate = event.end.dateTime ? new Date(event.end.dateTime) : new Date(event.end.date!)

      // Get calendar name
      const calendars = await client.listCalendars()
      const calendar = calendars.find((c) => c.id === calendarId) || { summary: "Calendar" }

      // Extract attendee emails
      const attendeeEmails = (event.attendees || [])
        .map((a) => a.email)
        .filter((email): email is string => !!email)

      // Update Firestore directly
      await adminDb
        .collection("calendarEvents")
        .doc(uid)
        .collection("events")
        .doc(event.id)
        .set(
          {
            provider: "gcal",
            calendarId: calendarId,
            calendarName: calendar.summary,
            providerEventId: event.id,
            accountId,
            title: event.summary || title,
            description: event.description || description || null,
            startISO: startDate.toISOString(),
            endISO: endDate?.toISOString() || null,
            location: event.location || location || null,
            organizer: event.organizer
              ? {
                  email: event.organizer.email || "",
                  name: event.organizer.displayName || null,
                }
              : null,
            attendees: attendeeEmails.map((email) => {
              const attendee = event.attendees?.find((a) => a.email === email)
              return {
                email,
                name: attendee?.displayName || null,
                responseStatus: attendee?.responseStatus || null,
              }
            }),
            htmlLink: event.htmlLink || null,
            status: event.status || "confirmed",
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        )
    } catch (firestoreError) {
      console.error("Error updating event in Firestore:", firestoreError)
      // Continue even if Firestore update fails - sync will catch it
    }

    // Also sync the calendar to ensure consistency (non-blocking)
    syncCalendarEvents(uid, accountId, { daysAhead: 14, maxEvents: 500 }).catch((syncError) => {
      console.error("Error syncing calendar after event update:", syncError)
    })

    return NextResponse.json({
      success: true,
      event,
    })
  } catch (error: any) {
    console.error("Error updating calendar event:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update event" },
      { status: 500 }
    )
  }
}
