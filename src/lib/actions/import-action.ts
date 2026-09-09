'use server';

import { generateText } from 'ai';
import { revalidatePath } from 'next/cache';
import { v4 as uuid } from 'uuid';

import { getAIModel, toUserFacingAIError } from '@/lib/ai';
import { getCurrentUserId } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import type { AIProviderConfig } from '@/lib/types';

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB

const STRUCTURING_SYSTEM_PROMPT = `You convert a candidate's raw resume text (from a PDF or DOCX) into a clean Markdown resume. Follow this structure exactly:

# Full Name

email | phone | city, state
[LinkedIn](url) | [GitHub](url)

---

## Experience

**Role** — _Company_ | Start – End

- Bullet using strong verbs and concrete metrics

## Education

**Degree, Major** — _School_ | Year

## Skills

**Languages:** ...
**Frameworks:** ...
**Tools:** ...

Rules:
- Keep the candidate's exact wording for bullets. Do not rewrite or improve.
- Omit sections the source does not contain. Do not fabricate.
- Preserve dates as written.
- Return ONLY the Markdown. No commentary, no fences.`;

async function extractPdfText(buffer: Buffer): Promise<string> {
  const mod = await import('pdf-parse');
  const parser = new mod.PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText();
    return result.text ?? '';
  } finally {
    await parser.destroy();
  }
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  const mammoth = await import('mammoth');
  const result = await mammoth.extractRawText({ buffer });
  return result.value ?? '';
}

async function extractText(buffer: Buffer, mimeType: string): Promise<string> {
  if (mimeType === 'application/pdf') return extractPdfText(buffer);
  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return extractDocxText(buffer);
  }
  if (mimeType === 'text/plain' || mimeType === 'text/markdown') {
    return buffer.toString('utf-8');
  }
  throw new Error(`Unsupported file type: ${mimeType}`);
}

export async function importResumeFromFile(
  formData: FormData,
  aiConfig: AIProviderConfig
): Promise<{ success: true; id: string; source: string } | { success: false; error: string }> {
  const file = formData.get('file');
  const rawName = formData.get('name');
  const name = (typeof rawName === 'string' && rawName.trim()) || 'Imported Resume';
  if (!(file instanceof File)) return { success: false, error: 'No file provided' };
  if (file.size === 0) return { success: false, error: 'Empty file' };
  if (file.size > MAX_FILE_BYTES) {
    return { success: false, error: `File too large (max ${MAX_FILE_BYTES / 1024 / 1024}MB)` };
  }
  if (file.type === 'application/msword' || /\.doc$/i.test(file.name)) {
    return {
      success: false,
      error: 'Save this legacy Word document as DOCX or PDF, then import it.',
    };
  }

  const extension = file.name.split('.').pop()?.toLowerCase();
  const fallbackTypes: Record<string, string> = {
    pdf: 'application/pdf',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    txt: 'text/plain',
    md: 'text/markdown',
  };
  const mimeType =
    !file.type || file.type === 'application/octet-stream'
      ? fallbackTypes[extension ?? ''] || file.type
      : file.type;

  let trimmed: string;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    trimmed = (await extractText(buffer, mimeType)).trim();
  } catch {
    return {
      success: false,
      error: 'Could not read this file. Try a text-based PDF, DOCX, TXT, or Markdown file.',
    };
  }
  if (trimmed.length < 50) {
    return {
      success: false,
      error: 'Could not extract enough text from file. Try a different format.',
    };
  }

  let markdown: string;
  try {
    const result = await generateText({
      model: getAIModel(aiConfig),
      system: STRUCTURING_SYSTEM_PROMPT,
      prompt: `Raw resume text:\n\n${trimmed}`,
    });
    markdown = result.text;
  } catch (err) {
    return { success: false, error: toUserFacingAIError(err).message };
  }
  if (!markdown.trim())
    return { success: false, error: 'The AI service returned an empty resume. Please try again.' };

  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      // Guest: let the caller store to localStorage
      return { success: true, id: '', source: markdown };
    }

    const id = uuid();
    await db.execute({
      sql: 'INSERT INTO resumes (id, name, source, user_id) VALUES (?, ?, ?, ?)',
      args: [id, name, markdown, userId],
    });
    revalidatePath('/dashboard');
    return { success: true, id, source: markdown };
  } catch {
    return { success: false, error: 'Could not save the imported resume. Please try again.' };
  }
}
