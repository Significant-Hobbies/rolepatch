'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getCurrentUserId } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import type { TailorChange, TailoredResume } from '@/lib/types';

const historySchema = z
  .object({
    resume_id: z.string().min(1).max(200).optional(),
    resume_source: z.string().min(20).max(20_000).optional(),
    job_id: z.string().min(1).max(200).optional(),
    job_url: z.string().max(2048).default(''),
    company: z.string().max(200).default(''),
    role: z.string().max(200).default(''),
    jd_text: z.string().min(1).max(15_000),
    source: z.string().min(20).max(50_000),
    changes: z
      .array(
        z.object({
          snippet: z.string().max(2000),
          reason: z.string().max(2000),
          jd_match: z.string().max(2000).optional(),
        })
      )
      .max(100)
      .default([]),
  })
  .strict();

/** Immutable generated/saved versions. Never marks a job submitted or changes a later stage. */
export async function recordResumeHistory(raw: z.input<typeof historySchema>) {
  const input = historySchema.parse(raw);
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('Sign in to save resume history');
  const statements: Array<{ sql: string; args: Array<string | number> }> = [];
  let resumeId = input.resume_id;
  if (resumeId) {
    const owned = await db.execute({
      sql: 'SELECT id FROM resumes WHERE id = ? AND user_id = ?',
      args: [resumeId, userId],
    });
    if (!owned.rows.length) throw new Error('Resume not found');
  } else {
    if (!input.resume_source) throw new Error('A master resume is required');
    const matching = await db.execute({
      sql: 'SELECT id FROM resumes WHERE source = ? AND user_id = ? ORDER BY updated_at DESC LIMIT 1',
      args: [input.resume_source, userId],
    });
    resumeId = matching.rows[0]?.id as string | undefined;
    if (!resumeId) {
      resumeId = crypto.randomUUID();
      statements.push({
        sql: 'INSERT INTO resumes (id, name, source, user_id) VALUES (?, ?, ?, ?)',
        args: [resumeId, 'API master resume', input.resume_source, userId],
      });
    }
  }
  let jobId = input.job_id;
  if (jobId) {
    const owned = await db.execute({
      sql: 'SELECT id, jd_text FROM job_applications WHERE id = ? AND user_id = ?',
      args: [jobId, userId],
    });
    if (!owned.rows.length) throw new Error('Job not found');
    if (String(owned.rows[0].jd_text).trim() !== input.jd_text.trim())
      throw new Error('Job description changed; generate a new job record');
  } else {
    jobId = crypto.randomUUID();
    statements.push({
      sql: `INSERT INTO job_applications (id, resume_id, url, company, role, jd_raw, jd_text, user_id)
            SELECT ?, r.id, ?, ?, ?, ?, ?, ? FROM resumes r WHERE r.id = ? AND r.user_id = ?`,
      args: [
        jobId,
        input.job_url,
        input.company,
        input.role,
        input.jd_text,
        input.jd_text,
        userId,
        resumeId,
        userId,
      ],
    });
  }
  const id = crypto.randomUUID();
  const insertIndex = statements.length;
  statements.push({
    sql: `INSERT INTO tailored_resumes (id, job_id, resume_id, source, changes_json, user_id)
          SELECT ?, j.id, r.id, ?, ?, ? FROM job_applications j JOIN resumes r ON r.id = ? AND r.user_id = ?
          WHERE j.id = ? AND j.user_id = ?`,
    args: [
      id,
      input.source,
      JSON.stringify(input.changes),
      userId,
      resumeId,
      userId,
      jobId,
      userId,
    ],
  });
  statements.push({
    sql: `UPDATE job_applications SET status = CASE WHEN status = 'draft' THEN 'tailored' ELSE status END, updated_at = unixepoch()
          WHERE id = ? AND user_id = ? AND EXISTS (SELECT 1 FROM tailored_resumes WHERE id = ? AND user_id = ?)`,
    args: [jobId, userId, id, userId],
  });
  const results = await db.batch(statements);
  if (results[insertIndex].rowsAffected !== 1) throw new Error('Resume history was not saved');
  revalidatePath('/dashboard');
  return {
    id,
    job_id: jobId,
    resume_id: resumeId,
    saved: true as const,
    view_url: `/tailor/${encodeURIComponent(jobId)}?version=${encodeURIComponent(id)}`,
  };
}

export async function listResumeHistory(): Promise<TailoredResume[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];
  const result = await db.execute({
    sql: `SELECT tr.* FROM tailored_resumes tr JOIN job_applications j ON j.id = tr.job_id AND j.user_id = tr.user_id
          WHERE tr.user_id = ? ORDER BY tr.created_at DESC, tr.rowid DESC`,
    args: [userId],
  });
  return result.rows.map((row) => {
    let changes: TailorChange[] = [];
    try {
      const parsed = JSON.parse(String(row.changes_json ?? '[]'));
      if (Array.isArray(parsed)) changes = parsed;
    } catch {
      /* Historic malformed explanations do not hide the resume. */
    }
    return {
      id: String(row.id),
      job_id: String(row.job_id),
      resume_id: String(row.resume_id),
      source: String(row.source),
      accepted: Number(row.accepted),
      created_at: Number(row.created_at),
      updated_at: Number(row.updated_at),
      changes,
    };
  });
}
