import { useEffect } from 'react';
import { Platform } from 'react-native';

type IdleWindow = Window & {
  cancelIdleCallback?: (handle: number) => void;
  requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number;
};

type NavigatorWithConnection = Navigator & {
  connection?: {
    saveData?: boolean;
  };
};

export function WebIdlePreloader({ isLargeScreen, isSignedIn }: { isLargeScreen: boolean; isSignedIn: boolean }) {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || typeof navigator === 'undefined') {
      return;
    }

    const connection = (navigator as NavigatorWithConnection).connection;
    if (connection?.saveData) {
      return;
    }

    let cancelled = false;
    const preload = () => {
      if (cancelled) {
        return;
      }

      void import('@/components/wandr/maps/map-preview');
      void import('@/components/wandr/stays/stays-map-screen');
      void import('@/app/(tabs)/stays');

      if (isLargeScreen) {
        void import('@/components/wandr/app-sidebar');
      }

      if (isSignedIn) {
        void import('@/app/(tabs)/trip');
        void import('@/app/(tabs)/friends');
        void import('@/components/wandr/notifications/trip-notification-center');
      }
    };

    const webWindow = window as IdleWindow;
    if (typeof webWindow.requestIdleCallback === 'function') {
      const idleId = webWindow.requestIdleCallback(preload, { timeout: 2400 });
      return () => {
        cancelled = true;
        webWindow.cancelIdleCallback?.(idleId);
      };
    }

    const timeoutId = globalThis.setTimeout(preload, 900);
    return () => {
      cancelled = true;
      globalThis.clearTimeout(timeoutId);
    };
  }, [isLargeScreen, isSignedIn]);

  return null;
}
