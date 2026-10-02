'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { getTokenBalance } from '@/lib/actions/token-actions';

const TokenBalanceContext = createContext<{
  balance: number | null;
  refreshBalance: () => Promise<void>;
}>({ balance: null, refreshBalance: async () => {} });

// Each account transition gets its own request scope, including returning accounts.
export function TokenBalanceProvider({
  userId,
  children,
}: {
  userId: string | null;
  children: React.ReactNode;
}) {
  const scope = useMemo(() => ({ userId, active: false, request: 0 }), [userId]);
  const [snapshot, setSnapshot] = useState<{ scope: typeof scope; balance: number | null }>({
    scope,
    balance: null,
  });
  const balance = snapshot.scope === scope ? snapshot.balance : null;

  const refreshBalance = useCallback(async () => {
    if (!scope.userId || !scope.active) return;
    const version = ++scope.request;
    setSnapshot({ scope, balance: null });
    try {
      const nextBalance = await getTokenBalance();
      if (scope.active && version === scope.request) setSnapshot({ scope, balance: nextBalance });
    } catch {
      // A failed read leaves the balance unknown, never an inferred zero.
      if (scope.active && version === scope.request) setSnapshot({ scope, balance: null });
    }
  }, [scope]);

  useEffect(() => {
    scope.active = true;
    void refreshBalance();
    return () => {
      scope.active = false;
      scope.request++;
    };
  }, [refreshBalance, scope]);

  return (
    <TokenBalanceContext.Provider value={{ balance, refreshBalance }}>
      {children}
    </TokenBalanceContext.Provider>
  );
}

export function useTokenBalance() {
  return useContext(TokenBalanceContext);
}
