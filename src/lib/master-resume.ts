import { extractResumeBulletGroups, lexResumeMarkdown } from '@/lib/resume-bullet-ranking';
import { prepareResumePolicy } from '@/lib/resume-tailoring-policy';

export interface MasterResumeEntry {
  title: string;
  details: string;
  points: string;
}

export interface MasterResumeData {
  fullName: string;
  contact: string;
  experience: MasterResumeEntry[];
  projects: MasterResumeEntry[];
  education: string;
  skills: string;
}

export const EMPTY_MASTER_TEMPLATE = '## Experience\n\n## Projects\n\n## Education\n\n## Skills\n';

export function emptyMasterResume(): MasterResumeData {
  return {
    fullName: '',
    contact: '',
    experience: [{ title: '', details: '', points: '' }],
    projects: [{ title: '', details: '', points: '' }],
    education: '',
    skills: '',
  };
}

// Form values are applicant facts, not Markdown instructions or invented examples.
function literal(value: string): string {
  return value.trim().replace(/[\\`*_{}[\]<>#]/g, '\\$&');
}

function paragraphs(value: string): string {
  return value.split(/\r?\n/).map(literal).filter(Boolean).join('\n\n');
}

function entries(items: MasterResumeEntry[]): string {
  return items
    .filter((item) => item.title.trim() || item.details.trim() || item.points.trim())
    .map((item) => {
      const points = item.points
        .split(/\r?\n/)
        .map((point) => literal(point.replace(/^\s*[-•+]\s+/, '')))
        .filter(Boolean)
        .map((point) => `- ${point}`)
        .join('\n');
      return [
        item.title.trim() ? `### ${literal(item.title)}` : '',
        paragraphs(item.details),
        points,
      ]
        .filter(Boolean)
        .join('\n\n');
    })
    .join('\n\n');
}

/** Insert supplied facts into an existing section without rewriting its other entries. */
export function masterResumeEntry(entry: MasterResumeEntry): string {
  return entries([entry]);
}

/** Build once from entered facts. No AI call and no wording rewrite. */
export function buildMasterResume(data: MasterResumeData): string {
  return `${[
    data.fullName.trim() ? `# ${literal(data.fullName)}` : '',
    paragraphs(data.contact),
    '## Experience',
    entries(data.experience),
    '## Projects',
    entries(data.projects),
    '## Education',
    paragraphs(data.education),
    '## Skills',
    paragraphs(data.skills),
  ]
    .filter(Boolean)
    .join('\n\n')}\n`;
}

export function masterResumeReadiness(source: string) {
  const tokens = lexResumeMarkdown(source)?.tokens ?? [];
  const hasName = tokens.some(
    (token) => token.type === 'heading' && token.depth === 1 && token.text.trim()
  );
  let section = '';
  let projects = false;
  let education = false;
  for (const token of tokens) {
    if (token.type === 'heading' && token.depth <= 2) {
      section = token.depth === 2 ? token.text : '';
      continue;
    }
    if (
      /\b(projects?|products?)\b/i.test(section) &&
      token.type === 'list' &&
      token.items.some((item) => item.text.trim())
    )
      projects = true;
    if (
      /\b(education|academic background|academic qualifications)\b/i.test(section) &&
      ['heading', 'paragraph', 'list', 'table'].includes(token.type) &&
      token.raw.trim().length > 2
    )
      education = true;
  }
  const points = extractResumeBulletGroups(source, 1).flatMap((group) => group.bullets).length;
  let policyError = '';
  try {
    prepareResumePolicy(source);
  } catch (error) {
    policyError = error instanceof Error ? error.message : 'Check your master resume sections.';
  }
  return {
    hasName,
    projects,
    education,
    points,
    ready: hasName && projects && education && points > 0 && !policyError,
    policyError,
  };
}

/** Append only the supplied missing facts; never parse/rebuild an imported history. */
export function appendMasterSection(
  source: string,
  title: 'Projects' | 'Education',
  content: string,
  projectName = ''
): string {
  if (!content.trim()) return source;
  const addition =
    title === 'Projects'
      ? entries([{ title: projectName, details: '', points: content }])
      : paragraphs(content);
  return `${source.trimEnd()}\n\n## ${title}\n\n${addition}\n`;
}

export function prependMasterName(source: string, name: string): string {
  return name.trim() ? `# ${literal(name)}\n\n${source}` : source;
}
