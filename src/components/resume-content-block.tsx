'use client';

import { useEffect, useRef, useState } from 'react';
import { Pencil } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { lexResumeMarkdown } from '@/lib/resume-bullet-ranking';

export function ResumeContent({ children }: { children: string }) {
  return (
    <div className="min-w-0 text-sm leading-6 wrap-anywhere [&_p+p]:mt-2 [&_h1]:text-xl [&_h1]:font-semibold [&_h3]:text-base [&_h3]:font-semibold [&_h4]:font-semibold [&_a]:underline [&_a]:underline-offset-4 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_table]:block [&_table]:overflow-x-auto [&_td]:px-2 [&_th]:px-2">
      <ReactMarkdown
        skipHtml
        components={{ h1: ({ children }) => <h3 className="text-xl font-semibold">{children}</h3> }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

/** Use original source ranges so editing one field never rebuilds imported history. */
export function ResumeContentBlock({
  id,
  value,
  label,
  section,
  onChange,
  onEditing,
}: {
  id: string;
  value: string;
  label: string;
  section: string;
  onChange: (value: string) => void;
  onEditing: (editing: boolean) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [original, setOriginal] = useState(value);
  const editRef = useRef<HTMLButtonElement>(null);
  const wasEditing = useRef(false);
  useEffect(() => {
    if (!editing && wasEditing.current) editRef.current?.focus();
    wasEditing.current = editing;
  }, [editing]);
  const [edits, setEdits] = useState<Record<number, string>>({});
  const lexed = lexResumeMarkdown(original);
  let cursor = 0;
  const fields = lexed?.tokens.flatMap((token) => {
    const start = lexed.offsets[cursor];
    cursor += token.raw.length;
    const end = lexed.offsets[cursor];
    if (token.type === 'space') return [];
    const raw = original.slice(start, end);
    const trailing = raw.match(/\s*$/)?.[0] ?? '';
    const heading = token.type === 'heading' ? (raw.match(/^#{1,6}[ \t]+/)?.[0] ?? '') : '';
    const category =
      token.type === 'paragraph' ? (raw.match(/^\*\*([^*]+):\*\*[ \t]*/)?.[0] ?? '') : '';
    const prefix = heading || category;
    const content = raw.slice(prefix.length, raw.length - trailing.length);
    let title = section;
    if (category) title = category.replace(/\*/g, '').replace(/:\s*$/, '');
    else if (token.type === 'heading')
      title = /personal/i.test(section)
        ? 'Full name'
        : /education/i.test(section)
          ? 'Institution and qualification'
          : /projects?|products?/i.test(section)
            ? 'Project name and description'
            : 'Role and company';
    else if (/personal/i.test(section))
      title = /@|https?:|\|/.test(content) ? 'Contact details and links' : 'Professional headline';
    else if (/education/i.test(section)) title = 'Education details';
    else if (/experience|employment|work history/i.test(section))
      title = 'Dates, location and role details';
    else if (/projects?|products?/i.test(section)) title = 'Technologies and links';
    return [
      {
        start,
        end,
        prefix,
        trailing,
        content,
        title,
        multiline:
          /\n/.test(content) ||
          /summary|skills/i.test(section) ||
          token.type === 'list' ||
          token.type === 'table',
      },
    ];
  });
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        {!editing && value.trim() ? (
          <ResumeContent>{value}</ResumeContent>
        ) : (
          <p className="text-sm font-medium">{label}</p>
        )}
        {!editing && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            ref={editRef}
            aria-label={`Edit ${label}`}
            onClick={() => {
              setOriginal(value);
              setEdits({});
              setEditing(true);
              onEditing(true);
            }}
          >
            <Pencil className="size-3.5" />
            Edit
          </Button>
        )}
      </div>
      {editing && (
        <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
          {fields?.length ? (
            fields.map((field, index) => {
              const props = {
                id: `${id}-${index}`,
                value: edits[index] ?? field.content,
                autoFocus: index === 0,
                onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                  setEdits((items) => ({ ...items, [index]: event.target.value })),
              };
              return (
                <div key={`${id}-${index}`} className="space-y-2">
                  <Label htmlFor={props.id}>{field.title}</Label>
                  {field.multiline ? <Textarea {...props} rows={3} /> : <Input {...props} />}
                </div>
              );
            })
          ) : (
            <>
              <Label htmlFor={id}>{section}</Label>
              <Textarea
                id={id}
                value={edits[0] ?? original}
                rows={3}
                onChange={(event) => setEdits({ 0: event.target.value })}
              />
            </>
          )}
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => {
                let next = original;
                if (fields?.length) {
                  for (let index = fields.length - 1; index >= 0; index--) {
                    const field = fields[index];
                    if (edits[index] !== undefined)
                      next =
                        next.slice(0, field.start) +
                        field.prefix +
                        edits[index] +
                        field.trailing +
                        next.slice(field.end);
                  }
                } else next = edits[0] ?? original;
                onChange(next);
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
                setEditing(false);
                onEditing(false);
              }}
            >
              Cancel edit
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
