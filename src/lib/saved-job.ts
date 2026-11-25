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
type SaveMode = 'url' | 'manual' | 'capture' | 'queue' | 'discover';

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

  // Discovery can supply a short preview and generic labels. Only the manual editor
  // can overwrite existing posting details or rebind an existing profile.
  const replace = Number(mode === 'manual');
  const marker = note?.match(/^RolePatch (?:semantic match:|discovery alert\b)/)?.[0] ?? note;
  const merged = await db.execute({
    sql: `UPDATE job_applications SET resume_id=CASE WHEN ? THEN ? ELSE coalesce(resume_id,?) END,
      company=CASE WHEN (company='' OR ?) AND lower(trim(?)) NOT IN ('','unknown company','unknown') THEN ? ELSE company END,
      role=CASE WHEN (role='' OR ?) AND lower(trim(?)) NOT IN ('','untitled role') THEN ? ELSE role END,
      jd_raw=CASE WHEN (jd_raw='' OR ?) AND trim(?)<>'' THEN ? ELSE jd_raw END,
      jd_text=CASE WHEN (jd_text='' OR ?) AND trim(?)<>'' THEN ? ELSE jd_text END,
      normalized_url=COALESCE(normalized_url,?),
      status=CASE WHEN ? AND stage IN ('archived','withdrawn') THEN 'draft' ELSE status END,
      notes=CASE WHEN ? IS NULL OR instr(COALESCE(notes,''),?)>0 THEN notes
                 WHEN trim(COALESCE(notes,''))='' THEN ? ELSE notes||char(10,10)||? END,
      updated_at=unixepoch()
    WHERE user_id=? AND id=? AND EXISTS(SELECT 1 FROM resumes WHERE id=? AND user_id=? AND archived_at IS NULL)`,
    args: [
      replace,
      resumeId,
      resumeId,
      replace,
      company,
      company,
      replace,
      role,
      role,
      replace,
      jdRaw,
      jdRaw,
      replace,
      jdText,
      jdText,
      identity.url,
      Number(mode !== 'discover'),
      note,
      marker,
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
