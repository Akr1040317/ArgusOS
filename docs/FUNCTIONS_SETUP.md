# Firebase Functions Setup - Automated Agent

## Overview

This document describes the Firebase Functions Gen2 setup for automated, scheduled agent behaviors in ArgusOS.

## What Was Implemented

### ✅ Three Scheduled Functions

1. **`hourlyDigest`** - Runs every hour
   - Computes digests for all users
   - Finds new important emails, overdue replies, follow-ups, upcoming meetings
   - Stores results in `digests/{uid}/runs/{digestId}`

2. **`hourlyCalendarSync`** - Runs every hour
   - Syncs Google Calendar events for all users (now → +14 days)
   - Auto-generates prep packs for events in next 24 hours
   - Updates `calendarEvents/{uid}/events/{eventId}`

3. **`dailyGmailWatchRenewal`** - Runs daily at 2 AM PST
   - Renews Gmail Watch subscriptions (expire after 7 days)
   - Checks expiration and renews watches expiring within 24 hours
   - Ensures continuous email monitoring

### ✅ Shared Library Code

All necessary code from `lib/` has been copied to `firebase/functions/src/lib/` with adjusted imports:
- `lib/firebase/admin.ts` - Firebase Admin SDK initialization
- `lib/digest/compute.ts` - Digest computation logic
- `lib/calendar/sync.ts` - Calendar sync logic
- `lib/calendar/client.ts` - Google Calendar API client
- `lib/calendar/tokenStore.ts` - Calendar token management
- `lib/calendar/relatedThreads.ts` - Thread-event linking
- `lib/gmail/watch.ts` - Gmail Watch management
- `lib/gmail/client.ts` - Gmail API client
- `lib/gmail/tokenStore.ts` - Gmail token management
- `lib/ai/prepPack.ts` - Prep pack generation
- `lib/ai/client.ts` - OpenAI client

## Deployment Steps

### 1. Install Dependencies

```bash
cd firebase/functions
npm install
```

### 2. Set Environment Variables

**Option A: Firebase Functions Config (Simple)**

```bash
firebase functions:config:set \
  openai.api_key="sk-..." \
  google.client_id="..." \
  google.client_secret="..." \
  google.redirect_uri="https://yourdomain.com/api/integrations/google/callback"
```

**Option B: Secret Manager (Recommended for Production)**

```bash
# Store secrets
gcloud secrets create openai-api-key --data-file=- <<< "sk-..."
gcloud secrets create google-client-id --data-file=- <<< "..."
gcloud secrets create google-client-secret --data-file=- <<< "..."

# Grant Functions access
PROJECT_NUMBER=$(gcloud projects describe argusos-4f13f --format="value(projectNumber)")
gcloud secrets add-iam-policy-binding openai-api-key \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

Then update `firebase/functions/src/index.ts` to read from Secret Manager (requires additional code).

### 3. Build Functions

```bash
cd firebase/functions
npm run build
```

### 4. Deploy Functions

```bash
# From project root
firebase deploy --only functions
```

This will:
- Deploy all three scheduled functions
- Create Cloud Scheduler jobs automatically
- Set up necessary IAM permissions

### 5. Verify Deployment

1. **Check Functions**: Firebase Console → Functions
2. **Check Scheduler**: GCP Console → Cloud Scheduler
   - Should see 3 jobs: `hourly-digest`, `hourly-calendar-sync`, `daily-gmail-watch-renewal`
3. **Check Logs**: GCP Console → Cloud Logging
   - Filter by function name to see execution logs

## Testing

### Manual Trigger (for testing)

```bash
# Trigger hourly digest manually
gcloud scheduler jobs run hourly-digest --location=us-central1

# Trigger calendar sync manually
gcloud scheduler jobs run hourly-calendar-sync --location=us-central1

# Trigger watch renewal manually
gcloud scheduler jobs run daily-gmail-watch-renewal --location=us-central1
```

### Local Testing (optional)

```bash
cd firebase/functions
npm run serve
```

Note: Scheduled functions can't be fully tested locally, but you can test the underlying logic.

## Monitoring

### Cloud Logging

View function execution logs:
```bash
gcloud functions logs read hourlyDigest --limit=50
```

Or in GCP Console: Cloud Logging → Filter by function name

### Metrics

- **Invocations**: Number of times functions run
- **Execution Time**: How long each execution takes
- **Errors**: Any failures during execution
- **Memory Usage**: Peak memory consumption

View in Firebase Console → Functions → Metrics

## Troubleshooting

### Functions Not Running

1. **Check Cloud Scheduler**:
   ```bash
   gcloud scheduler jobs list --location=us-central1
   ```
   Ensure jobs are enabled and schedule is correct

2. **Check Function Logs**:
   ```bash
   gcloud functions logs read hourlyDigest --limit=10
   ```

3. **Verify Permissions**:
   - Functions need Firestore read/write access
   - Functions need access to Google APIs (OAuth tokens)
   - Functions need OpenAI API key

### Authentication Errors

- Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set
- Check that OAuth tokens are stored in Firestore `integrations/{uid}/tokenRefs`
- Ensure tokens haven't expired (functions auto-refresh)

### Timeout Errors

- Increase `timeoutSeconds` in function config (max 540s for Gen2)
- Consider processing users in batches
- Check for rate limiting from Google APIs

## Cost Estimation

- **Invocations**: 
  - Hourly functions: ~720/month each = 1,440/month total
  - Daily function: ~30/month
  - Total: ~1,470 invocations/month

- **Execution Time**: 
  - Digest: ~30-60s per user
  - Calendar Sync: ~10-30s per account
  - Watch Renewal: ~5-10s per account

- **Estimated Cost**: $5-15/month (depends on number of users and execution time)

## Next Steps

1. ✅ Deploy functions
2. ✅ Verify Cloud Scheduler jobs are created
3. ✅ Monitor first few executions
4. ✅ Verify digests are being generated
5. ✅ Verify calendar sync is working
6. ✅ Verify Gmail Watch renewals are happening

## Architecture

```
Cloud Scheduler (hourly)
    ↓
hourlyDigest Function
    ↓
computeDigest() for each user
    ↓
Store in digests/{uid}/runs/{digestId}

Cloud Scheduler (hourly)
    ↓
hourlyCalendarSync Function
    ↓
syncCalendarEvents() for each account
    ↓
Update calendarEvents/{uid}/events/{eventId}

Cloud Scheduler (daily 2 AM)
    ↓
dailyGmailWatchRenewal Function
    ↓
startGmailWatch() for expiring accounts
    ↓
Update integrations/{uid}/gmail/watch/{accountId}
```

## Files Created

- `firebase/functions/package.json` - Dependencies
- `firebase/functions/tsconfig.json` - TypeScript config
- `firebase/functions/src/index.ts` - Main functions file
- `firebase/functions/src/lib/` - Shared library code
- `firebase/functions/README.md` - Function documentation
- `firebase/functions/.gitignore` - Git ignore rules
