# Build Phases (Private Full Feature Set)

## Phase 0 — Repo + Auth + Premium Shell
Deliver:
- Next.js App Router + TS + Tailwind + shadcn/ui
- Dark theme tokens (blue/purple/pink)
- Sidebar tabs + top bar
- Firebase Auth (Google sign-in)
- Firestore admin wiring for server routes
- Only allow your UID (hard-coded allowlist in env)

Definition of Done:
- Login works
- Dashboard shell renders
- Settings page shows your profile + "Run agent now" button (stub)

---

## Phase 1 — Gmail Integration + Inbox UI (3-pane)
Deliver:
- Gmail OAuth connect
- Initial sync:
  - threads list (last 7 days or 500 threads)
  - thread metadata and message snippets
- Inbox:
  - virtualized thread list
  - thread viewer with message bodies (text only ok)
  - splits sidebar stubbed (All only for now)

Definition of Done:
- Inbox loads and you can open threads reliably

---

## Phase 2 — Gmail Watch + Event-driven ingest (real-time)
Deliver:
- Gmail watch -> Pub/Sub -> webhook function
- Idempotent ingest:
  - dedupe historyId/messageId
  - upsert thread and messages
- Update UI live via Firestore listeners

Definition of Done:
- New incoming email appears in Inbox within ~1–2 minutes without manual refresh

---

## Phase 3 — AI Pipeline v1 (Classify + Summarize + Extract)
Deliver:
- On every ingested thread update:
  - classifyThread (JSON)
  - summarizeThread (bullets + ask + open loops)
  - extractActions (JSON tasks/deadlines)
- Store fields on thread doc
- UI shows:
  - chips for status + split
  - priority badge
  - summary panel

Definition of Done:
- New emails get categorized and summarized automatically

---

## Phase 4 — Instant Draft Replies for Important Needs Reply
Deliver:
- If importanceScore >= threshold AND status == NEEDS_REPLY:
  - generateDraft immediately and store
- Draft panel in UI:
  - shows draft instantly
  - regenerate
  - tone switch (concise/warm/assertive/formal)
  - copy button

Definition of Done:
- Important inbound emails always have a waiting draft by the time you open them (or show failure + retry)

---

## Phase 5 — Calendar Sync + Prep Packs + Linking to Threads
Deliver:
- Google Calendar connect (same OAuth)
- Sync now -> +14 days on hourly job and on-demand
- Event detail panel shows:
  - prep pack (AI-generated for next 24h)
  - related threads (heuristics: attendee email overlap + keywords)
- "Draft follow-up after meeting" button produces an email template draft stored in event doc

Definition of Done:
- Calendar renders; upcoming events have prep packs; related threads appear

---

## Phase 6 — Hourly Agent + Digests + Overdue detection
Deliver:
- Cloud Scheduler triggers hourly function
- Computes:
  - new important emails since last digest
  - needs reply overdue by P0/P1/P2 thresholds
  - follow-ups due (outbound no response after 72h)
  - next meetings + prep gaps
- Stores digest in Firestore
- Command Center shows attention banners

Definition of Done:
- Digests update automatically and surface overdue items

---

## Phase 7 — Chat Tab (RAG-lite, then embeddings upgrade)
Deliver:
- Chat sessions stored in Firestore
- Retrieval v1:
  - pull last N important threads + recent events + keyword match
- Chat prompt returns:
  - answer + actions + sources
- UI shows clickable sources

Optional upgrade:
- embeddings + vector search (later)

Definition of Done:
- "What did I miss today?" returns accurate answer with links

---

## Phase 8 — Keyboard-first polish (Command palette + shortcuts)
Deliver:
- cmdk command palette
- global shortcuts + inbox J/K navigation
- shortcut overlay `?`
- focus management so keyboard feels Superhuman-like

Definition of Done:
- can process inbox without mouse
