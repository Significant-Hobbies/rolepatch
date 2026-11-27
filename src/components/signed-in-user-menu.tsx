'use client';

import '@/app/application-utilities.css';
import '@/app/workspace.css';

import { ChevronsUpDown, LogOut, Settings } from 'lucide-react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@saas-maker/ui/components/avatar';
import { Button } from '@saas-maker/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@saas-maker/ui/components/dropdown-menu';
import { authClient } from '@/lib/auth-client';
import { isWorkspacePath } from '@/lib/workspace-return';
import { useWorkspaceTheme } from '@/components/workspace-theme';

export function SignedInUserMenu({
  user,
  sidebar,
}: {
  user: typeof authClient.$Infer.Session.user;
  sidebar: boolean;
}) {
  const { name, email, image } = user;
  const theme = useWorkspaceTheme();
  const avatar = (
    <Avatar className="h-8 w-8 rounded-lg">
      <AvatarImage src={image ?? undefined} alt="" />
      <AvatarFallback className="rounded-lg">
        {(name ?? '?')
          .split(/\s+/)
          .map((part) => part[0])
          .slice(0, 2)
          .join('')}
      </AvatarFallback>
    </Avatar>
  );
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {sidebar ? (
          <Button
            variant="ghost"
            className="h-12 w-full justify-start overflow-hidden"
            aria-label="Account menu"
          >
            {avatar}
            <span className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">{name}</span>
              <span className="truncate text-xs">Personal account</span>
            </span>
            <ChevronsUpDown className="ml-auto size-4" />
          </Button>
        ) : (
          <Button variant="ghost" size="icon" aria-label="Account menu">
            {avatar}
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="rolepatch-workspace w-56"
        data-workspace-theme={theme?.resolved ?? 'light'}
        align="end"
        side={sidebar ? 'top' : 'bottom'}
      >
        <DropdownMenuLabel className="truncate">{email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings" prefetch={false}>
            <Settings />
            Account settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            void authClient.signOut({
              fetchOptions: {
                onSuccess: () => {
                  if (isWorkspacePath(window.location.pathname))
                    window.location.replace('/sign-in');
                },
              },
            });
          }}
        >
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
