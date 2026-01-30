import { NextRequest, NextResponse } from "next/server"
import { adminAuth } from "@/lib/firebase/admin"
import { getCalendarTokens } from "@/lib/calendar/tokenStore"
import { CalendarClient } from "@/lib/calendar/client"

/**
 * List calendar events directly from Google Calendar API
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

    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get("accountId")
    const calendarId = searchParams.get("calendarId") || "primary"
    const timeMin = searchParams.get("timeMin")
    const timeMax = searchParams.get("timeMax")
    const maxResults = parseInt(searchParams.get("maxResults") || "250")

    if (!accountId || !timeMin || !timeMax) {
      return NextResponse.json(
        { error: "accountId, timeMin, and timeMax are required" },
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
      try {
        const tempClient = new CalendarClient(tokens.accessToken, tokens.refreshToken)
        accessToken = await tempClient.refreshAccessToken()
        // Update stored token
        const { updateCalendarAccessToken } = await import("@/lib/calendar/tokenStore")
        await updateCalendarAccessToken(uid, accountId, accessToken, Date.now() + 3600 * 1000)
      } catch (refreshError: any) {
        console.error("Error refreshing calendar token:", refreshError)
        return NextResponse.json(
          { error: `Token refresh failed: ${refreshError.message}. Please reconnect your account.` },
          { status: 401 }
        )
      }
    }

    // Create Calendar client and fetch events
    try {
      const client = new CalendarClient(accessToken, tokens.refreshToken)
      const events = await client.listEvents(calendarId, new Date(timeMin), new Date(timeMax), maxResults)

    // Transform to match the CalendarEvent interface
    const transformedEvents = events.map((event) => {
      const startDate = event.start.dateTime ? new Date(event.start.dateTime) : new Date(event.start.date!)
      const endDate = event.end.dateTime ? new Date(event.end.dateTime) : new Date(event.end.date!)

      return {
        id: event.id,
        title: event.summary || "(No Title)",
        description: event.description || undefined,
        startISO: startDate.toISOString(),
        endISO: endDate?.toISOString() || undefined,
        location: event.location || undefined,
        attendees: (event.attendees || []).map((a) => ({
          email: a.email || "",
          name: a.displayName || undefined,
        })),
        organizer: event.organizer
          ? {
              email: event.organizer.email || "",
              name: event.organizer.displayName || undefined,
            }
          : undefined,
        calendarId: calendarId,
        accountId: accountId,
      }
    })

      return NextResponse.json({
        success: true,
        events: transformedEvents,
      })
    } catch (apiError: any) {
      console.error("Error calling Calendar API:", apiError)
      console.error("Error details:", {
        message: apiError.message,
        code: apiError.code,
        response: apiError.response?.data,
      })
      
      // Check if it's a permissions error
      if (apiError.message?.includes("insufficient") || apiError.message?.includes("permission")) {
        return NextResponse.json(
          { error: "Insufficient permissions. Please reconnect your account with write permissions." },
          { status: 403 }
        )
      }

      return NextResponse.json(
        { 
          error: apiError.message || "Failed to fetch events",
          details: apiError.response?.data || apiError.code,
        },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error("Error fetching calendar events:", error)
    return NextResponse.json(
      { 
        error: error.message || "Failed to fetch events",
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}
