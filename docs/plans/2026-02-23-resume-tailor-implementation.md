# Resume Tailor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Next.js app for maintaining LaTeX resumes, tailoring them to job descriptions via AI, and generating cover letters with company research.

**Architecture:** Single Next.js app with server actions for DB/AI/scraping. CodeMirror for LaTeX editing, SwiftLaTeX WASM for client-side PDF compilation, Monaco diff for reviewing AI changes. Turso (libsql) for storage. Vercel AI SDK with OpenAI adapter + configurable baseURL for all AI providers.

**Tech Stack:** Next.js 15, pnpm, TypeScript, Turso (@libsql/client), Vercel AI SDK (ai + @ai-sdk/openai), CodeMirror 6, Monaco Editor, SwiftLaTeX WASM, linkedom, @mozilla/readability, Tailwind CSS

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `tailwind.config.ts`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `.env.local`
- Create: `.gitignore`

**Step 1: Initialize Next.js with pnpm**

Run:
```bash
cd /Users/sarthakagrawal/Desktop/resume-tailor
pnpm create next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --turbopack
```

Select defaults. This scaffolds the project.

**Step 2: Install core dependencies**

Run:
```bash
pnpm add @libsql/client ai @ai-sdk/openai uuid
pnpm add -D @types/uuid
```

**Step 3: Set up environment variables**

Create `.env.local`:
```bash
# Turso
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your-token

# AI Provider defaults
AI_BASE_URL=https://free-ai-gateway.sarthakagrawal927.workers.dev/v1
AI_API_KEY=your-gateway-key
AI_MODEL=auto
```

**Step 4: Add to .gitignore**

Append to `.gitignore`:
```
.env.local
```

**Step 5: Verify dev server runs**

Run: `pnpm dev`
Expected: Next.js dev server starts at localhost:3000

**Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml tsconfig.json next.config.ts tailwind.config.ts postcss.config.mjs src/ .gitignore .eslintrc.json
git commit -m "feat: scaffold Next.js project with core dependencies"
```

---

## Task 2: Database Schema & Client

**Files:**
- Create: `src/lib/db.ts`
- Create: `src/lib/db-schema.sql`
- Create: `src/lib/db-migrate.ts`

**Step 1: Write the schema file**

Create `src/lib/db-schema.sql`:
```sql
CREATE TABLE IF NOT EXISTS resumes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  latex_source TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS job_applications (
  id TEXT PRIMARY KEY,
  resume_id TEXT REFERENCES resumes(id),
  url TEXT NOT NULL DEFAULT '',
  company TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT '',
  jd_raw TEXT NOT NULL DEFAULT '',
  jd_text TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS tailored_resumes (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES job_applications(id),
  resume_id TEXT NOT NULL REFERENCES resumes(id),
  latex_source TEXT NOT NULL DEFAULT '',
  accepted INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS cover_letters (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES job_applications(id),
  resume_id TEXT NOT NULL REFERENCES resumes(id),
  content TEXT NOT NULL DEFAULT '',
  company_research TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
```

**Step 2: Write the DB client**

Create `src/lib/db.ts`:
```typescript
import { createClient } from '@libsql/client';

export const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});
```

**Step 3: Write the migration script**

Create `src/lib/db-migrate.ts`:
```typescript
import { db } from './db';
import { readFileSync } from 'fs';
import { join } from 'path';

async function migrate() {
  const schema = readFileSync(join(__dirname, 'db-schema.sql'), 'utf-8');
  const statements = schema.split(';').filter(s => s.trim());
  for (const stmt of statements) {
    await db.execute(stmt);
  }
  console.log('Migration complete');
}

migrate().catch(console.error);
```

**Step 4: Create a Turso database**

Run:
```bash
turso db create resume-tailor
turso db show resume-tailor --url
turso db tokens create resume-tailor
```

Copy the URL and token into `.env.local`.

**Step 5: Run migration**

Run:
```bash
pnpm tsx src/lib/db-migrate.ts
```

Expected: "Migration complete"

**Step 6: Commit**

```bash
git add src/lib/db.ts src/lib/db-schema.sql src/lib/db-migrate.ts
git commit -m "feat: add Turso database schema and client"
```

---

## Task 3: Resume CRUD Server Actions

**Files:**
- Create: `src/lib/actions/resume-actions.ts`
- Create: `src/lib/types.ts`

**Step 1: Define types**

Create `src/lib/types.ts`:
```typescript
export interface Resume {
  id: string;
  name: string;
  latex_source: string;
  created_at: number;
  updated_at: number;
}

export interface JobApplication {
  id: string;
  resume_id: string;
  url: string;
  company: string;
  role: string;
  jd_raw: string;
  jd_text: string;
  status: 'draft' | 'tailored' | 'applied';
  created_at: number;
  updated_at: number;
}

export interface TailoredResume {
  id: string;
  job_id: string;
  resume_id: string;
  latex_source: string;
  accepted: number;
  created_at: number;
  updated_at: number;
}

export interface CoverLetter {
  id: string;
  job_id: string;
  resume_id: string;
  content: string;
  company_research: string;
  created_at: number;
  updated_at: number;
}

export interface AIProviderConfig {
  baseURL: string;
  apiKey: string;
  model: string;
}
```

**Step 2: Write resume server actions**

Create `src/lib/actions/resume-actions.ts`:
```typescript
'use server';

import { db } from '@/lib/db';
import { v4 as uuid } from 'uuid';
import type { Resume } from '@/lib/types';
import { revalidatePath } from 'next/cache';

export async function listResumes(): Promise<Resume[]> {
  const result = await db.execute('SELECT * FROM resumes ORDER BY updated_at DESC');
  return result.rows as unknown as Resume[];
}

export async function getResume(id: string): Promise<Resume | null> {
  const result = await db.execute({ sql: 'SELECT * FROM resumes WHERE id = ?', args: [id] });
  return (result.rows[0] as unknown as Resume) ?? null;
}

export async function createResume(name: string, latexSource: string = ''): Promise<string> {
  const id = uuid();
  await db.execute({
    sql: 'INSERT INTO resumes (id, name, latex_source) VALUES (?, ?, ?)',
    args: [id, name, latexSource],
  });
  revalidatePath('/');
  return id;
}

export async function updateResume(id: string, latexSource: string): Promise<void> {
  await db.execute({
    sql: 'UPDATE resumes SET latex_source = ?, updated_at = unixepoch() WHERE id = ?',
    args: [latexSource, id],
  });
}

export async function deleteResume(id: string): Promise<void> {
  await db.execute({ sql: 'DELETE FROM resumes WHERE id = ?', args: [id] });
  revalidatePath('/');
}
```

**Step 3: Verify server starts with no errors**

Run: `pnpm dev`
Expected: No compilation errors

**Step 4: Commit**

```bash
git add src/lib/types.ts src/lib/actions/resume-actions.ts
git commit -m "feat: add resume CRUD server actions and types"
```

---

## Task 4: Dashboard Page

**Files:**
- Modify: `src/app/page.tsx`
- Create: `src/app/globals.css` (update Tailwind base)
- Create: `src/components/resume-card.tsx`

**Step 1: Build the dashboard page**

Modify `src/app/page.tsx`:
```typescript
import { listResumes } from '@/lib/actions/resume-actions';
import { ResumeCard } from '@/components/resume-card';
import { CreateResumeButton } from '@/components/create-resume-button';

export default async function Dashboard() {
  const resumes = await listResumes();

  return (
    <main className="max-w-5xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Resumes</h1>
        <CreateResumeButton />
      </div>
      {resumes.length === 0 ? (
        <p className="text-gray-500">No resumes yet. Create one to get started.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {resumes.map((r) => (
            <ResumeCard key={r.id} resume={r} />
          ))}
        </div>
      )}
    </main>
  );
}
```

**Step 2: Build the ResumeCard component**

Create `src/components/resume-card.tsx`:
```typescript
import Link from 'next/link';
import type { Resume } from '@/lib/types';

export function ResumeCard({ resume }: { resume: Resume }) {
  const updated = new Date(resume.updated_at * 1000).toLocaleDateString();
  return (
    <Link
      href={`/editor/${resume.id}`}
      className="block border rounded-lg p-4 hover:border-blue-500 transition-colors"
    >
      <h3 className="font-semibold truncate">{resume.name}</h3>
      <p className="text-sm text-gray-500 mt-1">Updated {updated}</p>
    </Link>
  );
}
```

**Step 3: Build CreateResumeButton (client component)**

Create `src/components/create-resume-button.tsx`:
```typescript
'use client';

import { useRouter } from 'next/navigation';
import { createResume } from '@/lib/actions/resume-actions';

export function CreateResumeButton() {
  const router = useRouter();

  async function handleCreate() {
    const name = prompt('Resume name:');
    if (!name) return;
    const id = await createResume(name);
    router.push(`/editor/${id}`);
  }

  return (
    <button
      onClick={handleCreate}
      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
    >
      New Resume
    </button>
  );
}
```

**Step 4: Verify in browser**

Run: `pnpm dev` → open localhost:3000
Expected: Dashboard shows "No resumes yet" with a "New Resume" button

**Step 5: Commit**

```bash
git add src/app/page.tsx src/components/resume-card.tsx src/components/create-resume-button.tsx
git commit -m "feat: add dashboard page with resume listing"
```

---

## Task 5: LaTeX Editor Page

**Files:**
- Create: `src/app/editor/[id]/page.tsx`
- Create: `src/components/latex-editor.tsx`

**Step 1: Install CodeMirror dependencies**

Run:
```bash
pnpm add @codemirror/lang-latex @codemirror/view @codemirror/state @codemirror/basic-setup codemirror @codemirror/theme-one-dark
```

**Step 2: Build the editor page (server component)**

Create `src/app/editor/[id]/page.tsx`:
```typescript
import { getResume } from '@/lib/actions/resume-actions';
import { notFound } from 'next/navigation';
import { LatexEditor } from '@/components/latex-editor';

export default async function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const resume = await getResume(id);
  if (!resume) notFound();

  return (
    <main className="h-screen flex flex-col">
      <header className="flex items-center justify-between px-6 py-3 border-b">
        <h1 className="font-semibold">{resume.name}</h1>
        <a href="/" className="text-sm text-gray-500 hover:text-gray-700">Back</a>
      </header>
      <div className="flex-1 flex overflow-hidden">
        <LatexEditor resumeId={resume.id} initialSource={resume.latex_source} />
      </div>
    </main>
  );
}
```

**Step 3: Build the LaTeX editor client component**

Create `src/components/latex-editor.tsx`:
```typescript
'use client';

