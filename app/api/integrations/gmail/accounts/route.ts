import { NextRequest, NextResponse } from "next/server"
import { adminAuth } from "@/lib/firebase/admin"
import { adminDb } from "@/lib/firebase/admin"

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decodedToken = await adminAuth.verifyIdToken(token)
    const uid = decodedToken.uid

    // Get integrations document
    const doc = await adminDb.collection("integrations").doc(uid).get()
    
    if (!doc.exists) {
      return NextResponse.json({ accounts: [] })
    }

    const data = doc.data()
    const accounts = data?.gmail?.accounts || []

    return NextResponse.json({ accounts })
  } catch (error: any) {
    console.error("Error fetching Gmail accounts:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
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

    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get("accountId")

    if (!accountId) {
      return NextResponse.json({ error: "accountId is required" }, { status: 400 })
    }

    // Get current document
    const docRef = adminDb.collection("integrations").doc(uid)
    const doc = await docRef.get()
    
    if (!doc.exists) {
      return NextResponse.json({ error: "No integrations found" }, { status: 404 })
    }

    const data = doc.data()
    const accounts = data?.gmail?.accounts || []
    
    // Remove account from array
    const updatedAccounts = accounts.filter((acc: any) => acc.accountId !== accountId)
    
    // Remove tokens
    const tokenRefs = data?.tokenRefs?.gmail || {}
    delete tokenRefs[accountId]
    
    // Update document
    await docRef.update({
      "gmail.accounts": updatedAccounts,
      [`tokenRefs.gmail`]: tokenRefs,
    })

    // Remove lookup entry
    await adminDb.collection("gmailAccountLookup").doc(accountId).delete()

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error disconnecting Gmail account:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
