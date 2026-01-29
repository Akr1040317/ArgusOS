# API Contracts (private)

Auth:
- All routes require Firebase auth token and allowlist UID.

## POST /api/integrations/google/connect
Starts OAuth flow or returns auth URL.

## POST /api/gmail/sync-initial
Body: { days?: number, maxThreads?: number }

## POST /api/gmail/webhook
Pub/Sub push endpoint (server-to-server). No user auth. Validate Pub/Sub JWT or secret.
Body: Pub/Sub message

## POST /api/agent/run-hourly
Body: { force?: boolean }
Runs hourly agent once.

## POST /api/thread/regenerate-draft
Body: { threadId: string, tone: "concise"|"warm"|"assertive"|"formal" }

## POST /api/chat/send
Body: { sessionId?: string, message: string }
Returns: { sessionId, assistantMessage, sources[] }
