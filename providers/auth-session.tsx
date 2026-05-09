import { useAuthActions } from '@convex-dev/auth/react';
import { useConvexAuth, useMutation, useQuery } from 'convex/react';
import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react';

import { getCurrentAuthSessionRef, linkCurrentAuthIdentityRef } from '@/lib/convex';

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
  const linkCurrentAuthIdentity = useMutation(linkCurrentAuthIdentityRef);
  const session = useQuery(getCurrentAuthSessionRef, isAuthenticated ? {} : 'skip');
  const linkAttemptedRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) {
      linkAttemptedRef.current = false;
      return;
    }

    if (isLoading || linkAttemptedRef.current) {
      return;
    }

    linkAttemptedRef.current = true;
    void linkCurrentAuthIdentity({}).catch(() => {
      linkAttemptedRef.current = false;
    });
  }, [isAuthenticated, isLoading, linkCurrentAuthIdentity]);

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
