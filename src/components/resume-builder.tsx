'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, FileText, Pencil } from 'lucide-react';
import { Button } from '@saas-maker/ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@saas-maker/ui/components/card';
import { Checkbox } from '@saas-maker/ui/components/checkbox';
import { Input } from '@saas-maker/ui/components/input';
import { Label } from '@saas-maker/ui/components/label';
import { Skeleton } from '@saas-maker/ui/components/skeleton';
import { Textarea } from '@saas-maker/ui/components/textarea';
import { useWorkspaceOutline } from '@/components/workspace-outline';
import { AchievementEvidenceBank } from '@/components/achievement-evidence-bank';
import { useAuth } from '@/components/auth-provider';
import { CareerResumeStudio } from '@/components/career-resume-studio';
import { ArchivedCareerProfiles } from '@/components/archived-career-profiles';
import { CareerProfilePanel } from '@/components/career-profile-panel';
import { CreateResumeButton } from '@/components/create-resume-button';
import { MasterResumeGuide } from '@/components/master-resume-guide';
import { ResumeImportButton } from '@/components/resume-import-button';
import { StashList } from '@/components/stash-list';
import { ResumeContent, ResumeContentBlock } from '@/components/resume-content-block';
import { AchievementInputs } from '@/components/achievement-inputs';
import { UserMenu } from '@/components/user-menu';
import { WorkspaceSectionNav } from '@/components/workspace-section-nav';
import { updateResume } from '@/lib/actions/resume-actions';
import { localListResumes, localUpdateResume } from '@/lib/local-storage';
import { masterResumeEntry } from '@/lib/master-resume';
import { replaceResumeRange, resumeOutline } from '@/lib/resume-outline';
import { listResumePoints, setResumePointPinned } from '@/lib/resume-pins';
import type { AchievementEvidence, Resume, StashEntry } from '@/lib/types';

const builderPages = {
  master: {
    href: '/resume-builder',
    label: 'Master résumé',
    title: 'Resume Builder',
    description: 'Edit the master résumé you use to tailor applications.',
  },
  evidence: {
    href: '/resume-builder/evidence',
    label: 'Evidence',
    title: 'Evidence',
    description: 'Keep achievements, source links, and extra experience to draw on when tailoring.',
  },
  profile: {
    href: '/resume-builder/profile',
    label: 'Career profile',
    title: 'Career profile',
    description: 'Manage the career records and application answers for this profile.',
  },
  generate: {
    href: '/resume-builder/generate',
    label: 'Generate',
    title: 'Generate a résumé',
    description: 'Create a general résumé or tailor one to a specific role.',
  },
} as const;

