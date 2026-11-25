import { rankSourceItems } from '@/lib/resume-fallback';
import { EMPTY_MASTER_TEMPLATE } from '@/lib/master-resume';
import { listResumePoints, stripResumePins } from '@/lib/resume-pins';
import type { GenerationInput } from '@/lib/career-resume-tools';

type Data = Record<string, unknown>;
export interface CareerFact {
  id: string;
  revision: number;
  kind: string;
  title: string;
  data: Data;
}

const field = (data: Data, key: string) => (typeof data[key] === 'string' ? data[key].trim() : '');
const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
const unique = (values: string[]) => [...new Set(values.filter(Boolean))];
const dateRange = (data: Data) =>
  [field(data, 'start_date'), field(data, 'end_date')].filter(Boolean).join(' – ');

function links(data: Data) {
  return unique(strings(data.source_urls))
    .filter((url) => /^https?:\/\/[^\s<>]+$/i.test(url))
    .map((url) => `<${url}>`)
    .join(' · ');
}

function contribution(fact: CareerFact, overrides: ReadonlyMap<string, string>) {
  const data = fact.data;
  const wording =
    overrides.get(fact.id) ||
    field(data, 'approved_wording') ||
    field(data, 'original_text') ||
    field(data, 'individual_contribution');
  if (!wording) return '';
  return data.metric_is_estimate ? `${wording} (metric is an estimate)` : wording;
}

