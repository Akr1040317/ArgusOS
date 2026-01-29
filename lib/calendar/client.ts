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
}
