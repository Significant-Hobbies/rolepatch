'use client';

import { useCallback, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { JobResumeHistory } from '@/components/job-resume-history';
import type { TailoredResume, JobDetailsPatch } from '@/lib/types';

export interface JobDetailsModalInitialValues {
  interview_date: number | null;
  follow_up_at: number | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  offer_amount: number | null;
  notes: string | null;
  rejection_reason: string | null;
}

interface JobDetailsModalProps {
  open: boolean;
  jobTitle: string;
  company: string;
  initial: JobDetailsModalInitialValues;
  description?: string;
  versions?: TailoredResume[];
  onClose: () => void;
  onReturnFocus?: () => void;
  onSave: (patch: JobDetailsPatch) => Promise<void> | void;
}

// unix seconds ↔ <Input type="datetime-local"> ("YYYY-MM-DDTHH:MM")
function unixToLocalInput(unix: number | null): string {
  if (!unix) return '';
  const d = new Date(unix * 1000);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function localInputToUnix(value: string): number | null {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? Math.floor(ms / 1000) : null;
}

// dollars ↔ cents
function centsToDollars(cents: number | null): string {
  if (cents == null) return '';
  return (cents / 100).toFixed(2);
}

function dollarsToCents(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const num = Number(trimmed);
  if (!Number.isFinite(num)) return null;
  return Math.round(num * 100);
}

export function JobDetailsModal({
  open,
  jobTitle,
  company,
  initial,
  description = '',
  versions = [],
  onClose,
  onReturnFocus,
  onSave,
}: JobDetailsModalProps) {
  const [interviewDate, setInterviewDate] = useState('');
  const [followUpAt, setFollowUpAt] = useState('');
  const [salaryMin, setSalaryMin] = useState('');
  const [salaryMax, setSalaryMax] = useState('');
  const [salaryCurrency, setSalaryCurrency] = useState('');
  const [offerAmount, setOfferAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Reset form from `initial` every time modal opens
  useEffect(() => {
    if (!open) return;
    setInterviewDate(unixToLocalInput(initial.interview_date));
    setFollowUpAt(unixToLocalInput(initial.follow_up_at));
    setSalaryMin(centsToDollars(initial.salary_min));
    setSalaryMax(centsToDollars(initial.salary_max));
    setSalaryCurrency(initial.salary_currency ?? '');
    setOfferAmount(centsToDollars(initial.offer_amount));
    setNotes(initial.notes ?? '');
    setRejectionReason(initial.rejection_reason ?? '');
    setError('');
  }, [open, initial]);

  const close = useCallback(() => {
    if (saving) return;
    onClose();
  }, [saving, onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const currency = salaryCurrency.trim().toUpperCase();
    if (currency && !/^[A-Z]{3}$/.test(currency)) {
      setError('Currency must be a 3-letter ISO 4217 code (e.g. USD)');
      return;
    }

    const patch: JobDetailsPatch = {
      interview_date: localInputToUnix(interviewDate),
      follow_up_at: localInputToUnix(followUpAt),
      salary_min: dollarsToCents(salaryMin),
      salary_max: dollarsToCents(salaryMax),
      salary_currency: currency || null,
      offer_amount: dollarsToCents(offerAmount),
      notes: notes.trim() || null,
      rejection_reason: rejectionReason.trim() || null,
    };

    setSaving(true);
    setError('');
    try {
      await onSave(patch);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
      }}
    >
      <SheetContent
        onCloseAutoFocus={(event) => {
          if (onReturnFocus) {
            event.preventDefault();
            onReturnFocus();
          }
        }}
        className="overflow-y-auto sm:max-w-xl"
        onEscapeKeyDown={(event) => {
          if (saving) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (saving) event.preventDefault();
        }}
      >
        <SheetHeader>
          <SheetTitle>{jobTitle || 'Untitled Role'}</SheetTitle>
          <SheetDescription>{company || 'Unknown Company'}</SheetDescription>
        </SheetHeader>
        <Tabs defaultValue="description" className="mt-6">
          <TabsList>
            <TabsTrigger value="description">Description</TabsTrigger>
            <TabsTrigger value="resumes">Resumes</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>
          <TabsContent value="description" className="mt-4">
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {description || 'No job description saved.'}
            </p>
          </TabsContent>
          <TabsContent value="resumes" className="mt-4">
            <JobResumeHistory role={jobTitle} company={company} versions={versions} />
          </TabsContent>
          <TabsContent value="details" className="mt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="job-details-interviewDate"
                    className="block text-sm font-medium mb-2"
                  >
                    Interview
                  </label>
                  <Input
                    type="datetime-local"
                    id="job-details-interviewDate"
                    value={interviewDate}
                    onChange={(e) => setInterviewDate(e.target.value)}
                  />
                </div>
                <div>
                  <label
                    htmlFor="job-details-followUpAt"
                    className="block text-sm font-medium mb-2"
                  >
                    Follow-up
                  </label>
                  <Input
                    type="datetime-local"
                    id="job-details-followUpAt"
                    value={followUpAt}
                    onChange={(e) => setFollowUpAt(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-[1fr_1fr_90px] gap-3">
                <div>
                  <label htmlFor="job-details-salaryMin" className="block text-sm font-medium mb-2">
                    Salary min
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    id="job-details-salaryMin"
                    value={salaryMin}
                    onChange={(e) => setSalaryMin(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label htmlFor="job-details-salaryMax" className="block text-sm font-medium mb-2">
                    Salary max
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    id="job-details-salaryMax"
                    value={salaryMax}
                    onChange={(e) => setSalaryMax(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label
                    htmlFor="job-details-salaryCurrency"
                    className="block text-sm font-medium mb-2"
                  >
                    Currency
                  </label>
                  <Input
                    type="text"
                    id="job-details-salaryCurrency"
                    value={salaryCurrency}
                    onChange={(e) => setSalaryCurrency(e.target.value)}
                    placeholder="USD"
                    maxLength={3}
                    className="uppercase"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="job-details-offerAmount" className="block text-sm font-medium mb-2">
                  Offer amount
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  id="job-details-offerAmount"
                  value={offerAmount}
                  onChange={(e) => setOfferAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div>
                <label htmlFor="job-details-notes" className="block text-sm font-medium mb-2">
                  Notes
                </label>
                <Textarea
                  id="job-details-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Recruiter name, interviewer, prep notes..."
                />
              </div>

              <div>
                <label
                  htmlFor="job-details-rejectionReason"
                  className="block text-sm font-medium mb-2"
                >
                  Rejection reason
                </label>
                <Input
                  type="text"
                  id="job-details-rejectionReason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Optional"
                />
              </div>

              {error && (
                <div className="text-sm text-[var(--destructive)] bg-[var(--destructive)]/10 border border-[var(--destructive)]/20 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button type="button" onClick={close} disabled={saving} variant="outline">
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
