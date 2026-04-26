'use client';

import { createContext, useContext } from 'react';

import { authClient } from '@/lib/auth-client';

interface AuthContextValue {
  userId: string | null;
  isGuest: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  userId: null,
  isGuest: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = authClient.useSession();
  const userId = session?.user?.id ?? null;
  return (
    <AuthContext.Provider value={{ isGuest: !userId, userId }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
