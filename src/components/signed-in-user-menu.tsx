'use client';

import { ChevronsUpDown, LogOut, Settings } from 'lucide-react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { authClient } from '@/lib/auth-client';

export function SignedInUserMenu({
  user,
  sidebar,
}: {
  user: typeof authClient.$Infer.Session.user;
  sidebar: boolean;
}) {
  const { name, email, image } = user;
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
  const menu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {sidebar ? (
          <SidebarMenuButton size="lg" aria-label="Account menu">
            {avatar}
            <span className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">{name}</span>
              <span className="truncate text-xs">Personal account</span>
            </span>
            <ChevronsUpDown className="ml-auto size-4" />
          </SidebarMenuButton>
        ) : (
          <Button variant="ghost" size="icon" aria-label="Account menu">
            {avatar}
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" side={sidebar ? 'top' : 'bottom'}>
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
            authClient.signOut();
          }}
        >
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
  return sidebar ? (
    <SidebarMenu>
      <SidebarMenuItem>{menu}</SidebarMenuItem>
    </SidebarMenu>
  ) : (
    menu
  );
}