function retainedMaster(source: string, pages: number, query: string, structuredCount: number) {
  if (!source.trim() || source.trim() === EMPTY_MASTER_TEMPLATE.trim()) return '';
  const points = listResumePoints(source);
  const limit = Math.max(2, pages * 9 - Math.min(6, structuredCount));
  if (points.length <= limit) return stripResumePins(source).trim();
  const kept = new Set(
    [
      ...points.filter((p) => p.pinned),
      ...rankSourceItems(
        points.map((p) => ({ ...p, text: p.label })),
        query
      ).slice(0, limit),
    ].map((p) => p.id)
  );
  let output = source;
  for (const point of [...points].reverse()) {
    if (!kept.has(point.id)) output = output.slice(0, point.start) + output.slice(point.end);
  }
  return stripResumePins(output)
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** JD text participates only in ranking. All printable content comes from owned source records. */
export function composeCareerResume(
  profile: { id: string; source: string; revision: number },
  facts: CareerFact[],
  input: GenerationInput,
  jd: string,
  overrides: ReadonlyMap<string, string> = new Map()
) {
  const warnings: string[] = [];
  const pin = new Set(input.pin_ids);
  const exclude = new Set(input.exclude_ids);
  if ([...pin].some((id) => exclude.has(id)))
    throw new Error('A record cannot be both pinned and excluded.');
  const activeIds = new Set([profile.id, ...facts.map((x) => x.id)]);
  if ([...pin, ...exclude].some((id) => !activeIds.has(id)))
    throw new Error('A pin or exclusion does not belong to this active profile.');
  const available = facts.filter((f) => {
    if (exclude.has(f.id)) return false;
    if (
      f.data.verification_status === 'disputed' ||
      (f.kind === 'achievement' &&
        !['user_confirmed', 'document_supported'].includes(field(f.data, 'verification_status')))
    ) {
      warnings.push(
        `Omitted ${f.id}: ${field(f.data, 'verification_status') || 'unverified'} claim.`
      );
      return false;
    }
    return true;
  });
  const query = [input.emphasis, jd].filter(Boolean).join('\n');
  const allIds = new Set(available.map((f) => f.id));
  const selectable = available.filter((f) => {
    const parent = field(f.data, 'related_role_id') || field(f.data, 'related_project_id');
    if (!parent || allIds.has(parent)) return true;
    warnings.push(`Omitted ${f.id}: its linked role or project is unavailable.`);
    return false;
  });
  const take = (kind: string) => selectable.filter((f) => f.kind === kind);
  const wording = (f: CareerFact) => contribution(f, overrides);
  const ranked = rankSourceItems(
    take('achievement').map((f) => ({
      fact: f,
      text: [contribution(f, new Map()), f.title, ...strings(f.data.technologies)].join(' '),
    })),
    query
  );
  const chosen = ranked
    .filter((x) => pin.has(x.fact.id) || wording(x.fact))
    .sort((a, b) => Number(pin.has(b.fact.id)) - Number(pin.has(a.fact.id)))
    .slice(0, Math.max(input.target_pages * 6, ranked.filter((x) => pin.has(x.fact.id)).length))
    .map((x) => x.fact);
  const used: CareerFact[] = [];
  const master = exclude.has(profile.id)
    ? ''
    : retainedMaster(profile.source, input.target_pages, query, chosen.length);
  const sections: string[] = [master];
  function render(section: string, rows: CareerFact[], build: (row: CareerFact) => string) {
    const lines = rows.flatMap((row) => {
      const text = build(row);
      if (!text) return [];
      used.push(row);
      return [text];
    });
    if (lines.length)
      sections.push([section && `## ${section}`, ...lines].filter(Boolean).join('\n\n'));
  }
  const identity = take('identity');
  if (identity.length) {
    const lines = identity.map((f) => {
      used.push(f);
      return [field(f.data, 'value') || field(f.data, 'original_text') || f.title, links(f.data)]
        .filter(Boolean)
        .join(' · ');
    });
    sections.unshift(lines.join('  \n'));
  }
  const bullet = (f: CareerFact) => {
    const text = wording(f);
    if (!text) {
      warnings.push(`Omitted ${f.id}: supply approved wording or an individual contribution.`);
      return '';
    }
    used.push(f);
    return `- ${text}`;
  };
  const dated = (a: CareerFact, b: CareerFact) =>
    field(b.data, 'start_date').localeCompare(field(a.data, 'start_date')) ||
    a.id.localeCompare(b.id);
  function entry(f: CareerFact) {
    const data = f.data;
    const heading = unique([field(data, 'role') || f.title, field(data, 'employer')]).join(' · ');
    const bullets = chosen
      .filter(
        (b) => (field(b.data, 'related_role_id') || field(b.data, 'related_project_id')) === f.id
      )
      .map(bullet);
    return [
      `### ${heading}`,
      [dateRange(data), links(data)].filter(Boolean).join(' · '),
      field(data, 'approved_wording') || field(data, 'original_text'),
      bullets.filter(Boolean).join('\n'),
    ]
      .filter(Boolean)
      .join('\n\n');
  }
  render('Experience', take('employment').sort(dated), entry);
  render('Projects', take('project').sort(dated), entry);
  const independent = chosen
    .filter((b) => !field(b.data, 'related_role_id') && !field(b.data, 'related_project_id'))
    .map(bullet)
    .filter(Boolean);
  if (independent.length) sections.push(`## Achievements\n\n${independent.join('\n')}`);
  render('Education', take('education').sort(dated), (f) =>
    unique([
      f.title,
      field(f.data, 'institution'),
      field(f.data, 'credential'),
      dateRange(f.data),
      field(f.data, 'original_text'),
      links(f.data),
    ]).join(' · ')
  );
  const skills = take('skill');
  if (skills.length) {
    sections.push(
      `## Skills\n\n${skills.map((f) => field(f.data, 'value') || f.title).join(', ')}`
    );
    used.push(...skills);
  }
  const markdown = sections.filter(Boolean).join('\n\n');
  if (!markdown || markdown.length > 40_000)
    throw new Error('Add printable career facts, or narrow the selection to 40,000 characters.');
  const selected_record_ids = [...(master ? [profile.id] : []), ...used.map((f) => f.id)];
  if ([...pin].some((id) => !selected_record_ids.includes(id)))
    throw new Error(
      'A pinned record is disputed, unverified, or lacks printable wording. Review it first.'
    );
  if (
    markdown.split(/\s+/).length > input.target_pages * 450 ||
    markdown.split('\n').length > input.target_pages * 55
  )
    warnings.push(
      'Required facts and pinned content may exceed the target length. Review the PDF before submission.'
    );
  return {
    markdown,
    selected_record_ids,
    warnings,
    changes: used.map((f) => ({
      record_id: f.id,
      revision: f.revision,
      reason: overrides.has(f.id)
        ? 'Reworded from this verified individual contribution and its supporting facts.'
        : f.kind === 'achievement'
          ? pin.has(f.id)
            ? 'Pinned achievement'
            : query
              ? 'Selected by relevance to your target.'
              : 'Selected from confirmed career evidence.'
          : `Included ${f.kind} from your profile.`,
    })),
  };
}
