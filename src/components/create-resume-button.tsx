'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useAuth } from '@/components/auth-provider';
import { MasterResumeFields } from '@/components/master-resume-fields';
import { createResume } from '@/lib/actions/resume-actions';
import { localCreateResume } from '@/lib/local-storage';
import { buildMasterResume, emptyMasterResume, masterResumeReadiness } from '@/lib/master-resume';

export function CreateResumeButton({
  destination = 'editor',
}: {
  destination?: 'editor' | 'builder';
}) {
  const router = useRouter();
  const { isGuest, isPending: authPending } = useAuth();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('Master resume');
  const [master, setMaster] = useState(emptyMasterResume);
  const [step, setStep] = useState('personal');
  const steps = [
    { id: 'personal', label: 'Personal' },
    { id: 'experience', label: 'Experience' },
    { id: 'projects', label: 'Projects' },
    { id: 'education', label: 'Education' },
    { id: 'skills', label: 'Skills' },
  ] as const;
  const stepIndex = steps.findIndex((item) => item.id === step);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    if (loading) return;
    setOpen(false);
    triggerRef.current?.focus();
  }, [loading]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || authPending) return;
    const source = buildMasterResume(master);
    setLoading(true);
    setError('');
    try {
      let id: string;
      if (isGuest) {
        id = localCreateResume(trimmed, source);
      } else {
        id = await createResume(trimmed, source);
      }
      setOpen(false);
      setMaster(emptyMasterResume());
      setStep('personal');
      setName('Master resume');
      router.push(destination === 'builder' ? `/resume-builder?resume=${id}` : `/editor/${id}`);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Could not save your master. Your entered details are still here.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (next) setOpen(true);
        else close();
      }}
    >
      <SheetTrigger asChild>
        <Button ref={triggerRef} variant="outline" disabled={authPending}>
          + New Resume
        </Button>
      </SheetTrigger>

      <SheetContent
        className="flex w-full flex-col overflow-hidden p-0 sm:max-w-xl"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          inputRef.current?.focus();
        }}
        onEscapeKeyDown={(event) => {
          if (loading) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (loading) event.preventDefault();
        }}
      >
        <SheetHeader className="shrink-0 border-b px-6 py-5 pr-12">
          <SheetTitle>Build your master resume</SheetTitle>
          <SheetDescription>
            Add your complete history once. We keep your points and projects, rank them for each
            job, and write a fresh summary. You can save a draft and finish later.
          </SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-6">
          {' '}
          <form onSubmit={handleSubmit} className="space-y-6 pt-4">
            <Tabs value={step} onValueChange={setStep}>
              <div className="sticky top-0 z-10 space-y-3 bg-background pb-3">
                <p className="text-sm text-muted-foreground">
                  Section {stepIndex + 1} of {steps.length} · Save a draft whenever you want.
                </p>
                <TabsList
                  className="h-auto w-full flex-wrap justify-start"
                  aria-label="Master resume sections"
                >
                  {steps.map((item) => (
                    <TabsTrigger key={item.id} value={item.id} disabled={loading}>
                      {item.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
              <TabsContent value="personal" className="space-y-5 pt-4">
                <div>
                  <label
                    htmlFor="master-document-name"
                    className="block text-sm font-semibold mb-2"
                  >
                    Resume name
                  </label>
                  <Input
                    ref={inputRef}
                    id="master-document-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <fieldset disabled={loading}>
                  <MasterResumeFields value={master} onChange={setMaster} section="personal" />
                </fieldset>
              </TabsContent>
              {steps.slice(1).map((item) => (
                <TabsContent key={item.id} value={item.id} className="pt-4">
                  <fieldset disabled={loading}>
                    <MasterResumeFields value={master} onChange={setMaster} section={item.id} />
                  </fieldset>
                </TabsContent>
              ))}
            </Tabs>
            <p className="text-sm text-[var(--muted-foreground)]">
              Next: review your master, mark points “Always include,” then add a job description.
            </p>
            {error && (
              <p role="alert" className="text-sm text-red-700">
                {error}
              </p>
            )}

            <div className="sticky bottom-0 flex flex-wrap items-center justify-end gap-2 border-t bg-background py-4">
              {stepIndex > 0 && (
                <Button
                  type="button"
                  onClick={() => setStep(steps[stepIndex - 1].id)}
                  disabled={loading}
                  variant="ghost"
                >
                  Back
                </Button>
              )}
              {stepIndex < steps.length - 1 && (
                <Button
                  type="button"
                  onClick={() => setStep(steps[stepIndex + 1].id)}
                  disabled={loading}
                  variant="outline"
                >
                  Next: {steps[stepIndex + 1].label}
                </Button>
              )}
              <Button type="submit" disabled={loading || authPending || !name.trim()}>
                {loading
                  ? 'Saving...'
                  : masterResumeReadiness(buildMasterResume(master)).ready
                    ? 'Save master resume'
                    : 'Save draft'}
              </Button>
            </div>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
