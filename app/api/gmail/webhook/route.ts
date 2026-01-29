import { NextRequest, NextResponse } from "next/server"
import { ingestGmailHistory } from "@/lib/gmail/ingest"

/**
 * Pub/Sub webhook handler for Gmail Watch notifications
 * This endpoint receives Pub/Sub push messages from Gmail
 */
export async function POST(request: NextRequest) {
  try {
    // Verify Pub/Sub message (in production, verify JWT signature)
    const body = await request.json()

    // Pub/Sub message format
    const message = body.message
    if (!message) {
      return NextResponse.json({ error: "Invalid message format" }, { status: 400 })
    }

    // Decode base64 data
    const data = JSON.parse(Buffer.from(message.data, "base64").toString("utf-8"))

    // Extract account info from Pub/Sub message
    // Gmail sends: { emailAddress, historyId }
    const emailAddress = data.emailAddress
    const historyId = data.historyId

    if (!emailAddress || !historyId) {
      return NextResponse.json({ error: "Missing emailAddress or historyId" }, { status: 400 })
    }

    // Look up UID from accountId mapping
    const { adminDb } = await import("@/lib/firebase/admin")
    const lookupDoc = await adminDb.collection("gmailAccountLookup").doc(emailAddress).get()
    
    if (!lookupDoc.exists) {
      console.error(`No UID found for account: ${emailAddress}`)
      return NextResponse.json({ error: `Account ${emailAddress} not found` }, { status: 404 })
    }

    const lookupData = lookupDoc.data()
    const uid = lookupData?.uid

    if (!uid) {
      return NextResponse.json({ error: "UID not found for account" }, { status: 400 })
    }

    // Process history changes
    const result = await ingestGmailHistory(uid, emailAddress, historyId)

    // Acknowledge message (Pub/Sub will retry if we return error)
    return NextResponse.json({
      success: true,
      processed: result.processed,
      errors: result.errors,
    })
  } catch (error: any) {
    console.error("Webhook error:", error)
    // Return 500 to trigger Pub/Sub retry
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
