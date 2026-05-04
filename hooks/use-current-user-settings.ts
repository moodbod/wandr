import { useQuery } from 'convex/react';

import { getUserSettingsRef } from '@/lib/convex';
import { useAuthSession } from '@/providers/auth-session';

export function useCurrentUserSettings() {
  const { session } = useAuthSession();
  return useQuery(getUserSettingsRef, session?.travelerSlug ? { travelerSlug: session.travelerSlug } : 'skip');
}
