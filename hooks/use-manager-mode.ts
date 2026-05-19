import * as SecureStore from 'expo-secure-store';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';

const LEGACY_MANAGER_MODE_STORAGE_KEY = 'wandr.manager-mode.v1';
const listeners = new Set<(
  state: { isLoading: boolean; isManagerMode: boolean; storageKey: string }
) => void>();

type ManagerModeState = {
  isLoading: boolean;
  isManagerMode: boolean;
  loadPromise: Promise<void> | null;
};

const managerModeStates = new Map<string, ManagerModeState>();

function getManagerModeStorageKey(accountKey?: string | null) {
  return accountKey ? `${LEGACY_MANAGER_MODE_STORAGE_KEY}.${encodeURIComponent(accountKey)}` : LEGACY_MANAGER_MODE_STORAGE_KEY;
}

function getManagerModeState(storageKey: string) {
  const existing = managerModeStates.get(storageKey);
  if (existing) {
    return existing;
  }

  const nextState: ManagerModeState = {
    isLoading: true,
    isManagerMode: false,
    loadPromise: null,
  };

  managerModeStates.set(storageKey, nextState);
  return nextState;
}

function emitManagerModeState(storageKey: string) {
  const state = getManagerModeState(storageKey);
  const snapshot = {
    isLoading: state.isLoading,
    isManagerMode: state.isManagerMode,
    storageKey,
  };
  listeners.forEach((listener) => listener(snapshot));
}

async function readStoredManagerMode(storageKey: string) {
  const value =
    Platform.OS === 'web'
      ? globalThis.localStorage?.getItem(storageKey) ?? null
      : await SecureStore.getItemAsync(storageKey);

  if (value !== null) {
    return value === 'enabled';
  }

  return null;
}

async function readManagerMode(storageKey: string, shouldMigrateLegacyValue: boolean) {
  const scopedValue = await readStoredManagerMode(storageKey);
  if (scopedValue !== null) {
    return scopedValue;
  }

  if (storageKey !== LEGACY_MANAGER_MODE_STORAGE_KEY && shouldMigrateLegacyValue) {
    const legacyValue = await readStoredManagerMode(LEGACY_MANAGER_MODE_STORAGE_KEY);
    if (legacyValue !== null) {
      await writeManagerMode(storageKey, legacyValue);
      return legacyValue;
    }
  }

  return false;
}

async function writeManagerMode(storageKey: string, isEnabled: boolean) {
  if (Platform.OS === 'web') {
    if (isEnabled) {
      globalThis.localStorage?.setItem(storageKey, 'enabled');
    } else {
      globalThis.localStorage?.removeItem(storageKey);
    }
    return;
  }

  if (isEnabled) {
    await SecureStore.setItemAsync(storageKey, 'enabled');
  } else {
    await SecureStore.deleteItemAsync(storageKey);
  }
}

function loadManagerMode(storageKey: string, shouldMigrateLegacyValue: boolean) {
  const state = getManagerModeState(storageKey);
  if (state.loadPromise) {
    return state.loadPromise;
  }

  state.isLoading = true;
  emitManagerModeState(storageKey);

  state.loadPromise = readManagerMode(storageKey, shouldMigrateLegacyValue)
    .then((storedValue) => {
      const currentState = getManagerModeState(storageKey);
      currentState.isManagerMode = storedValue;
    })
    .finally(() => {
      const currentState = getManagerModeState(storageKey);
      currentState.isLoading = false;
      emitManagerModeState(storageKey);
    });

  return state.loadPromise;
}

export function useManagerMode(accountKey?: string | null, canUseManagerMode = true) {
  const storageKey = useMemo(() => getManagerModeStorageKey(accountKey), [accountKey]);
  const initialState = getManagerModeState(storageKey);
  const [isLoading, setIsLoading] = useState(initialState.isLoading);
  const [isManagerMode, setIsManagerMode] = useState(initialState.isManagerMode);

  useEffect(() => {
    const nextState = getManagerModeState(storageKey);
    setIsLoading(nextState.isLoading);
    setIsManagerMode(canUseManagerMode ? nextState.isManagerMode : false);

    const listener = (state: { isLoading: boolean; isManagerMode: boolean; storageKey: string }) => {
      if (state.storageKey !== storageKey) {
        return;
      }
      setIsLoading(state.isLoading);
      setIsManagerMode(canUseManagerMode ? state.isManagerMode : false);
    };

    listeners.add(listener);
    loadManagerMode(storageKey, canUseManagerMode);

    return () => {
      listeners.delete(listener);
    };
  }, [canUseManagerMode, storageKey]);

  const setManagerMode = useCallback(async (nextValue: boolean) => {
    const state = getManagerModeState(storageKey);
    state.isLoading = false;
    state.isManagerMode = canUseManagerMode ? nextValue : false;
    emitManagerModeState(storageKey);
    await writeManagerMode(storageKey, canUseManagerMode ? nextValue : false);
  }, [canUseManagerMode, storageKey]);

  return { isLoading, isManagerMode, setManagerMode };
}
