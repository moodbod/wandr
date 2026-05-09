import { useAuthActions } from '@convex-dev/auth/react';
import { useConvexAuth, useQuery } from 'convex/react';
import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { getCurrentAuthSessionRef } from '@/lib/convex';

type AuthSession = {
  travelerSlug: string;
  email: string;
  name: string;
  role: 'traveler' | 'admin';
};

type AuthSessionContextValue = {
  isLoading: boolean;
  session: AuthSession | null;
  signOut: () => Promise<void>;
};

const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);

export function AuthSessionProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signOut } = useAuthActions();
  const session = useQuery(getCurrentAuthSessionRef, isAuthenticated ? {} : 'skip');

  const value = useMemo(
    () => ({
      isLoading: isLoading || (isAuthenticated && session === undefined),
      session: session ?? null,
      signOut,
    }),
    [isAuthenticated, isLoading, session, signOut]
  );

  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>;
}

export function useAuthSession() {
  const context = useContext(AuthSessionContext);
  if (!context) {
    throw new Error('useAuthSession must be used inside AuthSessionProvider');
  }

  return context;
}
