import { useEffect } from 'react';

type IdleWindow = Window & {
  cancelIdleCallback?: (handle: number) => void;
  requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number;
};

type NavigatorWithConnection = Navigator & {
  connection?: {
    saveData?: boolean;
  };
};

function scheduleIdleWork(callback: () => void) {
  const webWindow = window as IdleWindow;
  if (typeof webWindow.requestIdleCallback === 'function') {
    const idleId = webWindow.requestIdleCallback(callback, { timeout: 3000 });
    return () => webWindow.cancelIdleCallback?.(idleId);
  }

  const timeoutId = globalThis.setTimeout(callback, 1200);
  return () => globalThis.clearTimeout(timeoutId);
}

function isLocalDevelopmentHost(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

export function PwaCacheRegistrar() {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    if (isLocalDevelopmentHost(window.location.hostname)) {
      return;
    }

    const connection = (navigator as NavigatorWithConnection).connection;
    if (connection?.saveData) {
      return;
    }

    let cancelled = false;
    const register = () => {
      if (cancelled) {
        return;
      }

      void navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
        // The app still works without the cache; registration failures should not block startup.
      });
    };

    const schedule = () => scheduleIdleWork(register);
    let cleanupSchedule = () => {};
    const handleLoad = () => {
      cleanupSchedule = schedule();
    };

    if (document.readyState === 'complete') {
      cleanupSchedule = schedule();
    } else {
      window.addEventListener('load', handleLoad, { once: true });
    }

    return () => {
      cancelled = true;
      window.removeEventListener('load', handleLoad);
      cleanupSchedule();
    };
  }, []);

  return null;
}
