# Auth & Multi-User Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add NextAuth v5 with Google OAuth for multi-user support, while keeping a full guest experience via localStorage.

**Architecture:** NextAuth v5 with JWT sessions and Google OAuth. Signed-in users get DB persistence with `user_id` filtering on all tables. Guests get full functionality via localStorage for resumes/stash/tailored/cover-letters, with only `job_applications` and `scrapeJobUrl`/`tailorResume`/`generateCoverLetter` hitting the server. A React context (`DataProvider`) switches between localStorage and server-action backends based on auth state.

**Tech Stack:** next-auth v5 (Auth.js), Google OAuth, Turso (LibSQL), React Context, localStorage, Next.js 16 App Router

---

### Task 1: Install next-auth and create auth configuration

**Files:**
- Modify: `package.json`
- Create: `src/lib/auth.ts`
- Create: `src/app/api/auth/[...nextauth]/route.ts`

**Step 1: Install next-auth**

Run: `pnpm add next-auth@5`

**Step 2: Create the auth configuration file**

Create `src/lib/auth.ts`:

```typescript
import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { db } from '@/lib/db';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    async signIn({ user, profile }) {
      if (!user.email) return false;
      // Upsert user in DB
      await db.execute({
        sql: `INSERT INTO users (id, email, name, image)
              VALUES (?, ?, ?, ?)
              ON CONFLICT(email) DO UPDATE SET name = ?, image = ?, updated_at = unixepoch()`,
        args: [crypto.randomUUID(), user.email, user.name ?? '', user.image ?? '', user.name ?? '', user.image ?? ''],
      });
      return true;
    },
    async jwt({ token, user }) {
      if (user?.email) {
        const result = await db.execute({ sql: 'SELECT id FROM users WHERE email = ?', args: [user.email] });
        const row = result.rows[0];
        if (row) token.userId = row.id as string;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.userId) {
        (session as any).userId = token.userId;
      }
      return session;
    },
  },
});
```

**Step 3: Create the API route handler**

Create `src/app/api/auth/[...nextauth]/route.ts`:

```typescript
import { handlers } from '@/lib/auth';
export const { GET, POST } = handlers;
```

**Step 4: Verify it compiles**

