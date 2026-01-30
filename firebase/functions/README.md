# Firebase Functions - Scheduled Tasks

This directory contains Firebase Functions Gen2 scheduled tasks for ArgusOS automated agent behaviors.

## Functions

### 1. `hourlyDigest`
- **Schedule**: Every hour
- **Purpose**: Computes and stores digests for all users
- **What it does**:
  - Finds new important emails since last digest
  - Identifies overdue replies (by P0/P1/P2 thresholds)
  - Finds follow-ups due (outbound no response after 72h)
  - Lists upcoming meetings and prep gaps
  - Stores digest in `digests/{uid}/runs/{digestId}`

### 2. `hourlyCalendarSync`
- **Schedule**: Every hour
- **Purpose**: Syncs Google Calendar events for all users
- **What it does**:
  - Syncs events from now → +14 days
  - Auto-generates prep packs for events in next 24 hours
  - Updates events in `calendarEvents/{uid}/events/{eventId}`

### 3. `dailyGmailWatchRenewal`
- **Schedule**: Daily at 2 AM PST
- **Purpose**: Renews Gmail Watch subscriptions (expire after 7 days)
- **What it does**:
  - Checks watch expiration for all Gmail accounts
  - Renews watches expiring within 24 hours
  - Starts new watches for accounts without active watches

## Setup

### 1. Install Dependencies

```bash
cd firebase/functions
npm install
```

### 2. Environment Variables

Set these in Firebase Functions environment (or `.env` for local testing):

```bash
# Required
OPENAI_API_KEY=sk-...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=https://yourdomain.com/api/integrations/google/callback

# Optional (auto-detected in Functions)
GCP_PROJECT_ID=argusos-4f13f
GMAIL_WATCH_TOPIC=gmail-watch-notifications
```

**To set environment variables for Firebase Functions Gen2:**

```bash
# Set secrets (recommended for sensitive data like API keys)
firebase functions:secrets:set OPENAI_API_KEY
# Then paste your API key when prompted

firebase functions:secrets:set GOOGLE_CLIENT_ID
firebase functions:secrets:set GOOGLE_CLIENT_SECRET

# Or set as environment variables during deployment
firebase deploy --only functions --set-env-vars OPENAI_API_KEY=sk-...,GOOGLE_CLIENT_ID=...,GOOGLE_CLIENT_SECRET=...
```

**Note:** After setting secrets, you need to update the function definitions to access them. For now, you can also set them in the Firebase Console under Functions → Configuration → Environment Variables.

Or use Secret Manager (recommended for production):

```bash
# Store secrets in Google Secret Manager
gcloud secrets create openai-api-key --data-file=- <<< "sk-..."
gcloud secrets create google-client-id --data-file=- <<< "..."
gcloud secrets create google-client-secret --data-file=- <<< "..."

# Grant Functions access
gcloud secrets add-iam-policy-binding openai-api-key \
  --member="serviceAccount:PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### 3. Build

```bash
npm run build
```

### 4. Deploy

```bash
# Deploy all functions
firebase deploy --only functions

# Deploy specific function
firebase deploy --only functions:hourlyDigest
```

## Local Testing

```bash
# Start emulator
npm run serve

# Or use Firebase emulator suite
firebase emulators:start --only functions
```

## Monitoring

- **Cloud Logging**: View logs in GCP Console → Cloud Logging
- **Cloud Scheduler**: View scheduled jobs in GCP Console → Cloud Scheduler
- **Function Metrics**: View in Firebase Console → Functions

## Troubleshooting

### Functions not triggering
- Check Cloud Scheduler jobs are created and enabled
- Verify timezone is correct (`America/Los_Angeles`)
- Check function logs for errors

### Authentication errors
- Ensure Google OAuth credentials are set correctly
- Verify tokens are stored in Firestore `integrations/{uid}/tokenRefs`

### Timeout errors
- Increase `timeoutSeconds` in function config
- Consider processing users in batches
- Check for rate limiting from Google APIs

## Cost Considerations

- **Hourly functions**: ~720 invocations/month per function
- **Memory**: 512MiB per function
- **Timeout**: 9 minutes max
- **Estimated cost**: ~$5-10/month for all three functions (depends on execution time)
