# Fix: Create Pub/Sub Topic in Correct Project

The topic needs to be created in project `argusos-485818` (not `argusos-4f13f`).

## Run this command:

```bash
gcloud pubsub topics create gmail-watch-notifications --project=argusos-485818
```

## Then create the subscription:

```bash
gcloud pubsub subscriptions create gmail-watch-subscription \
  --topic=gmail-watch-notifications \
  --push-endpoint=https://lilian-huntable-elijah.ngrok-free.dev/api/gmail/webhook \
  --project=argusos-485818
```

## Grant Gmail permission:

```bash
gcloud pubsub topics add-iam-policy-binding gmail-watch-notifications \
  --member="serviceAccount:gmail-api-push@system.gserviceaccount.com" \
  --role="roles/pubsub.publisher" \
  --project=argusos-485818
```

## Project IDs Explained:

- **Firebase Project**: `argusos-4f13f` (for Firestore, Auth, etc.)
- **Google Cloud Project**: `argusos-485818` (for Pub/Sub, GCP services)
- These can be different projects, but for simplicity, you might want to use the same project

## Alternative: Use Same Project

If you want to use `argusos-4f13f` for everything, update `.env.local`:
```
GCP_PROJECT_ID=argusos-4f13f
```

Then create topic in that project instead.
