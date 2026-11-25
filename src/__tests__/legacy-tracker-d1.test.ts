// @vitest-environment node
import { readFileSync, readdirSync } from 'node:fs';
import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import { getPlatformProxy, unstable_splitSqlQuery } from 'wrangler';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import {
  createJobApplication,
  saveTailoredResume,
  listJobApplications,
} from '@/lib/actions/job-actions';
import { tailorResumeFromReference } from '@/lib/actions/resume-assistant-actions';
import { captureExtensionOpening } from '@/lib/saved-job';
import { callTracker } from '@/lib/actions/tracker-records';

let platform: Awaited<ReturnType<typeof getPlatformProxy>>;
vi.mock('@opennextjs/cloudflare', () => ({ getCloudflareContext: () => ({ env: platform.env }) }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/auth-utils', () => ({ getCurrentUserId: async () => 'owner' }));
const draft = '# Alex\n## Experience\n- Built a TypeScript service.';
vi.mock('@/lib/actions/tailor-action', () => ({
  tailorResumeForClient: async () => ({ success: true, data: { tailored: draft, changes: [] } }),
}));
const description =
  'Maintain TypeScript data services, improve response times, and manage observability for the infrastructure team.';

beforeAll(async () => {
  platform = await getPlatformProxy({
    configPath: '__tests__/fixtures/legacy-tracker/wrangler.json',
    persist: false,
  });
  for (const file of readdirSync('migrations')
    .filter((f) => f.endsWith('.sql'))
    .sort()) {
    await db.batch(unstable_splitSqlQuery(readFileSync(`migrations/${file}`, 'utf8')));
  }
  await db.execute("INSERT INTO users(id,email) VALUES('owner','owner@example.invalid')");
  await db.execute({
    sql: "INSERT INTO resumes(id,user_id,name,source) VALUES('master','owner','Master',?)",
    args: [draft],
  });
}, 30000);
afterAll(async () => {
  await platform?.dispose();
});
it('returns the committed legacy Save and immutable JD even when D1 counts trigger writes', async () => {
  const url = 'https://jobs.example.org/same?id=100';
  const job = await callTracker('rolepatch_applications_create', {
    request_id: 'ref-100',
    company: 'Example',
    role: 'Engineer',
    url,
  });
  if (!job.ok) throw new Error(job.error);
  const tailor = (jd: string) =>
    tailorResumeFromReference({
      resume_id: 'master',
      job_url: url,
      jd_text: jd,
      save_to_history: true,
    });
  const first = await tailor(description);
  expect(first).toMatchObject({
    ok: true,
    persisted: true,
    history: { saved: true, job_id: job.id },
  });
  const updated = `${description} It now also requires Python.`;
  const second = await tailor(updated);
  expect(second).toMatchObject({
    ok: true,
    persisted: true,
    history: { saved: true, job_id: job.id },
  });
  const web = await saveTailoredResume(job.id!, 'master', draft);
  const mirrored = await db.execute({
    sql: `SELECT id,markdown,json_extract(snapshot_json,'$.jd_text') AS jd FROM career_resume_versions
    WHERE user_id='owner' AND application_id=? ORDER BY rowid`,
    args: [job.id!],
  });
  expect(mirrored.rows.map((r) => r.jd)).toEqual([description, updated, description]);
  expect(mirrored.rows[2]).toMatchObject({ id: web, markdown: draft });
  // The real D1 binding counts the mirrored career_resume_versions insertion as a second write.
  const direct = await db.execute({
    sql: `INSERT INTO tailored_resumes(id,user_id,resume_id,job_id,source,jd_snapshot)
    VALUES('probe','owner','master',?,?,?)`,
    args: [job.id!, draft, description],
  });
  expect(direct.rowsAffected).toBeGreaterThan(1);
});
it('resolves legacy duplicate URLs across extension, Jobs and history while retaining every old artifact', async () => {
  const url = 'https://jobs.example.org/same?id=200';
  for (const [id, created] of [
    ['dup-first', 1],
    ['dup-later', 2],
  ] as const) {
    await db.execute({
      sql: `INSERT INTO job_applications (id,user_id,resume_id,url,company,role,jd_text,notes,created_at)
      VALUES (?,'owner','master',?,'Example','Engineer',?,'Candidate note',?)`,
      args: [id, `${url}&utm_medium=email`, description, created],
    });
    await saveTailoredResume(id, 'master', `${draft} ${id}`);
  }
  const capture = await captureExtensionOpening('owner', {
    url: `${url}&utm_source=mail`,
    title: 'Engineer',
    company: 'Example',
    jdText: description,
  });
  expect(capture).toEqual({ id: 'dup-first', existing: true });
  const fresh = `${description} Fresh posting.`;
  expect(
    await createJobApplication(
      'master',
      url,
      'Example',
      'Engineer II',
      fresh,
      fresh,
      undefined,
      'manual'
    )
  ).toBe('dup-first');
  const saved = await tailorResumeFromReference({
    resume_id: 'master',
    job_url: url,
    jd_text: fresh,
    save_to_history: true,
  });
  expect(saved).toMatchObject({ ok: true, history: { job_id: 'dup-first', saved: true } });
  const snapshots = await db.execute(
    "SELECT application_id,markdown FROM career_resume_versions WHERE application_id IN ('dup-first','dup-later')"
  );
  expect(snapshots.rows.map((r) => r.markdown)).toEqual(
    expect.arrayContaining([`${draft} dup-first`, `${draft} dup-later`])
  );
  await db.execute(
    "UPDATE job_applications SET status='rejected',stage='withdrawn',revision=revision+1 WHERE id='dup-first'"
  );
  expect(
    await createJobApplication(
      'master',
      url,
      'Example',
      'Engineer II',
      fresh,
      fresh,
      'Source: referral'
    )
  ).toBe('dup-first');
  const restored = (await listJobApplications()).find((j) => j.id === 'dup-first');
  expect(restored).toMatchObject({
    role: 'Engineer II',
    jd_text: fresh,
    notes: 'Candidate note\n\nSource: referral',
    status: 'draft',
  });
  const conflict = await callTracker('rolepatch_applications_create', {
    company: 'Changed employer',
    role: 'Engineer II',
    url,
    request_id: 'wrong',
  });
  expect(conflict).toMatchObject({
    ok: false,
    code: 'conflict',
    id: 'dup-first',
    revision: expect.any(Number),
  });
});

it('uses a legacy path-only LinkedIn job for extension capture, packet and fill receipt across visits', async () => {
  const path = 'https://www.linkedin.com/jobs/view/123456';
  await db.execute({
    sql: "INSERT INTO job_applications(id,user_id,resume_id,url,company,role) VALUES('ext-legacy','owner','master',?,'Example','Engineer')",
    args: [path],
  });
  const { POST: save } = await import('@/app/api/extension/save-job/route');
  const { POST: packet } = await import('@/app/api/extension/apply-packet/route');
  const { POST: receipt } = await import('@/app/api/extension/fill-receipt/route');
  const req = (url: string, input = {}) =>
    new NextRequest('https://rolepatch.example.invalid/', {
      method: 'POST',
      body: JSON.stringify({ url, ...input }),
    });
  for (const ref of ['a', 'b']) {
    const url = `${path}/?refId=${ref}&trackingId=xyz`;
    expect(
      await (await save(req(url, { jd_text: description, queue: false }))).json()
    ).toMatchObject({ existing: true, job_id: 'ext-legacy' });
    expect(await (await packet(req(url))).json()).toMatchObject({
      ok: true,
      packet: { job_id: 'ext-legacy' },
    });
    expect((await receipt(req(url, { job_id: 'ext-legacy' }))).status).toBe(200);
  }
  expect(
    (
      await db.execute(
        "SELECT id FROM job_applications WHERE url LIKE '%linkedin.com/jobs/view/123456%'"
      )
    ).rows
  ).toHaveLength(1);
});

it('preserves existing posting details, stage and profile on discovery, and adds each type of note once', async () => {
  const url = 'https://jobs.example.org/active';
  await db.execute("INSERT INTO resumes(id,user_id,name) VALUES('another','owner','Alt')");
  const id = await createJobApplication(
    'master',
    url,
    'Example',
    'Engineer',
    description,
    description
  );
  await db.execute({
    sql: "UPDATE job_applications SET status='applied',notes='User note' WHERE id=?",
    args: [id],
  });
  for (const preview of ['', 'Short teaser']) {
    expect(
      await createJobApplication(
        'another',
        url,
        'Unknown Company',
        'Untitled Role',
        preview,
        preview
      )
    ).toBe(id);
  }
  for (const note of [
    'RolePatch semantic match: 80%',
    'RolePatch semantic match: 95%',
    'RolePatch discovery alert: first',
    'RolePatch discovery alert.',
  ]) {
    expect(
      await createJobApplication('another', url, 'Other', 'Other', 'snippet', 'snippet', note)
    ).toBe(id);
  }
  expect(
    (await db.execute({ sql: 'SELECT * FROM job_applications WHERE id=?', args: [id] })).rows[0]
  ).toMatchObject({
    resume_id: 'master',
    status: 'applied',
    company: 'Example',
    role: 'Engineer',
    jd_raw: description,
    jd_text: description,
    notes: 'User note\n\nRolePatch semantic match: 80%\n\nRolePatch discovery alert: first',
  });
  await createJobApplication(
    'another',
    url,
    'Unknown Company',
    'Untitled Role',
    'Edited',
    'Edited',
    undefined,
    'manual'
  );
  expect(
    (await db.execute({ sql: 'SELECT * FROM job_applications WHERE id=?', args: [id] })).rows[0]
  ).toMatchObject({
    company: 'Example',
    role: 'Engineer',
    resume_id: 'another',
    jd_text: 'Edited',
  });
});
