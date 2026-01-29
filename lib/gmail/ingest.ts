import { GmailClient } from "./client"
import { adminDb } from "@/lib/firebase/admin"
import { FieldValue } from "firebase-admin/firestore"
import { getGmailTokens, updateGmailAccessToken } from "./tokenStore"
import { triggerAIPipeline } from "@/lib/ai/trigger"

export interface HistoryItem {
  id: string
  messages?: Array<{ id: string; threadId: string }>
  messagesAdded?: Array<{ message: { id: string; threadId: string } }>
}

/**
 * Process Gmail history changes and ingest new/updated threads
 * Idempotent: deduplicates by messageId and historyId
 */
export async function ingestGmailHistory(
  uid: string,
  accountId: string,
  historyId: string
): Promise<{ processed: number; errors: number }> {
  // Get tokens
  let tokens = await getGmailTokens(uid, accountId)
  if (!tokens) {
    throw new Error("Gmail not connected")
  }

  // Refresh token if needed
  let accessToken = tokens.accessToken
  if (tokens.expiresAt < Date.now()) {
    const client = new GmailClient(tokens.accessToken, tokens.refreshToken)
    accessToken = await client.refreshAccessToken()
    await updateGmailAccessToken(uid, accountId, accessToken, Date.now() + 3600 * 1000)
  }

  // Create Gmail client
  const client = new GmailClient(accessToken, tokens.refreshToken)

  // Get last processed historyId from Firestore
  const watchDoc = await adminDb.collection("integrations").doc(uid).get()
  const watchData = watchDoc.data()
  const lastHistoryId = watchData?.gmail?.watch?.[accountId]?.lastProcessedHistoryId

  // Fetch history since last processed
  const startHistoryId = lastHistoryId || historyId

  try {
    // Note: history.list requires startHistoryId to be a number, not string
    const historyResponse = await client.gmail.users.history.list({
      userId: "me",
      startHistoryId: startHistoryId,
      historyTypes: ["messageAdded"],
      maxResults: 100, // Limit results per request
    })

    const history = historyResponse.data.history || []
    let processed = 0
    let errors = 0

    // Process each history item
    for (const historyItem of history) {
      try {
        // Get messages added in this history item
        const messagesAdded = historyItem.messagesAdded || []

        for (const msgAdded of messagesAdded) {
          const messageId = msgAdded.message?.id
          const threadId = msgAdded.message?.threadId || historyItem.messages?.[0]?.threadId

          if (!messageId || !threadId) continue

          // Check if message already processed (deduplication)
          const messageDoc = await adminDb
            .collection("emailThreads")
            .doc(uid)
            .collection("threads")
            .doc(threadId)
            .collection("messages")
            .doc(messageId)
            .get()

          if (messageDoc.exists) {
            // Already processed, skip
            continue
          }

          // Fetch full thread
          const thread = await client.getThread(threadId)

          // Extract and store thread data
          await processThread(uid, accountId, thread, client)

          // Trigger AI pipeline (non-blocking)
          triggerAIPipeline(uid, threadId).catch((error) => {
            console.error(`Failed to trigger AI pipeline for thread ${threadId}:`, error)
          })

          processed++
        }
      } catch (error) {
        console.error(`Error processing history item ${historyItem.id}:`, error)
        errors++
      }
    }

    // Update last processed historyId
    await adminDb.collection("integrations").doc(uid).set(
      {
        gmail: {
          watch: {
            [accountId]: {
              lastProcessedHistoryId: historyId,
            },
          },
        },
      },
      { merge: true }
    )

    return { processed, errors }
  } catch (error: any) {
    // If historyId is too old, we need to do a full sync
    if (error.message?.includes("historyId")) {
      console.log(`HistoryId ${startHistoryId} too old, doing full sync for account ${accountId}`)
      // Could trigger a full sync here, but for now just return
      return { processed: 0, errors: 1 }
    }
    throw error
  }
}

async function processThread(
  uid: string,
  accountId: string,
  thread: any,
  client: GmailClient
): Promise<void> {
  // Extract participants and subject from first message
  const firstMessage = thread.messages[0]
  if (!firstMessage) return

  const headers = firstMessage.payload.headers || []
  const subject = client.getHeader(headers, "Subject") || "(No Subject)"
  const from = client.getHeader(headers, "From")
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
