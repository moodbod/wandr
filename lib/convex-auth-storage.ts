import type { TokenStorage } from '@convex-dev/auth/react';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

function getWebStorage() {
  return typeof window === 'undefined' ? null : window.localStorage;
}

export const convexAuthStorage: TokenStorage = {
  getItem(key) {
    if (Platform.OS === 'web') {
      return getWebStorage()?.getItem(key) ?? null;
    }

    return SecureStore.getItemAsync(key);
  },
  setItem(key, value) {
    if (Platform.OS === 'web') {
      getWebStorage()?.setItem(key, value);
      return;
    }

    return SecureStore.setItemAsync(key, value);
  },
  removeItem(key) {
    if (Platform.OS === 'web') {
      getWebStorage()?.removeItem(key);
      return;
    }

    return SecureStore.deleteItemAsync(key);
  },
};
