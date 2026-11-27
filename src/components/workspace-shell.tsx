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
    const openBookmark = () => {
      const { hash, search } = window.location;
      if ((pathname === '/jobs' || pathname === '/dashboard') && hash === '#history') {
        router.replace('/history');
      }
      if (pathname === '/resume-builder') {
        if (hash === '#sources' || hash === '#extra-experience') {
          router.replace(`/resume-builder/evidence${search}${hash}`);
        } else if (hash === '#career-records') {
          router.replace(`/resume-builder/profile${search}`);
        } else if (hash === '#career-resume-heading') {
          router.replace(`/resume-builder/generate${search}`);
        }
      }
    };
    openBookmark();
    window.addEventListener('hashchange', openBookmark);
    return () => window.removeEventListener('hashchange', openBookmark);
  }, [pathname, router]);
  const builder =
    pathname === '/resume-builder' ||
    pathname.startsWith('/resume-builder/') ||
    pathname.startsWith('/editor/');
  const workspacePage = builder
    ? '/resume-builder'
    : pathname === '/history'
      ? '/history'
      : pathname === '/jobs' ||
          pathname.startsWith('/jobs/') ||
          pathname === '/dashboard' ||
          pathname.startsWith('/tailor/')
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
