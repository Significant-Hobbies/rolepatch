'use server';

import { getCurrentUserId } from '@/lib/auth-utils';
import { guestMasterIssue } from '@/lib/guest-migration-validation';
import { db } from '@/lib/db';
import type { CoverLetter, JobApplication, Resume, StashEntry, TailoredResume } from '@/lib/types';

interface MigrationInput {
  resumes: Resume[];
  jobs: JobApplication[];
  tailoredResumes: TailoredResume[];
  coverLetters: CoverLetter[];
  stashEntries: StashEntry[];
}

interface MigrationResult {
  success: boolean;
  error?: string;
  counts?: {
    resumes: number;
    jobs: number;
    tailoredResumes: number;
    coverLetters: number;
    stashEntries: number;
  };
}

type MigrationTable =
  | 'resumes'
  | 'job_applications'
  | 'tailored_resumes'
  | 'cover_letters'
  | 'stash_entries';

async function importRecord(
  table: MigrationTable,
  id: string,
  userId: string,
  statement: { sql: string; args: (string | number | null)[] }
): Promise<boolean> {
  try {
    const result = await db.execute(statement);
    if (result.rowsAffected > 0) return true;
    const existing = await db.execute({
      sql: `SELECT id FROM ${table} WHERE id = ? AND user_id = ?`,
      args: [id, userId],
    });
    return existing.rows.length === 1;
  } catch {
    return false;
  }
}

export async function migrateGuestData(
  input: MigrationInput,
  expectedUserId: string
): Promise<MigrationResult> {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: 'Not signed in' };
  if (userId !== expectedUserId) {
    return { success: false, error: 'Your account changed. Reload before importing.' };
  }

  const issue = guestMasterIssue(input.resumes);
  if (issue) return { success: false, error: issue };
  const counts = { resumes: 0, jobs: 0, tailoredResumes: 0, coverLetters: 0, stashEntries: 0 };

  // 1. Resumes first (jobs reference them)
  for (const r of input.resumes) {
    const imported = await importRecord('resumes', r.id, userId, {
      sql: 'INSERT OR IGNORE INTO resumes (id, name, source, user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      args: [r.id, r.name, r.source, userId, r.created_at, r.updated_at],
    });
    counts.resumes += Number(imported);
  }

  // 2. Job applications (reference resumes)
  for (const j of input.jobs) {
    const imported = await importRecord('job_applications', j.id, userId, {
      sql: `INSERT OR IGNORE INTO job_applications (id, resume_id, url, company, role, jd_raw, jd_text, status, user_id, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        j.id,
        j.resume_id,
        j.url ?? '',
        j.company,
        j.role,
        j.jd_raw ?? '',
        j.jd_text ?? '',
        j.status ?? 'draft',
        userId,
        j.created_at,
        j.updated_at ?? j.created_at,
      ],
    });
    counts.jobs += Number(imported);
  }

  // 3. Tailored resumes (reference jobs + resumes)
  for (const t of input.tailoredResumes) {
    const imported = await importRecord('tailored_resumes', t.id, userId, {
      sql: `INSERT OR IGNORE INTO tailored_resumes (id, job_id, resume_id, source, accepted, changes_json, user_id, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        t.id,
        t.job_id,
        t.resume_id,
        t.source,
        t.accepted,
        JSON.stringify(t.changes ?? []),
        userId,
        t.created_at,
        t.updated_at,
      ],
    });
    counts.tailoredResumes += Number(imported);
  }

  // 4. Cover letters (reference jobs + resumes)
  for (const c of input.coverLetters) {
    const imported = await importRecord('cover_letters', c.id, userId, {
      sql: `INSERT OR IGNORE INTO cover_letters (id, job_id, resume_id, content, company_research, user_id, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        c.id,
        c.job_id,
        c.resume_id,
        c.content,
        c.company_research,
        userId,
        c.created_at,
        c.updated_at,
      ],
    });
    counts.coverLetters += Number(imported);
  }

  // 5. Stash entries (standalone)
  for (const s of input.stashEntries) {
    const imported = await importRecord('stash_entries', s.id, userId, {
      sql: 'INSERT OR IGNORE INTO stash_entries (id, category, label, content, user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      args: [s.id, s.category, s.label, s.content, userId, s.created_at, s.updated_at],
    });
    counts.stashEntries += Number(imported);
  }

  const importedCount = Object.values(counts).reduce((sum, count) => sum + count, 0);
  const requestedCount = Object.values(input).reduce((sum, records) => sum + records.length, 0);
  if (importedCount !== requestedCount) {
    return {
      success: false,
      error: 'Some records could not be imported. Your browser copies are still available.',
      counts,
    };
  }
  return { success: true, counts };
}