import { useRef, useCallback, useState } from 'react';
import { EditorView, keymap } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { basicSetup } from 'codemirror';
import { latex } from '@codemirror/lang-latex';
import { oneDark } from '@codemirror/theme-one-dark';
import { updateResume } from '@/lib/actions/resume-actions';

interface Props {
  resumeId: string;
  initialSource: string;
}

export function LatexEditor({ resumeId, initialSource }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [saving, setSaving] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const save = useCallback(async () => {
    if (!viewRef.current) return;
    const source = viewRef.current.state.doc.toString();
    setSaving(true);
    await updateResume(resumeId, source);
    setSaving(false);
    // TODO: Task 6 will add WASM compilation here
  }, [resumeId]);

  const editorMount = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node || viewRef.current) return;
      editorRef.current = node;

      const saveKeymap = keymap.of([
        {
          key: 'Mod-s',
          run: () => {
            save();
            return true;
          },
        },
      ]);

      const state = EditorState.create({
        doc: initialSource,
        extensions: [basicSetup, latex(), oneDark, saveKeymap],
      });

      viewRef.current = new EditorView({ state, parent: node });
    },
    [initialSource, save],
  );

  return (
    <>
      <div ref={editorMount} className="w-1/2 overflow-auto border-r" />
      <div className="w-1/2 flex items-center justify-center bg-gray-100 relative">
        {saving && (
          <span className="absolute top-3 right-3 text-xs text-gray-500">Saving...</span>
        )}
        {pdfUrl ? (
          <iframe src={pdfUrl} className="w-full h-full" title="PDF Preview" />
        ) : (
          <p className="text-gray-400">Press Cmd+S to save and compile</p>
        )}
      </div>
    </>
  );
}
```

**Step 4: Verify editor loads**

Run: `pnpm dev` → Create a resume → editor page loads with CodeMirror on left, placeholder on right
Expected: CodeMirror with LaTeX highlighting, Cmd+S saves to Turso

**Step 5: Commit**

```bash
git add src/app/editor/ src/components/latex-editor.tsx
git commit -m "feat: add LaTeX editor page with CodeMirror and save"
```

---

## Task 6: WASM LaTeX Compilation

**Files:**
- Create: `src/lib/latex-compiler.ts`
- Modify: `src/components/latex-editor.tsx`
- Modify: `next.config.ts`

**Step 1: Research and install SwiftLaTeX WASM engine**

SwiftLaTeX compiles PdfTeX/XeTeX to WASM. The engine files are loaded from a CDN (texlive.swiftlatex.com). We need to create a wrapper that:
1. Loads the WASM engine on first use
2. Compiles LaTeX source to PDF
3. Returns a blob URL for the iframe

Create `src/lib/latex-compiler.ts`:
```typescript
/* global PdfTeXEngine */

let engine: any = null;

export async function initCompiler(): Promise<void> {
  if (engine) return;

  // SwiftLaTeX loads via script tag and exposes PdfTeXEngine globally
  if (typeof window === 'undefined') return;

  const script = document.createElement('script');
  script.src = 'https://texlive.swiftlatex.com/PdfTeXEngine.js';
  document.head.appendChild(script);

  await new Promise<void>((resolve, reject) => {
    script.onload = () => resolve();
    script.onerror = reject;
  });

  engine = new (window as any).PdfTeXEngine();
  await engine.loadEngine();
}

export async function compileLatex(source: string): Promise<string> {
  await initCompiler();
  if (!engine) throw new Error('LaTeX compiler not available');

  engine.writeMemFSFile('input.tex', source);
  engine.setEngineMainFile('input.tex');
  const result = await engine.compileLaTeX();

  if (result.status !== 0) {
    throw new Error(result.log || 'LaTeX compilation failed');
  }

  const pdfBlob = new Blob([result.pdf], { type: 'application/pdf' });
  return URL.createObjectURL(pdfBlob);
}
```

**Step 2: Integrate into editor**

Modify `src/components/latex-editor.tsx` — update the `save` callback to call `compileLatex` after saving:
```typescript
// Add import at top:
import { compileLatex } from '@/lib/latex-compiler';

