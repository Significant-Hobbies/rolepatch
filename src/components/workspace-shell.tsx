'use client';

import dynamic from 'next/dynamic';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
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
  const router = useRouter();
  useEffect(() => {
    if (pathname !== '/jobs' && pathname !== '/dashboard') return;
    const openHistory = () => {
      if (window.location.hash === '#history') router.replace('/history');
    };
    openHistory();
    window.addEventListener('hashchange', openHistory);
    return () => window.removeEventListener('hashchange', openHistory);
  }, [pathname, router]);
  const builder = pathname === '/resume-builder' || pathname.startsWith('/editor/');
  const workspacePage = builder
    ? '/resume-builder'
    : pathname === '/history'
      ? '/history'
      : pathname === '/jobs' || pathname === '/dashboard' || pathname.startsWith('/tailor/')
        ? '/jobs'
        : null;
  const catalog = pathname === '/pricing' || pathname === '/tools';
  return (
    <>
      {!catalog && <ApplicationStyles />}
      {workspacePage ? (
        <WorkspaceInterior page={workspacePage}>{children}</WorkspaceInterior>
      ) : (
        <>
          <SiteNav />
          {children}
        </>
      )}
    </>
  );
}
