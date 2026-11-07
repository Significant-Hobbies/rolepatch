import { Lexer } from 'marked';
import type { TailorChange } from '@/lib/types';

export interface ResumeBullet {
  id: string;
  text: string;
  start: number;
  end: number;
}

interface BulletGroup {
  id: string;
  context: string;
  bullets: ResumeBullet[];
  start: number;
  end: number;
  separators: string[];
}

export interface BulletRanking {
  group_id: string;
  bullet_ids: string[];
}

interface ProjectGroup {
  id: string;
  context: string;
  projects: Array<{ id: string; title: string; text: string }>;
  start: number;
  end: number;
  separators: string[];
}

export interface ProjectRanking {
  group_id: string;
  project_ids: string[];
}

const RANKABLE_SECTION =
  /\b(experience|employment|work history|projects?|products?|achievements?|accomplishments?|highlights)\b/i;

/** Lex normalized Markdown, but use offsets to move only original byte-for-byte blocks. */
export function lexResumeMarkdown(source: string) {
  let normalized = '';
  const offsets: number[] = [];
  for (let i = 0; i < source.length; i++) {
    offsets.push(i);
    if (source[i] === '\r' && source[i + 1] === '\n') {
      normalized += '\n';
      i++;
    } else normalized += source[i];
  }
  offsets.push(source.length);
  const tokens = Lexer.lex(normalized);
  // Some Markdown constructs are normalized by the lexer. Never guess their offsets.
  if (tokens.map((token) => token.raw).join('') !== normalized) return null;
  return { tokens, offsets };
}

export function extractResumeBulletGroups(source: string, minimumBullets = 2): BulletGroup[] {
  const lexed = lexResumeMarkdown(source);
  if (!lexed) return [];
  const { tokens, offsets } = lexed;
  const groups: BulletGroup[] = [];
  const headings: Array<{ depth: number; text: string }> = [];
  let cursor = 0;
  for (const token of tokens) {
    const start = cursor;
    cursor += token.raw.length;
    if (token.type === 'heading') {
      while (headings.length && headings[headings.length - 1].depth >= token.depth) headings.pop();
      headings.push({ depth: token.depth, text: token.text });
    }
    // A skills/contact/education section cannot become a source of experience bullets.
    const section = headings.find((heading) => heading.depth === 2) ?? headings.at(-1);
    if (
      token.type !== 'list' ||
      token.ordered ||
      token.items.length < minimumBullets ||
      !section ||
      !RANKABLE_SECTION.test(section.text)
    )
      continue;
    const bullets: ResumeBullet[] = [];
    const separators: string[] = [];
    let position = 0;
    let valid = true;
    for (let i = 0; i < token.items.length; i++) {
      const item = token.items[i];
      const content = item.raw.replace(/\n+$/, '');
      if (!content || !token.raw.startsWith(content, position)) {
        valid = false;
        break;
      }
      const end = position + content.length;
      const following = token.items[i + 1]?.raw.replace(/\n+$/, '');
      const next = following === undefined ? token.raw.length : token.raw.indexOf(following, end);
      if (next < end || !/^\s*$/.test(token.raw.slice(end, next))) {
        valid = false;
        break;
      }
      bullets.push({
        id: `g${groups.length + 1}b${i + 1}`,
        text: source.slice(offsets[start + position], offsets[start + end]),
        start: offsets[start + position],
        end: offsets[start + end],
      });
      separators.push(source.slice(offsets[start + end], offsets[start + next]));
      position = next;
    }
    if (valid && position === token.raw.length)
      groups.push({
        id: `g${groups.length + 1}`,
        context: headings.map((heading) => heading.text).join(' / '),
        bullets,
        separators,
        start: offsets[start],
        end: offsets[cursor],
      });
  }
  return groups;
}