// Update save callback:
const save = useCallback(async () => {
  if (!viewRef.current) return;
  const source = viewRef.current.state.doc.toString();
  setSaving(true);
  await updateResume(resumeId, source);
  try {
    const url = await compileLatex(source);
    setPdfUrl(url);
  } catch (err) {
    console.error('Compilation failed:', err);
  }
  setSaving(false);
}, [resumeId]);
```

**Step 3: Update next.config.ts for WASM support if needed**

Modify `next.config.ts` to allow loading external scripts:
```typescript
const nextConfig = {
  // Allow SwiftLaTeX CDN scripts
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
        ],
      },
    ];
  },
};
```

Note: COEP/COOP headers are needed because SwiftLaTeX uses SharedArrayBuffer for the WASM engine.

**Step 4: Test compilation**

Run: `pnpm dev` → Open a resume → type a simple LaTeX document:
```latex
\documentclass{article}
\begin{document}
Hello, world!
\end{document}
```
Press Cmd+S.
Expected: PDF renders on the right side.

**Step 5: Commit**

```bash
git add src/lib/latex-compiler.ts src/components/latex-editor.tsx next.config.ts
git commit -m "feat: add client-side WASM LaTeX compilation with SwiftLaTeX"
```

---

## Task 7: Job Scraping Server Action

**Files:**
- Create: `src/lib/actions/scrape-action.ts`

**Step 1: Install scraping dependencies**

Run:
```bash
pnpm add @mozilla/readability linkedom
pnpm add -D @types/mozilla__readability
```

**Step 2: Write the scrape action**

Create `src/lib/actions/scrape-action.ts`:
```typescript
'use server';

import { Readability } from '@mozilla/readability';
import { parseHTML } from 'linkedom';

interface ScrapeResult {
  title: string;
  text: string;
  html: string;
  company: string;
  role: string;
}

