import { useQuery } from 'convex/react';

import { getUserSettingsRef } from '@/lib/convex';
import { useAuthSession } from '@/providers/auth-session';
import { useLiveExchangeRates } from './use-live-exchange-rates';

export function useCurrentUserSettings() {
  const { session } = useAuthSession();
  useLiveExchangeRates();
  return useQuery(getUserSettingsRef, session?.travelerSlug ? { travelerSlug: session.travelerSlug } : 'skip');
}
