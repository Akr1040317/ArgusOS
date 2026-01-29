import { NextRequest, NextResponse } from "next/server"
import { adminAuth } from "@/lib/firebase/admin"
import { syncGmailThreads } from "@/lib/gmail/sync"
import { getGmailTokens } from "@/lib/gmail/tokenStore"
import { GmailClient } from "@/lib/gmail/client"

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decodedToken = await adminAuth.verifyIdToken(token)
    const uid = decodedToken.uid

    const body = await request.json()
    const { days, maxThreads, accountId } = body

    if (!accountId) {
      return NextResponse.json({ error: "accountId is required" }, { status: 400 })
    }

    // Verify tokens exist
    const tokens = await getGmailTokens(uid, accountId)
    if (!tokens) {
      return NextResponse.json({ error: "Gmail not connected" }, { status: 400 })
    }

    // Refresh token if needed
    let accessToken = tokens.accessToken
    if (tokens.expiresAt < Date.now()) {
      const client = new GmailClient(tokens.accessToken, tokens.refreshToken)
      accessToken = await client.refreshAccessToken()
      // Update stored token (simplified - in production, update in tokenStore)
    }

    // Sync threads
    const result = await syncGmailThreads(uid, accountId, { days, maxThreads })

    return NextResponse.json({
      success: true,
      synced: result.synced,
      errors: result.errors,
      total: result.total,
    })
  } catch (error: any) {
    console.error("Sync error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