export async function scrapeJobUrl(url: string): Promise<ScrapeResult> {
  // Primary: Jina Reader
  try {
    const res = await fetch(`https://r.jina.ai/${url}`, {
      headers: { Accept: 'text/markdown' },
      signal: AbortSignal.timeout(15000),
    });
    if (res.ok) {
      const text = await res.text();
      const title = text.split('\n')[0]?.replace(/^#+\s*/, '') ?? '';
      return {
        title,
        text,
        html: '',
        company: extractCompany(url, title),
        role: title,
      };
    }
  } catch {
    // fallback
  }

  // Fallback: linkedom + Readability
  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,*/*',
    },
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.status}`);
  }

  const html = await response.text();
  const { document } = parseHTML(html);
  const reader = new Readability(document);
  const article = reader.parse();

  if (!article) throw new Error('Failed to parse job page content');

  return {
    title: article.title ?? '',
    text: article.textContent ?? '',
    html: article.content ?? '',
    company: extractCompany(url, article.title ?? ''),
    role: article.title ?? '',
  };
}

function extractCompany(url: string, title: string): string {
  // Try common job board patterns
  const greenhouse = url.match(/boards\.greenhouse\.io\/(\w+)/);
  if (greenhouse) return greenhouse[1];

  const lever = url.match(/jobs\.lever\.co\/([^/]+)/);
  if (lever) return lever[1];

  // Fallback: try first part of title before " - " or " at "
  const match = title.match(/(?:at|@)\s+(.+?)(?:\s*[-|]|$)/i);
  return match?.[1]?.trim() ?? '';
}
```

**Step 3: Verify it compiles**

Run: `pnpm dev`
Expected: No errors

**Step 4: Commit**

```bash
git add src/lib/actions/scrape-action.ts
git commit -m "feat: add job URL scraping with Jina Reader + Readability fallback"
```

---

## Task 8: AI Provider Configuration

**Files:**
- Create: `src/lib/ai.ts`
- Create: `src/app/settings/page.tsx`
- Create: `src/components/settings-form.tsx`

**Step 1: Build the AI client factory**

Create `src/lib/ai.ts`:
```typescript
import { createOpenAI } from '@ai-sdk/openai';
import type { AIProviderConfig } from '@/lib/types';

const PRESETS: Record<string, Omit<AIProviderConfig, 'model'>> = {
  'free-ai': {
    baseURL: 'https://free-ai-gateway.sarthakagrawal927.workers.dev/v1',
    apiKey: process.env.AI_API_KEY ?? '',
  },
  'local-ai': {
    baseURL: 'http://localhost:3456/api',
    apiKey: '',
  },
};

export function getAIProvider(config?: Partial<AIProviderConfig>) {
  const baseURL = config?.baseURL ?? process.env.AI_BASE_URL ?? PRESETS['free-ai'].baseURL;
  const apiKey = config?.apiKey ?? process.env.AI_API_KEY ?? '';
  const model = config?.model ?? process.env.AI_MODEL ?? 'auto';

  const provider = createOpenAI({
    baseURL,
    apiKey,
    compatibility: 'compatible',
  });

  return { provider, model };
}
```

**Step 2: Build settings page**

Create `src/app/settings/page.tsx`:
```typescript
import { SettingsForm } from '@/components/settings-form';

export default function SettingsPage() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-12">
      <h1 className="text-2xl font-bold mb-8">Settings</h1>
      <SettingsForm />
    </main>
  );
}
```

**Step 3: Build settings form (client component)**

Create `src/components/settings-form.tsx`:
```typescript
'use client';

import { useState, useEffect } from 'react';

interface Settings {
  preset: string;
  baseURL: string;
  apiKey: string;
  model: string;
}

const PRESETS = {
  'free-ai': {
    label: 'Free AI Gateway',
    baseURL: 'https://free-ai-gateway.sarthakagrawal927.workers.dev/v1',
  },
  'local-ai': {
    label: 'Local AI',
    baseURL: 'http://localhost:3456/api',
  },
  custom: {
    label: 'Bring Your Own Key',
    baseURL: '',
  },
};

export function SettingsForm() {
  const [settings, setSettings] = useState<Settings>({
    preset: 'free-ai',
    baseURL: PRESETS['free-ai'].baseURL,
    apiKey: '',
    model: 'auto',
  });

  useEffect(() => {
    const saved = localStorage.getItem('ai-settings');
    if (saved) setSettings(JSON.parse(saved));
  }, []);

  function handlePresetChange(preset: string) {
    const p = PRESETS[preset as keyof typeof PRESETS];
    setSettings((s) => ({ ...s, preset, baseURL: p.baseURL || s.baseURL }));
  }

  function handleSave() {
    localStorage.setItem('ai-settings', JSON.stringify(settings));
    alert('Settings saved');
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-2">AI Provider</label>
        <div className="space-y-2">
          {Object.entries(PRESETS).map(([key, { label }]) => (
            <label key={key} className="flex items-center gap-2">
              <input
                type="radio"
                name="preset"
                value={key}
                checked={settings.preset === key}
                onChange={() => handlePresetChange(key)}
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      {settings.preset === 'custom' && (
        <div>
          <label className="block text-sm font-medium mb-1">Base URL</label>
          <input
            type="url"
            value={settings.baseURL}
            onChange={(e) => setSettings((s) => ({ ...s, baseURL: e.target.value }))}
            className="w-full border rounded px-3 py-2"
            placeholder="https://api.openai.com/v1"
          />
        </div>
      )}

      {settings.preset !== 'local-ai' && (
        <div>
          <label className="block text-sm font-medium mb-1">API Key</label>
          <input
            type="password"
            value={settings.apiKey}
            onChange={(e) => setSettings((s) => ({ ...s, apiKey: e.target.value }))}
            className="w-full border rounded px-3 py-2"
            placeholder="sk-..."
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1">Model</label>
        <input
          type="text"
          value={settings.model}
          onChange={(e) => setSettings((s) => ({ ...s, model: e.target.value }))}
          className="w-full border rounded px-3 py-2"
          placeholder="auto"
        />
      </div>

      <button
        onClick={handleSave}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        Save Settings
      </button>
    </div>
  );
}
```

**Step 4: Add nav link to settings**

Update `src/app/layout.tsx` to include a nav bar with link to `/settings`.

**Step 5: Verify settings page**

Run: `pnpm dev` → go to /settings
Expected: Radio buttons for presets, API key input, model input, save button

**Step 6: Commit**

```bash
git add src/lib/ai.ts src/app/settings/ src/components/settings-form.tsx src/app/layout.tsx
git commit -m "feat: add AI provider settings with preset support"
```

---

## Task 9: Job Application CRUD & Tailor Page

**Files:**
- Create: `src/lib/actions/job-actions.ts`
- Create: `src/app/tailor/[jobId]/page.tsx`
- Create: `src/components/tailor-flow.tsx`

**Step 1: Write job application server actions**

Create `src/lib/actions/job-actions.ts`:
```typescript
'use server';

import { db } from '@/lib/db';
import { v4 as uuid } from 'uuid';
import type { JobApplication, TailoredResume } from '@/lib/types';
import { revalidatePath } from 'next/cache';

export async function createJobApplication(
  resumeId: string,
  url: string,
  company: string,
  role: string,
  jdRaw: string,
  jdText: string,
): Promise<string> {
  const id = uuid();
  await db.execute({
    sql: `INSERT INTO job_applications (id, resume_id, url, company, role, jd_raw, jd_text)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [id, resumeId, url, company, role, jdRaw, jdText],
  });
  revalidatePath('/');
  return id;
}

export async function getJobApplication(id: string): Promise<JobApplication | null> {
  const result = await db.execute({ sql: 'SELECT * FROM job_applications WHERE id = ?', args: [id] });
  return (result.rows[0] as unknown as JobApplication) ?? null;
}

export async function listJobApplications(): Promise<JobApplication[]> {
  const result = await db.execute('SELECT * FROM job_applications ORDER BY created_at DESC');
  return result.rows as unknown as JobApplication[];
}

export async function saveTailoredResume(
  jobId: string,
  resumeId: string,
  latexSource: string,
): Promise<string> {
  const id = uuid();
  await db.execute({
    sql: `INSERT INTO tailored_resumes (id, job_id, resume_id, latex_source)
          VALUES (?, ?, ?, ?)`,
    args: [id, jobId, resumeId, latexSource],
  });
  await db.execute({
    sql: `UPDATE job_applications SET status = 'tailored', updated_at = unixepoch() WHERE id = ?`,
    args: [jobId],
  });
  return id;
}

export async function getTailoredResumes(jobId: string): Promise<TailoredResume[]> {
  const result = await db.execute({
    sql: 'SELECT * FROM tailored_resumes WHERE job_id = ? ORDER BY created_at DESC',
    args: [jobId],
  });
  return result.rows as unknown as TailoredResume[];
}
```

**Step 2: Build the tailor page (server component)**

Create `src/app/tailor/[jobId]/page.tsx`:
```typescript
import { getJobApplication, getTailoredResumes } from '@/lib/actions/job-actions';
import { getResume } from '@/lib/actions/resume-actions';
import { notFound } from 'next/navigation';
import { TailorFlow } from '@/components/tailor-flow';

export default async function TailorPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const job = await getJobApplication(jobId);
  if (!job) notFound();

  const resume = await getResume(job.resume_id);
  if (!resume) notFound();

  const tailored = await getTailoredResumes(jobId);

  return (
    <main className="h-screen flex flex-col">
      <header className="flex items-center justify-between px-6 py-3 border-b">
        <div>
          <h1 className="font-semibold">{job.role}</h1>
          <p className="text-sm text-gray-500">{job.company}</p>
        </div>
        <a href="/" className="text-sm text-gray-500 hover:text-gray-700">Back</a>
      </header>
      <TailorFlow
        job={job}
        resume={resume}
        existingTailored={tailored}
      />
    </main>
  );
}
```

**Step 3: Build the TailorFlow client component (skeleton)**

Create `src/components/tailor-flow.tsx`:
```typescript
'use client';

import { useState } from 'react';
import type { JobApplication, Resume, TailoredResume } from '@/lib/types';

interface Props {
  job: JobApplication;
  resume: Resume;
  existingTailored: TailoredResume[];
}

export function TailorFlow({ job, resume, existingTailored }: Props) {
  const [tailoring, setTailoring] = useState(false);
  const [tailoredSource, setTailoredSource] = useState<string | null>(
    existingTailored[0]?.latex_source ?? null,
  );

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left: Job description */}
      <div className="w-1/3 border-r p-4 overflow-auto">
        <h2 className="font-semibold mb-2">Job Description</h2>
        <div className="prose prose-sm max-w-none whitespace-pre-wrap">
          {job.jd_text}
        </div>
      </div>

      {/* Right: Diff view (Task 10 will add Monaco diff here) */}
      <div className="w-2/3 flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="font-semibold">
            {tailoredSource ? 'Tailored Resume' : 'Original Resume'}
          </h2>
          {!tailoredSource && (
            <button
              onClick={() => {
                setTailoring(true);
                // Task 10 will wire up the AI call
              }}
              disabled={tailoring}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {tailoring ? 'Generating...' : 'Generate Tailored Resume'}
            </button>
          )}
        </div>
        <div className="flex-1 p-4 overflow-auto">
          <pre className="text-sm font-mono whitespace-pre-wrap">
            {tailoredSource ?? resume.latex_source}
          </pre>
        </div>
      </div>
    </div>
  );
}
```

**Step 4: Add "Tailor for Job" entry point from dashboard**

Create `src/components/new-job-button.tsx` — a button on the dashboard that:
1. Asks which resume to use (dropdown)
2. Asks for job URL
3. Calls scrapeJobUrl
4. Calls createJobApplication
5. Redirects to `/tailor/[jobId]`

**Step 5: Verify page structure**

Run: `pnpm dev` → create a resume → add a job → tailor page shows JD + resume
Expected: Three-panel layout (JD left, resume right, generate button)

**Step 6: Commit**

```bash
git add src/lib/actions/job-actions.ts src/app/tailor/ src/components/tailor-flow.tsx src/components/new-job-button.tsx
git commit -m "feat: add job application CRUD and tailor page skeleton"
```

---

## Task 10: AI Resume Tailoring + Monaco Diff

**Files:**
- Create: `src/lib/actions/tailor-action.ts`
- Modify: `src/components/tailor-flow.tsx`
- Create: `src/components/latex-diff.tsx`

**Step 1: Install Monaco**

Run:
```bash
pnpm add @monaco-editor/react
```

**Step 2: Write the tailor server action**

Create `src/lib/actions/tailor-action.ts`:
```typescript
'use server';

