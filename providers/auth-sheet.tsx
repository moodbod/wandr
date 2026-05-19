import { usePathname, useRouter } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

import { AuthBottomSheet, type AuthSheetMode } from '@/components/wandr/auth/auth-bottom-sheet';
import { useAuthSession } from '@/providers/auth-session';

type OpenAuthSheetOptions = {
  dismissTo?: string | null;
  initialMode?: Exclude<AuthSheetMode, 'onboarding'>;
  returnTo?: string | null;
};

type AuthSheetState = {
  dismissTo: string | null;
  isOpen: boolean;
  mode: AuthSheetMode;
  returnTo: string;
};

type AuthSheetContextValue = {
  closeAuthSheet: () => void;
  openAuthSheet: (options?: OpenAuthSheetOptions) => void;
};

const DEFAULT_RETURN_TO = '/(tabs)/explore';
const AuthSheetContext = createContext<AuthSheetContextValue | null>(null);

function getSafeReturnTo(value?: string | null) {
  return value && value.startsWith('/') ? value : DEFAULT_RETURN_TO;
}

function decodeSearchParam(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function getWebOAuthReturnTo() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return null;
  }

  const params = new URLSearchParams(window.location.search);
  if (!params.has('authMode') && !params.has('returnTo')) {
    return null;
  }

  return getSafeReturnTo(decodeSearchParam(params.get('returnTo')));
}

function clearWebOAuthParams() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return;
  }

  const url = new URL(window.location.href);
  url.searchParams.delete('authMode');
  url.searchParams.delete('returnTo');
  url.searchParams.delete('code');
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
}

export function AuthSheetProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, onboardingRequired, session } = useAuthSession();
  const [state, setState] = useState<AuthSheetState>({
    dismissTo: null,
    isOpen: false,
    mode: 'signIn',
    returnTo: DEFAULT_RETURN_TO,
  });

  const openAuthSheet = useCallback((options?: OpenAuthSheetOptions) => {
    setState((current) => ({
      dismissTo: options?.dismissTo ?? null,
      isOpen: true,
      mode: options?.initialMode ?? (current.mode === 'onboarding' ? 'signIn' : current.mode),
      returnTo: getSafeReturnTo(options?.returnTo),
    }));
  }, []);

  const closeAuthSheet = useCallback(() => {
    setState((current) => ({ ...current, dismissTo: null, isOpen: false }));
  }, []);

  const handleClose = useCallback(() => {
    const dismissTo = state.dismissTo;
    setState((current) => ({ ...current, dismissTo: null, isOpen: false }));

    if (!session && dismissTo && pathname !== dismissTo) {
      router.replace(dismissTo as never);
    }
  }, [pathname, router, session, state.dismissTo]);

  const handleModeChange = useCallback((mode: AuthSheetMode) => {
    setState((current) => ({ ...current, isOpen: true, mode }));
  }, []);

  const handleOnboardingBack = useCallback(() => {
    setState((current) => ({ ...current, isOpen: true, mode: 'signIn' }));
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !onboardingRequired) {
      return;
    }

    setState((current) => ({
      ...current,
      isOpen: true,
      mode: 'onboarding',
    }));
  }, [isAuthenticated, onboardingRequired]);

  useEffect(() => {
    if (!session || !state.isOpen) {
      return;
    }

    const returnTo = state.returnTo;
    setState((current) => ({ ...current, dismissTo: null, isOpen: false }));

    if (returnTo && pathname !== returnTo) {
      router.replace(returnTo as never);
    }
  }, [pathname, router, session, state.isOpen, state.returnTo]);

  useEffect(() => {
    if (!session) {
      return;
    }

    const returnTo = getWebOAuthReturnTo();
    if (!returnTo) {
      return;
    }

    clearWebOAuthParams();

    if (pathname !== returnTo) {
      router.replace(returnTo as never);
    }
  }, [pathname, router, session]);

  const value = useMemo(
    () => ({
      closeAuthSheet,
      openAuthSheet,
    }),
    [closeAuthSheet, openAuthSheet]
  );

  return (
    <AuthSheetContext.Provider value={value}>
      {children}
      <AuthBottomSheet
        isOpen={state.isOpen}
        mode={state.mode}
        returnTo={state.returnTo}
        onClose={handleClose}
        onModeChange={handleModeChange}
        onOnboardingBack={handleOnboardingBack}
      />
    </AuthSheetContext.Provider>
  );
}

export function useAuthSheet() {
  const context = useContext(AuthSheetContext);
  if (!context) {
    throw new Error('useAuthSheet must be used inside AuthSheetProvider');
  }

  return context;
}
