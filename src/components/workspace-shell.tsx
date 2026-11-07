'use client';

import { ArrowUpRight, BriefcaseBusiness, FileText } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo, useState, type ReactNode } from 'react';
import { SiteNav } from '@/components/site-nav';
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
];

function WorkspaceSidebar({
  builder,
  sections,
}: {
  builder: boolean;
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
                <span className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <ArrowUpRight className="size-4" />
                </span>
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
                  <SidebarMenuButton
                    asChild
                    isActive={builder === (href === '/resume-builder')}
                    tooltip={label}
                  >
                    <Link
                      href={href}
                      prefetch={false}
                      aria-current={builder === (href === '/resume-builder') ? 'page' : undefined}
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
        {builder && sections.length > 0 && (
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

export function WorkspaceShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? '';
  const [sections, setSections] = useState<WorkspaceSection[]>([]);
  const outline = useMemo(() => ({ sections, setSections }), [sections]);
  const builder = pathname === '/resume-builder' || pathname.startsWith('/editor/');
  const workspace =
    builder || pathname === '/jobs' || pathname === '/dashboard' || pathname.startsWith('/tailor/');
  if (!workspace)
    return (
      <>
        <SiteNav />
        {children}
      </>
    );
  return (
    <WorkspaceOutlineContext.Provider value={outline}>
      <WorkspaceThemeProvider>
        <SidebarProvider>
          <WorkspaceSidebar builder={builder} sections={sections} />
          <SidebarInset>
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
                      <BreadcrumbPage>{builder ? 'Resume Builder' : 'Jobs'}</BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
              </div>
              <div className="ml-auto mr-4 flex items-center gap-2">
                <ThemeToggle />
                <TokenBalance />
              </div>
            </header>
            {children}
          </SidebarInset>
        </SidebarProvider>
      </WorkspaceThemeProvider>
    </WorkspaceOutlineContext.Provider>
  );
}