import { generateText } from 'ai';
import { getAIProvider } from '@/lib/ai';
import type { AIProviderConfig } from '@/lib/types';

export async function tailorResume(
  latexSource: string,
  jdText: string,
  aiConfig?: Partial<AIProviderConfig>,
): Promise<string> {
  const { provider, model } = getAIProvider(aiConfig);

  const { text } = await generateText({
    model: provider(model),
    system: `You are a resume tailoring expert. You receive a LaTeX resume and a job description. Modify the resume content to better match the job while keeping the LaTeX structure and formatting intact. Only modify content sections (summary, experience bullets, skills). Do not change the LaTeX preamble, layout commands, or formatting. Return ONLY the complete modified LaTeX source, no explanation.`,
    prompt: `## Base Resume (LaTeX):\n${latexSource}\n\n## Job Description:\n${jdText}\n\n## Instructions:\n- Emphasize relevant experience and skills that match the JD\n- Reword bullet points to use keywords from the JD where truthful\n- Reorder skills to prioritize those mentioned in the JD\n- Keep it honest — do not fabricate experience`,
  });

  return text;
}
```

**Step 3: Build the Monaco diff component**

Create `src/components/latex-diff.tsx`:
```typescript
'use client';

import { DiffEditor } from '@monaco-editor/react';