Run: `pnpm build`
Expected: Build succeeds (auth won't work yet without env vars, but it should compile)

**Step 5: Commit**

```bash
git add src/lib/auth.ts src/app/api/auth/\[...nextauth\]/route.ts package.json pnpm-lock.yaml
git commit -m "feat: add NextAuth v5 with Google OAuth config"
```

---

### Task 2: Add users table and user_id columns to schema

**Files:**
- Modify: `src/lib/db-schema.sql`
- Modify: `src/lib/types.ts`
- Modify: `src/lib/db-migrate.ts`

**Step 1: Update the SQL schema**

Add to `src/lib/db-schema.sql` (before existing tables):

```sql
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT '',
  image TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
```

**Step 2: Add user_id columns via ALTER TABLE statements**

Add to `src/lib/db-migrate.ts` after existing migration logic, as safe ALTER TABLE statements:

```typescript
// Add user_id columns (idempotent - catches "duplicate column" errors)
const alterStatements = [
  'ALTER TABLE resumes ADD COLUMN user_id TEXT',
  'ALTER TABLE job_applications ADD COLUMN user_id TEXT',
  'ALTER TABLE tailored_resumes ADD COLUMN user_id TEXT',
  'ALTER TABLE cover_letters ADD COLUMN user_id TEXT',
  'ALTER TABLE stash_entries ADD COLUMN user_id TEXT',
];
for (const sql of alterStatements) {
  try {
    await db.execute(sql);
    console.log(`OK: ${sql}`);
  } catch (e: any) {
    if (e.message?.includes('duplicate column')) {
      console.log(`SKIP (exists): ${sql}`);
    } else {
      throw e;
    }
  }
}
```

**Step 3: Add UNIQUE constraint on cleaned URL for job_applications**

Add a unique index in `db-schema.sql`:

```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_job_applications_cleaned_url
  ON job_applications (url) WHERE user_id IS NULL;
```

And execute this in `db-migrate.ts` after the ALTER statements.

**Step 4: Add User type to types.ts**

Add to `src/lib/types.ts`:

```typescript
export interface User {
  id: string;
  email: string;
  name: string;
  image: string;
  created_at: number;
  updated_at: number;
}
```

**Step 5: Run migration**

Run: `npx tsx src/lib/db-migrate.ts`
Expected: All statements succeed or skip gracefully

**Step 6: Commit**

```bash
git add src/lib/db-schema.sql src/lib/db-migrate.ts src/lib/types.ts
git commit -m "feat: add users table and user_id columns to all tables"
```

---

### Task 3: Create auth helper and session utilities

**Files:**
- Create: `src/lib/auth-utils.ts`

**Step 1: Create server-side auth utility**

Create `src/lib/auth-utils.ts`:

```typescript
import { auth } from '@/lib/auth';

export async function getCurrentUserId(): Promise<string | null> {
  const session = await auth();
  return (session as any)?.userId ?? null;
}
```

This is used by server actions to get the current user's ID. Returns `null` for guests.

**Step 2: Commit**

```bash
git add src/lib/auth-utils.ts
git commit -m "feat: add getCurrentUserId server helper"
```

---

### Task 4: Update server actions for user_id filtering

**Files:**
- Modify: `src/lib/actions/resume-actions.ts`
- Modify: `src/lib/actions/job-actions.ts`
- Modify: `src/lib/actions/stash-actions.ts`
- Modify: `src/lib/actions/cover-letter-action.ts`

**Context:** Every server action that reads/writes user data must now filter by `user_id`. For signed-in users, `user_id` comes from the session. For guests, these actions should NOT be called (guests use localStorage) — except `createJobApplication` which stores with `user_id = NULL`, and `scrapeJobUrl`/`tailorResume`/`generateCoverLetter` which are stateless.

**Step 1: Update resume-actions.ts**

All functions get `user_id` from `getCurrentUserId()` and filter queries:

```typescript
import { getCurrentUserId } from '@/lib/auth-utils';

export async function listResumes(): Promise<Resume[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];
  const result = await db.execute({
    sql: 'SELECT * FROM resumes WHERE user_id = ? ORDER BY updated_at DESC',
    args: [userId],
  });
  return JSON.parse(JSON.stringify(result.rows)) as Resume[];
}

export async function getResume(id: string): Promise<Resume | null> {
  const userId = await getCurrentUserId();
  if (!userId) return null;
  const result = await db.execute({
    sql: 'SELECT * FROM resumes WHERE id = ? AND user_id = ?',
    args: [id, userId],
  });
  const row = result.rows[0];
  return row ? (JSON.parse(JSON.stringify(row)) as Resume) : null;
}

export async function createResume(name: string, source: string = DEFAULT_MARKDOWN_TEMPLATE): Promise<string> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('Sign in to create resumes');
  const id = uuid();
  await db.execute({
    sql: 'INSERT INTO resumes (id, name, source, user_id) VALUES (?, ?, ?, ?)',
    args: [id, name, source, userId],
  });
  revalidatePath('/');
  return id;
}

export async function updateResume(id: string, source: string): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('Sign in to update resumes');
  await db.execute({
    sql: 'UPDATE resumes SET source = ?, updated_at = unixepoch() WHERE id = ? AND user_id = ?',
    args: [source, id, userId],
  });
}

export async function deleteResume(id: string): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('Sign in to delete resumes');
  await db.execute({
    sql: 'DELETE FROM resumes WHERE id = ? AND user_id = ?',
    args: [id, userId],
  });
  revalidatePath('/');
}
```

**Step 2: Update job-actions.ts**

Similar pattern. `createJobApplication` is special — it accepts both guests (user_id=NULL) and signed-in users:

```typescript
import { getCurrentUserId } from '@/lib/auth-utils';

export async function createJobApplication(
  resumeId: string, url: string, company: string, role: string, jdRaw: string, jdText: string,
): Promise<string> {
  const userId = await getCurrentUserId();
  const id = uuid();
  await db.execute({
    sql: 'INSERT INTO job_applications (id, resume_id, url, company, role, jd_raw, jd_text, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    args: [id, resumeId, url, company, role, jdRaw, jdText, userId],
  });
  revalidatePath('/');
  return id;
}

export async function listJobApplications(): Promise<JobApplication[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];
  const result = await db.execute({
    sql: 'SELECT * FROM job_applications WHERE user_id = ? ORDER BY created_at DESC',
    args: [userId],
  });
  return JSON.parse(JSON.stringify(result.rows)) as JobApplication[];
}

export async function getJobApplication(id: string): Promise<JobApplication | null> {
  const userId = await getCurrentUserId();
  // Allow guests to read their job (they just created it via createJobApplication)
  const sql = userId
    ? 'SELECT * FROM job_applications WHERE id = ? AND user_id = ?'
    : 'SELECT * FROM job_applications WHERE id = ? AND user_id IS NULL';
  const args = userId ? [id, userId] : [id];
  const result = await db.execute({ sql, args });
  const row = result.rows[0];
  return row ? (JSON.parse(JSON.stringify(row)) as JobApplication) : null;
}

// saveTailoredResume and getTailoredResumes: add user_id filtering similarly
```

**Step 3: Update stash-actions.ts**

Same pattern as resume-actions: all functions get userId, filter by it, return `[]` for guests:

```typescript
import { getCurrentUserId } from '@/lib/auth-utils';

export async function listStashEntries(): Promise<StashEntry[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];
  // ... WHERE user_id = ?
}

export async function createStashEntry(category: string, label: string, content: string): Promise<string> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('Sign in to create stash entries');
  // ... INSERT with user_id
}

// updateStashEntry, deleteStashEntry: similar + AND user_id = ?
```

**Step 4: Update cover-letter-action.ts**

```typescript
import { getCurrentUserId } from '@/lib/auth-utils';

// getCoverLetter: add user_id filtering
// generateCoverLetter: the AI call is stateless, but saving to DB needs user_id
// For guests, the cover letter result is returned but not saved to DB
```

**Step 5: Update tailor-action.ts**

The `tailorResume` function is stateless (takes input, returns AI output). It should still call `listStashEntries()` for signed-in users. For guests, stash entries come from localStorage (handled client-side in Task 6). Modify the function to accept an optional `stashContent` parameter:

```typescript
export async function tailorResume(
  resumeSource: string,
  jdText: string,
  aiConfig?: Partial<AIProviderConfig>,
  stashContent?: string,
): Promise<string> {
  // If stashContent is provided (from guest localStorage), use it
  // Otherwise, fetch from DB (signed-in user)
  let stashBlock = stashContent ?? '';
  if (!stashContent) {
    const entries = await listStashEntries();
    // format entries as before...
  }
  // ... rest of AI call
}
```

**Step 6: Verify build**

Run: `pnpm build`
Expected: Build succeeds

**Step 7: Commit**

```bash
git add src/lib/actions/
git commit -m "feat: add user_id filtering to all server actions"
```

---

### Task 5: Build localStorage data layer for guests

**Files:**
- Create: `src/lib/local-storage.ts`

**Step 1: Create localStorage CRUD utilities**

Create `src/lib/local-storage.ts`:

```typescript
import type { Resume, StashEntry, TailoredResume, CoverLetter } from '@/lib/types';

const KEYS = {
  resumes: 'rt-resumes',
  stash: 'rt-stash',
  tailored: 'rt-tailored',
  coverLetters: 'rt-cover-letters',
} as const;

function getItems<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : [];
}

function setItems<T>(key: string, items: T[]): void {
  localStorage.setItem(key, JSON.stringify(items));
}

// --- Resumes ---
export function localListResumes(): Resume[] {
  return getItems<Resume>(KEYS.resumes).sort((a, b) => b.updated_at - a.updated_at);
}

export function localGetResume(id: string): Resume | null {
  return getItems<Resume>(KEYS.resumes).find(r => r.id === id) ?? null;
}

export function localCreateResume(name: string, source: string): string {
  const id = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);
  const resumes = getItems<Resume>(KEYS.resumes);
  resumes.push({ id, name, source, created_at: now, updated_at: now });
  setItems(KEYS.resumes, resumes);
  return id;
}

export function localUpdateResume(id: string, source: string): void {
  const resumes = getItems<Resume>(KEYS.resumes);
  const idx = resumes.findIndex(r => r.id === id);
  if (idx >= 0) {
    resumes[idx].source = source;
    resumes[idx].updated_at = Math.floor(Date.now() / 1000);
    setItems(KEYS.resumes, resumes);
  }
}

export function localDeleteResume(id: string): void {
  setItems(KEYS.resumes, getItems<Resume>(KEYS.resumes).filter(r => r.id !== id));
}

// --- Stash Entries ---
export function localListStashEntries(): StashEntry[] {
  return getItems<StashEntry>(KEYS.stash).sort((a, b) => b.updated_at - a.updated_at);
}

export function localCreateStashEntry(category: string, label: string, content: string): string {
  const id = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);
  const entries = getItems<StashEntry>(KEYS.stash);
  entries.push({ id, category, label, content, created_at: now, updated_at: now });
  setItems(KEYS.stash, entries);
  return id;
}

export function localUpdateStashEntry(id: string, category: string, label: string, content: string): void {
  const entries = getItems<StashEntry>(KEYS.stash);
  const idx = entries.findIndex(e => e.id === id);
  if (idx >= 0) {
    entries[idx] = { ...entries[idx], category, label, content, updated_at: Math.floor(Date.now() / 1000) };
    setItems(KEYS.stash, entries);
  }
}

export function localDeleteStashEntry(id: string): void {
  setItems(KEYS.stash, getItems<StashEntry>(KEYS.stash).filter(e => e.id !== id));
}

// --- Tailored Resumes ---
export function localGetTailoredResumes(jobId: string): TailoredResume[] {
  return getItems<TailoredResume>(KEYS.tailored).filter(t => t.job_id === jobId);
}

export function localSaveTailoredResume(jobId: string, resumeId: string, source: string): string {
  const id = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);
  const items = getItems<TailoredResume>(KEYS.tailored);
  items.push({ id, job_id: jobId, resume_id: resumeId, source, accepted: 0, created_at: now, updated_at: now });
  setItems(KEYS.tailored, items);
  return id;
}

// --- Cover Letters ---
export function localGetCoverLetter(jobId: string): CoverLetter | null {
  return getItems<CoverLetter>(KEYS.coverLetters).find(c => c.job_id === jobId) ?? null;
}

export function localSaveCoverLetter(jobId: string, resumeId: string, content: string, companyResearch: string): string {
  const id = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);
  const items = getItems<CoverLetter>(KEYS.coverLetters);
  // Replace existing for this job
  const filtered = items.filter(c => c.job_id !== jobId);
  filtered.push({ id, job_id: jobId, resume_id: resumeId, content, company_research: companyResearch, created_at: now, updated_at: now });
  setItems(KEYS.coverLetters, filtered);
  return id;
}

export function localUpdateCoverLetter(id: string, content: string): void {
  const items = getItems<CoverLetter>(KEYS.coverLetters);
  const idx = items.findIndex(c => c.id === id);
  if (idx >= 0) {
    items[idx].content = content;
    items[idx].updated_at = Math.floor(Date.now() / 1000);
    setItems(KEYS.coverLetters, items);
  }
}
```

**Step 2: Commit**

```bash
git add src/lib/local-storage.ts
git commit -m "feat: add localStorage CRUD layer for guest experience"
```

---

### Task 6: Create AuthProvider context and useData hook

**Files:**
- Create: `src/components/auth-provider.tsx`

**Step 1: Create the auth/data context**

This context provides:
1. Auth state (signed in or guest)
2. Sign in / sign out functions
3. User info (name, image, email)

Create `src/components/auth-provider.tsx`:

```typescript
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import type { Session } from 'next-auth';

interface AuthContextValue {
  session: Session | null;
  userId: string | null;
  isGuest: boolean;
  status: 'loading' | 'authenticated' | 'unauthenticated';
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  userId: null,
  isGuest: true,
  status: 'loading',
});

export function AuthProvider({ session, children }: { session: Session | null; children: React.ReactNode }) {
  const userId = (session as any)?.userId ?? null;
  return (
    <AuthContext.Provider value={{
      session,
      userId,
      isGuest: !userId,
      status: session ? 'authenticated' : 'unauthenticated',
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
```

**Step 2: Wrap the app in AuthProvider**

Modify `src/app/layout.tsx` to get the session and pass it to AuthProvider:

```typescript
import { auth } from '@/lib/auth';
import { AuthProvider } from '@/components/auth-provider';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AuthProvider session={session}>
          {/* nav + children */}
        </AuthProvider>
      </body>
    </html>
  );
}
```

**Step 3: Commit**

```bash
git add src/components/auth-provider.tsx src/app/layout.tsx
git commit -m "feat: add AuthProvider context with session state"
```

---

### Task 7: Convert dashboard page to support guest + signed-in

**Files:**
- Modify: `src/app/page.tsx`
- Create: `src/components/dashboard.tsx`

**Context:** The dashboard currently is a server component that calls `listResumes()` and `listJobApplications()`. For guests, it needs to read from localStorage instead.

**Step 1: Create a client Dashboard component**

Create `src/components/dashboard.tsx` — a client component that:
- Uses `useAuth()` to check if guest
- If signed-in: receives resumes and jobs as props (fetched by server parent)
- If guest: reads from localStorage on mount

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth-provider';
import { localListResumes } from '@/lib/local-storage';
import type { Resume, JobApplication } from '@/lib/types';
import { ResumeCard } from '@/components/resume-card';
import { CreateResumeButton } from '@/components/create-resume-button';
import { NewJobButton } from '@/components/new-job-button';

interface DashboardProps {
  serverResumes: Resume[];
  serverJobs: JobApplication[];
}

export function Dashboard({ serverResumes, serverJobs }: DashboardProps) {
  const { isGuest } = useAuth();
  const [resumes, setResumes] = useState<Resume[]>(serverResumes);
  const [jobs, setJobs] = useState<JobApplication[]>(serverJobs);

  useEffect(() => {
    if (isGuest) {
      setResumes(localListResumes());
      // Jobs for guests are in DB but with user_id=NULL
      // They can still be listed via a guest-specific server action or passed as props
      // For simplicity, guests see jobs from localStorage too
    }
  }, [isGuest]);

  // ... render same UI as current page.tsx but using resumes/jobs state
}
```

**Step 2: Simplify page.tsx to be a thin server wrapper**

```typescript
import { listResumes } from '@/lib/actions/resume-actions';
import { listJobApplications } from '@/lib/actions/job-actions';
import { Dashboard } from '@/components/dashboard';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const [resumes, jobs] = await Promise.all([
    listResumes(),
    listJobApplications(),
  ]);
  return <Dashboard serverResumes={resumes} serverJobs={jobs} />;
}
```

**Step 3: Verify build**

Run: `pnpm build`

**Step 4: Commit**

```bash
git add src/app/page.tsx src/components/dashboard.tsx
git commit -m "feat: convert dashboard to support guest + signed-in users"
```

---

### Task 8: Convert editor page for guest support

**Files:**
- Modify: `src/app/editor/[id]/page.tsx`
- Modify: `src/components/resume-editor.tsx`

**Context:** The editor page loads a resume by ID from the DB. For guests, it needs to load from localStorage.

**Step 1: Make editor page pass data and let client component handle guest logic**

The editor page is currently a server component. We need to make the `ResumeEditor` component aware of guest mode and use localStorage for saving.

Update `src/components/resume-editor.tsx` to accept a `isGuest` prop:
- If signed-in: calls `updateResume(id, source)` server action (existing behavior)
- If guest: calls `localUpdateResume(id, source)` from `local-storage.ts`

Update `src/app/editor/[id]/page.tsx`:
- Server component tries to load from DB
- Passes resume data as props
- Client component falls back to localStorage if no server data

**Step 2: Commit**

```bash
git add src/app/editor/\[id\]/page.tsx src/components/resume-editor.tsx
git commit -m "feat: add guest localStorage support to resume editor"
```

---

### Task 9: Convert stash page for guest support

**Files:**
- Modify: `src/app/stash/page.tsx`
- Modify: `src/components/stash-list.tsx`

**Context:** Same pattern as dashboard — stash-list becomes guest-aware.

**Step 1: Update stash-list.tsx**

Use `useAuth()` to determine data source:
- Signed-in: existing server action calls
- Guest: localStorage CRUD from `local-storage.ts`

The component already handles all CRUD via state + server actions. For guests, replace server action calls with localStorage calls.

**Step 2: Commit**

```bash
git add src/app/stash/page.tsx src/components/stash-list.tsx
git commit -m "feat: add guest localStorage support to stash page"
```

---

### Task 10: Convert tailor flow for guest support

**Files:**
- Modify: `src/components/tailor-flow.tsx`
- Modify: `src/app/tailor/[jobId]/page.tsx`

**Context:** The tailor flow calls `tailorResume()` (stateless AI call — works for everyone) and `saveTailoredResume()` (DB write — needs guest handling).

**Step 1: Update tailor-flow.tsx**

- Use `useAuth()` to check guest status
- `handleGenerate()`: for guests, also pass stash content from localStorage to `tailorResume()`
- `handleSave()`: for guests, save to localStorage via `localSaveTailoredResume()`

**Step 2: Update tailor page**

The server page loads job + resume from DB. For guests:
- Job is in DB (guest jobs are stored with user_id=NULL)
- Resume is in localStorage

Pass an `isGuest` flag so the client component knows to load resume from localStorage.

**Step 3: Commit**

```bash
git add src/components/tailor-flow.tsx src/app/tailor/\[jobId\]/page.tsx
git commit -m "feat: add guest localStorage support to tailor flow"
```

---

### Task 11: Convert cover letter page for guest support

**Files:**
- Modify: `src/components/cover-letter-editor.tsx`
- Modify: `src/app/cover-letter/[jobId]/page.tsx`

**Context:** Same pattern — AI generation is stateless, saving needs guest path.

**Step 1: Update cover-letter-editor.tsx**

- Guest: save cover letter to localStorage
- Signed-in: save to DB (existing behavior)

**Step 2: Commit**

```bash
git add src/components/cover-letter-editor.tsx src/app/cover-letter/\[jobId\]/page.tsx
git commit -m "feat: add guest localStorage support to cover letter page"
```

---

### Task 12: Convert create-resume-button and new-job-button for guest support

**Files:**
- Modify: `src/components/create-resume-button.tsx`
- Modify: `src/components/new-job-button.tsx`

**Step 1: Update create-resume-button.tsx**

- Use `useAuth()` to check guest status
- Guest: call `localCreateResume()`, then `router.push(/editor/${id})`
- Signed-in: call `createResume()` server action (existing)

**Step 2: Update new-job-button.tsx**

- Guest: resumes come from localStorage (need to pass them or read them)
- Job creation always hits the server (createJobApplication with user_id=NULL for guests)
- Guest resume_id is a localStorage ID (not in DB), so pass it as a reference

**Step 3: Commit**

```bash
git add src/components/create-resume-button.tsx src/components/new-job-button.tsx
git commit -m "feat: add guest support to create resume and new job buttons"
```

---

### Task 13: Add sign-in / user avatar to navigation bar

**Files:**
- Modify: `src/app/layout.tsx`
- Create: `src/components/user-menu.tsx`

**Step 1: Create UserMenu component**

Create `src/components/user-menu.tsx`:

```typescript
'use client';

