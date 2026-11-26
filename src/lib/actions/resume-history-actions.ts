'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getCurrentUserId } from '@/lib/auth-utils';
import { careerCredentialIssue } from '@/lib/career-data-privacy';
import { db } from '@/lib/db';
import { legacyApplicationIdentity } from '@/lib/tracker-store';
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
  const statements: Array<{ sql: string; args: Array<string | number | null> }> = [];
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
      const issue = careerCredentialIssue('Inline master resume', input.resume_source);
      if (issue) throw new Error(issue);
      resumeId = crypto.randomUUID();
      statements.push({
        sql: 'INSERT INTO resumes (id, name, source, user_id) VALUES (?, ?, ?, ?)',
        args: [resumeId, 'API master resume', input.resume_source, userId],
      });
    }
  }
  const identity = input.job_id
    ? { id: input.job_id, url: null }
    : await legacyApplicationIdentity(userId, input.job_url);
  let jobId = identity.id;
  if (input.job_id) {
    const owned = await db.execute({
      sql: 'SELECT id, jd_text FROM job_applications WHERE id = ? AND user_id = ?',
      args: [input.job_id, userId],
    });
    if (!owned.rows.length) throw new Error('Job not found');
    if (String(owned.rows[0].jd_text).trim() !== input.jd_text.trim())
      throw new Error('Job description changed; generate a new version from the saved description');
  } else if (!jobId) {
    jobId = crypto.randomUUID();
    statements.push({
      sql: `INSERT INTO job_applications (id, resume_id, url, company, role, jd_raw, jd_text, user_id, normalized_url)
            SELECT ?, r.id, ?, ?, ?, ?, ?, ?, ? FROM resumes r WHERE r.id = ? AND r.user_id = ? ON CONFLICT DO NOTHING`,
      args: [
        jobId,
        input.job_url,
        input.company,
        input.role,
        input.jd_text,
        input.jd_text,
        userId,
        identity.url,
        resumeId,
        userId,
      ],
    });
  }
  const id = crypto.randomUUID();
  statements.push({
    // NOT NULL job/master columns abort the entire batch if an owned relation vanished.
    // A concurrent URL intake may have won the unique key since the lookup.
    sql: `INSERT INTO tailored_resumes (id,job_id,resume_id,source,changes_json,user_id,jd_snapshot)
          VALUES (?,(SELECT id FROM job_applications WHERE user_id=? AND id=COALESCE(
                  (SELECT id FROM job_applications WHERE user_id=? AND normalized_url=?),?)),
                    (SELECT id FROM resumes WHERE user_id=? AND id=?),?,?,?,?)`,
    args: [
      id,
      userId,
      userId,
      identity.url,
      jobId,
      userId,
      resumeId,
      input.source,
      JSON.stringify(input.changes),
      userId,
      input.jd_text,
    ],
  });
  statements.push({
    sql: `UPDATE job_applications SET status=CASE WHEN status='draft' THEN 'tailored' ELSE status END,
           normalized_url=COALESCE(normalized_url,?),jd_text=CASE WHEN jd_text='' THEN ? ELSE jd_text END,
           jd_raw=CASE WHEN jd_raw='' THEN ? ELSE jd_raw END,updated_at=unixepoch()
         WHERE user_id=? AND id=(SELECT job_id FROM tailored_resumes WHERE id=? AND user_id=?)`,
    args: [identity.url, input.jd_text, input.jd_text, userId, id, userId],
  });
  statements.push({
    sql: 'SELECT job_id FROM tailored_resumes WHERE id=? AND user_id=?',
    args: [id, userId],
  });
  const results = await db.batch(statements);
  const savedJobId = results.at(-1)?.rows[0]?.job_id;
  if (typeof savedJobId !== 'string') throw new Error('Resume history was not saved');
  jobId = savedJobId;
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
