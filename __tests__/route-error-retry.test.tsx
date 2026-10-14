import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import RootError from '@/app/error';
import GlobalError from '@/app/global-error';
import DashboardError from '@/app/dashboard/error';
import EditorError from '@/app/editor/[id]/error';
import TailorError from '@/app/tailor/[jobId]/error';
import CoverLetterError from '@/app/cover-letter/[jobId]/error';
import InterviewError from '@/app/interview-prep/[jobId]/error';

vi.mock('@/lib/foundry-monitoring', () => ({ captureError: vi.fn() }));
afterEach(() => vi.restoreAllMocks());
for (const [name, Boundary] of [
  ['root', RootError],
  ['global', GlobalError],
  ['dashboard', DashboardError],
  ['editor', EditorError],
  ['tailor', TailorError],
  ['cover letter', CoverLetterError],
  ['interview', InterviewError],
] as const) {
  it(`${name} retries the failed server segment instead of merely clearing its cached error`, async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const retry = vi.fn();
    const reset = vi.fn();
    const node = document.createElement('div');
    document.body.append(node);
    const root = createRoot(node);
    const props = { error: new Error('Synthetic read failure'), retry, reset };
    await act(async () => root.render(createElement(Boundary, props)));
    await act(async () => node.querySelector('button')!.click());
    expect(retry).toHaveBeenCalledOnce();
    expect(reset).not.toHaveBeenCalled();
    await act(async () => root.unmount());
    node.remove();
  });
}
