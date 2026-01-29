import { adminDb } from "@/lib/firebase/admin"
import { FieldValue } from "firebase-admin/firestore"

export interface TokenData {
  accessToken: string
  refreshToken: string
  expiresAt: number
}

/**
 * Store Gmail OAuth tokens in Firestore
 * In production, consider using Google Secret Manager for better security
 */
export async function storeGmailTokens(
  uid: string,
  accountId: string,
  tokens: TokenData
): Promise<void> {
  try {
    // First, get existing document to check if account already exists
    const docRef = adminDb.collection("integrations").doc(uid)
    const doc = await docRef.get()
    
    const existingData = doc.exists ? doc.data() : {}
    const existingAccounts = existingData?.gmail?.accounts || []
    
    // Check if account already exists
    const accountExists = existingAccounts.some((acc: any) => acc.accountId === accountId)
    
    if (!accountExists) {
      // Add new account to array (use regular timestamp, not serverTimestamp)
      const now = new Date()
      await docRef.set(
        {
          gmail: {
            accounts: FieldValue.arrayUnion({
              accountId,
              email: accountId,
              status: "connected",
              connectedAt: now.toISOString(),
            }),
          },
        },
        { merge: true }
      )
    }
    
    // Update tokens (always update, even if account exists)
    const now = new Date()
    await docRef.set(
      {
        tokenRefs: {
          gmail: {
            [accountId]: {
              accessToken: tokens.accessToken,
              refreshToken: tokens.refreshToken,
              expiresAt: tokens.expiresAt,
              updatedAt: now.toISOString(),
            },
          },
        },
      },
      { merge: true }
    )

    // Create lookup entry for webhook (accountId -> uid)
    await adminDb.collection("gmailAccountLookup").doc(accountId).set({
      uid,
      accountId,
    })
  } catch (error: any) {
    console.error("Error storing Gmail tokens:", error)
    throw new Error(`Failed to store tokens: ${error.message}`)
  }
}

export async function getGmailTokens(uid: string, accountId: string): Promise<TokenData | null> {
  const doc = await adminDb.collection("integrations").doc(uid).get()
  if (!doc.exists) return null

  const data = doc.data()
  const tokenRefs = data?.tokenRefs?.gmail?.[accountId]

  if (!tokenRefs) return null

  return {
    accessToken: tokenRefs.accessToken,
    refreshToken: tokenRefs.refreshToken,
    expiresAt: tokenRefs.expiresAt,
  }
}

export async function updateGmailAccessToken(
  uid: string,
  accountId: string,
  accessToken: string,
  expiresAt: number
): Promise<void> {
  await adminDb
    .collection("integrations")
    .doc(uid)
    .update({
      [`tokenRefs.gmail.${accountId}.accessToken`]: accessToken,
      [`tokenRefs.gmail.${accountId}.expiresAt`]: expiresAt,
      [`tokenRefs.gmail.${accountId}.updatedAt`]: FieldValue.serverTimestamp(),
    })
}
