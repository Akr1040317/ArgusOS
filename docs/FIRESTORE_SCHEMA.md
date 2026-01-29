# Firestore Schema (private single-user)

## users/{uid}
- createdAt
- preferences:
  - theme: "dark"
  - compactMode: boolean
  - importantThreshold: number (default 0.72)
  - overdueThresholds: { P0Hours, P1Hours, P2Hours }
  - followUpAfterHours: number (default 72)
- styleProfile:
  - name: "Akshat"
  - signoff: "Best,\nAkshat"
  - toneHints: ["concise","direct","friendly-professional"]
  - bannedPatterns: ["em dash"]

## integrations/{uid}
- gmail:
  - accounts: [{ accountId, email, status, connectedAt }]
  - watch: { isActive, historyId, expiresAt }
- gcal:
  - calendars: [{ calendarId, summary, primary }]
- tokenRefs:
  - gmail: { [accountId]: secretRef }
  - gcal: { [accountId]: secretRef }

## emailThreads/{uid}/threads/{threadId}
- provider: "gmail"
- accountId
- providerThreadId
- subject
- participants: [{name,email}]
- lastMessageAt
- lastInboundAt
- lastOutboundAt
- snippet
- status: "NEEDS_REPLY" | "WAITING" | "FYI"
- split: "VIP"|"FINANCE"|"HIRING"|"STARTUP"|"NEWSLETTERS"|"RECEIPTS"|"FYI"|"OTHER"
- priority: "P0"|"P1"|"P2"
- importanceScore: number
- importanceReasons: string[]   # for UI explainability
- summaryBullets: string[]
- extractedAsk: string
- openLoops: string[]
- deadlines: [{ label, dateISO, confidence }]
- tasks: [{ type, label, dueISO, status, confidence }]
- draftReply:
  - text
  - tone
  - generatedAt
  - model
  - confidence
- draftState: "READY"|"FAILED"|"NONE"
- draftError: string?
- links: { providerThreadUrl }
- aiVersion: number
- updatedAt

## emailThreads/{uid}/threads/{threadId}/messages/{messageId}
- providerMessageId
- direction: "INBOUND"|"OUTBOUND"
- from: {name,email}
- to: [{name,email}]
- cc: [{name,email}]
- dateISO
- snippet
- bodyText
- bodyHtmlSanitized (optional)
- attachments: [{ filename, mimeType, size, attachmentId }]

## calendarEvents/{uid}/events/{eventId}
- provider: "gcal"
- calendarId
- providerEventId
- title
- startISO
- endISO
- attendees: [{name,email}]
- location
- description
- relatedThreadIds: string[]
- prepPack:
  - contextSummary: string
  - openLoops: string[]
  - suggestedAgenda: string[]
  - generatedAt: timestamp
- updatedAt

## digests/{uid}/runs/{runId}
- runAt
- importantNew: [{ threadId, blurb }]
- needsReplyOverdue: [{ threadId, blurb }]
- followUpsDue: [{ threadId, blurb }]
- upcomingMeetings: [{ eventId, blurb }]
- prepGaps: [{ eventId, blurb }]
- fullText

## chatSessions/{uid}/sessions/{sessionId}
- createdAt
- title

## chatSessions/{uid}/sessions/{sessionId}/messages/{messageId}
- role: "user"|"assistant"
- content
- sources: [{ type:"thread"|"event", id, blurb }]

## auditLogs/{uid}/items/{logId}
- at
- type: "GMAIL_INGEST"|"AI_CLASSIFY"|"AI_SUMMARIZE"|"AI_EXTRACT"|"AI_DRAFT"|"HOURLY_RUN"|"GCAL_SYNC"
- targetId
- ok: boolean
- detail: string
- latencyMs: number
