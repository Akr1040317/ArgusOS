import { NextRequest, NextResponse } from "next/server"
import { adminAuth } from "@/lib/firebase/admin"
import { adminDb } from "@/lib/firebase/admin"
import { computeDigest } from "@/lib/digest/compute"

/**
 * Compute and store digest for a user
 * Can be called manually or by Cloud Scheduler
 */
export async function POST(request: NextRequest) {
  try {
    // Check for service account (Cloud Scheduler) or user token
    const authHeader = request.headers.get("authorization")
    let uid: string

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.substring(7)
      try {
        const decodedToken = await adminAuth.verifyIdToken(token)
        uid = decodedToken.uid
      } catch (error) {
        // Might be a service account token, check request body
        const body = await request.json().catch(() => ({}))
        uid = body.uid
        if (!uid) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }
      }
    } else {
      // Try to get uid from request body (for Cloud Scheduler)
      const body = await request.json().catch(() => ({}))
      uid = body.uid
      if (!uid) {
        return NextResponse.json({ error: "Unauthorized or missing uid" }, { status: 401 })
      }
    }

    // Compute digest
    const digest = await computeDigest(uid)

    // Store digest
    const digestRef = adminDb.collection("digests").doc(uid).collection("runs").doc()
    await digestRef.set(digest)

    return NextResponse.json({
      success: true,
      digestId: digestRef.id,
      summary: {
        importantNew: digest.importantNew.length,
        needsReplyOverdue: digest.needsReplyOverdue.length,
        followUpsDue: digest.followUpsDue.length,
        upcomingMeetings: digest.upcomingMeetings.length,
        prepGaps: digest.prepGaps.length,
      },
    })
  } catch (error: any) {
    console.error("Digest computation error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * GET: Get latest digest for a user
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

    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get("limit") || "1", 10)

    const digestsSnapshot = await adminDb
      .collection("digests")
      .doc(uid)
      .collection("runs")
      .orderBy("runAt", "desc")
      .limit(limit)
      .get()

    const digests = digestsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    return NextResponse.json({ digests })
  } catch (error: any) {
    console.error("Error fetching digests:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
