'use client';

import '@/app/workspace.css';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@saas-maker/ui/components/breadcrumb';
import { Button } from '@saas-maker/ui/components/button';
import { Separator } from '@saas-maker/ui/components/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from '@saas-maker/ui/components/sheet';
import { BriefcaseBusiness, FileText, History, PanelLeft } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { RolePatchMark } from '@/components/rolepatch-mark';
import { ThemeToggle } from '@/components/theme-toggle';
import { TokenBalance } from '@/components/token-balance';
import { UserMenu } from '@/components/user-menu';
import { WorkspaceOutlineContext, type WorkspaceSection } from '@/components/workspace-outline';
import { WorkspaceThemeProvider, useWorkspaceTheme } from '@/components/workspace-theme';
import { useIsMobile } from '@/hooks/use-mobile';

const links = [
  { href: '/resume-builder', label: 'Resume Builder', icon: FileText },
  { href: '/jobs', label: 'Jobs', icon: BriefcaseBusiness },
  { href: '/history', label: 'History', icon: History },
] as const;
type WorkspacePage = (typeof links)[number]['href'];

function WorkspaceNavigation({
  page,
  sections,
  collapsed = false,
  onNavigate,
}: {
  page: WorkspacePage;
  sections: WorkspaceSection[];
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <>
      <Button
        variant="ghost"
        size={collapsed ? 'icon' : 'default'}
        className={collapsed ? 'self-center' : 'justify-start'}
        asChild
      >
        <Link
          href="/resume-builder"
          prefetch={false}
          onClick={onNavigate}
          aria-label="RolePatch workspace"
        >
          <RolePatchMark className="size-8 rounded-lg" />
          {!collapsed && <span className="font-semibold">RolePatch</span>}
        </Link>
      </Button>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto py-4">
        <nav aria-label={onNavigate ? 'Workspace menu' : 'Primary'} className="grid gap-1">
          {links.map(({ href, label, icon: Icon }) => (
            <Button
              key={href}
              variant={page === href ? 'secondary' : 'ghost'}
              size={collapsed ? 'icon' : 'default'}
              className={collapsed ? 'mx-auto' : 'justify-start'}
              asChild
            >
              <Link
                href={href}
                prefetch={false}
                onClick={onNavigate}
                aria-label={collapsed ? label : undefined}
                title={collapsed ? label : undefined}
                aria-current={page === href ? 'page' : undefined}
              >
                <Icon aria-hidden="true" />
                {!collapsed && label}
              </Link>
            </Button>
          ))}
        </nav>
        {!collapsed && page === '/resume-builder' && sections.length > 0 && (
          <nav aria-label="Resume sections" className="grid gap-1">
            <p className="px-3 text-xs font-medium text-muted-foreground">In this resume</p>
            {sections.map(({ id, title }) => (
              <Button
                key={id}
                size="sm"
                variant="ghost"
                className="justify-start overflow-hidden"
                asChild
              >
                <a href={`#${id}`} onClick={onNavigate}>
                  <span className="truncate">{title}</span>
                </a>
              </Button>
            ))}
          </nav>
        )}
      </div>
      <UserMenu sidebar={!collapsed} />
    </>
  );
}

