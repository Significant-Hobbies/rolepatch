import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MigrationBanner } from '@/components/migration-banner';
import { migrateGuestData } from '@/lib/actions/migration-actions';
vi.mock('@/components/auth-provider', () => ({ useAuth: () => ({ isGuest: false }) }));
vi.mock('@/lib/actions/migration-actions', () => ({ migrateGuestData: vi.fn() }));
afterEach(() => {
  cleanup();
  localStorage.clear();
});
it('keeps all guest data available when automatic or manual import fails preflight', async () => {
  const originals = {
    'rt-resumes': JSON.stringify([
      { id: 'a', name: 'Master', source: 'password=example12345', created_at: 1, updated_at: 1 },
    ]),
    'rt-jobs': '[]',
    'rt-tailored': '[]',
    'rt-cover-letters': '[]',
    'rt-stash': '[]',
  };
  for (const [key, value] of Object.entries(originals)) localStorage.setItem(key, value);
  render(<MigrationBanner />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Local resume 1, line 1');
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Your local data is intact.');
  for (const [key, value] of Object.entries(originals))
    expect(localStorage.getItem(key)).toBe(value);
  expect(localStorage.getItem('rt-migrated')).toBeNull();
  expect(migrateGuestData).not.toHaveBeenCalled();
});

it('repairs each flagged local resume and sends the whole batch only on explicit retry', async () => {
  const base = { created_at: 1, updated_at: 1 };
  const originals = [
    { ...base, id: 'unrelated', name: 'Unaffected', source: '# Unaffected' },
    {
      ...base,
      id: 'first',
      name: 'password=synthetic12345',
      source: '# Complete source\nunchanged',
    },
    { ...base, id: 'second', name: 'Engineer', source: '# Engineer\npassword=another98765' },
  ];
  const jobs = [{ id: 'job-one', company: 'Example', role: 'Engineer' }];
  const materials = [{ id: 'doc-one', job_id: 'job-one', source: 'A preserved document' }];
  localStorage.setItem('rt-resumes', JSON.stringify(originals));
  localStorage.setItem('rt-jobs', JSON.stringify(jobs));
  localStorage.setItem('rt-tailored', JSON.stringify(materials));
  vi.mocked(migrateGuestData).mockResolvedValue({
    success: false,
    error: 'Synthetic endpoint received the corrected batch.',
  });
  render(<MigrationBanner />);
  fireEvent.click(await screen.findByRole('button', { name: 'Edit local resume 2' }));
  fireEvent.change(screen.getByLabelText('Local resume name'), {
    target: { value: 'Backend master' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Save locally' }));
  expect(JSON.parse(localStorage.getItem('rt-resumes')!)[1]).toMatchObject({
    name: 'Backend master',
    source: originals[1].source,
  });
  fireEvent.click(screen.getByRole('button', { name: 'Edit local resume 3' }));
  const source = screen.getByLabelText('Local resume Markdown');
  fireEvent.click(screen.getByRole('button', { name: 'Save locally' }));
  expect(source).toBeVisible();
  fireEvent.change(source, { target: { value: '# Engineer\nBuilt APIs.\n' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save locally' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Retry the import');
  const corrected = JSON.parse(localStorage.getItem('rt-resumes')!);
  expect(corrected[0]).toEqual(originals[0]);
  expect(corrected[2]).toMatchObject({
    id: 'second',
    name: 'Engineer',
    source: '# Engineer\nBuilt APIs.\n',
  });
  expect(migrateGuestData).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Synthetic endpoint received the corrected batch.'
  );
  expect(migrateGuestData).toHaveBeenCalledWith({
    resumes: corrected,
    jobs,
    tailoredResumes: materials,
    coverLetters: [],
    stashEntries: [],
  });
  expect(localStorage.getItem('rt-jobs')).toBe(JSON.stringify(jobs));
  expect(localStorage.getItem('rt-tailored')).toBe(JSON.stringify(materials));
});

it.each([false, true])(
  'retains the draft and conflict until Cancel, with another flagged resume: %s',
  async (otherFlagged) => {
    const initial = {
      id: 'a',
      name: 'Master',
      source: 'password=synthetic12345',
      created_at: 1,
      updated_at: 1,
    };
    const others = otherFlagged ? [{ ...initial, id: 'b' }] : [];
    const stored = (entry: typeof initial) => JSON.stringify([entry, ...others]);
    localStorage.setItem('rt-resumes', stored(initial));
    render(<MigrationBanner />);
    fireEvent.click(await screen.findByRole('button', { name: 'Edit local resume 1' }));
    fireEvent.change(screen.getByLabelText('Local resume name'), {
      target: { value: 'My corrected name' },
    });
    fireEvent.change(screen.getByLabelText('Local resume Markdown'), {
      target: { value: 'Corrected here' },
    });
    const newer = { ...initial, source: 'Corrected elsewhere' };
    localStorage.setItem('rt-resumes', stored(newer));
    fireEvent.click(screen.getByRole('button', { name: 'Save locally' }));
    expect(screen.getByText(/changed in another tab/i)).toBeVisible();
    expect(screen.getByLabelText('Local resume name')).toHaveValue('My corrected name');
    expect(screen.getByLabelText('Local resume Markdown')).toHaveValue('Corrected here');
    expect(screen.getByRole('button', { name: 'Retry' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Dismiss' })).toBeDisabled();
    expect(localStorage.getItem('rt-resumes')).toBe(stored(newer));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByLabelText('Local resume Markdown')).not.toBeInTheDocument();
    expect(screen.queryByText(/changed in another tab/i)).not.toBeInTheDocument();
    if (otherFlagged)
      expect(screen.getByRole('button', { name: 'Edit local resume 2' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeEnabled();
    expect(localStorage.getItem('rt-resumes')).toBe(stored(newer));
  }
);
