import { OAuth2Client } from "google-auth-library"
import { google } from "googleapis"

export interface CalendarEvent {
  id: string
  summary: string
  description?: string
  start: { dateTime?: string; date?: string }
  end: { dateTime?: string; date?: string }
  attendees?: Array<{ email: string; displayName?: string; responseStatus?: string }>
  location?: string
  organizer?: { email: string; displayName?: string }
  htmlLink?: string
  status?: string
}

export class CalendarClient {
  private oauth2Client: OAuth2Client
  public calendar: ReturnType<typeof google.calendar>

  constructor(accessToken: string, refreshToken: string) {
    this.oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/integrations/google/callback"
    )

    this.oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    })

    this.calendar = google.calendar({ version: "v3", auth: this.oauth2Client })
  }

  async refreshAccessToken(): Promise<string> {
    const { credentials } = await this.oauth2Client.refreshAccessToken()
    if (!credentials.access_token) {
      throw new Error("Failed to refresh access token")
    }
    return credentials.access_token
  }

  /**
   * List calendars for the authenticated user
   */
  async listCalendars(): Promise<Array<{ id: string; summary: string; primary?: boolean }>> {
    const response = await this.calendar.calendarList.list()
    return (response.data.items || []).map((cal) => ({
      id: cal.id!,
      summary: cal.summary || "Untitled Calendar",
      primary: cal.primary || false,
    }))
  }

  /**
   * List events from a calendar within a time range
   */
  async listEvents(
    calendarId: string = "primary",
    timeMin: Date,
    timeMax: Date,
    maxResults: number = 250
  ): Promise<CalendarEvent[]> {
    const response = await this.calendar.events.list({
      calendarId,
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      maxResults,
      singleEvents: true,
      orderBy: "startTime",
    })

    return (response.data.items || []).map((event) => ({
      id: event.id!,
      summary: event.summary || "(No Title)",
      description: event.description || undefined,
      start: {
        dateTime: event.start?.dateTime || undefined,
        date: event.start?.date || undefined,
      },
      end: {
        dateTime: event.end?.dateTime || undefined,
        date: event.end?.date || undefined,
      },
      attendees: event.attendees?.map((a) => ({
        email: a.email || "",
        displayName: a.displayName || undefined,
        responseStatus: a.responseStatus || undefined,
      })),
      location: event.location || undefined,
      organizer: event.organizer
        ? {
            email: event.organizer.email || "",
            displayName: event.organizer.displayName || undefined,
          }
        : undefined,
      htmlLink: event.htmlLink || undefined,
      status: event.status || undefined,
    }))
  }

  /**
   * Get a single event by ID
   */
  async getEvent(calendarId: string, eventId: string): Promise<CalendarEvent | null> {
    try {
      const response = await this.calendar.events.get({
        calendarId,
        eventId,
      })

      const event = response.data
      return {
        id: event.id!,
        summary: event.summary || "(No Title)",
        description: event.description || undefined,
        start: {
          dateTime: event.start?.dateTime || undefined,
          date: event.start?.date || undefined,
        },
        end: {
          dateTime: event.end?.dateTime || undefined,
          date: event.end?.date || undefined,
        },
        attendees: event.attendees?.map((a) => ({
          email: a.email || "",
          displayName: a.displayName || undefined,
          responseStatus: a.responseStatus || undefined,
        })),
        location: event.location || undefined,
        organizer: event.organizer
          ? {
              email: event.organizer.email || "",
              displayName: event.organizer.displayName || undefined,
            }
          : undefined,
        htmlLink: event.htmlLink || undefined,
        status: event.status || undefined,
      }
    } catch (error) {
      console.error(`Error fetching event ${eventId}:`, error)
      return null
    }
  }

  /**
   * Create a new calendar event
   */
  async createEvent(
    calendarId: string = "primary",
    event: {
      title: string
      description?: string
      startISO: string
      endISO: string
      location?: string
      attendees?: Array<{ email: string; name?: string }>
      allDay?: boolean
    }
  ): Promise<CalendarEvent> {
    const eventData: any = {
      summary: event.title,
      description: event.description,
      location: event.location,
    }

    // Set start/end times
    if (event.allDay) {
      const startDate = new Date(event.startISO)
      const endDate = new Date(event.endISO)
      eventData.start = { date: startDate.toISOString().split("T")[0] }
      eventData.end = { date: endDate.toISOString().split("T")[0] }
    } else {
      eventData.start = { dateTime: event.startISO }
      eventData.end = { dateTime: event.endISO }
    }

    // Add attendees if provided
    if (event.attendees && event.attendees.length > 0) {
      eventData.attendees = event.attendees.map((a) => ({
        email: a.email,
        displayName: a.name,
      }))
    }

    const response = await this.calendar.events.insert({
      calendarId,
      requestBody: eventData,
    })

    if (!response.data || !response.data.id) {
      throw new Error("Failed to create event in Google Calendar: No event ID returned")
    }

    const createdEvent = response.data
    return {
      id: createdEvent.id!,
      summary: createdEvent.summary || "(No Title)",
      description: createdEvent.description || undefined,
      start: {
        dateTime: createdEvent.start?.dateTime || undefined,
        date: createdEvent.start?.date || undefined,
      },
      end: {
        dateTime: createdEvent.end?.dateTime || undefined,
        date: createdEvent.end?.date || undefined,
      },
      attendees: createdEvent.attendees?.map((a) => ({
        email: a.email || "",
        displayName: a.displayName || undefined,
        responseStatus: a.responseStatus || undefined,
      })),
      location: createdEvent.location || undefined,
      organizer: createdEvent.organizer
        ? {
            email: createdEvent.organizer.email || "",
            displayName: createdEvent.organizer.displayName || undefined,
          }
        : undefined,
      htmlLink: createdEvent.htmlLink || undefined,
      status: createdEvent.status || undefined,
    }
  }

  /**
   * Update an existing calendar event
   */
  async updateEvent(
    calendarId: string,
    eventId: string,
    updates: {
      title?: string
      description?: string
      startISO?: string
      endISO?: string
      location?: string
      attendees?: Array<{ email: string; name?: string }>
      allDay?: boolean
    }
  ): Promise<CalendarEvent> {
    // First get the existing event
    const existingEvent = await this.getEvent(calendarId, eventId)
    if (!existingEvent) {
      throw new Error(`Event ${eventId} not found`)
    }

    const eventData: any = {}

    if (updates.title !== undefined) {
      eventData.summary = updates.title
    }
    if (updates.description !== undefined) {
      eventData.description = updates.description
    }
    if (updates.location !== undefined) {
      eventData.location = updates.location
    }

    // Update start/end times if provided
    if (updates.startISO || updates.endISO || updates.allDay !== undefined) {
      const allDay = updates.allDay !== undefined ? updates.allDay : existingEvent.start.date !== undefined
      const startISO = updates.startISO || (existingEvent.start.dateTime || existingEvent.start.date)!
      const endISO = updates.endISO || (existingEvent.end.dateTime || existingEvent.end.date)!

      if (allDay) {
        const startDate = new Date(startISO)
        const endDate = new Date(endISO)
        eventData.start = { date: startDate.toISOString().split("T")[0] }
        eventData.end = { date: endDate.toISOString().split("T")[0] }
      } else {
        eventData.start = { dateTime: startISO }
        eventData.end = { dateTime: endISO }
      }
    }

    // Update attendees if provided
    if (updates.attendees !== undefined) {
      eventData.attendees = updates.attendees.map((a) => ({
        email: a.email,
        displayName: a.name,
      }))
    }

    const response = await this.calendar.events.patch({
      calendarId,
      eventId,
      requestBody: eventData,
    })

    const updatedEvent = response.data
    return {
      id: updatedEvent.id!,
      summary: updatedEvent.summary || "(No Title)",
      description: updatedEvent.description || undefined,
      start: {
        dateTime: updatedEvent.start?.dateTime || undefined,
        date: updatedEvent.start?.date || undefined,
      },
      end: {
        dateTime: updatedEvent.end?.dateTime || undefined,
        date: updatedEvent.end?.date || undefined,
      },
      attendees: updatedEvent.attendees?.map((a) => ({
        email: a.email || "",
        displayName: a.displayName || undefined,
        responseStatus: a.responseStatus || undefined,
      })),
      location: updatedEvent.location || undefined,
      organizer: updatedEvent.organizer
        ? {
            email: updatedEvent.organizer.email || "",
            displayName: updatedEvent.organizer.displayName || undefined,
          }
        : undefined,
      htmlLink: updatedEvent.htmlLink || undefined,
      status: updatedEvent.status || undefined,
    }
  }

  /**
   * Delete a calendar event
   */
  async deleteEvent(calendarId: string, eventId: string): Promise<void> {
    await this.calendar.events.delete({
      calendarId,
      eventId,
    })
  }
}
