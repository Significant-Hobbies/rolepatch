import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateResumeButton } from '@/components/create-resume-button';
import { createResume } from '@/lib/actions/resume-actions';
import { localCreateResume } from '@/lib/local-storage';

const state = vi.hoisted(() => ({ isGuest: true, isPending: false, push: vi.fn() }));
vi.mock('@/components/auth-provider', () => ({ useAuth: () => state }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: state.push }) }));
vi.mock('@/lib/actions/resume-actions', () => ({ createResume: vi.fn() }));
vi.mock('@/lib/local-storage', () => ({ localCreateResume: vi.fn() }));
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
    vi.mocked(createResume).mockRejectedValueOnce(new Error('Save unavailable'));
    render(<CreateResumeButton />);
    fillMaster();
    fireEvent.click(screen.getByRole('button', { name: 'Save master resume' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Save unavailable');
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
