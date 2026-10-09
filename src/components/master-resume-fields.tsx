'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useId } from 'react';
import { AchievementInputs } from '@/components/achievement-inputs';
import type { MasterResumeData, MasterResumeEntry } from '@/lib/master-resume';

export function MasterResumeFields({
  value,
  onChange,
  section,
}: {
  value: MasterResumeData;
  section?: 'personal' | 'experience' | 'projects' | 'education' | 'skills';
  onChange: (value: MasterResumeData) => void;
}) {
  const prefix = useId();
  function field(
    key: 'fullName' | 'contact' | 'education' | 'skills',
    label: string,
    help?: string,
    multiline = false
  ) {
    const id = `${prefix}-${key}`;
    const props = {
      id,
      value: value[key],
      onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        onChange({ ...value, [key]: event.target.value }),
      className: 'w-full',
      'aria-describedby': help ? `${id}-help` : undefined,
    };
    return (
      <div>
        <label htmlFor={id} className="block text-sm font-semibold mb-2">
          {label}
        </label>
        {multiline ? <Textarea {...props} rows={3} /> : <Input {...props} />}
        {help && (
          <p id={`${id}-help`} className="mt-2 text-sm text-[var(--muted-foreground)]">
            {help}
          </p>
        )}
      </div>
    );
  }
  function group(
    key: 'experience' | 'projects',
    label: string,
    titleLabel: string,
    detailsLabel: string
  ) {
    function change(index: number, part: keyof MasterResumeEntry, text: string) {
      onChange({
        ...value,
        [key]: value[key].map((entry, i) => (i === index ? { ...entry, [part]: text } : entry)),
      });
    }
    return (
      <fieldset className="space-y-4">
        <legend className="text-base font-bold mb-3">{label}</legend>
        <p className="text-sm text-[var(--muted-foreground)]">
          {key === 'experience'
            ? 'Include every role and all your achievements. You can leave this blank if you have no work history yet.'
            : 'Include your products, personal projects and coursework projects. Add what you built and the result.'}
        </p>
        {value[key].map((entry, index) => (
          <div
            key={`${key}-${index}`}
            className="space-y-4 rounded-lg border border-[var(--border)] p-4"
          >
            {(['title', 'details'] as const).map((part) => {
              const id = `${prefix}-${key}-${index}-${part}`;
              const labelText = part === 'title' ? titleLabel : detailsLabel;
              const props = {
                id,
                value: entry[part],
                onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                  change(index, part, event.target.value),
                className: 'w-full',
              };
              return (
                <div key={part}>
                  <label htmlFor={id} className="block text-sm font-semibold mb-2">
                    {labelText} {index + 1}
                  </label>
                  <Input {...props} />
                </div>
              );
            })}
            <AchievementInputs
              value={entry.points}
              onChange={(text) => change(index, 'points', text)}
            />
          </div>
        ))}
        <Button
          type="button"
          onClick={() =>
            onChange({ ...value, [key]: [...value[key], { title: '', details: '', points: '' }] })
          }
          variant="outline"
        >
          + Add another {key === 'experience' ? 'role' : 'project'}
        </Button>
      </fieldset>
    );
  }
  return (
    <div className="space-y-7">
      {(!section || section === 'personal') && field('fullName', 'Full name')}
      {(!section || section === 'personal') &&
        field(
          'contact',
          'Contact details and links',
          'Email, location, phone and professional links you want on your resume. Only include what you want to share.',
          true
        )}
      {(!section || section === 'experience') &&
        group('experience', 'Work experience', 'Role and company', 'Dates and location')}
      {(!section || section === 'projects') &&
        group(
          'projects',
          'Projects and products',
          'Project or product name',
          'Technologies and link (optional)'
        )}
      {(!section || section === 'education') &&
        field(
          'education',
          'Education',
          'Degree or qualification, institution and dates. Include every relevant entry; education stays in every tailored resume.',
          true
        )}
      {(!section || section === 'skills') &&
        field(
          'skills',
          'Skills',
          'Your actual tools, languages and skills. The job description will not add skills you have not supplied.',
          true
        )}
    </div>
  );
}
