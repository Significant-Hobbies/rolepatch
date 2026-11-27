'use client';

import '@/app/workspace.css';

import { BriefcaseBusiness, FileText, History } from 'lucide-react';
import { Button } from '@saas-maker/ui/components/button';
import Link from 'next/link';
import { useMemo, useState, type ReactNode } from 'react';
import { RolePatchMark } from '@/components/rolepatch-mark';
import { TokenBalance } from '@/components/token-balance';
import { UserMenu } from '@/components/user-menu';
import { WorkspaceThemeProvider } from '@/components/workspace-theme';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { WorkspaceOutlineContext, type WorkspaceSection } from '@/components/workspace-outline';

const links = [
  { href: '/resume-builder', label: 'Resume Builder', icon: FileText },
  { href: '/jobs', label: 'Jobs', icon: BriefcaseBusiness },
  { href: '/history', label: 'History', icon: History },
] as const;
type WorkspacePage = (typeof links)[number]['href'];

function WorkspaceSidebar({
  page,
  sections,
}: {
  page: WorkspacePage;
  sections: WorkspaceSection[];
}) {
  const { setOpenMobile } = useSidebar();
  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/resume-builder" prefetch={false} onClick={() => setOpenMobile(false)}>
                <RolePatchMark className="size-8 rounded-lg" />
                <span className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">RolePatch</span>
                  <span className="truncate text-xs">Your workspace</span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <nav aria-label="Primary">
            <SidebarMenu>
              {links.map(({ href, label, icon: Icon }) => (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton asChild isActive={page === href} tooltip={label}>
                    <Link
                      href={href}
                      prefetch={false}
                      aria-current={page === href ? 'page' : undefined}
                      onClick={() => setOpenMobile(false)}
                    >
                      <Icon />
                      <span>{label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </nav>
        </SidebarGroup>
        {page === '/resume-builder' && sections.length > 0 && (
          <SidebarGroup className="group-data-[collapsible=icon]:hidden">
            <SidebarGroupLabel>Master resume</SidebarGroupLabel>
            <nav aria-label="Resume sections">
              <SidebarMenu>
                {sections.map((section) => (
                  <SidebarMenuItem key={section.id}>
                    <SidebarMenuButton asChild>
                      <a href={`#${section.id}`} onClick={() => setOpenMobile(false)}>
                        <span>{section.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </nav>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter>
        <UserMenu sidebar />
      </SidebarFooter>
    </Sidebar>
  );
}

export function WorkspaceInterior({
  children,
  page,
}: {
  children: ReactNode;
  page: WorkspacePage;
}) {
  const [sections, setSections] = useState<WorkspaceSection[]>([]);
  const outline = useMemo(() => ({ sections, setSections }), [sections]);
  return (
    <WorkspaceOutlineContext.Provider value={outline}>
      <WorkspaceThemeProvider>
        <SidebarProvider>
          <WorkspaceSidebar page={page} sections={sections} />
          <SidebarInset className="min-w-0">
            <header className="flex h-16 shrink-0 items-center gap-2 border-b">
              <div className="flex items-center gap-2 px-4">
                <SidebarTrigger className="-ml-1" />
                <Separator orientation="vertical" className="mr-2 h-4" />
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem className="hidden md:block">
                      <BreadcrumbLink asChild>
                        <Link href="/resume-builder" prefetch={false}>
                          RolePatch
                        </Link>
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator className="hidden md:block" />
                    <BreadcrumbItem>
                      <BreadcrumbPage>
                        {links.find((link) => link.href === page)?.label}
                      </BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
              </div>
              <div className="ml-auto mr-4 flex items-center gap-2">
                <ThemeToggle />
                <TokenBalance />
              </div>
            </header>
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
            {children}
          </SidebarInset>
        </SidebarProvider>
      </WorkspaceThemeProvider>
    </WorkspaceOutlineContext.Provider>
  );
}
