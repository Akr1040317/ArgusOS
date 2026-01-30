import { NextRequest, NextResponse } from "next/server"
import { adminAuth } from "@/lib/firebase/admin"
import { getTokenUsage } from "@/lib/ai/tokenTracker"

/**
 * GET /api/ai/token-usage - Get token usage statistics
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

    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get("days") || "7", 10)

    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    console.log(`[TokenUsage API] Fetching usage for ${uid} from ${startDate.toISOString()} to ${endDate.toISOString()}`)

    const usage = await getTokenUsage(uid, startDate, endDate)

    console.log(`[TokenUsage API] Retrieved usage for ${uid}:`, {
      totalTokens: usage.totalTokens,
      totalCost: usage.totalCost,
      features: Object.keys(usage.byFeature).length,
      providers: Object.keys(usage.byProvider).length,
    })

    return NextResponse.json({ success: true, usage })
  } catch (error: any) {
    console.error("[TokenUsage API] Error getting token usage:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
