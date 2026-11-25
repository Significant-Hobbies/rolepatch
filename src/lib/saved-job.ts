import { db } from '@/lib/db';
import { legacyApplicationIdentity } from '@/lib/tracker-store';

type Opening = {
  resumeId: string;
  url: string;
  company: string;
  role: string;
  jdRaw: string;
  jdText: string;
};
type SaveMode = 'add' | 'capture' | 'queue';

/** All signed-in legacy intake paths resolve the same opening before changing current job data. */
export async function saveOwnedOpening(
  owner: string,
  opening: Opening,
  mode: SaveMode,
  note: string | null = null
) {
  const { resumeId, url, company, role, jdRaw, jdText } = opening;
  const identity = await legacyApplicationIdentity(owner, url);
  let jobId = identity.id;
  if (!jobId) {
    const id = crypto.randomUUID();
    const insert = await db.execute({
      sql: `INSERT INTO job_applications (id,resume_id,url,normalized_url,company,role,jd_raw,jd_text,user_id,notes)
      SELECT ?,r.id,?,?,?,?,?,?,?,? FROM resumes r WHERE r.id=? AND r.user_id=? AND r.archived_at IS NULL
      ON CONFLICT DO NOTHING`,
      args: [
        id,
        mode === 'capture' ? (identity.url ?? url) : url,
        identity.url,
        company,
        role,
        jdRaw,
        jdText,
        owner,
        note,
        resumeId,
        owner,
      ],
    });
    if (insert.rowsAffected > 0) return { id, existing: false };
    jobId = (await legacyApplicationIdentity(owner, url)).id;
  }
  if (!jobId) throw new Error('Resume or job not found.');
  if (mode === 'capture') return { id: jobId, existing: true };

  // A deliberate re-add uses the freshly entered posting. Queuing preserves an existing
  // posting's details and appends only the discovery note, including on a restored job.
  const detailArgs = mode === 'add' ? [company, role, jdRaw, jdText] : [];
  const details = mode === 'add' ? 'company=?,role=?,jd_raw=?,jd_text=?,' : '';
  const merged = await db.execute({
    sql: `UPDATE job_applications SET resume_id=CASE WHEN ?='queue' THEN coalesce(resume_id,?) ELSE ? END,${details}
      normalized_url=COALESCE(normalized_url,?),
      status=CASE WHEN stage IN ('archived','withdrawn') THEN 'draft' ELSE status END,
      notes=CASE WHEN ? IS NULL OR instr(COALESCE(notes,''),?)>0 THEN notes
                 WHEN trim(COALESCE(notes,''))='' THEN ? ELSE notes||char(10,10)||? END,
      updated_at=unixepoch()
    WHERE user_id=? AND id=? AND EXISTS(SELECT 1 FROM resumes WHERE id=? AND user_id=? AND archived_at IS NULL)`,
    args: [
      mode,
      resumeId,
      resumeId,
      ...detailArgs,
      identity.url,
      note,
      note,
      note,
      note,
      owner,
      jobId,
      resumeId,
      owner,
    ],
  });
  if (!merged.rowsAffected) throw new Error('Resume or job not found.');
  return { id: jobId, existing: true };
}

function extractCompanyFromUrl(url: string, titleFallback: string): string {
  const greenhouse = url.match(/boards\.greenhouse\.io\/([^/]+)/i);
  if (greenhouse) return decodeURIComponent(greenhouse[1]);
  const lever = url.match(/jobs\.lever\.co\/([^/]+)/i);
  if (lever) return decodeURIComponent(lever[1]);
  const match = titleFallback.match(/(?:at|@)\s+(.+?)(?:\s*[-|]|$)/i);
  return match?.[1]?.trim() ?? '';
}

export async function captureExtensionOpening(
  userId: string,
  input: { url: string; jdText: string; title: string; company: string }
) {
  const { url, jdText } = input;
  const profile = await db.execute({
    sql: 'SELECT id FROM resumes WHERE user_id=? AND archived_at IS NULL ORDER BY updated_at DESC,id LIMIT 1',
    args: [userId],
  });
  const resumeId = profile.rows[0]?.id;
  if (!resumeId) return null;
  const title = input.title;
  const company = input.company || extractCompanyFromUrl(url, title) || 'Unknown';
  const role =
    title ||
    jdText
      .split('\n')
      .find((line) => line.trim().length > 0)
      ?.trim()
      .slice(0, 120) ||
    'Untitled role';
  return saveOwnedOpening(
    userId,
    { resumeId: String(resumeId), url, company, role, jdRaw: jdText, jdText },
    'capture'
  );
}
