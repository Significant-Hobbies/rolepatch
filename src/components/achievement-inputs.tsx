'use client';

import { useId } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export function AchievementInputs({
  value,
  onChange,
  label = 'Achievements',
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}) {
  const id = useId();
  const points = value.split('\n');
  return (
    <fieldset className="space-y-3">
      <legend className="mb-2 text-sm font-medium">{label}</legend>
      <p className="text-sm text-muted-foreground">
        One achievement at a time. What did you build, improve or ship? Add the result if you know
        it.
      </p>
      {points.map((point, index) => (
        <div key={`${id}-${index}`} className="space-y-2">
          <Label htmlFor={`${id}-${index}`}>Achievement {index + 1}</Label>
          <Textarea
            id={`${id}-${index}`}
            rows={3}
            value={point}
            onChange={(event) =>
              onChange(
                points
                  .map((item, position) =>
                    position === index ? event.target.value.replace(/\r?\n/g, ' ') : item
                  )
                  .join('\n')
              )
            }
          />
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange(`${value}\n`)}>
        <Plus />
        Add achievement
      </Button>
    </fieldset>
  );
}
