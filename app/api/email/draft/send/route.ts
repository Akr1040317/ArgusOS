import { NextRequest, NextResponse } from "next/server"
import { adminAuth } from "@/lib/firebase/admin"
import { getGmailTokens } from "@/lib/gmail/tokenStore"
import { GmailClient } from "@/lib/gmail/client"

/**
 * Send a draft email via Gmail API
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

    const { accountId, draftId } = await request.json()

    if (!accountId || !draftId) {
      return NextResponse.json(
        { error: "accountId and draftId are required" },
        { status: 400 }
      )
    }

    // Get Gmail tokens
    const tokens = await getGmailTokens(uid, accountId)
    if (!tokens) {
      return NextResponse.json({ error: "Gmail account not connected" }, { status: 404 })
    }

    // Refresh token if needed
    let accessToken = tokens.accessToken
    if (tokens.expiresAt < Date.now()) {
      const client = new GmailClient(tokens.accessToken, tokens.refreshToken)
      accessToken = await client.refreshAccessToken()
    }

    // Create Gmail client and send draft
    const client = new GmailClient(accessToken, tokens.refreshToken)
    const messageId = await client.sendDraft(draftId)

    return NextResponse.json({
      success: true,
      messageId,
    })
  } catch (error: any) {
    console.error("Error sending draft:", error)
    return NextResponse.json(
      { error: error.message || "Failed to send draft" },
      { status: 500 }
    )
  }
}
