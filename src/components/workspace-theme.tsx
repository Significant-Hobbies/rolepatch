'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type WorkspaceTheme = 'light' | 'dark' | 'system';
const storageKey = 'rolepatch-workspace-theme';
function preference(value: string | null): WorkspaceTheme {
  return value === 'light' || value === 'dark' ? value : 'system';
}
const ThemeContext = createContext<{
  theme: WorkspaceTheme;
  resolved: 'light' | 'dark';
  setTheme: (theme: WorkspaceTheme) => void;
} | null>(null);

export function useWorkspaceTheme() {
  return useContext(ThemeContext);
}

export function WorkspaceThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setPreference] = useState<WorkspaceTheme>('system');
  const [systemDark, setSystemDark] = useState(false);
  useEffect(() => {
    try {
      setPreference(preference(localStorage.getItem(storageKey)));
    } catch {
      /* Theme still works for this visit when browser storage is blocked. */
    }
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const change = () => setSystemDark(media.matches);
    const sync = (event: StorageEvent) => {
      if (event.key === storageKey || event.key === null) setPreference(preference(event.newValue));
    };
    change();
    media.addEventListener('change', change);
    window.addEventListener('storage', sync);
    return () => {
      media.removeEventListener('change', change);
      window.removeEventListener('storage', sync);
    };
  }, []);
  const resolved = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;
  const setTheme = (next: WorkspaceTheme) => {
    setPreference(next);
    try {
      localStorage.setItem(storageKey, next);
    } catch {
      /* Retain the selected theme in memory. */
    }
  };
  return (
    <ThemeContext.Provider value={{ theme, resolved, setTheme }}>
      <div className="rolepatch-workspace bg-sidebar" data-workspace-theme={resolved}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}
