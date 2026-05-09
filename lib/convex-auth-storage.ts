import type { TokenStorage } from '@convex-dev/auth/react';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

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

export const convexAuthStorage: TokenStorage = {
  async getItem(key) {
    if (Platform.OS === 'web') {
      return getWebStorage('local')?.getItem(key) ?? getWebStorage('session')?.getItem(key) ?? null;
    }

    return await SecureStore.getItemAsync(key);
  },
  async setItem(key, value) {
    if (Platform.OS === 'web') {
      getWebStorage('local')?.setItem(key, value);
      getWebStorage('session')?.removeItem(key);
      return;
    }

    return await SecureStore.setItemAsync(key, value);
  },
  async removeItem(key) {
    if (Platform.OS === 'web') {
      getWebStorage('local')?.removeItem(key);
      getWebStorage('session')?.removeItem(key);
      return;
    }

    return await SecureStore.deleteItemAsync(key);
  },
};
