'use server';

import { findSharedAiBudgetDenied } from '@/lib/shared-ai-budget';
import { rewriteCareerFacts } from '@/lib/career-resume-rewrite';
import { getCurrentUserId } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import { composeCareerResume, type CareerFact } from '@/lib/career-resume-compose';
import {
  generationInput,
  versionInputs,
  renderVersionInput,
  type GenerationInput,
} from '@/lib/career-resume-tools';
import { extractPublicJob } from '@/lib/public-job-extraction';
import { markdownToHtml } from '@/lib/resume-html';
import { renderResumePdf } from '@/lib/resume-pdf';
import { DEFAULT_RENDER_CONFIG } from '@/lib/resume-templates';

interface Snapshot {
  generation_credits?: number;
  profile_revision?: number;
  jd_text?: string;
  job_url?: string;
  selected_record_ids?: string[];
  warnings?: string[];
  changes?: { record_id: string; revision: number; reason: string }[];
  render_settings?: typeof DEFAULT_RENDER_CONFIG;
  target_pages?: 1 | 2;
}
interface Version {
  id: string;
  profile_id: string;
  application_id: string | null;
  series_id: string;
  revision: number;
  markdown: string;
  snapshot_json: string;
  request_hash: string;
  created_at: number;
  saved: number;
  approved: number;
  archived: number;
}
const fail = (code: string, error: string) => ({ ok: false as const, code, error });
const oneDay = 86400;
const now = () => Math.floor(Date.now() / 1000);

function output(row: Version) {
  const snapshot: Snapshot = JSON.parse(row.snapshot_json);
  return {
    ok: true as const,
    id: row.id,
    version_id: row.saved ? row.id : null,
    draft_id: row.id,
    revision: row.revision,
    series_id: row.series_id,
    profile_id: row.profile_id,
    application_id: row.application_id,
    saved: !!row.saved,
    approved: !!row.approved,
    archived: !!row.archived,
    requires_review: !row.approved,
    markdown: row.markdown,
    selected_record_ids: snapshot.selected_record_ids ?? [],
    warnings: snapshot.warnings ?? [],
    changes: snapshot.changes ?? [],
    snapshot,
  };
}

