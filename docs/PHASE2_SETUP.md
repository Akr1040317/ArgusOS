# Phase 2 Setup: Gmail Watch + Real-time Ingest

## Overview
Phase 2 enables real-time email ingestion using Gmail Watch API → Pub/Sub → Webhook.

## Prerequisites

1. **Gmail API enabled** (already done in Phase 1)
2. **Pub/Sub API enabled** in Google Cloud Console
3. **Pub/Sub topic created** for Gmail notifications

## Setup Steps

### 1. Enable Pub/Sub API

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/library)
2. Search for "Cloud Pub/Sub API"
3. Click "Enable"

### 2. Create Pub/Sub Topic

**Option A: Using gcloud CLI**
```bash
gcloud pubsub topics create gmail-watch-notifications --project=argusos-4f13f
```

**Option B: Using Google Cloud Console**
1. Go to [Pub/Sub Topics](https://console.cloud.google.com/cloudpubsub/topic/list)
2. Click "Create Topic"
3. Topic ID: `gmail-watch-notifications`
4. Click "Create"

### 3. Create Pub/Sub Subscription (for testing)

```bash
gcloud pubsub subscriptions create gmail-watch-subscription \
  --topic=gmail-watch-notifications \
  --project=argusos-4f13f
```

### 4. Configure Webhook Endpoint

The webhook endpoint is: `https://yourdomain.com/api/gmail/webhook`

For local development, you'll need to use a tunneling service like:
- ngrok: `ngrok http 3000`
- Cloudflare Tunnel
- Or deploy to Vercel for testing

### 5. Set Up Pub/Sub Push Subscription

1. Go to [Pub/Sub Subscriptions](https://console.cloud.google.com/cloudpubsub/subscription/list)
2. Create a new subscription or edit existing
3. Set delivery type to "Push"
4. Endpoint URL: `https://yourdomain.com/api/gmail/webhook`
5. Save

### 6. Grant Permissions

The Pub/Sub service account needs permission to publish to the topic:
- Service account: `service-{PROJECT_NUMBER}@gcp-sa-pubsub.iam.gserviceaccount.com`
- Role: Pub/Sub Publisher

## How It Works

1. **User connects Gmail** → OAuth flow completes
2. **Initial sync** → Fetches last 7 days of emails
3. **Start Watch** → Calls Gmail Watch API with Pub/Sub topic
4. **Gmail sends notifications** → Pub/Sub receives messages
5. **Webhook processes** → Ingests new emails to Firestore
6. **UI updates** → Firestore listeners show new emails in real-time

## Testing

1. Connect Gmail account
2. Do initial sync
3. Start watch (click "Watch" button in Settings)
4. Send yourself a test email
5. Email should appear in inbox within 1-2 minutes

## Watch Expiration

Gmail Watch expires after 7 days. You'll need to:
- Auto-renew watch before expiration (implement in Phase 6)
- Or manually restart watch from Settings

## Troubleshooting

- **Watch fails**: Check Pub/Sub topic exists and permissions are correct
- **Webhook not receiving**: Verify endpoint URL is accessible and Pub/Sub subscription is configured
- **Emails not appearing**: Check webhook logs and Firestore for errors
