# How Drafts Work - Storage & Flow

## Overview

Drafts are stored directly on the **thread document** in Firestore. They're generated automatically when an email is important and needs a reply, and persist until you send a reply or regenerate them.

## Storage Location

**Firestore Path:** `emailThreads/{uid}/threads/{threadId}`

The draft is stored as part of the thread document itself, not in a separate collection.

## Data Structure

```typescript
{
  // ... other thread fields ...
  
  draftReply: {
    subject: string,        // e.g., "Re: Meeting tomorrow"
    text: string,          // The draft body text
    tone: string,          // "concise" | "warm" | "assertive" | "formal"
    generatedAt: Timestamp, // When the draft was created
    model: string          // "gpt-4o-mini"
  },
  
  draftState: "READY" | "FAILED" | "NONE",
  draftError?: string      // Error message if generation failed
}
```

## Generation Flow

### 1. **Automatic Generation (During AI Pipeline)**

When a new email is ingested:

```
Email arrives → Gmail Watch → Webhook → Ingest → AI Pipeline
                                                      ↓
                                    ┌────────────────┴────────────────┐
                                    │                                 │
                              Classify Thread                   Summarize & Extract
                                    │                                 │
                                    └────────────────┬────────────────┘
                                                     ↓
                                    Check: importanceScore >= 0.7 AND status === "NEEDS_REPLY"
                                                     ↓
                                              YES → Generate Draft
                                                     ↓
                                    Store draftReply on thread document
```

**Code Location:** `lib/ai/pipeline.ts` → `runAIPipeline()`

**Conditions for auto-generation:**
- `importanceScore >= threshold` (default: 0.7, configurable in user preferences)
- `status === "NEEDS_REPLY"`
- Thread has inbound messages

### 2. **Manual Regeneration**

When you click "Regenerate" or change tone:

```
User clicks Regenerate → API call to /api/drafts/regenerate
                                    ↓
                    Fetch thread + messages from Firestore
                                    ↓
                    Call generateDraft() with selected tone
                                    ↓
                    Update thread document with new draftReply
                                    ↓
                    UI updates via Firestore listener (real-time)
```

**Code Location:** `app/api/drafts/regenerate/route.ts`

## Persistence

- **Drafts persist** until:
  - You regenerate them (overwrites old draft)
  - You manually delete them (future feature)
  - Thread is deleted

- **Drafts are NOT sent automatically** - they're just stored for you to review, edit, and send manually

## User Style Profile

Drafts use your personal style profile stored in `users/{uid}/styleProfile`:

```typescript
{
  name: "Akshat",
  signoff: "Best,\nAkshat",
  toneHints: ["concise", "direct", "friendly-professional"],
  bannedPatterns: ["em dash"]
}
```

If no style profile exists, defaults are used.

## Real-time Updates

The UI uses Firestore listeners (`onSnapshot`) to update in real-time:

```typescript
// In ThreadViewer component
const threadRef = doc(db, "emailThreads", user.uid, "threads", threadId)
onSnapshot(threadRef, (snapshot) => {
  setThread({ id: snapshot.id, ...snapshot.data() })
})
```

So when a draft is generated or regenerated, the UI updates automatically without refresh.

## Example Flow

1. **New email arrives** → "Meeting request from John"
2. **AI Pipeline runs:**
   - Classifies: `importanceScore: 0.85`, `status: "NEEDS_REPLY"`
   - Generates draft automatically
   - Stores on thread: `draftReply: { subject: "Re: Meeting request", text: "...", tone: "concise" }`
3. **You open thread** → Draft panel shows immediately
4. **You change tone to "warm"** → Click Regenerate
5. **New draft generated** → Thread document updated with new `draftReply.text` and `draftReply.tone`
6. **UI updates automatically** → New draft appears instantly

## Security

- Drafts are stored per-user (isolated by `uid`)
- Firestore security rules ensure users can only read/write their own threads
- Drafts are never sent automatically - you control when to send

## Future Enhancements

- Draft history (store multiple drafts per thread)
- Draft templates
- Send draft directly via Gmail API
- Draft analytics (which tones work best)
