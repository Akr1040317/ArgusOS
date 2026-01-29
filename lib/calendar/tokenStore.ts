import { adminDb } from "@/lib/firebase/admin"
import { FieldValue } from "firebase-admin/firestore"

export interface CalendarTokens {
  accessToken: string
  refreshToken: string
  expiresAt: number
}

/**
 * Store Calendar OAuth tokens for a user account
 * Uses same tokenRefs structure as Gmail for consistency
 */
export async function storeCalendarTokens(
  uid: string,
  accountId: string,
  accessToken: string,
  refreshToken: string,
  expiresIn: number
): Promise<void> {
  const expiresAt = Date.now() + expiresIn * 1000
  const now = new Date()

  // Get existing document
  const docRef = adminDb.collection("integrations").doc(uid)
  const doc = await docRef.get()
  const existingData = doc.exists ? doc.data() : {}
  const existingAccounts = existingData?.calendar?.accounts || []

  // Check if account already exists
  const accountExists = existingAccounts.some((acc: any) => acc.accountId === accountId)

  if (!accountExists) {
    // Add new account to array
    await docRef.set(
      {
        calendar: {
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

  // Store tokens in tokenRefs (same structure as Gmail)
  await docRef.set(
    {
      tokenRefs: {
        calendar: {
          [accountId]: {
            accessToken,
            refreshToken,
            expiresAt,
            updatedAt: now.toISOString(),
          },
        },
      },
    },
    { merge: true }
  )
}

/**
 * Get Calendar OAuth tokens for a user account
 */
export async function getCalendarTokens(uid: string, accountId: string): Promise<CalendarTokens | null> {
  const doc = await adminDb.collection("integrations").doc(uid).get()
  if (!doc.exists) return null

  const data = doc.data()
  const tokenRefs = data?.tokenRefs?.calendar?.[accountId]

  if (!tokenRefs) return null

  return {
    accessToken: tokenRefs.accessToken,
    refreshToken: tokenRefs.refreshToken,
    expiresAt: tokenRefs.expiresAt,
  }
}

/**
 * Update Calendar access token (after refresh)
 */
export async function updateCalendarAccessToken(
  uid: string,
  accountId: string,
  accessToken: string,
  expiresAt: number
): Promise<void> {
  await adminDb
    .collection("integrations")
    .doc(uid)
    .update({
      [`tokenRefs.calendar.${accountId}.accessToken`]: accessToken,
      [`tokenRefs.calendar.${accountId}.expiresAt`]: expiresAt,
      [`tokenRefs.calendar.${accountId}.updatedAt`]: FieldValue.serverTimestamp(),
    })
}
