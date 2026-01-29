# Phase 6 Setup: Hourly Agent + Digests

## Overview
Phase 6 implements an hourly digest agent that computes and stores summaries of:
- New important emails since last digest
- Overdue replies (by P0/P1/P2 thresholds)
- Follow-ups due (outbound no response after 72h)
- Upcoming meetings + prep gaps

## Implementation Status

✅ **Completed:**
- Digest computation logic (`lib/digest/compute.ts`)
- API endpoint for manual digest generation (`/api/digest/compute`)
- Command Center UI showing latest digest (`components/dashboard/CommandCenter.tsx`)
- Manual trigger button in Settings

⏳ **Pending:**
- Cloud Scheduler setup (for automatic hourly runs)
- Cloud Function (Gen2) for scheduled execution

## Manual Testing

You can manually trigger the digest agent:

1. **Via Settings:**
   - Go to Settings → Agent section
   - Click "Run agent now"
   - Check Dashboard to see the digest

2. **Via API:**
   ```bash
   curl -X POST https://yourdomain.com/api/digest/compute \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"uid": "YOUR_UID"}'
   ```

## Cloud Scheduler Setup (For Production)

To enable automatic hourly digests, you need to set up Cloud Scheduler:

### Option 1: Cloud Scheduler → HTTP Endpoint

1. **Create Cloud Scheduler Job:**
   ```bash
   gcloud scheduler jobs create http hourly-digest \
     --schedule="0 * * * *" \
     --uri="https://yourdomain.com/api/digest/compute" \
     --http-method=POST \
     --headers="Content-Type=application/json" \
     --message-body='{"uid":"ALL_USERS"}' \
     --project=argusos-4f13f
   ```

   Note: This requires a way to iterate over all users. See Option 2 for a better approach.

### Option 2: Cloud Function (Recommended)

Create a Cloud Function that:
1. Gets triggered by Cloud Scheduler
2. Iterates over all users
3. Calls digest computation for each user

**Function Code:**
```typescript
import { onSchedule } from "firebase-functions/v2/scheduler"
import { adminDb } from "./lib/firebase/admin"
import { computeDigest } from "./lib/digest/compute"

export const hourlyDigest = onSchedule(
  { schedule: "every 1 hours", timeZone: "America/Los_Angeles" },
  async (event) => {
    // Get all users
    const usersSnapshot = await adminDb.collection("users").get()
    
    for (const userDoc of usersSnapshot.docs) {
      const uid = userDoc.id
      try {
        const digest = await computeDigest(uid)
        await adminDb
          .collection("digests")
          .doc(uid)
          .collection("runs")
          .add(digest)
        console.log(`Digest generated for user ${uid}`)
      } catch (error) {
        console.error(`Error generating digest for user ${uid}:`, error)
      }
    }
  }
)
```

## Firestore Indexes

The digest computation requires these indexes:

```json
{
  "indexes": [
    {
      "collectionGroup": "threads",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "lastMessageAt", "order": "DESCENDING" },
        { "fieldPath": "importanceScore", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "runs",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "runAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

Add these to `firestore.indexes.json` and deploy:
```bash
firebase deploy --only firestore:indexes
```

## User Preferences

Users can customize thresholds in their preferences:

```typescript
preferences: {
  importantThreshold: 0.7,  // Default 0.7
  overdueThresholds: {
    P0Hours: 2,   // Default 2 hours
    P1Hours: 24,  // Default 24 hours
    P2Hours: 72   // Default 72 hours
  },
  followUpAfterHours: 72  // Default 72 hours
}
```

## Command Center UI

The Command Center (`/dashboard`) displays:
- **Attention Banner**: Shows urgent items (overdue replies, follow-ups, prep gaps)
- **New Important Emails**: Recent high-importance emails
- **Overdue Replies**: Threads that need reply and are past threshold
- **Follow-ups Due**: Outbound messages with no response after threshold
- **Upcoming Meetings**: Events in next 24 hours
- **Prep Gaps**: Meetings without prep packs

The UI updates in real-time as new digests are generated.
