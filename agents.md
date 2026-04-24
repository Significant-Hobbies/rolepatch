# agents.md — resume-tailor

## Purpose
LaTeX resume tailoring tool — job scraping + AI diff + cover letter generation. Users paste a job URL, AI rewrites their resume to match, with a Monaco diff view for review.

## Stack
- Framework: Next.js 16 (App Router), React 19
- Language: TypeScript
- Styling: Tailwind CSS v4
- DB: Turso (libSQL)
- Auth: NextAuth v4 (Google OAuth, JWT sessions)
- Editor: CodeMirror (LaTeX editing) + Monaco (diff view)
- AI: Vercel AI SDK with OpenAI-compatible adapter (swappable `baseURL`)
- Scraping: Jina Reader (primary) + linkedom + Readability (fallback)
- Testing: None configured
- Deploy: Vercel
- Package manager: pnpm

## Repo structure
```
src/
  app/
    landing/           # Public landing page (/)
    dashboard/         # Main app — resumes + jobs list
    editor/[id]/       # LaTeX editor with preview (CodeMirror)
    tailor/[jobId]/    # Scrape JD → AI tailor → diff view (Monaco)
    cover-letter/      # Cover letter generation
    stash/             # Extra content pool for AI
    settings/          # AI provider config
    api/auth/          # NextAuth route
  components/          # React components (client-side)
  lib/
    actions/           # Server actions — all data mutations + AI calls
    auth.ts            # NextAuth config
    auth-utils.ts      # getCurrentUserId() helper
    db.ts              # Turso client
    ai.ts              # AI provider setup (swappable baseURL)
    local-storage.ts   # Guest mode data layer
    types.ts           # TypeScript interfaces
    saasmaker.ts       # SaaS Maker SDK init
  styles/globals.css
```

## Key commands
```bash
pnpm dev      # next dev
pnpm build    # next build
pnpm start    # next start
pnpm lint     # eslint
```

## Architecture notes
- **Server actions for all mutations** (`src/lib/actions/`). Each action calls `getCurrentUserId()` from `src/lib/auth-utils.ts`.
- **Guest vs signed-in**: full app works without auth via localStorage (`src/lib/local-storage.ts`). Signed-in users persist to Turso with `user_id` filtering.
- **AI provider**: single adapter in `src/lib/ai.ts` — supports free gateway, local AI, or BYOK via `baseURL` swap.
- **Scraping**: Jina Reader is primary; `linkedom` + `@mozilla/readability` as fallback.
- **SaaS Maker**: feedback widget + analytics integrated. Config in `.saasmaker.json`.
- **Data model**: `users`, `resumes`, `job_applications`, `tailored_resumes`, `cover_letters`, `stash_entries`.
- All env vars documented in `.env.example`.

## Active context
