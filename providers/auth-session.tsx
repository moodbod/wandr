import { useAuthActions } from '@convex-dev/auth/react';
import { useConvexAuth, useQuery } from 'convex/react';
import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { getCurrentAuthIdentityRef, getCurrentAuthSessionRef } from '@/lib/convex';

type AuthSession = {
  travelerSlug: string;
  email: string;
  name: string;
  role: 'traveler' | 'admin';
};

type AuthSessionContextValue = {
  isLoading: boolean;
  isAuthenticated: boolean;
  onboardingRequired: boolean;
  session: AuthSession | null;
  signOut: () => Promise<void>;
};

const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);

export function AuthSessionProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading: isConvexLoading } = useConvexAuth();
  const { signOut } = useAuthActions();
  
  const identity = useQuery(getCurrentAuthIdentityRef, isAuthenticated ? {} : 'skip');
  const session = useQuery(getCurrentAuthSessionRef, isAuthenticated ? {} : 'skip');

  const value = useMemo(
    () => {
      const isIdentityLoading = isAuthenticated && identity === undefined;
      const isSessionLoading = isAuthenticated && session === undefined;
      
      const onboardingRequired = isAuthenticated && identity !== undefined && identity !== null && !identity.onboardingCompleted;

      return {
        isLoading: isConvexLoading || isIdentityLoading || isSessionLoading,
        isAuthenticated,
        onboardingRequired,
        session: session ?? null,
        signOut,
      };
    },
    [isAuthenticated, isConvexLoading, identity, session, signOut]
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
