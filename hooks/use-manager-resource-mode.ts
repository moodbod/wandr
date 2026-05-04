import { useCallback, useEffect, useState } from 'react';

export type ManagerResourceMode = 'experiences' | 'rooms';
export type ManagerProfileSurface = 'profile' | 'manager';

let managerResourceMode: ManagerResourceMode = 'experiences';
let managerProfileSurface: ManagerProfileSurface = 'profile';
const listeners = new Set<(state: { mode: ManagerResourceMode; surface: ManagerProfileSurface }) => void>();

function emitManagerState() {
  const state = { mode: managerResourceMode, surface: managerProfileSurface };
  listeners.forEach((listener) => listener(state));
}

export function useManagerResourceMode() {
  const [mode, setModeState] = useState<ManagerResourceMode>(managerResourceMode);
  const [surface, setSurfaceState] = useState<ManagerProfileSurface>(managerProfileSurface);

  useEffect(() => {
    const listener = (state: { mode: ManagerResourceMode; surface: ManagerProfileSurface }) => {
      setModeState(state.mode);
      setSurfaceState(state.surface);
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const setMode = useCallback((nextMode: ManagerResourceMode) => {
    managerResourceMode = nextMode;
    emitManagerState();
  }, []);

  const setSurface = useCallback((nextSurface: ManagerProfileSurface) => {
    managerProfileSurface = nextSurface;
    emitManagerState();
  }, []);

  const openManager = useCallback((nextMode: ManagerResourceMode) => {
    managerResourceMode = nextMode;
    managerProfileSurface = 'manager';
    emitManagerState();
  }, []);

  return { mode, openManager, setMode, setSurface, surface };
}
