import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase/admin"
import { triggerAIPipeline } from "@/lib/ai/trigger"

/**
 * Run AI pipeline on all threads from today
 * Useful for processing existing emails after Phase 3 implementation
 */
export async function POST(request: NextRequest) {
  try {
    const { uid } = await request.json()
    if (!uid) {
      return NextResponse.json({ error: "UID required" }, { status: 400 })
    }

    // Get start of today in UTC
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayISO = today.toISOString()

    // Fetch all threads from today
    const threadsRef = adminDb
      .collection("emailThreads")
      .doc(uid)
      .collection("threads")

    const threadsSnapshot = await threadsRef
      .where("lastMessageAt", ">=", todayISO)
      .get()

    const threads = threadsSnapshot.docs
    const results = {
      total: threads.length,
      processed: 0,
      errors: 0,
      skipped: 0,
    }

    // Process each thread (with rate limiting to avoid overwhelming OpenAI)
    for (const threadDoc of threads) {
      const threadData = threadDoc.data()
      
      // Skip if already processed (has aiVersion) - but allow reprocessing if user wants
      // For now, we'll process all threads to ensure they get AI results
      // The AI pipeline itself is idempotent and will update existing results

      try {
        // Trigger AI pipeline (non-blocking, but we'll wait a bit between requests)
        await triggerAIPipeline(uid, threadDoc.id)
        results.processed++
        
        // Small delay to avoid rate limits (process 10 per second max)
        await new Promise((resolve) => setTimeout(resolve, 100))
      } catch (error: any) {
        console.error(`Error processing thread ${threadDoc.id}:`, error)
        results.errors++
      }
    }

    return NextResponse.json({
      success: true,
      ...results,
      message: `Processed ${results.processed} threads, skipped ${results.skipped} already processed, ${results.errors} errors`,
    })
  } catch (error: any) {
    console.error("Bulk AI processing error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
