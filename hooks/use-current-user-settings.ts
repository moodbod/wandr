import { useQuery } from 'convex/react';

import { getUserSettingsRef } from '@/lib/convex';
import { useAuthSession } from '@/providers/auth-session';
import { useLiveExchangeRates } from './use-live-exchange-rates';

export function useCurrentUserSettings() {
  const { session } = useAuthSession();
  const settings = useQuery(getUserSettingsRef, session?.travelerSlug ? { travelerSlug: session.travelerSlug } : 'skip');
  const preferredCurrency = settings?.preferredCurrency;
  useLiveExchangeRates(Boolean(preferredCurrency && preferredCurrency !== 'USD'));

  return settings;
}
