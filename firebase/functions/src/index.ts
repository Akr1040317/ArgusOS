import { onSchedule } from "firebase-functions/v2/scheduler"
import { adminDb } from "./lib/firebase/admin"
import { computeDigest } from "./lib/digest/compute"
import { syncCalendarEvents } from "./lib/calendar/sync"
import { startGmailWatch, getWatchStatus } from "./lib/gmail/watch"

/**
 * Hourly Digest Function
 * Runs every hour to compute and store digests for all users
 */
export const hourlyDigest = onSchedule(
  {
    schedule: "every 1 hours",
    timeZone: "America/Los_Angeles",
    memory: "512MiB",
    timeoutSeconds: 540, // 9 minutes max
  },
  async (event) => {
    console.log("Starting hourly digest computation...")
    const startTime = Date.now()

    try {
      // Get all users
      const usersSnapshot = await adminDb.collection("users").get()
      const totalUsers = usersSnapshot.docs.length
      let successCount = 0
      let errorCount = 0

      console.log(`Processing ${totalUsers} users...`)

      // Process each user
      for (const userDoc of usersSnapshot.docs) {
        const uid = userDoc.id
        try {
          // Compute digest
          const digest = await computeDigest(uid)

          // Store digest
          await adminDb
            .collection("digests")
            .doc(uid)
            .collection("runs")
            .add(digest)

          successCount++
          console.log(`✓ Digest generated for user ${uid}`)
        } catch (error: any) {
          errorCount++
          console.error(`✗ Error generating digest for user ${uid}:`, error.message)
          // Continue to next user
        }
      }

      const duration = Date.now() - startTime
      console.log(
        `Hourly digest completed: ${successCount} succeeded, ${errorCount} failed, ${duration}ms`
      )
    } catch (error: any) {
      console.error("Fatal error in hourly digest:", error)
      throw error
    }
  }
)

/**
 * Hourly Calendar Sync Function
 * Runs every hour to sync calendars for all users
 */
export const hourlyCalendarSync = onSchedule(
  {
    schedule: "every 1 hours",
    timeZone: "America/Los_Angeles",
    memory: "512MiB",
    timeoutSeconds: 540, // 9 minutes max
  },
  async (event) => {
    console.log("Starting hourly calendar sync...")
    const startTime = Date.now()

    try {
      // Get all users
      const usersSnapshot = await adminDb.collection("users").get()
      let totalSynced = 0
      let totalErrors = 0
      let usersProcessed = 0

      // Process each user
      for (const userDoc of usersSnapshot.docs) {
        const uid = userDoc.id

        try {
          // Get calendar accounts for this user
          const integrationsDoc = await adminDb.collection("integrations").doc(uid).get()
          if (!integrationsDoc.exists) {
            console.log(`No integrations found for user ${uid}, skipping`)
            continue
          }

          const integrationsData = integrationsDoc.data()
          const calendarAccounts = integrationsData?.calendar?.accounts || []

          if (calendarAccounts.length === 0) {
            console.log(`No calendar accounts for user ${uid}, skipping`)
            continue
          }

          // Sync each calendar account
          for (const account of calendarAccounts) {
            const accountId = account.accountId || account.email
            if (!accountId) continue

            try {
              const result = await syncCalendarEvents(uid, accountId, {
                daysAhead: 14,
                maxEvents: 500,
              })

              totalSynced += result.synced
              totalErrors += result.errors
              console.log(
                `✓ Synced ${result.synced} events for user ${uid}, account ${accountId} (${result.errors} errors)`
              )
            } catch (error: any) {
              totalErrors++
              console.error(
                `✗ Error syncing calendar for user ${uid}, account ${accountId}:`,
                error.message
              )
            }
          }

          usersProcessed++
        } catch (error: any) {
          console.error(`✗ Error processing user ${uid}:`, error.message)
          // Continue to next user
        }
      }

      const duration = Date.now() - startTime
      console.log(
        `Hourly calendar sync completed: ${usersProcessed} users, ${totalSynced} events synced, ${totalErrors} errors, ${duration}ms`
      )
    } catch (error: any) {
      console.error("Fatal error in hourly calendar sync:", error)
      throw error
    }
  }
)

