# Firestore Security Rules Setup

## Deploy Rules

You need to deploy the Firestore security rules to Firebase:

```bash
# Install Firebase CLI if not already installed
npm install -g firebase-tools

# Login to Firebase
firebase login

# Deploy rules
firebase deploy --only firestore:rules
```

Or use the npm script:
```bash
npm run firebase:deploy:rules
```

## What the Rules Do

The security rules allow:
- ✅ Authenticated users to read/write their own data
- ✅ Users can access their own email threads, calendar events, digests, etc.
- ✅ Webhook can read `gmailAccountLookup` (for account identification)
- ❌ Users cannot access other users' data
- ❌ Users cannot write to audit logs or digests (server-side only)

## Testing

After deploying rules:
1. Refresh your browser
2. Go to Inbox
3. Threads should load without permission errors

## Troubleshooting

If you still get permission errors:
1. Check you're logged in
2. Verify rules are deployed: Check Firebase Console → Firestore → Rules
3. Check browser console for specific error messages
