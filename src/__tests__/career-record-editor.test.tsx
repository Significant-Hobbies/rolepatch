import { fireEvent, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { it, expect, vi } from 'vitest';
import { CareerRecordEditor } from '@/components/career-record-editor';

it('preserves a saved claim while typing an extra evidence URL, and requires deliberate reconfirmation after a wording edit', async () => {
  const onSave = vi.fn();
  const user = userEvent.setup();
  render(
    <CareerRecordEditor
      includeSensitive={false}
      pending={false}
      onCancel={() => {}}
      onSave={onSave}
      record={{
        id: 'test',
        profile_id: 'p',
        kind: 'achievement',
        title: 'Cache',
        revision: 1,
        sensitive: false,
        archived_at: null,
        data: {
          approved_wording: 'Built cache',
          verification_status: 'document_supported',
          source_urls: ['https://example.test/a'],
        },
      }}
    />
  );
  await user.type(
    screen.getByLabelText('Source links (one per line)'),
    '{End}{Enter}https://example.test/b'
  );
  const status = screen.getByLabelText('Verification status');
  expect(status).toHaveValue('document_supported');
  fireEvent.click(screen.getByRole('button', { name: 'Save record' }));
  expect(onSave).toHaveBeenLastCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        source_urls: ['https://example.test/a', 'https://example.test/b'],
        verification_status: 'document_supported',
      }),
      reconfirm: false,
    })
  );
  fireEvent.change(screen.getByLabelText('Approved wording'), {
    target: { value: 'Built another cache' },
  });
  expect(status).toHaveValue('unverified');
  await user.selectOptions(status, 'document_supported');
  fireEvent.click(screen.getByRole('button', { name: 'Save record' }));
  expect(onSave).toHaveBeenLastCalledWith(
    expect.objectContaining({
      reconfirm: true,
      data: expect.objectContaining({ verification_status: 'document_supported' }),
    })
  );
});