import { useAuth } from '@/components/auth-provider';
import { signIn, signOut } from 'next-auth/react';
import { useState } from 'react';

export function UserMenu() {
  const { session, isGuest } = useAuth();
  const [open, setOpen] = useState(false);

  if (isGuest) {
    return (
      <button
        onClick={() => signIn('google')}
        className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        Sign in
      </button>
    );
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2">
        {session?.user?.image ? (
          <img src={session.user.image} alt="" className="w-7 h-7 rounded-full" />
        ) : (
          <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-medium">
            {session?.user?.name?.[0] ?? '?'}
          </div>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 z-50">
          <div className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
            {session?.user?.email}
          </div>
          <button
            onClick={() => signOut()}
            className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Add UserMenu to layout.tsx nav bar**

Add `<UserMenu />` to the right side of the nav bar (use `ml-auto` to push it right):

```tsx
<nav className="border-b border-gray-200 dark:border-gray-800">
  <div className="max-w-5xl mx-auto px-6 py-3 flex items-center gap-6">
    <Link href="/">Resume Tailor</Link>
    <Link href="/settings">Settings</Link>
    <Link href="/stash">Stash</Link>
    <div className="ml-auto">
      <UserMenu />
    </div>
  </div>
</nav>
```

**Step 3: Commit**

```bash
git add src/components/user-menu.tsx src/app/layout.tsx
git commit -m "feat: add sign-in button and user avatar menu to nav bar"
```

---

### Task 14: Add environment variables and Vercel deployment config

**Files:**
- Modify: `.env.local` (add new vars locally)
- Create: `vercel.json` (optional, if needed)

**Step 1: Add required env vars to .env.local**

Add to `.env.local`:

```
GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
AUTH_SECRET=<generate with: openssl rand -base64 32>
```

**Step 2: Set up Google OAuth credentials**

1. Go to Google Cloud Console > APIs & Services > Credentials
2. Create OAuth 2.0 Client ID (Web application)
3. Add authorized redirect URI: `https://your-domain.vercel.app/api/auth/callback/google` and `http://localhost:3000/api/auth/callback/google`
4. Copy Client ID and Client Secret to `.env.local`

**Step 3: Generate AUTH_SECRET**

Run: `openssl rand -base64 32`
Copy output to `.env.local` as `AUTH_SECRET`

**Step 4: Deploy to Vercel**

1. Run `vercel` CLI or push to GitHub and connect repo
2. Set environment variables in Vercel dashboard:
   - `TURSO_DATABASE_URL`
   - `TURSO_AUTH_TOKEN`
   - `AI_BASE_URL`
   - `AI_API_KEY`
   - `AI_MODEL`
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `AUTH_SECRET`

**Step 5: Run migration on production**

Run: `TURSO_DATABASE_URL=<prod-url> TURSO_AUTH_TOKEN=<prod-token> npx tsx src/lib/db-migrate.ts`

**Step 6: Verify deployment**

1. Visit deployed URL
2. App should work as guest (localStorage mode)
3. Sign in with Google should work
4. After sign-in, data should persist to DB

**Step 7: Commit any config changes**

```bash
git add vercel.json  # if created
git commit -m "chore: add Vercel deployment configuration"
```

---

## Summary

| Task | Description | Key Files |
|------|-------------|-----------|
| 1 | Install next-auth, auth config | `src/lib/auth.ts`, API route |
| 2 | Users table, user_id columns | `db-schema.sql`, `db-migrate.ts` |
| 3 | Auth helper utility | `src/lib/auth-utils.ts` |
| 4 | Update server actions for user_id | All action files |
| 5 | localStorage CRUD layer | `src/lib/local-storage.ts` |
| 6 | AuthProvider context | `src/components/auth-provider.tsx` |
| 7 | Dashboard guest support | `src/components/dashboard.tsx` |
| 8 | Editor guest support | `resume-editor.tsx` |
| 9 | Stash guest support | `stash-list.tsx` |
| 10 | Tailor flow guest support | `tailor-flow.tsx` |
| 11 | Cover letter guest support | `cover-letter-editor.tsx` |
| 12 | Create/New buttons guest support | Button components |
| 13 | Sign-in / avatar nav UI | `user-menu.tsx`, `layout.tsx` |
| 14 | Env vars + Vercel deploy | `.env.local`, Vercel dashboard |
