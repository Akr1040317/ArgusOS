# Phase 2 Quick Setup Guide

## Step 1: Create Pub/Sub Topic ✅
```bash
gcloud pubsub topics create gmail-watch-notifications --project=argusos-4f13f
```

## Step 2: Create Pub/Sub Push Subscription

You need to create a subscription that pushes messages to your webhook endpoint.

### Option A: Using gcloud CLI

For local development with ngrok:
```bash
# Start ngrok in another terminal
ngrok http 3000

# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
# Then create subscription:
gcloud pubsub subscriptions create gmail-watch-subscription \
  --topic=gmail-watch-notifications \
  --push-endpoint=https://YOUR-NGROK-URL.ngrok.io/api/gmail/webhook \
  --project=argusos-4f13f
```

For production (Vercel):
```bash
gcloud pubsub subscriptions create gmail-watch-subscription \
  --topic=gmail-watch-notifications \
  --push-endpoint=https://yourdomain.com/api/gmail/webhook \
  --project=argusos-4f13f
```

### Option B: Using Google Cloud Console

1. Go to [Pub/Sub Subscriptions](https://console.cloud.google.com/cloudpubsub/subscription/list?project=argusos-4f13f)
2. Click "Create Subscription"
3. Subscription ID: `gmail-watch-subscription`
4. Topic: `gmail-watch-notifications`
5. Delivery type: **Push**
6. Endpoint URL: `https://yourdomain.com/api/gmail/webhook` (or ngrok URL for local)
7. Click "Create"

## Step 3: Grant Pub/Sub Permissions

The Gmail service account needs permission to publish to your topic:

```bash
# Get the Gmail service account email
# It's usually: gmail-api-push@system.gserviceaccount.com

# Grant publish permission
gcloud pubsub topics add-iam-policy-binding gmail-watch-notifications \
  --member="serviceAccount:gmail-api-push@system.gserviceaccount.com" \
  --role="roles/pubsub.publisher" \
  --project=argusos-4f13f
```

## Step 4: Test the Setup

1. **Connect Gmail** (if not already done)
   - Go to Settings → Connect Gmail Account

2. **Do Initial Sync**
   - Click "Sync" button for your account

3. **Start Watch**
   - Click "Watch" button for your account
   - This calls Gmail Watch API with your Pub/Sub topic

4. **Send Test Email**
   - Send yourself an email from another account
   - Check inbox - should appear within 1-2 minutes

## Troubleshooting

### Watch fails to start
- Check Pub/Sub topic exists: `gcloud pubsub topics list`
- Verify Gmail API is enabled
- Check service account has publish permissions

### Webhook not receiving messages
- Verify subscription endpoint URL is correct
- Check subscription exists: `gcloud pubsub subscriptions list`
- For local dev, ensure ngrok is running and URL is updated
- Check webhook logs in your server/terminal

### Emails not appearing
- Check webhook is receiving messages (server logs)
- Verify Firestore has new threads
- Check browser console for Firestore listener errors

## Local Development Setup

1. Install ngrok: `brew install ngrok` (Mac) or download from ngrok.com
2. Start ngrok: `ngrok http 3000`
3. Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)
4. Update Pub/Sub subscription endpoint to use ngrok URL
5. Restart your Next.js dev server
6. Test watch functionality

## Production Setup

1. Deploy to Vercel (or your hosting)
2. Get your production URL
3. Create/update Pub/Sub subscription with production webhook URL
4. Test watch functionality
