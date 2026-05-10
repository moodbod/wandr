import type { TokenStorage } from '@convex-dev/auth/react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const webStorage =
  Platform.OS === 'web' && typeof window !== 'undefined'
    ? window.localStorage
    : null;

export const convexAuthStorage: TokenStorage = {
  async getItem(key) {
    if (webStorage) {
      return webStorage.getItem(key);
    }

    return await SecureStore.getItemAsync(key);
  },
  async removeItem(key) {
    if (webStorage) {
      webStorage.removeItem(key);
      return;
    }

    await SecureStore.deleteItemAsync(key);
  },
  async setItem(key, value) {
    if (webStorage) {
      webStorage.setItem(key, value);
      return;
    }

    await SecureStore.setItemAsync(key, value);
  },
};
