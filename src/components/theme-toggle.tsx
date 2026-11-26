'use client';

import { ToggleGroup, ToggleGroupItem } from '@saas-maker/ui/components/toggle-group';
import { useWorkspaceTheme, type WorkspaceTheme } from '@/components/workspace-theme';

const choices = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
] as const satisfies ReadonlyArray<{ value: WorkspaceTheme; label: string }>;

export function ThemeToggle() {
  const state = useWorkspaceTheme();
  if (!state) return null;
  return (
    <ToggleGroup
      type="single"
      size="sm"
      value={state.theme}
      onValueChange={(value) => {
        const choice = choices.find((option) => option.value === value);
        if (choice) state.setTheme(choice.value);
      }}
      aria-label="Appearance"
      className="shrink-0 border bg-background p-0.5"
    >
      {choices.map(({ value, label }) => (
        <ToggleGroupItem
          key={value}
          value={value}
          className="h-8 px-2 text-xs data-[state=on]:bg-accent data-[state=on]:text-accent-foreground"
        >
          {label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
