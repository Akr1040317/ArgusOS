import { NextRequest, NextResponse } from "next/server"
import { adminAuth } from "@/lib/firebase/admin"
import { startGmailWatch } from "@/lib/gmail/watch"

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decodedToken = await adminAuth.verifyIdToken(token)
    const uid = decodedToken.uid

    const body = await request.json()
    const { accountId, topicName } = body

    if (!accountId) {
      return NextResponse.json({ error: "accountId is required" }, { status: 400 })
    }

    if (!topicName) {
      return NextResponse.json({ error: "topicName is required" }, { status: 400 })
    }

    const result = await startGmailWatch(uid, accountId, topicName)

    return NextResponse.json({
      success: true,
      historyId: result.historyId,
      expiration: result.expiration,
    })
  } catch (error: any) {
    console.error("Error starting Gmail watch:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
