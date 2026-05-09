import { usePathname, useRouter } from 'expo-router';
import { useCallback } from 'react';

import { useAuthSession } from '@/providers/auth-session';

export function useRequireAuthAction() {
  const pathname = usePathname();
  const router = useRouter();
  const { session } = useAuthSession();

  return useCallback(() => {
    if (session) {
      return true;
    }

    router.push({
      pathname: '/(auth)',
      params: { returnTo: pathname || '/(tabs)/explore' },
    });
    return false;
  }, [pathname, router, session]);
}
