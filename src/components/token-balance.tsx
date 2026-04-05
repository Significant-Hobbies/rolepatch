'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/auth-provider';
import { getTokenBalance } from '@/lib/actions/token-actions';

export function TokenBalance() {
  const { isGuest } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (isGuest) return;
    getTokenBalance().then(setBalance).catch(() => {});
  }, [isGuest]);

  if (isGuest || balance === null) return null;

  return (
    <Link
      href="/pricing"
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-800 border border-gray-700 text-sm hover:border-gray-600 transition-colors"
      title="Token balance"
    >
      <span className="text-xs">&#9889;</span>
      <span className="text-[var(--accent)] font-semibold text-xs">{balance}</span>
    </Link>
  );
}
