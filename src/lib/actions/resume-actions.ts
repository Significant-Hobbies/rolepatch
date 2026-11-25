'use server';

import { revalidatePath } from 'next/cache';
import { v4 as uuid } from 'uuid';

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

export async function createResume(
  name: string,
  source: string = EMPTY_MASTER_TEMPLATE
): Promise<string> {
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

export async function updateResume(
  id: string,
  source: string,
  previousSource?: string
): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('Sign in to update resumes');
  const result = await db.execute({
    sql: 'UPDATE resumes SET source = ?, updated_at = unixepoch() WHERE id = ? AND user_id = ? AND archived_at IS NULL AND (? IS NULL OR source = ?)',
    args: [source, id, userId, previousSource ?? null, previousSource ?? null],
  });
  if (!result.rowsAffected)
    throw new Error('This master changed. Reload before saving your edits.');
}

export async function renameResume(id: string, name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Resume name cannot be empty');
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('Sign in to rename resumes');
  await db.execute({
    sql: 'UPDATE resumes SET name = ?, updated_at = unixepoch() WHERE id = ? AND user_id = ?',
    args: [trimmed, id, userId],
  });
  revalidatePath('/');
}