function WorkspaceHeader({
  page,
  sections,
  collapsed,
  onToggle,
  drawerOpen,
  onDrawerChange,
}: {
  page: WorkspacePage;
  sections: WorkspaceSection[];
  collapsed: boolean;
  onToggle: () => void;
  drawerOpen: boolean;
  onDrawerChange: (open: boolean) => void;
}) {
  const theme = useWorkspaceTheme();
  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-1 border-b px-2 sm:gap-2 sm:px-4">
      <div className="flex min-w-0 items-center gap-1 sm:gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="hidden md:inline-flex"
          aria-label="Toggle Sidebar"
          aria-controls="workspace-sidebar"
          aria-expanded={!collapsed}
          onClick={onToggle}
        >
          <PanelLeft />
        </Button>
        <Sheet open={drawerOpen} onOpenChange={onDrawerChange}>
          <SheetTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="md:hidden"
              aria-label="Toggle Sidebar"
            >
              <PanelLeft />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            data-sidebar="sidebar"
            data-workspace-theme={theme?.resolved}
            className="rolepatch-workspace w-72 max-w-[90vw] gap-2 bg-sidebar px-3 py-4"
          >
            <SheetTitle className="sr-only">Workspace menu</SheetTitle>
            <SheetDescription className="sr-only">Page links and account settings</SheetDescription>
            <WorkspaceNavigation
              page={page}
              sections={sections}
              onNavigate={() => onDrawerChange(false)}
            />
          </SheetContent>
        </Sheet>
        <Separator orientation="vertical" className="hidden h-4 md:block" />
        <Breadcrumb>
          <BreadcrumbList className="flex-nowrap">
            <BreadcrumbItem className="hidden lg:block">
              <BreadcrumbLink asChild>
                <Link href="/resume-builder" prefetch={false}>
                  RolePatch
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden lg:block" />
            <BreadcrumbItem>
              <BreadcrumbPage className="truncate">
                {links.find((link) => link.href === page)?.label}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <ThemeToggle />
        <TokenBalance />
      </div>
    </header>
  );
}

function WorkspaceLayout({ children, page }: { children: ReactNode; page: WorkspacePage }) {
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sections, setSections] = useState<WorkspaceSection[]>([]);
  const outline = useMemo(() => ({ sections, setSections }), [sections]);

  useEffect(() => {
    function toggle(event: KeyboardEvent) {
      if (event.key !== 'b' || !(event.metaKey || event.ctrlKey)) return;
      if (
        event.target instanceof Element &&
        event.target.closest('input, textarea, [contenteditable]')
      )
        return;
      event.preventDefault();
      if (isMobile) setDrawerOpen((open) => !open);
      else setCollapsed((value) => !value);
    }
    window.addEventListener('keydown', toggle);
    return () => window.removeEventListener('keydown', toggle);
  }, [isMobile]);

  return (
    <WorkspaceOutlineContext.Provider value={outline}>
      <div className="flex min-h-svh">
        <Button
          asChild
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50"
        >
          <a href="#workspace-content">Skip to content</a>
        </Button>
        <aside
          data-sidebar="sidebar"
          id="workspace-sidebar"
          className={`sticky top-0 hidden h-svh shrink-0 flex-col gap-2 bg-sidebar px-2 py-4 md:flex ${collapsed ? 'w-14' : 'w-64'}`}
        >
          <WorkspaceNavigation page={page} sections={sections} collapsed={collapsed} />
        </aside>
        <div className="flex min-w-0 flex-1 flex-col bg-background md:m-2 md:ml-0 md:rounded-xl md:shadow">
          <WorkspaceHeader
            page={page}
            sections={sections}
            collapsed={collapsed}
            onToggle={() => setCollapsed((value) => !value)}
            drawerOpen={isMobile && drawerOpen}
            onDrawerChange={setDrawerOpen}
          />
          <nav
            aria-label="Primary"
            className="flex justify-center gap-1 border-b px-2 py-1.5 md:hidden"
          >
            {links.map(({ href, label }) => (
              <Button
                key={href}
                asChild
                variant={page === href ? 'secondary' : 'ghost'}
                size="sm"
                className="min-h-10 px-2.5"
              >
                <Link href={href} aria-current={page === href ? 'page' : undefined}>
                  {label}
                </Link>
              </Button>
            ))}
          </nav>
          <div id="workspace-content" tabIndex={-1} className="flex min-h-0 flex-1 flex-col">
            {children}
          </div>
        </div>
      </div>
    </WorkspaceOutlineContext.Provider>
  );
}

export function WorkspaceInterior({
  children,
  page,
}: {
  children: ReactNode;
  page: WorkspacePage;
}) {
  return (
    <WorkspaceThemeProvider>
      <WorkspaceLayout page={page}>{children}</WorkspaceLayout>
    </WorkspaceThemeProvider>
  );
}