/** A project title, technologies, prose and all bullets move as one original block. */
export function extractResumeProjectGroups(source: string): ProjectGroup[] {
  const lexed = lexResumeMarkdown(source);
  if (!lexed) return [];
  const { tokens, offsets } = lexed;
  const groups: ProjectGroup[] = [];
  let section: { title: string; projects: Array<{ title: string; start: number }> } | null = null;
  let cursor = 0;
  const finish = (end: number) => {
    if (!section || section.projects.length < 2) return;
    const id = `p${groups.length + 1}`;
    const separators: string[] = [];
    const projects = section.projects.map((project, index) => {
      const block = source.slice(project.start, section!.projects[index + 1]?.start ?? end);
      const text = block.replace(/\s+$/, '');
      separators.push(block.slice(text.length));
      return { id: `${id}i${index + 1}`, title: project.title, text };
    });
    groups.push({
      id,
      context: section.title,
      projects,
      start: section.projects[0].start,
      end,
      separators,
    });
  };
  for (const token of tokens) {
    if (token.type === 'heading' && token.depth <= 2) {
      finish(offsets[cursor]);
      section =
        token.depth === 2 && /\b(projects?|products?)\b/i.test(token.text)
          ? { title: token.text, projects: [] }
          : null;
    } else if (token.type === 'heading' && token.depth === 3 && section) {
      section.projects.push({ title: token.text, start: offsets[cursor] });
    }
    cursor += token.raw.length;
  }
  finish(source.length);
  return groups;
}

/** Call after bullet assembly and re-extract project offsets from that assembled source. */
export function assembleRankedProjects(
  source: string,
  rankings: ProjectRanking[]
): { tailored: string; changes: TailorChange[] } {
  const groups = extractResumeProjectGroups(source);
  const byGroup = new Map(rankings.map((ranking) => [ranking.group_id, ranking]));
  if (rankings.length !== groups.length || byGroup.size !== groups.length)
    throw new Error('Invalid response: incomplete or duplicate project groups');
  let cursor = 0;
  let tailored = '';
  const changes: TailorChange[] = [];
  for (const group of groups) {
    const ranking = byGroup.get(group.id);
    const byId = new Map(group.projects.map((project) => [project.id, project]));
    if (
      !ranking ||
      ranking.project_ids.length !== group.projects.length ||
      new Set(ranking.project_ids).size !== group.projects.length ||
      ranking.project_ids.some((id) => !byId.has(id))
    )
      throw new Error(
        'Invalid response: ranking must preserve every original project in its section'
      );
    tailored += source.slice(cursor, group.start);
    ranking.project_ids.forEach((id, index) => {
      const project = byId.get(id)!;
      tailored += project.text + group.separators[index];
      const previous = group.projects.findIndex((item) => item.id === id);
      if (previous !== index && changes.length < 8)
        changes.push({
          snippet: project.text.split(/\r?\n/)[0],
          reason: `Moved this complete project from position ${previous + 1} to ${index + 1} within ${group.context}. Its title, links and content stay together.`,
        });
    });
    cursor = group.end;
  }
  return { tailored: tailored + source.slice(cursor), changes };
}

/** The model can choose an order, never write content or move claims across roles. */
export function assembleRankedResume(
  source: string,
  groups: BulletGroup[],
  rankings: BulletRanking[]
): { tailored: string; changes: TailorChange[] } {
  const byGroup = new Map(rankings.map((ranking) => [ranking.group_id, ranking]));
  if (rankings.length !== groups.length || byGroup.size !== groups.length)
    throw new Error('Invalid response: incomplete or duplicate ranking groups');
  let cursor = 0;
  let tailored = '';
  const changes: TailorChange[] = [];
  for (const group of groups) {
    const ranking = byGroup.get(group.id);
    const byId = new Map(group.bullets.map((bullet) => [bullet.id, bullet]));
    if (
      !ranking ||
      ranking.bullet_ids.length !== group.bullets.length ||
      new Set(ranking.bullet_ids).size !== group.bullets.length ||
      ranking.bullet_ids.some((id) => !byId.has(id))
    )
      throw new Error('Invalid response: ranking must preserve every original bullet in its group');
    tailored += source.slice(cursor, group.start);
    ranking.bullet_ids.forEach((id, index) => {
      const bullet = byId.get(id)!;
      tailored += bullet.text + group.separators[index];
      const previous = group.bullets.findIndex((item) => item.id === id);
      if (previous !== index && changes.length < 8)
        changes.push({
          snippet: bullet.text.replace(/^\s*[-+*]\s+/, '').slice(0, 240),
          reason: `Moved this existing bullet from position ${previous + 1} to ${index + 1} within its original section. Wording is unchanged.`,
        });
    });
    cursor = group.end;
  }
  tailored += source.slice(cursor);
  return { tailored, changes };
}
