import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ResumeRefinement } from '@/components/resume-refinement';
import { refineResumeSectionForClient } from '@/lib/actions/refine-resume-action';
import type { ResumeDraft } from '@/lib/resume-refinement';

vi.mock('@/lib/actions/refine-resume-action', () => ({ refineResumeSectionForClient: vi.fn() }));
const original: ResumeDraft = {
  source:
    '# Alex\n\n## Summary\nBuilt APIs and React interfaces.\n\n## Projects\n### Reader\n- Built a reading queue.\n\n## Education\nBSc, Example College.\n',
  changes: [
    { snippet: 'Built APIs and React interfaces.', reason: 'Previous summary explanation' },
    { snippet: 'Built a reading queue.', reason: 'Previous project explanation' },
  ],
};
const refined = original.source.replace(
  'Built APIs and React interfaces.',
  'Built React interfaces and APIs.'
);
const changed = vi.fn();
const consumed = vi.fn();
const config = () => ({ endpointUrl: '', apiKey: '', model: '' });
const props = {
  masterSource: original.source,
  jdText: 'Build React interfaces.',
  isGuest: true,
  disabled: false,
  hasCredits: true,
  aiConfig: config,
  onConsumed: consumed,
};
function Harness() {
  const [draft, setDraft] = useState(original);
  return (
    <ResumeRefinement
      {...props}
      draft={draft}
      onChange={(next) => {
        changed(next);
        setDraft(next);
      }}
    />
  );
}
function propose() {
  fireEvent.click(screen.getByText('Refine one section'));
  fireEvent.change(screen.getByLabelText('What should change?'), {
    target: { value: 'Lead with frontend work' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Preview refinement' }));
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(refineResumeSectionForClient).mockResolvedValue({
    success: true,
    data: { tailored: refined, changes: [{ snippet: 'Refined', reason: 'Summary only' }] },
  });
});
describe('section refinement review', () => {
  it('allows an already paid proposal to be applied after the last token is spent', async () => {
    const view = render(
      <ResumeRefinement {...props} isGuest={false} draft={original} onChange={changed} />
    );
    propose();
    const apply = await screen.findByRole('button', { name: 'Apply refinement' });
    await waitFor(() => expect(apply).not.toBeDisabled());
    view.rerender(
      <ResumeRefinement
        {...props}
        isGuest={false}
        hasCredits={false}
        draft={original}
        onChange={changed}
      />
    );
    expect(screen.getByRole('button', { name: 'Preview refinement' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Apply refinement' })).not.toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Apply refinement' }));
    expect(changed).toHaveBeenCalledTimes(1);
  });

  it('previews without mutation, applies explicitly, and undoes source and explanations together', async () => {
    render(<Harness />);
    propose();
    const apply = await screen.findByRole('button', { name: 'Apply refinement' });
    await waitFor(() => expect(apply).not.toBeDisabled());
    expect(screen.getByTitle('Refinement preview').getAttribute('srcdoc')).toContain(
      'Built React interfaces and APIs.'
    );
    expect(changed).not.toHaveBeenCalled();
    fireEvent.click(apply);
    expect(changed).toHaveBeenLastCalledWith({
      source: refined,
      changes: [{ snippet: 'Refined', reason: 'Summary only' }, original.changes[1]],
    });
    fireEvent.click(screen.getByRole('button', { name: 'Undo refinement' }));
    expect(changed).toHaveBeenLastCalledWith(original);
    expect(consumed).toHaveBeenCalledTimes(1);
  });

  it('cannot apply a late proposal after the draft was edited', async () => {
    let resolve!: (value: Awaited<ReturnType<typeof refineResumeSectionForClient>>) => void;
    vi.mocked(refineResumeSectionForClient).mockReturnValue(
      new Promise((done) => {
        resolve = done;
      })
    );
    const view = render(<ResumeRefinement {...props} draft={original} onChange={changed} />);
    propose();
    view.rerender(
      <ResumeRefinement
        {...props}
        draft={{ ...original, source: `${original.source}\nManual note.` }}
        onChange={changed}
      />
    );
    await act(async () => {
      resolve({ success: true, data: { tailored: refined, changes: [] } });
    });
    expect(screen.queryByRole('button', { name: 'Apply refinement' })).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('draft changed');
    expect(changed).not.toHaveBeenCalled();
  });

  it('discards failed proposals without changing the draft', async () => {
    vi.mocked(refineResumeSectionForClient).mockResolvedValue({
      success: false,
      error: 'Try again safely.',
      retryable: true,
    });
    render(<Harness />);
    propose();
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Try again safely.'));
    expect(changed).not.toHaveBeenCalled();
  });
});
