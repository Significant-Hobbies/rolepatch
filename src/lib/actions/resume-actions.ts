'use server';

import { revalidatePath } from 'next/cache';
import { v4 as uuid } from 'uuid';

import { careerCredentialIssue } from '@/lib/career-data-privacy';
import { getCurrentUserId } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import type { Resume } from '@/lib/types';
import { EMPTY_MASTER_TEMPLATE } from '@/lib/master-resume';

export async function listResumes(): Promise<Resume[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];
  const result = await db.execute({
    sql: 'SELECT id, name, source, created_at, updated_at FROM resumes WHERE user_id = ? AND archived_at IS NULL ORDER BY is_default DESC, updated_at DESC, id',
    args: [userId],
  });
  return JSON.parse(JSON.stringify(result.rows)) as Resume[];
}

export async function getResume(id: string): Promise<Resume | null> {
  const userId = await getCurrentUserId();
  if (!userId) return null;
  const result = await db.execute({
    sql: 'SELECT id, name, source, created_at, updated_at FROM resumes WHERE id = ? AND user_id = ?',
    args: [id, userId],
  });
  const row = result.rows[0];
  return row ? (JSON.parse(JSON.stringify(row)) as Resume) : null;
}

type ResumeWriteFailure = { ok: false; error: string };
const failure = (error: string): ResumeWriteFailure => ({ ok: false, error });
const reloadMessage = 'This master changed. Reload before saving your edits.';

export async function createResume(
  name: string,
  source: string = EMPTY_MASTER_TEMPLATE
): Promise<string | ResumeWriteFailure> {
  const userId = await getCurrentUserId();
  if (!userId) return failure('Sign in to create resumes.');
  const issue =
    careerCredentialIssue('Resume name', name) ?? careerCredentialIssue('Master resume', source);
  if (issue) return failure(issue);
  const id = uuid();
  await db.execute({
    sql: 'INSERT INTO resumes (id, name, source, user_id) VALUES (?, ?, ?, ?)',
    args: [id, name, source, userId],
  });
  revalidatePath('/');
  return id;
}

export async function updateResume(
  id: string,
  source: string,
  previousSource?: string
): Promise<undefined | ResumeWriteFailure> {
  const userId = await getCurrentUserId();
  if (!userId) return failure('Sign in to update resumes.');
  let expected = previousSource;
  if (careerCredentialIssue('Master resume', source)) {
    // Only the stored owner-bound value can exempt existing lines. Bind it to
    // the update so a concurrent edit cannot reintroduce a removed credential.
    const current = (
      await db.execute({
        sql: 'SELECT source FROM resumes WHERE id=? AND user_id=? AND archived_at IS NULL',
        args: [id, userId],
      })
    ).rows[0];
    if (
      typeof current?.source !== 'string' ||
      (expected !== undefined && expected !== current.source)
    )
      return failure(reloadMessage);
    expected = current.source;
    const issue = careerCredentialIssue('Master resume', source, expected);
    if (issue) return failure(issue);
  }
  const result = await db.execute({
    sql: 'UPDATE resumes SET source = ?, updated_at = unixepoch() WHERE id = ? AND user_id = ? AND archived_at IS NULL AND (? IS NULL OR source = ?)',
    args: [source, id, userId, expected ?? null, expected ?? null],
  });
  if (!result.rowsAffected) return failure(reloadMessage);
}

export async function renameResume(
  id: string,
  name: string
): Promise<undefined | ResumeWriteFailure> {
  const trimmed = name.trim();
  if (!trimmed) return failure('Resume name cannot be empty.');
  const userId = await getCurrentUserId();
  if (!userId) return failure('Sign in to rename resumes.');
  // An unchanged historical name needs no write. Every new name must pass validation.
  const issue = careerCredentialIssue('Resume name', trimmed);
  if (issue) {
    const same = await db.execute({
      sql: 'SELECT id FROM resumes WHERE id=? AND user_id=? AND archived_at IS NULL AND name=?',
      args: [id, userId, trimmed],
    });
    if (same.rows.length) return;
    return failure(issue);
  }
  const result = await db.execute({
    sql: 'UPDATE resumes SET name = ?, updated_at = unixepoch() WHERE id = ? AND user_id = ? AND archived_at IS NULL',
    args: [trimmed, id, userId],
  });
  if (!result.rowsAffected) return failure(reloadMessage);
  revalidatePath('/');
}
