// @vitest-environment node
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  generateText: vi.fn(),
  getCurrentUserId: vi.fn(),
  execute: vi.fn(),
  revalidatePath: vi.fn(),
}));
vi.mock('ai', () => ({ generateText: mocks.generateText }));
vi.mock('@/lib/ai', () => ({
  getAIModel: () => 'synthetic-model',
  toUserFacingAIError: () => new Error('Generation unavailable'),
}));
vi.mock('@/lib/auth-utils', () => ({ getCurrentUserId: mocks.getCurrentUserId }));
vi.mock('@/lib/db', () => ({ db: { execute: mocks.execute } }));
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }));

const source =
  '# Synthetic Candidate\n\n## Experience\nEngineer at Example, 2022–2025. Reduced latency from 240ms to 160ms.';
const config = { endpointUrl: '', apiKey: '', model: '' };

function input(text = source) {
  const form = new FormData();
  form.set('file', new File([text], 'synthetic.md', { type: 'text/markdown' }));
  form.set('name', 'Synthetic import');
  return form;
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.resetModules();
  mocks.getCurrentUserId.mockResolvedValue(null);
  mocks.generateText.mockResolvedValue({ text: source });
});
afterEach(() => vi.unstubAllGlobals());

describe('resume file import action', () => {
  it.each([
    ['pdf', 'application/pdf'],
    ['docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  ])('extracts a real synthetic %s document before structuring', async (extension, mime) => {
    const bytes = readFileSync(
      new URL(`./fixtures/resume-import/synthetic.${extension}`, import.meta.url)
    );
    const form = new FormData();
    form.set('file', new File([bytes], `synthetic.${extension}`, { type: mime }));
    const { importResumeFromFile } = await import('@/lib/actions/import-action');
    await importResumeFromFile(form, config);
    const prompt = mocks.generateText.mock.calls[0]?.[0].prompt;
    expect(prompt).toContain('Synthetic Candidate');
    expect(prompt).toContain('2022-2025');
    expect(prompt).toContain('240ms to 160ms');
    expect(mocks.execute).not.toHaveBeenCalled();
  });

  it('loads without runtime code generation and keeps guest writes browser-local', async () => {
    const form = input();
    vi.stubGlobal(
      'Function',
      new Proxy(Function, {
        construct() {
          throw new EvalError('Code generation from strings disallowed');
        },
      })
    );
    const { importResumeFromFile } = await import('@/lib/actions/import-action');
    vi.unstubAllGlobals();
    const result = await importResumeFromFile(form, config);
    expect(result).toEqual({ id: '', source });
    expect(mocks.generateText.mock.calls[0]?.[0].prompt).toContain(source);
    expect(mocks.execute).not.toHaveBeenCalled();
  });

  it('binds a signed-in import to the resolved owner', async () => {
    mocks.getCurrentUserId.mockResolvedValue('owner-1');
    const { importResumeFromFile } = await import('@/lib/actions/import-action');
    const result = await importResumeFromFile(input(), config);
    expect(result.id).not.toBe('');
    expect(mocks.execute).toHaveBeenCalledWith({
      sql: 'INSERT INTO resumes (id, name, source, user_id) VALUES (?, ?, ?, ?)',
      args: [result.id, 'Synthetic import', source, 'owner-1'],
    });
  });

  it('does not save an import when AI generation fails', async () => {
    mocks.generateText.mockRejectedValue(new Error('Provider unavailable'));
    const { importResumeFromFile } = await import('@/lib/actions/import-action');
    await expect(importResumeFromFile(input(), config)).rejects.toThrow('Generation unavailable');
    expect(mocks.execute).not.toHaveBeenCalled();
  });

  it('rejects empty input before generation or persistence', async () => {
    const { importResumeFromFile } = await import('@/lib/actions/import-action');
    await expect(importResumeFromFile(input(''), config)).rejects.toThrow('Empty file');
    expect(mocks.generateText).not.toHaveBeenCalled();
    expect(mocks.execute).not.toHaveBeenCalled();
  });
});
