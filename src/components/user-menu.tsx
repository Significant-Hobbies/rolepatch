'use client';

import { useAuth } from '@/components/auth-provider';
import { signIn, signOut } from 'next-auth/react';
import { useState, useEffect, useRef } from 'react';

export function UserMenu() {
  const { isGuest, userId } = useAuth();
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState<any>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isGuest) {
      fetch('/api/auth/session')
        .then((r) => r.json())
        .then(setSession)
        .catch(() => {});
    }
  }, [isGuest]);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  if (isGuest) {
    return (
      <button
        onClick={() => signIn('google')}
        className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        Sign in
      </button>
    );
  }

  const name = session?.user?.name ?? '';
  const email = session?.user?.email ?? '';
  const image = session?.user?.image;

  return (
    <div className="relative" ref={menuRef}>
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2">
        {image ? (
          <img src={image} alt="" className="w-7 h-7 rounded-full" />
        ) : (
          <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-medium">
            {name[0] ?? '?'}
          </div>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 z-50">
          <div className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 truncate">
            {email}
          </div>
          <button
            onClick={() => signOut()}
            className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
