import { NextRequest, NextResponse } from "next/server"
import { adminAuth } from "@/lib/firebase/admin"
import { getCalendarTokens } from "@/lib/calendar/tokenStore"
import { CalendarClient } from "@/lib/calendar/client"

/**
 * Get list of calendars for an account
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

    if (!accountId) {
      return NextResponse.json({ error: "accountId is required" }, { status: 400 })
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

    // Create Calendar client and list calendars
    try {
      const client = new CalendarClient(accessToken, tokens.refreshToken)
      const calendars = await client.listCalendars()

      return NextResponse.json({
        success: true,
        calendars,
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
          error: apiError.message || "Failed to fetch calendars",
          details: apiError.response?.data || apiError.code,
        },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error("Error fetching calendars:", error)
    return NextResponse.json(
      { 
        error: error.message || "Failed to fetch calendars",
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}
