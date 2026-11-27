import { Label } from '@saas-maker/ui/components/label';
import { NativeSelect } from '@saas-maker/ui/components/native-controls';
import { Input } from '@saas-maker/ui/components/input';
import { Textarea } from '@saas-maker/ui/components/textarea';

export type TrackerRow = Record<string, string | number | null>;
export interface TrackerField {
  key: string;
  label: string;
  type?: 'date' | 'number' | 'url' | 'long';
  choices?: readonly string[];
  required?: boolean;
}
export const choiceClass = 'h-9 w-full rounded-md border border-input bg-background px-2 text-sm';
export function displayChoice(value: string) {
  return value.replaceAll('_', ' ');
}
function parseField(field: TrackerField, raw: string) {
  if (raw === '') return field.key === 'jd_text' ? '' : null;
  switch (field.type) {
    case 'number':
      return Number(raw);
    case 'date':
      return Date.parse(`${raw}T00:00:00Z`) / 1000;
    default:
      return raw;
  }
}
export function readFields(form: HTMLFormElement, fields: TrackerField[], original?: TrackerRow) {
  const data = new FormData(form);
  const values: Record<string, string | number | null> = {};
  for (const field of fields) {
    const raw = String(data.get(field.key) ?? '');
    const value = parseField(field, raw);
    const initial = original?.[field.key];
    if (
      initial === value ||
      (initial == null && value == null) ||
      (field.key === 'url' && !value && !initial)
    )
      continue;
    // A date-only edit must retain any existing time if the displayed day was untouched.
    if (
      field.type === 'date' &&
      typeof initial === 'number' &&
      raw === new Date(initial * 1000).toISOString().slice(0, 10)
    )
      continue;
    values[field.key] = value;
  }
  return values;
}
export function TrackerFields({ fields, record }: { fields: TrackerField[]; record?: TrackerRow }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {fields.map((field) => {
        const value = record?.[field.key];
        const initial =
          field.type === 'date' && typeof value === 'number'
            ? new Date(value * 1000).toISOString().slice(0, 10)
            : String(value ?? '');
        const props = {
          'aria-label': field.label,
          name: field.key,
          defaultValue: initial,
          required: field.required,
        };
        return (
          <Label
            key={field.key}
            className={`grid min-w-0 gap-1.5 text-sm font-medium ${field.type === 'long' ? 'sm:col-span-2' : ''}`}
          >
            {field.label}
            {field.choices ? (
              <NativeSelect {...props} className={choiceClass}>
                <option value="">Select…</option>
                {field.choices.map((choice) => (
                  <option key={choice} value={choice}>
                    {displayChoice(choice)}
                  </option>
                ))}
              </NativeSelect>
            ) : field.type === 'long' ? (
              <Textarea {...props} rows={3} />
            ) : (
              <Input
                {...props}
                type={field.type ?? 'text'}
                min={field.type === 'number' ? 0 : undefined}
                step={field.type === 'number' ? 'any' : undefined}
              />
            )}
          </Label>
        );
      })}
    </div>
  );
}
