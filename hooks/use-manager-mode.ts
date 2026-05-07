import * as SecureStore from 'expo-secure-store';
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';

const MANAGER_MODE_STORAGE_KEY = 'wandr.manager-mode.v1';
const listeners = new Set<(state: { isLoading: boolean; isManagerMode: boolean }) => void>();

let isManagerModeSnapshot = false;
let isLoadingSnapshot = true;
let managerModeLoadPromise: Promise<void> | null = null;

function emitManagerModeState() {
  const state = { isLoading: isLoadingSnapshot, isManagerMode: isManagerModeSnapshot };
  listeners.forEach((listener) => listener(state));
}

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
  const [isLoading, setIsLoading] = useState(isLoadingSnapshot);
  const [isManagerMode, setIsManagerMode] = useState(isManagerModeSnapshot);

  useEffect(() => {
    const listener = (state: { isLoading: boolean; isManagerMode: boolean }) => {
      setIsLoading(state.isLoading);
      setIsManagerMode(state.isManagerMode);
    };

    listeners.add(listener);

    if (!managerModeLoadPromise) {
      managerModeLoadPromise = readManagerMode()
        .then((storedValue) => {
          isManagerModeSnapshot = storedValue;
        })
        .finally(() => {
          isLoadingSnapshot = false;
          emitManagerModeState();
        });
    }

    return () => {
      listeners.delete(listener);
    };
  }, []);

  const setManagerMode = useCallback(async (nextValue: boolean) => {
    isManagerModeSnapshot = nextValue;
    emitManagerModeState();
    await writeManagerMode(nextValue);
  }, []);

  return { isLoading, isManagerMode, setManagerMode };
}
