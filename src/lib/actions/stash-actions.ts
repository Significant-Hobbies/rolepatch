'use server';

import { db } from '@/lib/db';
import { v4 as uuid } from 'uuid';
import type { StashEntry } from '@/lib/types';
import { revalidatePath } from 'next/cache';

export async function listStashEntries(): Promise<StashEntry[]> {
  const result = await db.execute('SELECT * FROM stash_entries ORDER BY category, created_at DESC');
  return JSON.parse(JSON.stringify(result.rows)) as StashEntry[];
}

export async function createStashEntry(
  category: string,
  label: string,
  content: string,
): Promise<string> {
  const id = uuid();
  await db.execute({
    sql: 'INSERT INTO stash_entries (id, category, label, content) VALUES (?, ?, ?, ?)',
    args: [id, category, label, content],
  });
  revalidatePath('/stash');
  return id;
}

export async function updateStashEntry(
  id: string,
  category: string,
  label: string,
  content: string,
): Promise<void> {
  await db.execute({
    sql: 'UPDATE stash_entries SET category = ?, label = ?, content = ?, updated_at = unixepoch() WHERE id = ?',
    args: [category, label, content, id],
  });
  revalidatePath('/stash');
}

export async function deleteStashEntry(id: string): Promise<void> {
  await db.execute({ sql: 'DELETE FROM stash_entries WHERE id = ?', args: [id] });
  revalidatePath('/stash');
}
