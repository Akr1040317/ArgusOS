import { NextRequest, NextResponse } from "next/server"
import { adminAuth, adminDb } from "@/lib/firebase/admin"
import { getGmailTokens } from "@/lib/gmail/tokenStore"
import { GmailClient } from "@/lib/gmail/client"

/**
 * Create a draft email via Gmail API
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

    const { accountId, to, cc, bcc, subject, body, threadId } = await request.json()

    if (!accountId || !to || !Array.isArray(to) || to.length === 0 || !subject || !body) {
      return NextResponse.json(
        { error: "accountId, to (array), subject, and body are required" },
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

    // Create Gmail client and create draft
    const client = new GmailClient(accessToken, tokens.refreshToken)
    
    // Get user email for "From" field
    let fromEmail = accountId.includes("@") ? accountId : accountId
    if (!fromEmail.includes("@")) {
      const integrationsDoc = await adminDb.collection("integrations").doc(uid).get()
      const integrationsData = integrationsDoc.data()
      const gmailAccount = integrationsData?.gmail?.accounts?.find(
        (acc: any) => acc.accountId === accountId
      )
      fromEmail = gmailAccount?.email || accountId
    }

    // Get thread info if replying
    let inReplyTo: string | undefined
    let references: string | undefined
    if (threadId) {
      try {
        const thread = await client.getThread(threadId)
        if (thread.messages.length > 0) {
          const lastMessage = thread.messages[thread.messages.length - 1]
          const messageId = client.getHeader(lastMessage.payload.headers, "Message-ID")
          if (messageId) {
            inReplyTo = messageId
            const messageIds = thread.messages
              .map((msg) => client.getHeader(msg.payload.headers, "Message-ID"))
              .filter((id) => id)
            references = messageIds.join(" ")
          }
        }
      } catch (error) {
        console.error("Error fetching thread for reply headers:", error)
      }
    }

    const draftId = await client.createDraft(fromEmail, to, subject, body, {
      cc,
      bcc,
      threadId,
      inReplyTo,
      references,
    })

    return NextResponse.json({
      success: true,
      draftId,
    })
  } catch (error: any) {
    console.error("Error creating draft:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create draft" },
      { status: 500 }
    )
  }
}