export function ResumeBuilder({
  serverResumes,
  serverEvidence = [],
  serverStash = [],
  requestedResume,
  view = 'master',
}: {
  serverResumes: Resume[];
  serverEvidence?: AchievementEvidence[];
  serverStash?: StashEntry[];
  requestedResume?: string;
  view?: keyof typeof builderPages;
}) {
  const { isGuest, isPending } = useAuth();
  const [resumes, setResumes] = useState(serverResumes);
  const [dirty, setDirty] = useState(false);
  const [selected, setSelected] = useState(
    serverResumes.find((item) => item.id === requestedResume)?.id ?? serverResumes[0]?.id ?? ''
  );
  const previousRequest = useRef(requestedResume);
  useEffect(() => {
    if (isPending) return;
    const items = isGuest ? localListResumes() : serverResumes;
    setResumes(items);
    const requestChanged = requestedResume !== previousRequest.current;
    previousRequest.current = requestedResume;
    setSelected((current) => {
      if ((requestChanged || !current) && items.some((item) => item.id === requestedResume)) {
        return requestedResume ?? '';
      }
      return items.some((item) => item.id === current) ? current : (items[0]?.id ?? '');
    });
  }, [isGuest, isPending, serverResumes, requestedResume]);
  const resume = resumes.find((item) => item.id === selected);
  const { title, description, href } = builderPages[view];
  const editMaster = view === 'master';
  const useProfile = view === 'profile' || view === 'generate';
  return (
    <main className="w-full min-w-0 max-w-6xl flex-1 space-y-6 p-4 md:p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1
            id={editMaster ? 'resume-builder-heading' : undefined}
            className="text-3xl font-bold tracking-tight"
          >
            {title}
          </h1>
          <p className="mt-2 max-w-xl text-muted-foreground">{description}</p>
        </div>
        {editMaster && (
          <fieldset disabled={dirty} className="flex flex-wrap gap-2">
            <ResumeImportButton />
            <CreateResumeButton destination="builder" />
          </fieldset>
        )}
      </header>
      <WorkspaceSectionNav
        label="Resume Builder sections"
        items={Object.values(builderPages)}
        current={href}
        resumeId={selected || requestedResume}
      />
      {(editMaster || (useProfile && !isGuest && !isPending)) && resumes.length > 0 && (
        <div className="max-w-md space-y-2">
          <label htmlFor="master-selection" className="block text-sm font-semibold mb-2">
            Master resume
          </label>
          <select
            id="master-selection"
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            disabled={dirty}
            value={selected}
            onChange={(event) => setSelected(event.target.value)}
          >
            {resumes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          {dirty && (
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">
              Save your changes before switching resumes.
            </p>
          )}
        </div>
      )}
      {editMaster &&
        (resume ? (
          <OutlineEditor
            key={resume.id}
            resume={resume}
            isGuest={isGuest}
            disabled={isPending}
            onDirty={setDirty}
            onSaved={(source) =>
              setResumes((items) =>
                items.map((item) => (item.id === resume.id ? { ...item, source } : item))
              )
            }
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Start with your complete master resume</CardTitle>
              <CardDescription>
                Import a resume or choose New Resume to add your roles, products, education and
                skills. You can save a draft and finish later.
              </CardDescription>
            </CardHeader>
          </Card>
        ))}
      {useProfile && isPending && <Skeleton aria-label="Loading career profile" className="h-40" />}
      {useProfile &&
        !isPending &&
        (isGuest ? (
          <Card>
            <CardHeader>
              <CardTitle>Sign in to use your career profile</CardTitle>
              <CardDescription>
                Career records and generated résumés are saved to your account.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <UserMenu callbackURL={href} />
            </CardFooter>
          </Card>
        ) : (
          <div className="space-y-6">
            {resume ? (
              view === 'profile' ? (
                <CareerProfilePanel key={resume.id} profileId={resume.id} />
              ) : (
                <CareerResumeStudio key={resume.id} profileId={resume.id} />
              )
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Start with a master résumé</CardTitle>
                </CardHeader>
                <CardFooter>
                  <Button asChild variant="outline">
                    <Link href="/resume-builder">Open master résumé</Link>
                  </Button>
                </CardFooter>
              </Card>
            )}
            {view === 'profile' && <ArchivedCareerProfiles />}
          </div>
        ))}
      {view === 'evidence' && (
        <>
          <section id="sources" className="rounded-xl border bg-card p-4 sm:p-6">
            <AchievementEvidenceBank serverEntries={serverEvidence} embedded />
          </section>
          <section id="extra-experience" className="rounded-xl border bg-card p-4 sm:p-6">
            <h2 className="text-base font-semibold">Extra experience</h2>
            <p className="mt-2 mb-6 text-muted-foreground">
              Keep additional projects, skills and achievements here for relevant applications.
            </p>
            <StashList serverEntries={serverStash} />
          </section>
        </>
      )}
    </main>
  );
}

function OutlineEditor({
  resume,
  isGuest,
  disabled,
  onDirty,
  onSaved,
}: {
  resume: Resume;
  isGuest: boolean;
  disabled: boolean;
  onDirty: (value: boolean) => void;
  onSaved: (source: string) => void;
}) {
  const [source, setSource] = useState(resume.source);
  const [savedSource, setSavedSource] = useState(resume.source);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [editCount, setEditCount] = useState(0);
  const editingChanged = (editing: boolean) =>
    setEditCount((count) => Math.max(0, count + (editing ? 1 : -1)));
  const sections = useMemo(() => resumeOutline(source), [source]);
  const outline = useWorkspaceOutline();
  const setSections = outline?.setSections;
  useEffect(() => {
    setSections?.(sections.map(({ id, title }) => ({ id, title })));
    return () => setSections?.([]);
  }, [setSections, sections]);
  const points = listResumePoints(source);
  async function save() {
    const snapshot = source;
    setSaving(true);
    setMessage('');
    try {
      if (isGuest) localUpdateResume(resume.id, snapshot);
      else {
        const issue = await updateResume(resume.id, snapshot, savedSource);
        if (issue) {
          setMessage(issue.error);
          return;
        }
      }
      setSavedSource(snapshot);
      onSaved(snapshot);
      setMessage('Saved');
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Could not save. Your edits are still here.'
      );
    } finally {
      setSaving(false);
    }
  }
  useEffect(() => {
    onDirty(source !== savedSource || editCount > 0);
  }, [source, savedSource, onDirty, editCount]);
  useEffect(() => {
    if (source === savedSource && editCount === 0) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    const guardLink = (event: MouseEvent) => {
      const link = (event.target as Element).closest('a');
      if (!link) return;
      const target = new URL(link.href, window.location.href);
      if (
        target.pathname === window.location.pathname &&
        target.search === window.location.search &&
        target.hash
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      setMessage('Save your changes before leaving your master resume.');
    };
    window.addEventListener('beforeunload', warn);
    document.addEventListener('click', guardLink, true);
    return () => {
      window.removeEventListener('beforeunload', warn);
      document.removeEventListener('click', guardLink, true);
    };
  }, [source, savedSource, editCount]);
  return (
    <div className="space-y-6">
      {!outline && (
        <aside className="rounded-md border p-4">
          <div className="font-semibold text-sm mb-3">In your resume</div>
          <div className="flex flex-wrap lg:flex-col gap-1">
            {sections.map((section) => (
              <a key={section.id} className="outline-link" href={`#${section.id}`}>
                {section.title}
              </a>
            ))}
          </div>
        </aside>
      )}
      <div className="min-w-0 space-y-6">
        <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b bg-background py-3">
          <p role="status" className="text-sm font-semibold">
            {editCount > 0
              ? 'Finish your edit, then save'
              : (message === 'Saved' && source !== savedSource ? '' : message) ||
                (source === savedSource ? 'All changes saved' : 'Unsaved changes')}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href={`/editor/${resume.id}`} prefetch={false}>
                <FileText />
                Preview
              </Link>
            </Button>
            <Button disabled={saving || disabled || editCount > 0} type="button" onClick={save}>
              <Check />
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
        <MasterResumeGuide source={source} onChange={setSource} />
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
          <fieldset className="min-w-0 space-y-6" disabled={saving || disabled}>
            {sections.map((section) => {
              const sectionPoints = points.filter(
                (point) => point.start >= section.contentStart && point.end <= section.end
              );
              let cursor = section.contentStart;
              const pieces: React.ReactNode[] = [];
              function details(start: number, end: number, suffix: string) {
                if (!source.slice(start, end).trim() && sectionPoints.length) return;
                const content = source.slice(start, end);
                const editStart = start + (content.match(/^\s*/)?.[0].length ?? 0);
                const editEnd = Math.max(editStart, end - (content.match(/\s*$/)?.[0].length ?? 0));
                pieces.push(
                  <ResumeContentBlock
                    key={`details-${suffix}`}
                    id={`${section.id}-${suffix}`}
                    label={
                      sectionPoints.length
                        ? `${section.title} ${suffix === 'end' ? 'additional details' : `details ${Number(suffix) + 1}`}`
                        : section.title
                    }
                    section={section.title}
                    onEditing={editingChanged}
                    value={source.slice(editStart, editEnd)}
                    onChange={(value) =>
                      setSource(replaceResumeRange(source, editStart, editEnd, value))
                    }
                  />
                );
              }
              for (const [index, point] of sectionPoints.entries()) {
                details(cursor, point.start, String(index));
                pieces.push(
                  <Achievement
                    key={point.id}
                    id={`${section.id}-${point.id}`}
                    number={index + 1}
                    text={point.label}
                    pinned={point.pinned}
                    onEditing={editingChanged}
                    onPin={(pinned) => setSource(setResumePointPinned(source, point.id, pinned))}
                    onChange={(value) => {
                      const prefix = point.text.match(/^\s*[-+*]\s+/)?.[0] ?? '- ';
                      const marker = point.pinned ? ' <!-- rolepatch:always-include -->' : '';
                      const newline = value.indexOf('\n');
                      const updated =
                        newline < 0
                          ? prefix + value + marker
                          : prefix + value.slice(0, newline) + marker + value.slice(newline);
                      setSource(replaceResumeRange(source, point.start, point.end, updated));
                    }}
                  />
                );
                cursor = point.end;
              }
              if (cursor < section.end || !sectionPoints.length)
                details(cursor, section.end, 'end');
              return (
                <section id={section.id} key={section.id} className="scroll-mt-20">
                  <Card>
                    <CardHeader>
                      <CardTitle>
                        <h2>{section.title}</h2>
                      </CardTitle>
                      <CardDescription>
                        {/experience|employment|work history/i.test(section.title)
                          ? 'Keep every role and achievement here. Edit only the point you want to improve.'
                          : /projects?|products?/i.test(section.title)
                            ? 'Your complete products and projects. Each job ranks these alongside your experience.'
                            : /education/i.test(section.title)
                              ? 'Your qualifications stay in every tailored resume.'
                              : /skills/i.test(section.title)
                                ? 'Only skills you have supplied appear in your resumes.'
                                : 'Review your details, then choose Edit to make a change.'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/education/i.test(section.title) && (
                        <div className="flex items-center gap-2">
                          <Checkbox id={`education-${section.id}`} checked disabled />
                          <Label htmlFor={`education-${section.id}`}>
                            Education · always included
                          </Label>
                        </div>
                      )}
                      <div className="space-y-5">{pieces}</div>
                      {/experience|employment|work history|projects?|products?/i.test(
                        section.title
                      ) && (
                        <AddEntry
                          key={section.id}
                          project={/projects?|products?/i.test(section.title)}
                          onAdd={(entry) =>
                            setSource(
                              replaceResumeRange(source, section.end, section.end, `\n${entry}\n\n`)
                            )
                          }
                        />
                      )}
                    </CardContent>
                  </Card>
                </section>
              );
            })}
          </fieldset>
          <Card className="xl:sticky xl:top-20">
            <CardHeader>
              <CardTitle>Keep essential points</CardTitle>
              <CardDescription>
                Mark a point “Always include” to keep it in every tailored resume.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Add all your experience and complete projects. Each job uses the most relevant
                points, keeps education, and gets a new summary.
              </p>
            </CardContent>
            <CardFooter>
              <Button variant="outline" asChild>
                <Link href="/jobs" prefetch={false}>
                  Use for a job
                </Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
        <div className="flex flex-wrap gap-4 border-t border-[var(--border)] pt-6">
          <Link
            className="font-semibold underline"
            href={`/editor/${resume.id}`}
            onClick={(event) => {
              if (source !== savedSource) {
                event.preventDefault();
                setMessage('Save your changes before previewing or choosing a job.');
              }
            }}
          >
            Preview and export resume
          </Link>
          <Link
            className="font-semibold underline"
            href="/jobs"
            onClick={(event) => {
              if (source !== savedSource) {
                event.preventDefault();
                setMessage('Save your changes before previewing or choosing a job.');
              }
            }}
          >
            Choose a job
          </Link>
        </div>
      </div>
    </div>
  );
}

function Achievement({
  id,
  number,
  text,
  pinned,
  onPin,
  onChange,
  onEditing,
}: {
  id: string;
  number: number;
  text: string;
  pinned: boolean;
  onPin: (pinned: boolean) => void;
  onChange: (text: string) => void;
  onEditing: (editing: boolean) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(text);
  const editRef = useRef<HTMLButtonElement>(null);
  const wasEditing = useRef(false);
  useEffect(() => {
    if (!editing && wasEditing.current) editRef.current?.focus();
    wasEditing.current = editing;
  }, [editing]);
  return (
    <div className="space-y-3 border-t pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">Achievement {number}</p>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Checkbox
              id={`pin-${id}`}
              checked={pinned}
              aria-label={`Always include: ${text}`}
              onCheckedChange={(checked) => onPin(checked === true)}
            />
            <Label htmlFor={`pin-${id}`} className="text-xs font-normal">
              Always include
            </Label>
          </div>
          {!editing && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              ref={editRef}
              aria-label={`Edit achievement ${number}: ${text}`}
              onClick={() => {
                setDraft(text);
                onEditing(true);
                setEditing(true);
              }}
            >
              <Pencil className="size-3.5" />
              Edit
            </Button>
          )}
        </div>
      </div>
      {editing ? (
        <div className="space-y-3">
          <Label htmlFor={id}>Achievement {number}</Label>
          <p id={`${id}-help`} className="text-sm text-muted-foreground">
            What did you build or improve? Include the result when you know it.
          </p>
          <Textarea
            id={id}
            aria-describedby={`${id}-help`}
            autoFocus
            rows={4}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
          {!draft.trim() && (
            <p className="text-sm text-muted-foreground">
              Add the achievement wording, or cancel to keep the original point.
            </p>
          )}
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              disabled={!draft.trim()}
              onClick={() => {
                onChange(draft);
                setEditing(false);
                onEditing(false);
              }}
            >
              Done
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                onEditing(false);
                setEditing(false);
              }}
            >
              Cancel edit
            </Button>
          </div>
        </div>
      ) : (
        <ResumeContent>{text}</ResumeContent>
      )}
    </div>
  );
}

function AddEntry({ project, onAdd }: { project: boolean; onAdd: (entry: string) => void }) {
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [points, setPoints] = useState('');
  const [open, setOpen] = useState(false);
  return (
    <details open={open} onToggle={(event) => setOpen(event.currentTarget.open)} className="mt-6">
      <summary className="cursor-pointer font-semibold">
        + Add {project ? 'project or product' : 'role'}
      </summary>
      <div className="space-y-4 mt-5">
        <label className="block text-sm font-semibold">
          {project ? 'Project name' : 'Role and company'}
          <Input
            className="mt-2"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>
        <label className="block text-sm font-semibold">
          {project ? 'Technologies and link' : 'Dates and location'}
          <Input
            className="mt-2"
            value={details}
            onChange={(event) => setDetails(event.target.value)}
          />
        </label>
        <AchievementInputs value={points} onChange={setPoints} label="Achievements" />
        <Button
          type="button"
          disabled={!title.trim()}
          onClick={() => {
            onAdd(masterResumeEntry({ title, details, points }));
            setTitle('');
            setDetails('');
            setPoints('');
            setOpen(false);
          }}
        >
          Add to master
        </Button>
      </div>
    </details>
  );
}
