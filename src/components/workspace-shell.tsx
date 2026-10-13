'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { SiteNav } from '@/components/site-nav';

// Public tools and pricing do not need the editor sidebar and its dependencies.
const WorkspaceInterior = dynamic(() =>
  import('./workspace-interior').then((module) => module.WorkspaceInterior)
);
const ApplicationStyles = dynamic(() =>
  import('./application-styles').then((module) => module.ApplicationStyles)
);

export function WorkspaceShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? '';
  const builder = pathname === '/resume-builder' || pathname.startsWith('/editor/');
  const workspace =
    builder || pathname === '/jobs' || pathname === '/dashboard' || pathname.startsWith('/tailor/');
  const catalog = pathname === '/pricing' || pathname === '/tools';
  return (
    <>
      {!catalog && <ApplicationStyles />}
      {workspace ? (
        <WorkspaceInterior builder={builder}>{children}</WorkspaceInterior>
      ) : (
        <>
          <SiteNav />
          {children}
        </>
      )}
    </>
  );
}