interface Props {
  original: string;
  modified: string;
  onModifiedChange: (value: string) => void;
}

export function LatexDiff({ original, modified, onModifiedChange }: Props) {
  return (
    <DiffEditor
      height="100%"
      language="latex"
      original={original}
      modified={modified}
      onMount={(editor) => {
        const modifiedEditor = editor.getModifiedEditor();
        modifiedEditor.onDidChangeModelContent(() => {
          onModifiedChange(modifiedEditor.getValue());
        });
      }}
      options={{
        renderSideBySide: true,
        readOnly: false,
        originalEditable: false,
      }}
    />
  );
}
```

**Step 4: Wire up TailorFlow**

Update `src/components/tailor-flow.tsx` to:
1. Call `tailorResume` when "Generate" is clicked (pass AI config from localStorage)
2. Show `LatexDiff` when tailored output is available
3. Add "Accept" button that calls `saveTailoredResume`

**Step 5: Test the full flow**

Run: `pnpm dev` → create resume with LaTeX → add job → click Generate → see diff
Expected: Monaco diff editor shows original (left, read-only) vs tailored (right, editable)

**Step 6: Commit**

```bash
git add src/lib/actions/tailor-action.ts src/components/latex-diff.tsx src/components/tailor-flow.tsx
git commit -m "feat: add AI resume tailoring with Monaco diff view"
```

---

## Task 11: Cover Letter Generation

**Files:**
- Create: `src/lib/actions/cover-letter-action.ts`
- Create: `src/app/cover-letter/[jobId]/page.tsx`
- Create: `src/components/cover-letter-editor.tsx`

**Step 1: Write the cover letter server actions**

Create `src/lib/actions/cover-letter-action.ts`:
```typescript
'use server';

import { generateText } from 'ai';
import { getAIProvider } from '@/lib/ai';
import { db } from '@/lib/db';
import { v4 as uuid } from 'uuid';
import type { AIProviderConfig, CoverLetter } from '@/lib/types';
import { scrapeJobUrl } from './scrape-action';

async function researchCompany(companyUrl: string): Promise<string> {
  try {
    const result = await scrapeJobUrl(companyUrl);
    return result.text;
  } catch {
    return '';
  }
}

export async function generateCoverLetter(
  resumeLatex: string,
  jdText: string,
  company: string,
  jobId: string,
  resumeId: string,
  aiConfig?: Partial<AIProviderConfig>,
): Promise<string> {
  const { provider, model } = getAIProvider(aiConfig);

  // Research company
  let companyResearch = '';
  const searchUrls = [
    `https://www.${company.toLowerCase().replace(/\s+/g, '')}.com/about`,
    `https://www.${company.toLowerCase().replace(/\s+/g, '')}.com/careers`,
  ];
  for (const url of searchUrls) {
    const research = await researchCompany(url);
    if (research) {
      companyResearch += research + '\n\n';
    }
  }

  const { text } = await generateText({
    model: provider(model),
    system: `You are a professional cover letter writer. Using the candidate's resume, the job description, and research about the company, write a compelling cover letter. Return ONLY the cover letter text, no explanation.`,
    prompt: `## Resume:\n${resumeLatex}\n\n## Job Description:\n${jdText}\n\n## Company Research:\n${companyResearch || 'No research available.'}\n\n## Instructions:\n- Connect candidate's experience to the specific role\n- Reference company values/mission where genuine\n- Keep it concise (3-4 paragraphs)\n- Professional but not generic`,
  });

  // Save to DB
  const id = uuid();
  await db.execute({
    sql: `INSERT INTO cover_letters (id, job_id, resume_id, content, company_research)
          VALUES (?, ?, ?, ?, ?)`,
    args: [id, jobId, resumeId, text, companyResearch],
  });

  return text;
}

export async function getCoverLetter(jobId: string): Promise<CoverLetter | null> {
  const result = await db.execute({
    sql: 'SELECT * FROM cover_letters WHERE job_id = ? ORDER BY created_at DESC LIMIT 1',
    args: [jobId],
  });
  return (result.rows[0] as unknown as CoverLetter) ?? null;
}

export async function updateCoverLetter(id: string, content: string): Promise<void> {
  await db.execute({
    sql: 'UPDATE cover_letters SET content = ?, updated_at = unixepoch() WHERE id = ?',
    args: [content, id],
  });
}
```

**Step 2: Build cover letter page**

Create `src/app/cover-letter/[jobId]/page.tsx`:
```typescript
import { getJobApplication } from '@/lib/actions/job-actions';
import { getResume } from '@/lib/actions/resume-actions';
import { getCoverLetter } from '@/lib/actions/cover-letter-action';
import { notFound } from 'next/navigation';
import { CoverLetterEditor } from '@/components/cover-letter-editor';

