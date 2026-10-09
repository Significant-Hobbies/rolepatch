'use client';

import { useAuth } from '@/components/auth-provider';
import { useTokenBalance } from '@/components/token-balance-provider';

export function TokenBalance() {
  const { isGuest } = useAuth();
  const { balance } = useTokenBalance();

  if (isGuest || balance === null) return null;

  return (
    <span
      role="status"
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--card)] border border-[var(--border)] text-sm hover:border-[var(--muted-foreground)] transition-colors"
      title="Token balance"
      aria-label={`${balance} credits available`}
    >
      <span className="text-xs">&#9889;</span>
      <span className="text-[var(--accent)] font-semibold text-xs">{balance}</span>
    </span>
  );
}