/**
 * Daily Gmail Watch Renewal Function
 * Runs daily at 2 AM to renew Gmail Watch subscriptions
 */
export const dailyGmailWatchRenewal = onSchedule(
  {
    schedule: "0 2 * * *", // 2 AM daily
    timeZone: "America/Los_Angeles",
    memory: "512MiB",
    timeoutSeconds: 540, // 9 minutes max
  },
  async (event) => {
    console.log("Starting daily Gmail Watch renewal...")
    const startTime = Date.now()

    try {
      // Get all users
      const usersSnapshot = await adminDb.collection("users").get()
      let renewedCount = 0
      let skippedCount = 0
      let errorCount = 0

      // Pub/Sub topic name (should match what's configured in GCP)
      const topicName = process.env.GMAIL_WATCH_TOPIC || "gmail-watch-notifications"
      const projectId = process.env.GCP_PROJECT_ID || process.env.GCLOUD_PROJECT || "argusos-4f13f"
      const fullTopicName = `projects/${projectId}/topics/${topicName}`

      console.log(`Using topic: ${fullTopicName}`)

      // Process each user
      for (const userDoc of usersSnapshot.docs) {
        const uid = userDoc.id

        try {
          // Get Gmail accounts for this user
          const integrationsDoc = await adminDb.collection("integrations").doc(uid).get()
          if (!integrationsDoc.exists) {
            continue
          }

          const integrationsData = integrationsDoc.data()
          const gmailAccounts = integrationsData?.gmail?.accounts || []

          if (gmailAccounts.length === 0) {
            continue
          }

          // Check and renew watch for each account
          for (const account of gmailAccounts) {
            const accountId = account.accountId || account.email
            if (!accountId) continue

            try {
              // Check current watch status
              const watchStatus = await getWatchStatus(uid, accountId)

              if (!watchStatus || !watchStatus.isActive) {
                // No active watch, start one
                console.log(`Starting new watch for user ${uid}, account ${accountId}`)
                await startGmailWatch(uid, accountId, fullTopicName)
                renewedCount++
              } else if (watchStatus.expiresAt) {
                // Check if expiring soon (< 24 hours)
                const expirationDate = new Date(watchStatus.expiresAt)
                const hoursUntilExpiration =
                  (expirationDate.getTime() - Date.now()) / (1000 * 60 * 60)

                if (hoursUntilExpiration < 24) {
                  // Renew watch
                  console.log(
                    `Renewing watch for user ${uid}, account ${accountId} (expires in ${hoursUntilExpiration.toFixed(1)}h)`
                  )
                  await startGmailWatch(uid, accountId, fullTopicName)
                  renewedCount++
                } else {
                  // Watch still valid, skip
                  skippedCount++
                  console.log(
                    `Watch still valid for user ${uid}, account ${accountId} (expires in ${hoursUntilExpiration.toFixed(1)}h)`
                  )
                }
              } else {
                // No expiration date, renew to be safe
                console.log(`Renewing watch for user ${uid}, account ${accountId} (no expiration date)`)
                await startGmailWatch(uid, accountId, fullTopicName)
                renewedCount++
              }
            } catch (error: any) {
              errorCount++
              console.error(
                `✗ Error renewing watch for user ${uid}, account ${accountId}:`,
                error.message
              )
            }
          }
        } catch (error: any) {
          console.error(`✗ Error processing user ${uid}:`, error.message)
          // Continue to next user
        }
      }

      const duration = Date.now() - startTime
      console.log(
        `Daily Gmail Watch renewal completed: ${renewedCount} renewed, ${skippedCount} skipped, ${errorCount} errors, ${duration}ms`
      )
    } catch (error: any) {
      console.error("Fatal error in daily Gmail Watch renewal:", error)
      throw error
    }
  }
)