async function version(owner: string, id: string, savedOnly = true) {
  const result = await db.execute({
    sql: `SELECT * FROM career_resume_versions WHERE user_id=? AND id=? ${savedOnly ? 'AND saved=1' : ''}`,
    args: [owner, id],
  });
  return result.rows[0] as unknown as Version | undefined;
}
async function byRequest(owner: string, request: string) {
  const result = await db.execute({
    sql: 'SELECT * FROM career_resume_versions WHERE user_id=? AND request_id=?',
    args: [owner, request],
  });
  return result.rows[0] as unknown as Version | undefined;
}
async function hash(operation: string, input: unknown) {
  const bytes = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(JSON.stringify([operation, input]))
  );
  return Buffer.from(bytes).toString('hex');
}
async function formatted(row: Version, format: string, replayed: boolean) {
  const versionOutput = output(row);
  const result = {
    ...versionOutput,
    generation_credits: versionOutput.snapshot.generation_credits ?? 0,
    credits_charged: replayed ? 0 : (versionOutput.snapshot.generation_credits ?? 0),
    replayed,
  };
  if (format === 'html')
    return {
      ...result,
      html: markdownToHtml(row.markdown, 'Resume', result.snapshot.render_settings),
    };
  if (format === 'pdf') {
    try {
      return {
        ...result,
        pdf: await renderResumePdf(row.markdown, result.snapshot.render_settings),
      };
    } catch {
      return {
        ...result,
        ...fail(
          'pdf_render_failed',
          'The draft is available. Retry render by Markdown or saved version ID at no charge.'
        ),
      };
    }
  }
  return result;
}
async function generate(owner: string, input: GenerationInput) {
  const signature = await hash('generate', input);
  // Discard expired unsaved content while retaining a tombstone so a late retry cannot debit again.
  await db.execute({
    sql: "UPDATE career_resume_versions SET markdown='', snapshot_json='{}' WHERE user_id=? AND saved=0 AND markdown<>'' AND created_at<=?",
    args: [owner, now() - oneDay],
  });
  const replay = async (row: Version) => {
    if (row.request_hash !== signature)
      return fail('conflict', 'That request ID belongs to another request.');
    if (!row.markdown)
      return fail(
        'draft_expired',
        'This unsaved draft expired. A new generation requires a new request ID.'
      );
    return formatted(row, input.format, true);
  };
  const cached = await byRequest(owner, input.request_id);
  if (cached) return replay(cached);
  const profile = (
    await db.execute({
      sql: `SELECT id,source,revision FROM resumes WHERE user_id=? AND archived_at IS NULL AND ${input.profile_id ? 'id=?' : 'is_default=1'}`,
      args: input.profile_id ? [owner, input.profile_id] : [owner],
    })
  ).rows[0];
  if (!profile) return fail('not_found', 'Select an active profile or set a default.');
  let jd = input.jd_text?.trim() ?? '';
  let jobUrl = input.job_url ?? '';
  if (input.application_id) {
    const job = (
      await db.execute({
        sql: 'SELECT jd_text,url FROM job_applications WHERE id=? AND user_id=?',
        args: [input.application_id, owner],
      })
    ).rows[0];
    if (!job) return fail('not_found', 'Application not found.');
    jd ||= String(job.jd_text || '');
    jobUrl ||= String(job.url || '');
  }
  if (!jd && jobUrl) {
    try {
      jd = await extractPublicJob(jobUrl);
    } catch {
      return fail('generation_failed', 'Could not read the posting. Supply jd_text and retry.');
    }
  }
  // Keyset reads handle large profiles without returning private answers or private notes.
  const facts: CareerFact[] = [];
  let cursor = '';
  for (;;) {
    const rows = (
      await db.execute({
        sql: `SELECT id,kind,title,data_json,revision FROM career_records
      WHERE user_id=? AND profile_id=? AND archived_at IS NULL AND sensitive=0
      AND kind IN ('identity','employment','project','achievement','education','skill')
      AND id>? ORDER BY id LIMIT 100`,
        args: [owner, String(profile.id), cursor],
      })
    ).rows;
    facts.push(
      ...rows.map((r) => ({
        id: String(r.id),
        kind: String(r.kind),
        title: String(r.title),
        revision: Number(r.revision),
        data: JSON.parse(String(r.data_json)),
      }))
    );
    if (rows.length < 100) break;
    cursor = String(rows.at(-1)!.id);
  }
  const profileInfo = {
    id: String(profile.id),
    source: String(profile.source),
    revision: Number(profile.revision),
  };
  const compose = (overrides?: ReadonlyMap<string, string>) =>
    composeCareerResume(profileInfo, facts, input, jd, overrides);
  let draft: ReturnType<typeof compose>;
  try {
    draft = compose();
  } catch (error) {
    return fail(
      'invalid_input',
      error instanceof Error ? error.message : 'Unable to select records.'
    );
  }
  const id = crypto.randomUUID();
  let charge = 0;
  let lease = false;
  const selected = facts.filter(
    (f) =>
      f.kind === 'achievement' &&
      draft.selected_record_ids.includes(f.id) &&
      f.data.individual_contribution
  );
  if (input.mode === 'grounded_rewrite' && selected.length) {
    const balance = (
      await db.execute({ sql: 'SELECT balance FROM token_balances WHERE user_id=?', args: [owner] })
    ).rows[0];
    if (Number(balance?.balance ?? 0) < 1)
      return fail(
        'insufficient_tokens',
        'One credit is required for an AI rewrite. Fixed wording is free.'
      );
    const acquired = await db.execute({
      sql: `INSERT INTO career_resume_requests(user_id,request_id,request_hash,lease_id,expires_at)
      VALUES(?,?,?,?,?) ON CONFLICT(user_id,request_id) DO UPDATE SET expires_at=excluded.expires_at,lease_id=excluded.lease_id
      WHERE career_resume_requests.expires_at<=unixepoch() AND career_resume_requests.request_hash=excluded.request_hash`,
      args: [owner, input.request_id, signature, id, now() + 90],
    });
    if (!acquired.rowsAffected) {
      const completed = await byRequest(owner, input.request_id);
      return completed
        ? replay(completed)
        : fail(
            'conflict',
            'This request ID is already in use. Retry the same request after the ongoing generation finishes.'
          );
    }
    lease = true;
    const finished = await byRequest(owner, input.request_id);
    if (finished) {
      await db.execute({
        sql: 'DELETE FROM career_resume_requests WHERE user_id=? AND request_id=? AND lease_id=?',
        args: [owner, input.request_id, id],
      });
      return replay(finished);
    }
    try {
      const rewrites = await rewriteCareerFacts(selected, [input.emphasis, jd].join('\n'));
      if (rewrites.size) {
        const enhanced = compose(rewrites);
        if (enhanced.markdown !== draft.markdown) {
          draft = enhanced;
          charge = 1;
        }
      }
      if (!charge) draft.warnings.push('The approved wording already fits. No credit was charged.');
    } catch (error) {
      if (findSharedAiBudgetDenied(error)) {
        await db.execute({
          sql: 'DELETE FROM career_resume_requests WHERE user_id=? AND request_id=? AND lease_id=?',
          args: [owner, input.request_id, id],
        });
        return fail(
          'rate_limited',
          'The shared AI budget is unavailable. Retry later or use fixed wording at no charge.'
        );
      }
      draft.warnings.push(
        'The AI rewrite was unavailable or could not be grounded. Returned fixed wording at no charge.'
      );
    }
  } else if (input.mode === 'grounded_rewrite')
    draft.warnings.push(
      'Add a verified individual contribution for a rewrite. Returned fixed wording at no charge.'
    );
  const { markdown, ...provenance } = draft;
  const snapshot = JSON.stringify({
    ...provenance,
    generation_credits: charge,
    profile_revision: profile.revision,
    application_id: input.application_id ?? null,
    jd_text: jd,
    job_url: jobUrl,
    target_pages: input.target_pages,
    mode: input.mode,
    emphasis: input.emphasis,
    pin_ids: input.pin_ids,
    exclude_ids: input.exclude_ids,
    render_settings: DEFAULT_RENDER_CONFIG,
  });
  const [insert] = await db.batch([
    {
      sql: `INSERT INTO career_resume_versions(id,user_id,profile_id,application_id,series_id,revision,markdown,snapshot_json,saved,request_id,request_hash)
      SELECT ?,?,r.id,?,?,1,?,?,?,?,? FROM resumes r LEFT JOIN token_balances b ON b.user_id=r.user_id
      WHERE r.id=? AND r.user_id=? AND r.revision=? AND r.archived_at IS NULL AND COALESCE(b.balance,0)>=?
      AND (?=0 OR EXISTS(SELECT 1 FROM career_resume_requests q WHERE q.user_id=r.user_id AND q.request_id=? AND q.lease_id=?))
      AND (? IS NULL OR EXISTS(SELECT 1 FROM job_applications WHERE id=? AND user_id=?))
      ON CONFLICT(user_id,request_id) DO NOTHING`,
      args: [
        id,
        owner,
        input.application_id ?? null,
        id,
        markdown,
        snapshot,
        Number(input.save_to_history),
        input.request_id,
        signature,
        String(profile.id),
        owner,
        Number(profile.revision),
        charge,
        Number(lease),
        input.request_id,
        id,
        input.application_id ?? null,
        input.application_id ?? null,
        owner,
      ],
    },
    {
      sql: `UPDATE token_balances SET balance=balance-1,total_used=total_used+1,updated_at=unixepoch()
      WHERE ?=1 AND user_id=? AND EXISTS (SELECT 1 FROM career_resume_versions WHERE user_id=? AND id=?)`,
      args: [charge, owner, owner, id],
    },
    {
      sql: `INSERT INTO token_transactions(id,user_id,amount,type,reference_id,balance_after)
      SELECT ?,user_id,-1,'tailor',?,balance FROM token_balances WHERE user_id=? AND ?=1 AND
      EXISTS(SELECT 1 FROM career_resume_versions WHERE user_id=? AND id=?)`,
      args: [crypto.randomUUID(), id, owner, charge, owner, id],
    },
  ]);
  if (lease)
    await db.execute({
      sql: 'DELETE FROM career_resume_requests WHERE user_id=? AND request_id=? AND lease_id=?',
      args: [owner, input.request_id, id],
    });
  const stored = await byRequest(owner, input.request_id);
  if (!stored) {
    const balance = (
      await db.execute({ sql: 'SELECT balance FROM token_balances WHERE user_id=?', args: [owner] })
    ).rows[0];
    return Number(balance?.balance ?? 0) < charge
      ? fail('insufficient_tokens', 'One generation credit is required.')
      : fail('conflict', 'The profile or application changed. Retry with its current data.');
  }
  return insert.rowsAffected === 1 ? formatted(stored, input.format, false) : replay(stored);
}
async function append(
  owner: string,
  operation: 'save' | 'update' | 'archive',
  input: {
    request_id: string;
    draft_id?: string;
    version_id?: string;
    expected_revision?: number;
    markdown?: string;
    approved?: boolean;
  }
) {
  const signature = await hash(operation, input);
  const replay = async (row: Version) =>
    row.request_hash === signature
      ? output(row)
      : fail('conflict', 'That request ID belongs to another request.');
  const cached = await byRequest(owner, input.request_id);
  if (cached) return replay(cached);
  const prior = await version(owner, (input.draft_id ?? input.version_id)!, operation !== 'save');
  if (!prior) return fail('not_found', 'Resume revision not found.');
  if (
    operation === 'save' &&
    (!prior.markdown || (!prior.saved && prior.created_at <= now() - oneDay))
  )
    return fail('draft_expired', 'This draft expired.');
  if (prior.archived || (operation === 'save' && prior.saved))
    return fail('conflict', 'Choose a current, unarchived draft or version.');
  if (operation === 'update' && input.markdown === undefined && input.approved === undefined)
    return fail('invalid_input', 'Supply edited Markdown or an approval decision.');
  if (input.expected_revision !== undefined && input.expected_revision !== prior.revision)
    return fail('conflict', 'The expected revision is stale.');
  const id = crypto.randomUUID();
  const args = [
    id,
    input.markdown ?? prior.markdown,
    Number(input.approved ?? (input.markdown === undefined && !!prior.approved)),
    Number(operation === 'archive'),
    input.request_id,
    signature,
    owner,
    prior.id,
    prior.series_id,
    owner,
    prior.revision,
  ];
  await db.execute({
    sql: `INSERT INTO career_resume_versions(id,user_id,profile_id,application_id,series_id,revision,markdown,snapshot_json,saved,approved,archived,request_id,request_hash)
    SELECT ?,user_id,profile_id,application_id,series_id,revision+1,?,snapshot_json,1,?,?,?,? FROM career_resume_versions
    WHERE user_id=? AND id=? AND NOT EXISTS (SELECT 1 FROM career_resume_versions WHERE series_id=? AND user_id=? AND revision>?)
    ON CONFLICT DO NOTHING`,
    args,
  });
  const persisted = await byRequest(owner, input.request_id);
  return persisted
    ? replay(persisted)
    : fail('conflict', 'A newer revision exists. Read the current version before editing.');
}

