# ArgusOS

Private email and calendar agent dashboard with AI-powered triage, instant drafts, and meeting prep.

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Environment variables are already set up in `.env.local` with your Firebase configuration.

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

- `app/` - Next.js App Router pages
- `components/` - React components (shell, UI, feature components)
- `lib/` - Utilities, Firebase config, AI pipeline, etc.
- `docs/` - Documentation and specifications
- `PROMPTS/` - AI prompt templates

## Phases

See `docs/PHASES.md` for the complete implementation plan.

- **Phase 0**: Foundation + Landing + Auth + Premium Shell ✅
- **Phase 1**: Gmail Integration + Inbox UI
- **Phase 2**: Gmail Watch + Event-driven Ingest
- **Phase 3**: AI Pipeline (Classify + Summarize + Extract)
- **Phase 4**: Instant Draft Replies
- **Phase 5**: Calendar Sync + Prep Packs
- **Phase 6**: Hourly Agent + Digests
- **Phase 7**: Chat Tab
- **Phase 8**: Keyboard-first Polish

## Tech Stack

- **Frontend**: Next.js 14+ (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Firebase Functions Gen2, Cloud Scheduler, Pub/Sub
- **Database**: Firestore
- **Auth**: Firebase Auth (Email/Password + Google OAuth)
- **AI**: OpenAI (configurable via env)

## Security

- Firebase Auth handles user authentication
- All dashboard routes require authenticated users
- Multiple users can sign up and use the application
