import { usePathname } from 'expo-router';
import { useCallback } from 'react';

import { useAuthSession } from '@/providers/auth-session';
import { useAuthSheet } from '@/providers/auth-sheet';

export function useRequireAuthAction() {
  const pathname = usePathname();
  const { openAuthSheet } = useAuthSheet();
  const { session } = useAuthSession();

  return useCallback(() => {
    if (session) {
      return true;
    }

    openAuthSheet({
      initialMode: 'signIn',
      returnTo: pathname || '/(tabs)/explore',
    });
    return false;
  }, [openAuthSheet, pathname, session]);
}
