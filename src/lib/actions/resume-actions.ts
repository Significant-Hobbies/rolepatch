'use server';

import { db } from '@/lib/db';
import { v4 as uuid } from 'uuid';
import type { Resume } from '@/lib/types';
import { revalidatePath } from 'next/cache';

export async function listResumes(): Promise<Resume[]> {
  const result = await db.execute('SELECT * FROM resumes ORDER BY updated_at DESC');
  return result.rows as unknown as Resume[];
}

export async function getResume(id: string): Promise<Resume | null> {
  const result = await db.execute({ sql: 'SELECT * FROM resumes WHERE id = ?', args: [id] });
  return (result.rows[0] as unknown as Resume) ?? null;
}

const DEFAULT_TYPST_TEMPLATE = String.raw`#set page(margin: (x: 1.2cm, y: 1.2cm))
#set text(size: 10pt)

#align(center)[
  #text(size: 18pt, weight: "bold")[Your Name]

  your.email#"@"example.com | (555) 123-4567 | City, ST

  #link("https://linkedin.com/in/yourprofile")[LinkedIn] | #link("https://github.com/yourprofile")[GitHub]
]

#line(length: 100%)

== Experience

*Job Title* #h(1fr) _Company Name_ \
Location #h(1fr) _Start -- End_

- Accomplishment or responsibility
- Another accomplishment with measurable impact

== Education

*Degree, Major* #h(1fr) _University Name_ \
Relevant coursework or honors #h(1fr) _Graduation Year_

== Skills

*Languages:* JavaScript, TypeScript, Python \
*Frameworks:* React, Next.js, Node.js \
*Tools:* Git, Docker, AWS
`;

export async function createResume(name: string, latexSource: string = DEFAULT_TYPST_TEMPLATE): Promise<string> {
  const id = uuid();
  await db.execute({
    sql: 'INSERT INTO resumes (id, name, latex_source) VALUES (?, ?, ?)',
    args: [id, name, latexSource],
  });
  revalidatePath('/');
  return id;
}

export async function updateResume(id: string, latexSource: string): Promise<void> {
  await db.execute({
    sql: 'UPDATE resumes SET latex_source = ?, updated_at = unixepoch() WHERE id = ?',
    args: [latexSource, id],
  });
}

export async function deleteResume(id: string): Promise<void> {
  await db.execute({ sql: 'DELETE FROM resumes WHERE id = ?', args: [id] });
  revalidatePath('/');
}