export async function callCareerResume(name: string, args: unknown) {
  const owner = await getCurrentUserId();
  if (!owner) return fail('unauthenticated', 'Sign in to use career resume versions.');
  try {
    switch (name) {
      case 'rolepatch_generate_resume':
        return await generate(owner, generationInput.parse(args));
      case 'rolepatch_resume_versions_list': {
        const input = versionInputs.list.parse(args);
        const where = ['v.user_id=?', 'v.saved=1'];
        const values: Array<string | number> = [owner];
        if (input.profile_id) {
          where.push('v.profile_id=?');
          values.push(input.profile_id);
        }
        if (!input.include_archived)
          where.push(
            'NOT EXISTS(SELECT 1 FROM career_resume_versions a WHERE a.user_id=v.user_id AND a.series_id=v.series_id AND a.archived=1)'
          );
        if (input.cursor) {
          const anchor = await version(owner, input.cursor);
          if (!anchor) return fail('invalid_input', 'Invalid history cursor.');
          where.push('(v.created_at,v.id)<(?,?)');
          values.push(anchor.created_at, anchor.id);
        }
        const rows = (
          await db.execute({
            sql: `SELECT v.id,v.series_id,v.profile_id,v.application_id,v.revision,v.approved,v.archived,v.created_at
          FROM career_resume_versions v WHERE ${where.join(' AND ')} ORDER BY v.created_at DESC,v.id DESC LIMIT ?`,
            args: [...values, input.limit + 1],
          })
        ).rows;
        const versions = rows.slice(0, input.limit).map((row) => ({
          id: String(row.id),
          series_id: String(row.series_id),
          profile_id: String(row.profile_id),
          application_id: row.application_id ? String(row.application_id) : null,
          revision: Number(row.revision),
          approved: !!row.approved,
          archived: !!row.archived,
          created_at: Number(row.created_at),
        }));
        return {
          ok: true as const,
          versions,
          next_cursor: rows.length > input.limit ? versions.at(-1)!.id : null,
        };
      }
      case 'rolepatch_resume_versions_get':
      case 'rolepatch_render_resume_pdf': {
        const input = renderVersionInput.parse(args);
        const row = await version(owner, input.version_id);
        if (!row) return fail('not_found', 'Saved version not found.');
        const result = output(row);
        if (name === 'rolepatch_resume_versions_get') return result;
        try {
          return {
            ...result,
            credits_charged: 0,
            pdf: await renderResumePdf(row.markdown, result.snapshot.render_settings),
          };
        } catch {
          return {
            ...result,
            ...fail(
              'pdf_render_failed',
              'Could not render this version. Retry export at no charge.'
            ),
          };
        }
      }
      case 'rolepatch_resume_versions_save':
        return await append(owner, 'save', versionInputs.save.parse(args));
      case 'rolepatch_resume_versions_update':
        return await append(owner, 'update', versionInputs.update.parse(args));
      case 'rolepatch_resume_versions_archive':
        return await append(owner, 'archive', versionInputs.archive.parse(args));
      default:
        return fail('invalid_input', 'Unknown resume operation.');
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError')
      return fail('invalid_input', 'Invalid arguments. Check the tool schema and retry.');
    return fail(
      'generation_failed',
      'Resume service is unavailable. Retry with the same request ID.'
    );
  }
}
