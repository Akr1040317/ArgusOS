# Firebase Admin Setup

To use server-side features (like Gmail sync), you need to set up Firebase Admin SDK.

## Option 1: Service Account (Recommended)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `argusos-4f13f`
3. Go to **Project Settings** (gear icon) → **Service Accounts**
4. Click **Generate New Private Key**
5. Download the JSON file
6. Extract these values from the JSON:
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `client_email` → `FIREBASE_CLIENT_EMAIL`
   - `private_key` → `FIREBASE_PRIVATE_KEY` (keep the `\n` characters)

7. Add to `.env.local`:
```env
FIREBASE_PROJECT_ID=argusos-4f13f
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@argusos-4f13f.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

**Important**: Wrap the private key in quotes and keep the `\n` characters.

## Option 2: Application Default Credentials (For GCP)

If you're running on Google Cloud Platform, you can use Application Default Credentials:

1. Install gcloud CLI
2. Run: `gcloud auth application-default login`
3. Set: `GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json`

## Quick Test

After setting up, restart your dev server and try connecting Gmail again.
