import { NextRequest, NextResponse } from "next/server"
import { adminAuth } from "@/lib/firebase/admin"
import { adminDb } from "@/lib/firebase/admin"
import { FieldValue } from "firebase-admin/firestore"

/**
 * GET: List connected Calendar accounts
 * DELETE: Disconnect a Calendar account
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

    const doc = await adminDb.collection("integrations").doc(uid).get()
    const data = doc.data()

    let calendarAccounts = data?.calendar?.accounts || []
    const gmailAccounts = data?.gmail?.accounts || []

    // If no calendar accounts but Gmail accounts exist, create calendar accounts from Gmail
    // (they share the same OAuth tokens)
    if (calendarAccounts.length === 0 && gmailAccounts.length > 0) {
      const docRef = adminDb.collection("integrations").doc(uid)
      
      // Create calendar account entries from Gmail accounts
      calendarAccounts = gmailAccounts.map((gmailAcc: any) => ({
        accountId: gmailAcc.accountId,
        email: gmailAcc.email,
        status: "connected",
        connectedAt: gmailAcc.connectedAt || new Date().toISOString(),
      }))

      // Also copy Gmail tokens to calendar tokens if they don't exist
      const gmailTokens = data?.tokenRefs?.gmail || {}
      const calendarTokens: Record<string, any> = {}
      
      for (const [accountId, tokens] of Object.entries(gmailTokens)) {
        calendarTokens[accountId] = tokens
      }

      // Update the document
      await docRef.set(
        {
          calendar: {
            accounts: calendarAccounts,
          },
          tokenRefs: {
            calendar: calendarTokens,
          },
        },
        { merge: true }
      )
    }

    return NextResponse.json({ accounts: calendarAccounts })
  } catch (error: any) {
    console.error("Error fetching Calendar accounts:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decodedToken = await adminAuth.verifyIdToken(token)
    const uid = decodedToken.uid

    const searchParams = request.nextUrl.searchParams
    const accountId = searchParams.get("accountId")

    if (!accountId) {
      return NextResponse.json({ error: "accountId required" }, { status: 400 })
    }

    // Remove account from array and delete tokens
    const docRef = adminDb.collection("integrations").doc(uid)
    const doc = await docRef.get()
    
    if (!doc.exists) {
      return NextResponse.json({ error: "No integrations found" }, { status: 404 })
    }

    const data = doc.data()
    const accounts = data?.calendar?.accounts || []
    const filteredAccounts = accounts.filter((acc: any) => acc.accountId !== accountId)

    // Remove tokens
    const tokenRefs = data?.tokenRefs?.calendar || {}
    delete tokenRefs[accountId]

    await docRef.update({
      "calendar.accounts": filteredAccounts,
      "tokenRefs.calendar": tokenRefs,
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error disconnecting Calendar account:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
