import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

type NetworkStatus = {
  isInternetReachable: boolean;
  isLoading: boolean;
};

const INITIAL_STATUS: NetworkStatus = {
  isInternetReachable: true,
  isLoading: true,
};

export function useNetworkStatus() {
  const [status, setStatus] = useState<NetworkStatus>(() => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
      return {
        isInternetReachable: navigator.onLine,
        isLoading: false,
      };
    }

    return INITIAL_STATUS;
  });

  useEffect(() => {
    if (Platform.OS === 'web') {
      const update = () => {
        setStatus({
          isInternetReachable: typeof navigator === 'undefined' ? true : navigator.onLine,
          isLoading: false,
        });
      };

      update();
      window.addEventListener('online', update);
      window.addEventListener('offline', update);
      return () => {
        window.removeEventListener('online', update);
        window.removeEventListener('offline', update);
      };
    }

    let subscription: { remove: () => void } | null = null;
    let cancelled = false;

    async function loadNetworkStatus() {
      const Network = await import('expo-network');
      const state = await Network.getNetworkStateAsync();
      if (!cancelled) {
        setStatus({
          isInternetReachable: Boolean(state.isInternetReachable ?? state.isConnected),
          isLoading: false,
        });
      }

      subscription = Network.addNetworkStateListener((nextState) => {
        setStatus({
          isInternetReachable: Boolean(nextState.isInternetReachable ?? nextState.isConnected),
          isLoading: false,
        });
      });
    }

    void loadNetworkStatus().catch(() => {
      if (!cancelled) {
        setStatus({ isInternetReachable: true, isLoading: false });
      }
    });

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, []);

  return status;
}
