# ArgusOS (Private) — Email + Calendar Agent Dashboard (Full Spec)

## 0) Product summary
A private, single-user web app that unifies Gmail + Google Calendar into a Superhuman-like dashboard with:
- real-time (or near real-time) inbox triage
- thread summaries + extracted asks + tasks
- instant draft replies for important inbound emails (precomputed)
- calendar event intelligence + meeting prep packs linked to threads
- hourly digests + "missed reply" alerts
- Chat tab (ChatGPT-style) to query your inbox and calendar
- command palette + keyboard-first navigation
- premium dark UI (blue/purple/pink accents)

Private constraints:
- Only your Firebase Auth account is allowed.
- No onboarding flows.
- No billing.
- No team/multi-user.
- Still secure token storage and audit logs.

Hosting: Vercel (Next.js)
Backend: Firebase Functions Gen2 + Cloud Scheduler + Pub/Sub (Gmail watch)
Data: Firestore
Auth: Firebase Auth (Google sign-in)
AI: OpenAI (configurable via env vars)

Non-goals v1:
- Auto-sending any outbound without explicit click
- LinkedIn/Discord/Slack
- Outlook/Microsoft (later)
- Mobile app (later)

---

## 1) Core tabs and UX (premium)

### 1.1 Global Shell
- Left Sidebar:
  - Command Center
  - Inbox
  - Calendar
  - Tasks
  - Chat
  - Digests
  - Settings
- Top bar:
  - Search box
  - "Run agent now" button (manual trigger)
  - User avatar (simple sign-out)
- Command palette: Cmd+K
- Shortcut overlay: `?`

### 1.2 Command Center (Home)
Cards:
1) Top Priorities (P0/P1) - max 5
2) Needs Reply (count + top 5)
3) Waiting on Them (follow-ups due)
4) Upcoming Meetings (next 24h, prep status)
5) Latest Digest (most recent hourly run)

### 1.3 Inbox (3-pane Superhuman layout)
Left:
- Splits:
  - VIP
  - Needs Reply
  - Waiting on Them
  - Finance
  - Hiring
  - Startup
  - Newsletters
  - Receipts
  - FYI
  - All

Center:
- Virtualized thread list sorted by:
  - priority desc then lastMessageAt desc (default)
Thread row shows:
- sender + subject
- 1-line AI "what this is about"
- chips: status + split
- priority badge (P0/P1/P2)
- "draft ready" icon (if draftReply READY)

Right:
Thread detail with sub-tabs:
- Summary: bullet summary + "why important"
- Ask & Actions: extracted ask + tasks + deadlines
- Draft: precomputed draft + regenerate + tone switch + copy + (optional) send later
- Raw: full message list (for trust)

### 1.4 Calendar
- Week view + Day agenda toggle
- Event detail panel:
  - prep pack (context summary + open loops + suggested agenda)
  - related threads list
  - "draft follow-up after meeting" action (generates a draft email template)

### 1.5 Tasks
Derived tasks only:
- Reply tasks (inbound waiting)
- Follow-ups (outbound waiting)
- Commitments (promised actions)
Each task links to the source thread.

### 1.6 Digests
- Latest digest pinned
- History list (last 7 days)
- Each digest shows:
  - important new emails
  - needs reply overdue
  - follow-ups due
  - next meetings in 24h
- Buttons per item: open thread/event

### 1.7 Chat tab (prompt UI)
ChatGPT-like UI. You can ask:
- "What did I miss today?"
- "Summarize all VIP threads this week"
- "Draft replies for all P0 Needs Reply"
- "What meetings tomorrow need prep?"
Outputs must include:
- Answer (concise)
- Actions (buttons)
- Sources (thread/event links)

---

## 2) Agent behavior (always-on)

### 2.1 Event-driven (new email)
On new inbound email:
1) Fetch full thread context (last 15 messages or full, capped by tokens)
2) Normalize and store thread+messages
3) AI pipeline:
   - classifyThread -> split/status/priority/importanceScore/reasons
   - summarizeThread -> bullets + ask + open loops (or separate extraction)
   - extractActions -> tasks + deadlines
   - if important and Needs Reply: generateDraft -> store draftReply
4) Write audit log

Important: Draft generation happens immediately so it is waiting when you open the thread.

### 2.2 Hourly agent loop
Every hour:
- Scan inbox debt:
  - Needs Reply older than thresholds per priority
- Scan follow-up debt:
  - last outbound, no inbound for 72h (config)
- Update tasks/deadlines states
- Calendar sync (now->+14d) and prep pack generation for next 24h
- Compose digest and store it
- Write audit log

### 2.3 Notification policy (private v1)
In-app only:
- Digest tab updates
- "Attention" banner in Command Center if:
  - P0 overdue
  - meeting in < 60 minutes with no prep pack

(SMS/WhatsApp later)

---

## 3) AI requirements (high precision, deterministic outputs)

### 3.1 Models (configurable)
- Fast model: classification + extraction
- Main model: drafting + chat reasoning
- Optional embeddings later for semantic search

### 3.2 Strict JSON outputs
Classification and extraction prompts MUST return strict JSON and be validated server-side.
If invalid JSON, retry once with a "fix JSON" prompt.
If still invalid, mark step failed and continue.

### 3.3 Drafting rules
- No em dashes
- Default concise, professional
- Use your style profile:
  - signoff = "Best,\nAkshat"
  - tone hints = direct, friendly, no fluff
- If missing critical info, ask a question instead of guessing.

### 3.4 Explainability
Store "reasons" for importance and show in UI.

---

## 4) Security + privacy (single-user but real)
- Allowlist only your UID in Firestore rules and backend checks.
- Do not store raw OAuth tokens in Firestore.
- Store tokens in Google Secret Manager or encrypted blob store; Firestore stores references only.
- Sanitize email HTML if stored.
- Audit logs for:
  - webhook ingests
  - AI steps run
  - failures and retries
