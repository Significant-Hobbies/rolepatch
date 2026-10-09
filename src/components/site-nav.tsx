'use client';

import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

import { TokenBalance } from '@/components/token-balance';
import { UserMenu } from '@/components/user-menu';

const NAV_LINKS = [
  { href: '/resume-builder', label: 'Resume Builder' },
  { href: '/jobs', label: 'Jobs' },
];

export function SiteNav() {
  const pathname = usePathname() ?? '';
  const [menuOpen, setMenuOpen] = useState(false);
  const [prevPath, setPrevPath] = useState(pathname);

  // Close the mobile menu when the route changes (render-phase reset —
  // avoids a setState-in-effect cascading render).
  if (pathname !== prevPath) {
    setPrevPath(pathname);
    setMenuOpen(false);
  }

  if (pathname === '/') return null;

  return (
    <nav
      aria-label="Primary"
      className="precision-app-nav sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--background)]/80 backdrop-blur-xl"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-1">
        <Link
          href="/resume-builder"
          prefetch={false}
          className="font-semibold text-foreground mr-auto sm:mr-6 flex items-center gap-2"
        >
          <span className="w-6 h-6 rounded-md bg-[var(--accent)] flex items-center justify-center text-[10px] font-bold text-white">
            ↗
          </span>
          RolePatch
        </Link>

        {/* Desktop links */}
        {NAV_LINKS.map((link) => {
          const isActive =
            pathname === link.href ||
            pathname.startsWith(`${link.href}/`) ||
            (link.href === '/jobs' &&
              (pathname === '/dashboard' || pathname.startsWith('/tailor/'))) ||
            (link.href === '/resume-builder' && pathname.startsWith('/editor/'));
          return (
            <Link
              key={link.href}
              href={link.href}
              prefetch={false}
              aria-current={isActive ? 'page' : undefined}
              className={`hidden sm:block px-3 py-1.5 text-sm rounded-md transition-colors ${
                isActive
                  ? 'bg-[var(--muted)] text-foreground font-medium'
                  : 'text-[var(--muted-foreground)] hover:text-foreground hover:bg-[var(--muted)]'
              }`}
            >
              {link.label}
            </Link>
          );
        })}

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <TokenBalance />
          <UserMenu />
          {/* Keep the full link list collapsed until there is room for account controls. */}
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            className="sm:hidden flex items-center justify-center w-11 h-11 -mr-2 rounded-md text-[var(--muted-foreground)] hover:text-foreground hover:bg-[var(--muted)] transition-colors"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="sm:hidden border-t border-[var(--border)] bg-[var(--background)] px-4 py-2">
          <div className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => {
              const isActive =
                pathname === link.href ||
                pathname.startsWith(`${link.href}/`) ||
                (link.href === '/jobs' &&
                  (pathname === '/dashboard' || pathname.startsWith('/tailor/'))) ||
                (link.href === '/resume-builder' && pathname.startsWith('/editor/'));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  prefetch={false}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center min-h-[44px] px-3 text-sm rounded-md transition-colors ${
                    isActive
                      ? 'bg-[var(--muted)] text-foreground font-medium'
                      : 'text-[var(--muted-foreground)] hover:text-foreground hover:bg-[var(--muted)]'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </nav>
  );
}
