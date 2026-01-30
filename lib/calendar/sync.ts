import { CalendarClient } from "./client"
import { adminDb } from "@/lib/firebase/admin"
import { FieldValue } from "firebase-admin/firestore"
import { getCalendarTokens, updateCalendarAccessToken } from "./tokenStore"
import { generatePrepPack } from "@/lib/ai/prepPack"
import { findRelatedThreads } from "./relatedThreads"

export interface SyncOptions {
  daysAhead?: number // Default 14
  maxEvents?: number // Default 500
}

/**
 * Sync calendar events from Google Calendar to Firestore
 */
export async function syncCalendarEvents(
  uid: string,
  accountId: string,
  options: SyncOptions = {}
): Promise<{ synced: number; errors: number }> {
  const { daysAhead = 14, maxEvents = 500 } = options

  // Get tokens
  let tokens = await getCalendarTokens(uid, accountId)
  if (!tokens) {
    throw new Error("Calendar not connected")
  }

  // Refresh token if needed
  let accessToken = tokens.accessToken
  if (tokens.expiresAt < Date.now()) {
    const client = new CalendarClient(tokens.accessToken, tokens.refreshToken)
    accessToken = await client.refreshAccessToken()
    await updateCalendarAccessToken(uid, accountId, accessToken, Date.now() + 3600 * 1000)
  }

  // Create Calendar client
  const client = new CalendarClient(accessToken, tokens.refreshToken)

  // Get time range: now to +daysAhead days
  const timeMin = new Date()
  const timeMax = new Date()
  timeMax.setDate(timeMax.getDate() + daysAhead)

  // List calendars
  const calendars = await client.listCalendars()
  let synced = 0
  let errors = 0

  // Sync events from each calendar
  for (const calendar of calendars) {
    try {
      const events = await client.listEvents(calendar.id, timeMin, timeMax, maxEvents)

      for (const event of events) {
        try {
          // Parse dates
          const startDate = event.start.dateTime
            ? new Date(event.start.dateTime)
            : event.start.date
            ? new Date(event.start.date)
            : null

          const endDate = event.end.dateTime
            ? new Date(event.end.dateTime)
            : event.end.date
            ? new Date(event.end.date)
            : null

          if (!startDate) continue

          // Extract attendee emails
          const attendeeEmails = (event.attendees || [])
            .map((a) => a.email)
            .filter((email): email is string => !!email)

          // Check if event is in the next 24 hours (for auto prep pack generation)
          const now = new Date()
          const hoursUntilEvent = (startDate.getTime() - now.getTime()) / (1000 * 60 * 60)
          const shouldGeneratePrepPack = hoursUntilEvent > 0 && hoursUntilEvent <= 24

          // Store event
          await adminDb
            .collection("calendarEvents")
            .doc(uid)
            .collection("events")
            .doc(event.id)
            .set(
              {
                provider: "gcal",
                calendarId: calendar.id,
                calendarName: calendar.summary,
                providerEventId: event.id,
                accountId,
                title: event.summary,
                description: event.description || null,
                startISO: startDate.toISOString(),
                endISO: endDate?.toISOString() || null,
                location: event.location || null,
                organizer: event.organizer
                  ? {
                      email: event.organizer.email,
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

          // Auto-generate prep pack for events in next 24 hours (non-blocking)
          if (shouldGeneratePrepPack) {
            // Check if prep pack already exists
            const eventDoc = await adminDb
              .collection("calendarEvents")
              .doc(uid)
              .collection("events")
              .doc(event.id)
              .get()

            const eventData = eventDoc.data()
            if (!eventData?.prepPack) {
              // Generate prep pack asynchronously (don't block sync)
              generatePrepPackForEvent(uid, event.id, {
                title: event.summary || "",
                description: event.description || undefined,
                startISO: startDate.toISOString(),
                endISO: endDate?.toISOString() || undefined,
                attendees: attendeeEmails.map((email) => {
                  const attendee = event.attendees?.find((a) => a.email === email)
                  return {
                    email,
                    name: attendee?.displayName || undefined,
                  }
                }),
                location: event.location || undefined,
                organizer: event.organizer
                  ? {
                      email: event.organizer.email,
                      name: event.organizer.displayName || undefined,
                    }
                  : undefined,
              }).catch((error) => {
                console.error(`Failed to auto-generate prep pack for event ${event.id}:`, error)
              })
            }
          }

          synced++
        } catch (error) {
          console.error(`Error syncing event ${event.id}:`, error)
          errors++
        }
      }
    } catch (error) {
      console.error(`Error syncing calendar ${calendar.id}:`, error)
      errors++
    }
  }

  return { synced, errors }
}

/**
 * Generate prep pack for an event (async helper)
 */
async function generatePrepPackForEvent(
  uid: string,
  eventId: string,
  event: {
    title: string
    description?: string
    startISO: string
    endISO?: string
    attendees: Array<{ email: string; name?: string }>
    location?: string
    organizer?: { email: string; name?: string }
  }
): Promise<void> {
  try {
    // Find related threads
    const relatedThreads = await findRelatedThreads(uid, {
      title: event.title,
      description: event.description || "",
      attendees: event.attendees,
      startISO: event.startISO,
    })

    // Generate prep pack
    const prepPack = await generatePrepPack(uid, event, relatedThreads)

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
  } catch (error) {
    console.error(`Error generating prep pack for event ${eventId}:`, error)
    throw error
  }
}
