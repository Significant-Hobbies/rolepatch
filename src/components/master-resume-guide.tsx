'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useId, useState } from 'react';
import { appendMasterSection, masterResumeReadiness, prependMasterName } from '@/lib/master-resume';

export function MasterResumeGuide({
  source,
  onChange,
}: {
  source: string;
  onChange: (source: string) => void;
}) {
  const readiness = masterResumeReadiness(source);
  const prefix = useId();
  const [name, setName] = useState('');
  const [projectName, setProjectName] = useState('');
  const [projects, setProjects] = useState('');
  const [education, setEducation] = useState('');
  const hasAdditions =
    (!readiness.hasName && name.trim()) ||
    (!readiness.projects && projects.trim()) ||
    (!readiness.education && education.trim());
  return (
    <details
      open={!readiness.ready}
      className="border-b border-[var(--border)] bg-[var(--card)] px-4 py-3"
    >
      <summary className="cursor-pointer text-sm font-semibold">
        Master resume · {readiness.ready ? 'ready for a job' : 'add missing details'}
      </summary>
      <div className="mt-3 max-h-64 overflow-y-auto space-y-3 pr-2 text-sm">
        <p className="text-[var(--muted-foreground)]">
          Keep every relevant role, achievement, project and skill here. These are your approved
          points for future resumes. Each JD changes their order and gets a new summary.
        </p>
        <ul className="space-y-1">
          <li>{readiness.projects ? '✓' : '○'} Projects and product achievements</li>
          <li>{readiness.education ? '✓' : '○'} Education · included in every draft</li>
          <li>
            {readiness.points > 0 ? '✓' : '○'} {readiness.points} achievement{' '}
            {readiness.points === 1 ? 'point' : 'points'}
          </li>
        </ul>
        {!readiness.hasName && (
          <div>
            <label htmlFor={`${prefix}-name`} className="block font-semibold mb-2">
              Full name
            </label>
            <Input
              id={`${prefix}-name`}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
        )}
        {!readiness.projects && (
          <>
            <div>
              <label htmlFor={`${prefix}-project-name`} className="block font-semibold mb-2">
                Project or product name
              </label>
              <Input
                id={`${prefix}-project-name`}
                value={projectName}
                onChange={(event) => setProjectName(event.target.value)}
              />
            </div>
            <div>
              <label htmlFor={`${prefix}-projects`} className="block font-semibold mb-2">
                Project achievements — one point per line
              </label>
              <Textarea
                id={`${prefix}-projects`}
                rows={3}
                value={projects}
                onChange={(event) => setProjects(event.target.value)}
              />
            </div>
          </>
        )}
        {!readiness.education && (
          <div>
            <label htmlFor={`${prefix}-education`} className="block font-semibold mb-2">
              Education
            </label>
            <Textarea
              id={`${prefix}-education`}
              rows={3}
              value={education}
              onChange={(event) => setEducation(event.target.value)}
            />
            <p className="mt-2 text-[var(--muted-foreground)]">
              Degree or qualification, institution and dates. Only add your actual details.
            </p>
          </div>
        )}
        {!readiness.ready && (
          <>
            {hasAdditions && (
              <Button
                type="button"
                onClick={() => {
                  let updated = source;
                  if (!readiness.hasName) updated = prependMasterName(updated, name);
                  if (!readiness.projects)
                    updated = appendMasterSection(updated, 'Projects', projects, projectName);
                  if (!readiness.education)
                    updated = appendMasterSection(updated, 'Education', education);
                  onChange(updated);
                  setName('');
                  setProjectName('');
                  setProjects('');
                  setEducation('');
                }}
              >
                Add details to master
              </Button>
            )}
            <p className="text-[var(--muted-foreground)]">
              Use the editor below to check your imported history and add any other missing points.
              Click Save to keep your changes.
            </p>
            {readiness.projects && readiness.education && readiness.policyError && (
              <p role="status">{readiness.policyError}</p>
            )}
          </>
        )}
        {readiness.ready && (
          <p>
            Review your points, choose “Always include,” and click Save. Then{' '}
            <Link href="/jobs" className="underline font-semibold">
              add a job description
            </Link>
            .
          </p>
        )}
      </div>
    </details>
  );
}
