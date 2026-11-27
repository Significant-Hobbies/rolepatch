'use client';

import dynamic from 'next/dynamic';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { useAuth } from '@/components/auth-provider';
import { SiteNav } from '@/components/site-nav';
import { isWorkspacePath, workspaceReturnPath } from '@/lib/workspace-return';

// Public tools and pricing do not need the editor sidebar and its dependencies.
const WorkspaceInterior = dynamic(() =>
  import('./workspace-interior').then((module) => module.WorkspaceInterior)
);
const ApplicationStyles = dynamic(() =>
  import('./application-styles').then((module) => module.ApplicationStyles)
);

function useEndedWorkspaceSession(pathname: string) {
  const router = useRouter();
  const { isGuest, isPending, isSessionError } = useAuth();
  const inWorkspace = isWorkspacePath(pathname);
  const sessionEnded = inWorkspace && !isPending && !isSessionError && isGuest;
  useEffect(() => {
    if (!inWorkspace) return;
    const recheckRestoredPage = (event: PageTransitionEvent) => {
      if (event.persisted) router.refresh();
    };
    window.addEventListener('pageshow', recheckRestoredPage);
    return () => window.removeEventListener('pageshow', recheckRestoredPage);
  }, [inWorkspace, router]);
  useEffect(() => {
    if (!sessionEnded) return;
    const { pathname, search, hash } = window.location;
    const returnTo = workspaceReturnPath(pathname + search + hash);
    window.location.replace(`/sign-in?${new URLSearchParams({ returnTo })}`);
  }, [sessionEnded]);
  return sessionEnded;
}

export function WorkspaceShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const sessionEnded = useEndedWorkspaceSession(pathname);
  useEffect(() => {
    const isJobsRoot = pathname === '/jobs' || pathname === '/dashboard';
    if (!isJobsRoot && pathname !== '/resume-builder') return;
    const openBookmark = () => {
      const { hash, search } = window.location;
      if (isJobsRoot && hash === '#history') {
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
    if (!isJobsRoot) return;
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
  if (sessionEnded) return null;
  return (
    <>
      {!catalog && <ApplicationStyles />}
      {workspacePage ? (
        <WorkspaceInterior page={workspacePage}>{children}</WorkspaceInterior>
      ) : (
        <>
          {pathname !== '/sign-in' && <SiteNav />}
          {children}
        </>
      )}
    </>
  );
}
