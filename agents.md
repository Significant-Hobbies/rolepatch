# Resume Tailor — Agent Context

## What This Is

Web app for maintaining LaTeX resumes and generating job-tailored versions using AI. Users paste a job URL, AI rewrites their resume to match, and they review changes in a diff view. Also generates cover letters with company research.

## Architecture

- **Framework**: Next.js 16 + React 19 + TypeScript
- **Styling**: Tailwind CSS 4
- **Database**: Turso (libsql) — SQLite over HTTP
- **AI**: Vercel AI SDK with OpenAI-compatible adapter (swappable baseURL)
- **Auth**: NextAuth v4 with Google OAuth, JWT sessions
- **Editor**: CodeMirror (LaTeX editing), Monaco (diff view)
- **Scraping**: Jina Reader (primary), linkedom + Readability (fallback)
- **Deployment**: Vercel

## Key Patterns

- **Guest vs Signed-in**: Full app works without auth via localStorage (`src/lib/local-storage.ts`). Signed-in users persist to Turso with user_id filtering.
- **Server Actions**: All data mutations in `src/lib/actions/`. Each action checks `getCurrentUserId()` from `src/lib/auth-utils.ts`.
- **AI Provider**: Single adapter in `src/lib/ai.ts` — supports free gateway, local AI, or BYOK.
- **SaaS Maker**: Feedback widget + analytics tracking integrated. CLI: `saasmaker` (installed via asdf). Config in `.saasmaker.json`.

## Project Structure

```
src/
├── app/
│   ├── landing/           # Public landing page (/)
│   ├── dashboard/         # Main app — resumes + jobs list
│   ├── editor/[id]/       # LaTeX editor with preview
│   ├── tailor/[jobId]/    # Scrape JD → AI tailor → diff view
│   ├── cover-letter/      # Cover letter generation
│   ├── stash/             # Extra content pool for AI
│   ├── settings/          # AI provider config
│   └── api/auth/          # NextAuth route
├── components/            # React components (client-side)
├── lib/
│   ├── actions/           # Server actions (CRUD, AI calls, scraping)
│   ├── auth.ts            # NextAuth config
│   ├── auth-utils.ts      # getCurrentUserId() helper
│   ├── db.ts              # Turso client
│   ├── ai.ts              # AI provider setup
│   ├── local-storage.ts   # Guest mode data layer
│   ├── types.ts           # TypeScript interfaces
│   └── saasmaker.ts       # SaaS Maker SDK init
└── styles/globals.css
```

## Data Model

| Table | Purpose |
|-------|---------|
| `users` | Auth accounts (email, name, image) |
| `resumes` | Master resumes (LaTeX source) |
| `job_applications` | Job tracking (url, company, role, JD, status) |
| `tailored_resumes` | AI-generated versions (linked to job + resume) |
| `cover_letters` | Generated letters + company research |
| `stash_entries` | Extra content pool (category, label, content) |

## Conventions

- pnpm for package management
- Server actions over API routes
- Minimal abstractions — inline logic preferred
- Dark mode supported throughout
- All env vars documented in `.env.example`

## SaaS Maker CLI

```bash
saasmaker status              # Project stats
saasmaker feedback list       # User feedback
saasmaker roadmap list        # Roadmap items
saasmaker analytics dashboard # Traffic analytics
saasmaker testimonials list   # User testimonials
```
