import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ResumeBuilder } from '@/components/resume-builder';
import { updateResume } from '@/lib/actions/resume-actions';
import { localListResumes, localUpdateResume } from '@/lib/local-storage';

const auth = vi.hoisted(() => ({ isGuest: true, isPending: false }));
vi.mock('@/components/auth-provider', () => ({ useAuth: () => auth }));
vi.mock('@/components/achievement-evidence-bank', () => ({ AchievementEvidenceBank: () => null }));
vi.mock('@/components/stash-list', () => ({ StashList: () => null }));
vi.mock('@/components/create-resume-button', () => ({ CreateResumeButton: () => null }));
vi.mock('@/components/resume-import-button', () => ({ ResumeImportButton: () => null }));
vi.mock('@/components/master-resume-guide', () => ({ MasterResumeGuide: () => null }));
vi.mock('@/lib/actions/resume-actions', () => ({ updateResume: vi.fn() }));
vi.mock('@/lib/local-storage', () => ({ localListResumes: vi.fn(), localUpdateResume: vi.fn() }));

const source =
  '# Ada\n\n## Experience\n\n### Acme · 2022\n\n- Built React screens.\n\n## Projects\n\n### Reader\n\n- Released Reader.\n\n## Education\n\nBSc.\n';
const resume = { id: 'r1', name: 'Master', source, created_at: 1, updated_at: 1 };
const props = { serverResumes: [resume], serverEvidence: [], serverStash: [] };
afterEach(cleanup);
beforeEach(() => {
  vi.resetAllMocks();
  auth.isGuest = true;
  auth.isPending = false;
  vi.mocked(localListResumes).mockReturnValue([resume]);
  vi.mocked(updateResume).mockResolvedValue();
});

it('saves guest edits and pins without rewriting other sections, then retains saved edits on switching', async () => {
  vi.mocked(localListResumes).mockReturnValue([resume, { ...resume, id: 'r2', name: 'Other' }]);
  render(<ResumeBuilder {...props} />);
  fireEvent.click(screen.getByRole('button', { name: 'Edit achievement 1: Built React screens.' }));
  fireEvent.change(screen.getAllByLabelText('Achievement 1')[0], {
    target: { value: 'Built accessible React screens.' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Done' }));
  fireEvent.click(
    screen.getByRole('checkbox', { name: 'Always include: Built accessible React screens.' })
  );
  expect(screen.getByLabelText('Master resume')).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));
  await waitFor(() =>
    expect(localUpdateResume).toHaveBeenCalledWith(
      'r1',
      source.replace(
        '- Built React screens.',
        '- Built accessible React screens. <!-- rolepatch:always-include -->'
      )
    )
  );
  expect(updateResume).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('Master resume'), { target: { value: 'r2' } });
  fireEvent.change(screen.getByLabelText('Master resume'), { target: { value: 'r1' } });
  expect(screen.getByText('Built accessible React screens.')).toBeVisible();
  expect(
    screen.getByRole('checkbox', { name: 'Always include: Built accessible React screens.' })
  ).toBeChecked();
});
it('retains edits and permits retry after an owner-scoped cloud save failure', async () => {
  auth.isGuest = false;
  vi.mocked(updateResume).mockRejectedValueOnce(new Error('Save unavailable'));
  render(<ResumeBuilder {...props} />);
  fireEvent.click(screen.getByRole('button', { name: 'Edit achievement 1: Built React screens.' }));
  fireEvent.change(screen.getAllByLabelText('Achievement 1')[0], {
    target: { value: 'Built accessible React screens.' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Done' }));
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));
  await screen.findByText('Save unavailable');
  expect(screen.getByText('Built accessible React screens.')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));
  await screen.findByText('Saved');
  expect(updateResume).toHaveBeenCalledTimes(2);
  expect(localUpdateResume).not.toHaveBeenCalled();
  expect(localListResumes).not.toHaveBeenCalled();
});
it('does not read guest storage or save while authentication is pending', () => {
  auth.isPending = true;
  render(<ResumeBuilder {...props} />);
  expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  expect(localListResumes).not.toHaveBeenCalled();
});

it('opens a newly requested master when creation navigates within the builder page', () => {
  const other = { ...resume, id: 'r2', name: 'Other', source: source.replace('Ada', 'Grace') };
  vi.mocked(localListResumes).mockReturnValue([resume, other]);
  const view = render(<ResumeBuilder {...props} requestedResume="r1" />);
  view.rerender(<ResumeBuilder {...props} requestedResume="r2" />);
  expect(screen.getByLabelText('Master resume')).toHaveValue('r2');
  expect(screen.getByRole('heading', { name: 'Grace' })).toBeVisible();
});

it('shows readable details and cancels a focused edit without changing the imported master', () => {
  render(<ResumeBuilder {...props} />);
  expect(screen.queryByLabelText('Full name')).not.toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Ada' })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Edit Personal details' }));
  fireEvent.change(screen.getByLabelText('Full name'), { target: { value: '' } });
  expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Ada Lovelace' } });
  fireEvent.click(screen.getByRole('button', { name: 'Cancel edit' }));
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));
  expect(localUpdateResume).toHaveBeenCalledWith('r1', source);
});

it('keeps a temporarily cleared achievement intact until Done and permits cancellation', () => {
  render(<ResumeBuilder {...props} />);
  fireEvent.click(screen.getByRole('button', { name: 'Edit achievement 1: Built React screens.' }));
  fireEvent.change(screen.getAllByLabelText('Achievement 1')[0], { target: { value: '' } });
  expect(screen.getByRole('button', { name: 'Done' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Cancel edit' }));
  expect(screen.getByText('Built React screens.')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));
  expect(localUpdateResume).toHaveBeenCalledWith('r1', source);
});

it('saves a structured name change while preserving contact links, pins and every other original byte', async () => {
  const original =
    '# Ada\r\n\r\n[Portfolio](https://example.org)\r\n\r\n## Experience\r\n\r\n### Acme\r\n\r\n- Built UI. <!-- rolepatch:always-include -->\r\n\r\n## Education\r\n\r\nBSc.\r\n';
  vi.mocked(localListResumes).mockReturnValue([{ ...resume, source: original }]);
  render(<ResumeBuilder {...props} serverResumes={[{ ...resume, source: original }]} />);
  fireEvent.click(screen.getByRole('button', { name: 'Edit Personal details' }));
  fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Ada Lovelace' } });
  fireEvent.click(screen.getByRole('button', { name: 'Done' }));
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));
  await waitFor(() =>
    expect(localUpdateResume).toHaveBeenCalledWith(
      'r1',
      original.replace('# Ada', '# Ada Lovelace')
    )
  );
});
