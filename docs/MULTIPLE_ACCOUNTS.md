# Multiple Gmail Accounts - How It Works

## Overview

ArgusOS supports multiple Gmail accounts per user. Each account can be connected, synced, and watched independently.

## Architecture

### Shared Pub/Sub Topic
- **One topic for all accounts**: `gmail-watch-notifications`
- All Gmail accounts push notifications to the same topic
- The webhook identifies which account sent the email from the `emailAddress` field

### Per-Account Watch
- Each account has its own Gmail Watch subscription
- Each watch is independent and expires after 7 days
- You can start/stop watch for each account individually

### Account Identification
- Each account is stored with its email as `accountId`
- Lookup collection (`gmailAccountLookup`) maps `accountId → uid`
- Webhook uses `emailAddress` from Pub/Sub message to find the account

## How It Works

1. **User connects Account 1** (`akshra0317@gmail.com`)
   - OAuth flow completes
   - Tokens stored in `integrations/{uid}/tokenRefs/gmail/{accountId}`
   - Account added to `integrations/{uid}/gmail/accounts[]`
   - Lookup created: `gmailAccountLookup/{accountId} → {uid}`

2. **User connects Account 2** (`arastogi@hivespelling.com`)
   - Same process, stored separately
   - Both accounts visible in Settings

3. **User starts Watch for Account 1**
   - Calls Gmail Watch API with shared topic: `projects/argusos-485818/topics/gmail-watch-notifications`
   - Gmail starts sending notifications to Pub/Sub
   - Watch state stored: `integrations/{uid}/gmail/watch/{accountId}`

4. **New email arrives in Account 1**
   - Gmail sends notification to Pub/Sub topic
   - Pub/Sub pushes to webhook: `/api/gmail/webhook`
   - Webhook receives: `{ emailAddress: "akshra0317@gmail.com", historyId: "..." }`
   - Webhook looks up UID: `gmailAccountLookup/akshra0317@gmail.com → {uid}`
   - Processes email and stores in `emailThreads/{uid}/threads/{threadId}`
   - UI updates automatically via Firestore listeners

5. **New email arrives in Account 2**
   - Same process, but `emailAddress` is different
   - Webhook identifies it's for Account 2
   - Stores in same Firestore structure (all accounts share the same `emailThreads/{uid}` collection)

## Data Structure

```
integrations/{uid}
  gmail:
    accounts: [
      { accountId: "akshra0317@gmail.com", email: "...", status: "connected" },
      { accountId: "arastogi@hivespelling.com", email: "...", status: "connected" },
      { accountId: "akshatrdev@gmail.com", email: "...", status: "connected" }
    ]
    watch: {
      "akshra0317@gmail.com": { isActive: true, historyId: "...", expiresAt: "..." },
      "arastogi@hivespelling.com": { isActive: true, historyId: "...", expiresAt: "..." }
      // akshatrdev@gmail.com doesn't have watch started yet
    }
  tokenRefs:
    gmail: {
      "akshra0317@gmail.com": { accessToken: "...", refreshToken: "..." },
      "arastogi@hivespelling.com": { accessToken: "...", refreshToken: "..." },
      "akshatrdev@gmail.com": { accessToken: "...", refreshToken: "..." }
    }

gmailAccountLookup/{accountId}
  "akshra0317@gmail.com": { uid: "...", accountId: "akshra0317@gmail.com" }
  "arastogi@hivespelling.com": { uid: "...", accountId: "arastogi@hivespelling.com" }
  "akshatrdev@gmail.com": { uid: "...", accountId: "akshatrdev@gmail.com" }

emailThreads/{uid}/threads/{threadId}
  accountId: "akshra0317@gmail.com"  // Identifies which account this thread belongs to
  // ... thread data
```

## UI Behavior

- **Inbox shows all threads** from all connected accounts
- **Threads are identified** by `accountId` field (can filter by account later)
- **Each account can be synced/watched independently**
- **Settings shows all accounts** with individual controls

## Benefits

1. **Unified inbox** - See all emails from all accounts in one place
2. **Independent control** - Sync/watch each account separately
3. **Shared AI processing** - All accounts benefit from AI classification
4. **Single webhook** - One endpoint handles all accounts

## Future Enhancements

- Filter inbox by account
- Account-specific splits/filters
- Per-account preferences
- Account switching in inbox
