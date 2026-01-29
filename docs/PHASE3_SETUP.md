# Phase 3: AI Pipeline Setup

Phase 3 implements automatic email classification, summarization, and action extraction using OpenAI.

## Prerequisites

- Phase 2 completed (Gmail Watch working)
- OpenAI API key

## Setup Steps

### 1. Install Dependencies

```bash
npm install
```

This will install the `openai` package added in Phase 3.

### 2. Configure OpenAI API Key

Add your OpenAI API key to `.env.local`:

```bash
OPENAI_API_KEY=sk-...
```

You can get an API key from: https://platform.openai.com/api-keys

### 3. Deploy (if needed)

The AI pipeline runs automatically on the server when threads are ingested. No additional deployment needed if you're running locally.

## How It Works

1. **Automatic Triggering**: When a new email thread is synced or ingested via webhook, the AI pipeline automatically runs.

2. **AI Pipeline Steps** (runs in parallel for speed):
   - **Classification**: Determines priority (P0/P1/P2), status (NEEDS_REPLY/WAITING/FYI), split category (VIP/FINANCE/etc.), and importance score
   - **Summarization**: Generates bullet points, extracts the "ask", and identifies open loops
   - **Extraction**: Extracts deadlines, tasks, and actionable items

3. **Results Stored**: All AI results are stored on the thread document in Firestore and update in real-time in the UI.

## UI Features

- **Thread List**: Shows priority badges (P0/P1/P2), status chips (NEEDS_REPLY/WAITING), and split categories
- **Thread Viewer**: Displays:
  - Summary bullets
  - Extracted "ask"
  - Open loops
  - Deadlines
  - Tasks with types
  - Importance reasons

## Testing

1. Send yourself an email (or wait for a new email to arrive)
2. The email should appear in the inbox
3. Within a few seconds, you should see:
   - Priority badge appear
   - Status chip appear
   - When you click the thread, the summary section should populate with AI-generated content

## Troubleshooting

- **No AI results appearing**: Check that `OPENAI_API_KEY` is set in `.env.local` and restart your dev server
- **AI errors in console**: Check your OpenAI API key is valid and you have credits
- **Slow processing**: The pipeline runs asynchronously and doesn't block email ingestion. Check server logs for errors.

## Cost Considerations

- Uses `gpt-4o-mini` model (fast and cost-effective)
- Processes only new threads (not re-processing existing ones)
- Token limits are set to keep costs low (~2000 tokens per thread)
