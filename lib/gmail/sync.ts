import { GmailClient, GmailThread } from "./client"
import { adminDb } from "@/lib/firebase/admin"
import { FieldValue } from "firebase-admin/firestore"
import { getGmailTokens, updateGmailAccessToken } from "./tokenStore"
import { triggerAIPipeline } from "@/lib/ai/trigger"

export interface SyncOptions {
  days?: number
  maxThreads?: number
}

export async function syncGmailThreads(uid: string, accountId: string, options: SyncOptions = {}) {
  const { days = 7, maxThreads = 500 } = options

  // Get tokens
  let tokens = await getGmailTokens(uid, accountId)
  if (!tokens) {
    throw new Error("Gmail not connected")
  }

  // Refresh token if needed
  let accessToken = tokens.accessToken
  if (tokens.expiresAt < Date.now()) {
    const tempClient = new GmailClient(tokens.accessToken, tokens.refreshToken)
    accessToken = await tempClient.refreshAccessToken()
    // Update stored token
    await updateGmailAccessToken(uid, accountId, accessToken, Date.now() + 3600 * 1000)
  }

  // Create Gmail client
  const client = new GmailClient(accessToken, tokens.refreshToken)

  // Calculate date query
  const daysAgo = new Date()
  daysAgo.setDate(daysAgo.getDate() - days)
  const afterDate = Math.floor(daysAgo.getTime() / 1000)
  const query = `after:${afterDate}`

  // List threads
  const { threads } = await client.listThreads(maxThreads, query)

  let synced = 0
  let errors = 0

  for (const threadRef of threads) {
    try {
      // Get full thread
      const thread = await client.getThread(threadRef.id)

      // Extract participants and subject from first message
      const firstMessage = thread.messages[0]
      if (!firstMessage) continue

      const headers = firstMessage.payload.headers || []
      const subject = client.getHeader(headers, "Subject") || "(No Subject)"
      const from = client.getHeader(headers, "From")
      const to = client.getHeader(headers, "To")
      const dateHeader = client.getHeader(headers, "Date")

      // Parse participants
      const participants: Array<{ name: string; email: string }> = []
      if (from) {
        const fromMatch = from.match(/^(.+?)\s*<(.+?)>$/) || [null, from, from]
        participants.push({
          name: fromMatch[1]?.trim() || fromMatch[2],
          email: fromMatch[2],
        })
      }

      // Determine last inbound/outbound
      let lastInboundAt: Date | null = null
      let lastOutboundAt: Date | null = null
      let lastMessageAt: Date | null = null

      for (const msg of thread.messages) {
        const msgHeaders = msg.payload.headers || []
        const msgFrom = client.getHeader(msgHeaders, "From")
        const msgDate = new Date(parseInt(msg.internalDate))

        if (!lastMessageAt || msgDate > lastMessageAt) {
          lastMessageAt = msgDate
        }

        // Check if it's from the user (simplified - check if from matches accountId)
        const isOutbound = msgFrom?.includes(accountId) || false
        if (isOutbound) {
          if (!lastOutboundAt || msgDate > lastOutboundAt) {
            lastOutboundAt = msgDate
          }
        } else {
          if (!lastInboundAt || msgDate > lastInboundAt) {
            lastInboundAt = msgDate
          }
        }
      }

      // Store thread
      await adminDb
        .collection("emailThreads")
        .doc(uid)
        .collection("threads")
        .doc(thread.id)
        .set(
          {
            provider: "gmail",
            accountId,
            providerThreadId: thread.id,
            subject,
            participants,
            lastMessageAt: lastMessageAt?.toISOString() || FieldValue.serverTimestamp(),
            lastInboundAt: lastInboundAt?.toISOString() || null,
            lastOutboundAt: lastOutboundAt?.toISOString() || null,
            snippet: thread.snippet,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        )

      // Store messages
      for (const msg of thread.messages) {
        const msgHeaders = msg.payload.headers || []
        const msgFrom = client.getHeader(msgHeaders, "From")
        const msgTo = client.getHeader(msgHeaders, "To")
        const msgCc = client.getHeader(msgHeaders, "Cc")
        const msgDate = new Date(parseInt(msg.internalDate))
        const { text, html } = client.extractTextFromPayload(msg.payload)

        const isOutbound = msgFrom?.includes(accountId) || false

        await adminDb
          .collection("emailThreads")
          .doc(uid)
          .collection("threads")
          .doc(thread.id)
          .collection("messages")
          .doc(msg.id)
          .set(
            {
              providerMessageId: msg.id,
              direction: isOutbound ? "OUTBOUND" : "INBOUND",
              from: {
                name: msgFrom?.match(/^(.+?)\s*<(.+?)>$/) ? msgFrom.match(/^(.+?)\s*<(.+?)>$/)?.[1]?.trim() : msgFrom,
                email: msgFrom?.match(/^(.+?)\s*<(.+?)>$/) ? msgFrom.match(/^(.+?)\s*<(.+?)>$/)?.[2] : msgFrom,
              },
              to: parseEmailList(msgTo || ""),
              cc: parseEmailList(msgCc || ""),
              dateISO: msgDate.toISOString(),
              snippet: msg.snippet,
              bodyText: text.substring(0, 10000), // Limit size
              bodyHtml: html ? html.substring(0, 50000) : null, // Limit HTML size
              updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true }
          )
      }

      // Trigger AI pipeline (non-blocking)
      triggerAIPipeline(uid, threadRef.id).catch((error) => {
        console.error(`Failed to trigger AI pipeline for thread ${threadRef.id}:`, error)
      })

      synced++
    } catch (error) {
      console.error(`Error syncing thread ${threadRef.id}:`, error)
      errors++
    }
  }

  return { synced, errors, total: threads.length }
}

function parseEmailList(emailString: string): Array<{ name: string; email: string }> {
  if (!emailString) return []
  return emailString.split(",").map((email) => {
    const match = email.trim().match(/^(.+?)\s*<(.+?)>$/) || [null, email.trim(), email.trim()]
    return {
      name: match[1]?.trim() || match[2],
      email: match[2],
    }
  })
}
