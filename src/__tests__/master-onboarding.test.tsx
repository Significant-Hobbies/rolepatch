import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateResumeButton } from '@/components/create-resume-button';
import { createResume } from '@/lib/actions/resume-actions';
import { localCreateResume } from '@/lib/local-storage';

const state = vi.hoisted(() => ({ isGuest: true, isPending: false, push: vi.fn() }));
vi.mock('@/components/auth-provider', () => ({ useAuth: () => state }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: state.push }) }));
vi.mock('@/lib/actions/resume-actions', () => ({ createResume: vi.fn(), renameResume: vi.fn() }));
vi.mock('@/lib/local-storage', () => ({ localCreateResume: vi.fn(), localRenameResume: vi.fn() }));
afterEach(cleanup);
beforeEach(() => {
  vi.resetAllMocks();
  state.isGuest = true;
  state.isPending = false;
  vi.mocked(localCreateResume).mockReturnValue('local-master');
  vi.mocked(createResume).mockResolvedValue('cloud-master');
});

function fillMaster() {
  fireEvent.click(screen.getByRole('button', { name: '+ New Resume' }));
  fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Alex' } });
  fireEvent.click(screen.getByRole('button', { name: 'Next: Experience' }));
  fireEvent.change(screen.getByLabelText('Role and company 1'), {
    target: { value: 'Engineer — Acme' },
  });
  fireEvent.change(screen.getByLabelText('Achievement 1'), {
    target: { value: 'Built React screens.' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Add achievement' }));
  fireEvent.change(screen.getByLabelText('Achievement 2'), { target: { value: 'Released APIs.' } });
  fireEvent.click(screen.getByRole('button', { name: 'Next: Projects' }));
  fireEvent.change(screen.getByLabelText('Project or product name 1'), {
    target: { value: 'Reader' },
  });
  fireEvent.change(screen.getByLabelText('Achievement 1'), {
    target: { value: 'Released Reader.' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Next: Education' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Education' }), {
    target: { value: 'BSc — Example University' },
  });
}

describe('onboarding storage and recovery', () => {
  it('creates guest masters locally with the entered source', async () => {
    render(<CreateResumeButton />);
    fillMaster();
    fireEvent.click(screen.getByRole('button', { name: 'Save master resume' }));
    await waitFor(() => expect(state.push).toHaveBeenCalledWith('/editor/local-master'));
    expect(localCreateResume).toHaveBeenCalledWith(
      'Master resume',
      expect.stringContaining('Released Reader.')
    );
    expect(createResume).not.toHaveBeenCalled();
  });
  it('passes the same complete source to the owner-scoped cloud action', async () => {
    state.isGuest = false;
    render(<CreateResumeButton />);
    fillMaster();
    fireEvent.click(screen.getByRole('button', { name: 'Save master resume' }));
    await waitFor(() => expect(state.push).toHaveBeenCalledWith('/editor/cloud-master'));
    expect(createResume).toHaveBeenCalledWith(
      'Master resume',
      expect.stringContaining('BSc — Example University')
    );
    expect(localCreateResume).not.toHaveBeenCalled();
  });
  it('retains entered data after a save failure and permits retry', async () => {
    state.isGuest = false;
    vi.mocked(createResume).mockResolvedValueOnce({
      ok: false,
      error: 'Resume name, line 1. Remove the credential.',
    });
    render(<CreateResumeButton />);
    fillMaster();
    fireEvent.click(screen.getByRole('button', { name: 'Save master resume' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Resume name, line 1. Remove the credential.'
    );
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByLabelText('Full name')).toHaveValue('Alex');
    fireEvent.click(screen.getByRole('button', { name: 'Next: Experience' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next: Projects' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next: Education' }));
    expect(screen.getByRole('textbox', { name: 'Education' })).toHaveValue(
      'BSc — Example University'
    );
    fireEvent.click(screen.getByRole('button', { name: 'Save master resume' }));
    await waitFor(() => expect(state.push).toHaveBeenCalledWith('/editor/cloud-master'));
  });
  it('does not create a guest record while authentication is unresolved', () => {
    state.isPending = true;
    render(<CreateResumeButton />);
    expect(screen.getByRole('button', { name: '+ New Resume' })).toBeDisabled();
    expect(localCreateResume).not.toHaveBeenCalled();
  });
});

it('retains the authoritative saved name and displays the validation field when a rename is rejected', async () => {
  const { ResumeNameEditor } = await import('@/components/resume-name-editor');
  const { renameResume } = await import('@/lib/actions/resume-actions');
  vi.mocked(renameResume).mockResolvedValueOnce({
    ok: false,
    error: 'Resume name, line 1. Remove the credential.',
  });
  const saved = vi.fn(),
    error = vi.fn();
  render(
    <ResumeNameEditor
      resumeId="r"
      isGuest={false}
      name="Saved name"
      onSaved={saved}
      onError={error}
    />
  );
  fireEvent.click(screen.getByRole('button', { name: 'Saved name' }));
  const input = screen.getByRole('textbox', { name: 'Resume name' });
  fireEvent.change(input, { target: { value: 'Invalid name' } });
  fireEvent.blur(input);
  expect(await screen.findByRole('button', { name: 'Saved name' })).toBeVisible();
  expect(saved).not.toHaveBeenCalled();
  expect(error).toHaveBeenLastCalledWith('Resume name, line 1. Remove the credential.');
});
