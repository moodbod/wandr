import * as SecureStore from 'expo-secure-store';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

const SESSION_STORAGE_KEY = 'wandr.phone-session.v1';

type AuthSession = {
  travelerSlug: string;
  phoneNumber: string;
};

type AuthSessionContextValue = {
  isLoading: boolean;
  session: AuthSession | null;
  signIn: (session: AuthSession) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);

async function getStoredSession() {
  const rawValue =
    Platform.OS === 'web'
      ? globalThis.localStorage?.getItem(SESSION_STORAGE_KEY) ?? null
      : await SecureStore.getItemAsync(SESSION_STORAGE_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<AuthSession>;
    return parsed.travelerSlug && parsed.phoneNumber
      ? {
          travelerSlug: parsed.travelerSlug,
          phoneNumber: parsed.phoneNumber,
        }
      : null;
  } catch {
    return null;
  }
}

async function storeSession(session: AuthSession | null) {
  if (Platform.OS === 'web') {
    if (session) {
      globalThis.localStorage?.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } else {
      globalThis.localStorage?.removeItem(SESSION_STORAGE_KEY);
    }
    return;
  }

  if (session) {
    await SecureStore.setItemAsync(SESSION_STORAGE_KEY, JSON.stringify(session));
  } else {
    await SecureStore.deleteItemAsync(SESSION_STORAGE_KEY);
  }
}

export function AuthSessionProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<AuthSession | null>(null);

  useEffect(() => {
    let isMounted = true;

    getStoredSession()
      .then((storedSession) => {
        if (isMounted) {
          setSession(storedSession);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const signIn = useCallback(async (nextSession: AuthSession) => {
    setSession(nextSession);
    await storeSession(nextSession);
  }, []);

  const signOut = useCallback(async () => {
    setSession(null);
    await storeSession(null);
  }, []);

  const value = useMemo(
    () => ({
      isLoading,
      session,
      signIn,
      signOut,
    }),
    [isLoading, session, signIn, signOut]
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
