import { NextRequest, NextResponse } from "next/server"
import { adminAuth, adminDb } from "@/lib/firebase/admin"
import { getCalendarTokens } from "@/lib/calendar/tokenStore"
import { CalendarClient } from "@/lib/calendar/client"
import { syncCalendarEvents } from "@/lib/calendar/sync"
import { FieldValue } from "firebase-admin/firestore"

/**
 * Create a new calendar event
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
      title,
      description,
      startISO,
      endISO,
      location,
      attendees,
      allDay = false,
    } = await request.json()

    if (!accountId || !title || !startISO || !endISO) {
      return NextResponse.json(
        { error: "accountId, title, startISO, and endISO are required" },
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

    // Create Calendar client and create event in Google Calendar
    const client = new CalendarClient(accessToken, tokens.refreshToken)
    console.log(`Creating event in Google Calendar: ${calendarId}`, { title, startISO, endISO })
    const event = await client.createEvent(calendarId, {
      title,
      description,
      startISO,
      endISO,
      location,
      attendees,
      allDay,
    })
    console.log(`Event created in Google Calendar with ID: ${event.id}`)

    // Immediately write to Firestore so it appears in UI right away
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

      // Write directly to Firestore
      const firestoreData = {
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
      }

      console.log(`Writing event to Firestore: ${event.id}`, {
        startISO: firestoreData.startISO,
        title: firestoreData.title,
      })

      await adminDb
        .collection("calendarEvents")
        .doc(uid)
        .collection("events")
        .doc(event.id)
        .set(firestoreData, { merge: true })

      console.log(`Event written to Firestore successfully: ${event.id}`)
    } catch (firestoreError: any) {
      console.error("Error writing event to Firestore:", firestoreError)
      console.error("Firestore error details:", {
        message: firestoreError.message,
        code: firestoreError.code,
        stack: firestoreError.stack,
      })
      // Continue even if Firestore write fails - sync will catch it
    }

    // Also sync the calendar to ensure consistency (non-blocking)
    syncCalendarEvents(uid, accountId, { daysAhead: 14, maxEvents: 500 }).catch((syncError) => {
      console.error("Error syncing calendar after event creation:", syncError)
    })

    return NextResponse.json({
      success: true,
      event,
    })
  } catch (error: any) {
    console.error("Error creating calendar event:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create event" },
      { status: 500 }
    )
  }
}
