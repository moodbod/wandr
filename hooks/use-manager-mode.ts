import * as SecureStore from 'expo-secure-store';
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';

const MANAGER_MODE_STORAGE_KEY = 'wandr.manager-mode.v1';

async function readManagerMode() {
  const value =
    Platform.OS === 'web'
      ? globalThis.localStorage?.getItem(MANAGER_MODE_STORAGE_KEY) ?? null
      : await SecureStore.getItemAsync(MANAGER_MODE_STORAGE_KEY);

  return value === 'enabled';
}

async function writeManagerMode(isEnabled: boolean) {
  if (Platform.OS === 'web') {
    if (isEnabled) {
      globalThis.localStorage?.setItem(MANAGER_MODE_STORAGE_KEY, 'enabled');
    } else {
      globalThis.localStorage?.removeItem(MANAGER_MODE_STORAGE_KEY);
    }
    return;
  }

  if (isEnabled) {
    await SecureStore.setItemAsync(MANAGER_MODE_STORAGE_KEY, 'enabled');
  } else {
    await SecureStore.deleteItemAsync(MANAGER_MODE_STORAGE_KEY);
  }
}

export function useManagerMode() {
  const [isLoading, setIsLoading] = useState(true);
  const [isManagerMode, setIsManagerMode] = useState(false);

  useEffect(() => {
    let isMounted = true;

    readManagerMode()
      .then((storedValue) => {
        if (isMounted) {
          setIsManagerMode(storedValue);
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

  const setManagerMode = useCallback(async (nextValue: boolean) => {
    setIsManagerMode(nextValue);
    await writeManagerMode(nextValue);
  }, []);

  return { isLoading, isManagerMode, setManagerMode };
}
