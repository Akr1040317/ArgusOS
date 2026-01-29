# Repo Structure (recommended)

app/
  login/page.tsx
  app/layout.tsx
  app/page.tsx                  # Command Center
  app/inbox/page.tsx
  app/inbox/[threadId]/page.tsx
  app/calendar/page.tsx
  app/tasks/page.tsx
  app/chat/page.tsx
  app/settings/page.tsx

components/
  shell/Sidebar.tsx
  shell/Topbar.tsx
  shell/CommandPalette.tsx
  shell/ShortcutOverlay.tsx

  inbox/ThreadList.tsx
  inbox/ThreadRow.tsx
  inbox/ThreadViewer.tsx
  inbox/AIPanel.tsx
  inbox/DraftPanel.tsx

  calendar/CalendarWeek.tsx
  calendar/EventDetail.tsx
  calendar/PrepPack.tsx

  chat/ChatWindow.tsx
  chat/SourceList.tsx

lib/
  firebase/client.ts
  firebase/admin.ts
  gmail/client.ts
  gcal/client.ts

  ai/client.ts
  ai/pipeline.ts
  ai/schemas.ts
  ai/prompts.ts

  security/allowlist.ts
  utils/sanitizeEmail.ts
  utils/date.ts
  utils/scoring.ts

firebase/
  functions/src/index.ts
  functions/src/gmailWebhook.ts
  functions/src/hourlyAgent.ts
  functions/src/calendarSync.ts
  functions/src/aiPipeline.ts
  functions/src/tokenStore.ts

PROMPTS/
  classify.json.md
  extract.json.md
  summarize.md
  draft.md
  chat.md

docs/
  PRIVATE_FULL_SPEC.md
  PHASES.md
  FIRESTORE_SCHEMA.md
  THEME.md
  SHORTCUTS.md
  API_CONTRACTS.md
  SECURITY_NOTES.md
