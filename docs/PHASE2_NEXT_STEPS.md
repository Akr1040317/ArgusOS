# Phase 2 Next Steps - Complete Watch Setup

## Your ngrok URL
`https://lilian-huntable-elijah.ngrok-free.dev`

## Step 1: Create Pub/Sub Subscription

Run this command in your terminal:

```bash
gcloud pubsub subscriptions create gmail-watch-subscription \
  --topic=gmail-watch-notifications \
  --push-endpoint=https://lilian-huntable-elijah.ngrok-free.dev/api/gmail/webhook \
  --project=argusos-4f13f
```

## Step 2: Grant Gmail Service Account Permission

Gmail needs permission to publish to your topic:

```bash
gcloud pubsub topics add-iam-policy-binding gmail-watch-notifications \
  --member="serviceAccount:gmail-api-push@system.gserviceaccount.com" \
  --role="roles/pubsub.publisher" \
  --project=argusos-4f13f
```

## Step 3: Test the Setup

1. **Make sure your Next.js dev server is running**: `npm run dev`
2. **Keep ngrok running** (don't close that terminal)
3. **Go to Settings** in your app
4. **Click "Watch"** button for your Gmail account
5. **Send yourself a test email** from another account
6. **Check inbox** - email should appear within 1-2 minutes automatically!

## Important Notes

- **Keep ngrok running** - if you restart ngrok, you'll get a new URL and need to update the subscription
- **ngrok URL changes** - Free ngrok URLs change each time you restart. For production, use a permanent URL (Vercel deployment)
- **Watch expires** - Gmail Watch expires after 7 days. Auto-renewal will be added in Phase 6

## Troubleshooting

- **Webhook not receiving**: Check ngrok web interface at http://127.0.0.1:4040 to see incoming requests
- **Watch fails**: Verify Pub/Sub topic exists and permissions are set
- **Emails not appearing**: Check server logs and ngrok web interface for errors
