'use server';

import { db } from '@/lib/db';
import { v4 as uuid } from 'uuid';
import type { Resume } from '@/lib/types';
import { revalidatePath } from 'next/cache';

export async function listResumes(): Promise<Resume[]> {
  const result = await db.execute('SELECT * FROM resumes ORDER BY updated_at DESC');
  return JSON.parse(JSON.stringify(result.rows)) as Resume[];
}

export async function getResume(id: string): Promise<Resume | null> {
  const result = await db.execute({ sql: 'SELECT * FROM resumes WHERE id = ?', args: [id] });
  const row = result.rows[0];
  return row ? (JSON.parse(JSON.stringify(row)) as Resume) : null;
}

const DEFAULT_MARKDOWN_TEMPLATE = `# Your Name

your.email@example.com | (555) 123-4567 | City, ST
[LinkedIn](https://linkedin.com/in/yourprofile) | [GitHub](https://github.com/yourprofile)

---

## Experience

**Job Title** — _Company Name_ | Start – End

- Accomplishment or responsibility
- Another accomplishment with measurable impact

## Education

**Degree, Major** — _University Name_ | Graduation Year

Relevant coursework or honors

## Skills

**Languages:** JavaScript, TypeScript, Python
**Frameworks:** React, Next.js, Node.js
**Tools:** Git, Docker, AWS
`;

export async function createResume(name: string, source: string = DEFAULT_MARKDOWN_TEMPLATE): Promise<string> {
  const id = uuid();
  await db.execute({
    sql: 'INSERT INTO resumes (id, name, source) VALUES (?, ?, ?)',
    args: [id, name, source],
  });
  revalidatePath('/');
  return id;
}

export async function updateResume(id: string, source: string): Promise<void> {
  await db.execute({
    sql: 'UPDATE resumes SET source = ?, updated_at = unixepoch() WHERE id = ?',
    args: [source, id],
  });
}

export async function deleteResume(id: string): Promise<void> {
  await db.execute({ sql: 'DELETE FROM resumes WHERE id = ?', args: [id] });
  revalidatePath('/');
}