export default async function CoverLetterPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const job = await getJobApplication(jobId);
  if (!job) notFound();

  const resume = await getResume(job.resume_id);
  if (!resume) notFound();

  const existing = await getCoverLetter(jobId);

  return (
    <main className="max-w-4xl mx-auto px-6 py-12">
      <header className="mb-8">
        <h1 className="text-2xl font-bold">Cover Letter</h1>
        <p className="text-gray-500">{job.role} at {job.company}</p>
      </header>
      <CoverLetterEditor
        job={job}
        resume={resume}
        existingLetter={existing}
      />
    </main>
  );
}
```

**Step 3: Build the cover letter editor component**

Create `src/components/cover-letter-editor.tsx`:
```typescript
'use client';

import { useState } from 'react';
import type { JobApplication, Resume, CoverLetter } from '@/lib/types';
import { generateCoverLetter, updateCoverLetter } from '@/lib/actions/cover-letter-action';

interface Props {
  job: JobApplication;
  resume: Resume;
  existingLetter: CoverLetter | null;
}

export function CoverLetterEditor({ job, resume, existingLetter }: Props) {
  const [content, setContent] = useState(existingLetter?.content ?? '');
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleGenerate() {
    setGenerating(true);
    const settings = JSON.parse(localStorage.getItem('ai-settings') ?? '{}');
    const text = await generateCoverLetter(
      resume.latex_source,
      job.jd_text,
      job.company,
      job.id,
      resume.id,
      settings,
    );
    setContent(text);
    setGenerating(false);
  }

  async function handleSave() {
    if (!existingLetter) return;
    setSaving(true);
    await updateCoverLetter(existingLetter.id, content);
    setSaving(false);
  }

  return (
    <div className="space-y-4">
      {!content && (
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {generating ? 'Researching company & generating...' : 'Generate Cover Letter'}
        </button>
      )}

      {content && (
        <>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full h-96 border rounded-lg p-4 font-serif text-base leading-relaxed resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Regenerate
            </button>
          </div>
        </>
      )}
    </div>
  );
}
```

**Step 4: Add "Cover Letter" link from tailor page**

Add a link in the tailor page header: `<a href={/cover-letter/${job.id}}>Cover Letter</a>`

**Step 5: Test full flow**

Run: `pnpm dev` → Create resume → Add job → Generate tailored resume → Click Cover Letter → Generate
Expected: Company research + cover letter generated, editable in textarea

**Step 6: Commit**

```bash
git add src/lib/actions/cover-letter-action.ts src/app/cover-letter/ src/components/cover-letter-editor.tsx
git commit -m "feat: add cover letter generation with company research"
```

---

## Task 12: Navigation, Polish, Wire Everything Together

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/page.tsx`
- Create: `src/components/nav.tsx`

**Step 1: Build shared navigation**

Create `src/components/nav.tsx`:
```typescript
import Link from 'next/link';

export function Nav() {
  return (
    <nav className="border-b px-6 py-3 flex items-center gap-6">
      <Link href="/" className="font-bold text-lg">Resume Tailor</Link>
      <Link href="/settings" className="text-sm text-gray-600 hover:text-gray-900">Settings</Link>
    </nav>
  );
}
```

**Step 2: Add Nav to layout**

Update `src/app/layout.tsx` to include `<Nav />` in the body.

**Step 3: Update dashboard to show both resumes and recent jobs**

Update `src/app/page.tsx` to also list recent job applications with links to `/tailor/[jobId]`.

**Step 4: End-to-end test**

Test the complete flow:
1. Create a resume with LaTeX → save → see PDF preview
2. Add a job URL → scrape succeeds → see JD
3. Generate tailored resume → see diff → accept
4. Generate cover letter → edit → save
5. Switch AI provider in settings → repeat

**Step 5: Commit**

```bash
git add src/components/nav.tsx src/app/layout.tsx src/app/page.tsx
git commit -m "feat: add navigation and wire all pages together"
```

---

## Summary

| Task | Description | Key Deps |
|------|-------------|----------|
| 1 | Project scaffold | Next.js, pnpm, Turso, AI SDK |
| 2 | Database schema & client | @libsql/client |
| 3 | Resume CRUD server actions | — |
| 4 | Dashboard page | — |
| 5 | LaTeX editor page | CodeMirror |
| 6 | WASM LaTeX compilation | SwiftLaTeX |
| 7 | Job scraping | Jina Reader, linkedom, Readability |
| 8 | AI provider settings | Vercel AI SDK, @ai-sdk/openai |
| 9 | Job CRUD + tailor page skeleton | — |
| 10 | AI tailoring + Monaco diff | Monaco, generateText |
| 11 | Cover letter generation | — |
| 12 | Navigation + polish | — |

**Dependencies:** Tasks 1→2→3→4 are sequential. Tasks 5-6 depend on 3. Tasks 7-8 are independent. Tasks 9-10 depend on 3+7+8. Task 11 depends on 9. Task 12 depends on all.
