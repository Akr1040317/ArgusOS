import { NextRequest, NextResponse } from "next/server"
import { adminAuth } from "@/lib/firebase/admin"
import { syncCalendarEvents } from "@/lib/calendar/sync"

/**
 * Sync calendar events from Google Calendar
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

    const { accountId, daysAhead, maxEvents } = await request.json()

    if (!accountId) {
      return NextResponse.json({ error: "accountId required" }, { status: 400 })
    }

    const result = await syncCalendarEvents(uid, accountId, {
      daysAhead: daysAhead || 14,
      maxEvents: maxEvents || 500,
    })

    return NextResponse.json({
      success: true,
      ...result,
      message: `Synced ${result.synced} events, ${result.errors} errors`,
    })
  } catch (error: any) {
    console.error("Calendar sync error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
