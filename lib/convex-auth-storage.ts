import type { TokenStorage } from '@convex-dev/auth/react';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const OAUTH_VERIFIER_STORAGE_PREFIX = '__convexAuthOAuthVerifier';

function getWebStorage(kind: 'local' | 'session') {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return kind === 'session' ? window.sessionStorage : window.localStorage;
  } catch {
    return null;
  }
}

function isOAuthVerifierKey(key: string) {
  return key.startsWith(OAUTH_VERIFIER_STORAGE_PREFIX);
}

export const convexAuthStorage: TokenStorage = {
  getItem(key) {
    if (Platform.OS === 'web') {
      if (isOAuthVerifierKey(key)) {
        const sessionStorage = getWebStorage('session');
        return sessionStorage ? sessionStorage.getItem(key) ?? null : getWebStorage('local')?.getItem(key) ?? null;
      }

      return getWebStorage('local')?.getItem(key) ?? null;
    }

    return SecureStore.getItemAsync(key);
  },
  setItem(key, value) {
    if (Platform.OS === 'web') {
      if (isOAuthVerifierKey(key)) {
        const sessionStorage = getWebStorage('session');
        if (sessionStorage) {
          sessionStorage.setItem(key, value);
          getWebStorage('local')?.removeItem(key);
          return;
        }
      }

      getWebStorage('local')?.setItem(key, value);
      return;
    }

    return SecureStore.setItemAsync(key, value);
  },
  removeItem(key) {
    if (Platform.OS === 'web') {
      if (isOAuthVerifierKey(key)) {
        getWebStorage('session')?.removeItem(key);
      }
      getWebStorage('local')?.removeItem(key);
      return;
    }

    return SecureStore.deleteItemAsync(key);
  },
};
