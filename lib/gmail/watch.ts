import { GmailClient } from "./client"
import { adminDb } from "@/lib/firebase/admin"
import { FieldValue } from "firebase-admin/firestore"
import { getGmailTokens, updateGmailAccessToken } from "./tokenStore"

export interface WatchResponse {
  historyId: string
  expiration: string
}

/**
 * Start Gmail Watch for an account
 * Watch expires after 7 days and needs to be renewed
 */
export async function startGmailWatch(
  uid: string,
  accountId: string,
  topicName: string
): Promise<WatchResponse> {
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
  const gmail = client.gmail

  // Start watch - topicName should be full resource name
  // Format: projects/{project-id}/topics/{topic-name}
  const projectId = process.env.GCP_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  const fullTopicName = topicName.startsWith("projects/") 
    ? topicName 
    : `projects/${projectId}/topics/${topicName}`

  const response = await gmail.users.watch({
    userId: "me",
    requestBody: {
      topicName: fullTopicName,
      labelIds: ["INBOX"], // Only watch INBOX
    },
  })

  const historyId = response.data.historyId || ""
  const expiration = response.data.expiration || ""

  // Store watch state with UID mapping for webhook lookup
  await adminDb.collection("integrations").doc(uid).set(
    {
      gmail: {
        watch: {
          [accountId]: {
            isActive: true,
            historyId,
            expiresAt: expiration,
            topicName,
            startedAt: new Date().toISOString(),
            uid, // Store UID for webhook lookup
          },
        },
      },
    },
    { merge: true }
  )

  // Also create a reverse lookup: accountId -> uid (for webhook)
  await adminDb.collection("gmailAccountLookup").doc(accountId).set({
    uid,
    accountId,
  })

  return {
    historyId,
    expiration,
  }
}

/**
 * Stop Gmail Watch for an account
 */
export async function stopGmailWatch(uid: string, accountId: string): Promise<void> {
  // Get tokens
  const tokens = await getGmailTokens(uid, accountId)
  if (!tokens) {
    throw new Error("Gmail not connected")
  }

  // Create Gmail client
  const client = new GmailClient(tokens.accessToken, tokens.refreshToken)
  const gmail = client.gmail

  // Stop watch
  await gmail.users.stop({
    userId: "me",
  })

  // Update watch state
  await adminDb.collection("integrations").doc(uid).update({
    [`gmail.watch.${accountId}`]: FieldValue.delete(),
  })

  // Remove lookup entry
  await adminDb.collection("gmailAccountLookup").doc(accountId).delete()
}

/**
 * Get watch status for an account
 */
export async function getWatchStatus(uid: string, accountId: string): Promise<{
  isActive: boolean
  historyId?: string
  expiresAt?: string
} | null> {
  const doc = await adminDb.collection("integrations").doc(uid).get()
  if (!doc.exists) return null

  const data = doc.data()
  const watch = data?.gmail?.watch?.[accountId]

  if (!watch) return { isActive: false }

  return {
    isActive: watch.isActive || false,
    historyId: watch.historyId,
    expiresAt: watch.expiresAt,
  }
}
