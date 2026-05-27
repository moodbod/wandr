import { useQuery } from 'convex/react';

import { getUserSettingsRef } from '@/lib/convex';
import { useAuthSession } from '@/providers/auth-session';
import { useLiveExchangeRates } from './use-live-exchange-rates';

function useCurrentUserSettingsQuery() {
  const { session } = useAuthSession();
  return useQuery(getUserSettingsRef, session?.travelerSlug ? { travelerSlug: session.travelerSlug } : 'skip');
}

export function useCurrentUserSettings() {
  const settings = useCurrentUserSettingsQuery();
  const preferredCurrency = settings?.preferredCurrency;
  useLiveExchangeRates(Boolean(preferredCurrency && preferredCurrency !== 'USD'));

  return settings;
}

export function useCurrentLocationSharingSetting() {
  return useCurrentUserSettingsQuery()?.locationSharing;
}

export function useShowOtherUsersLiveLocationSetting() {
  return useCurrentUserSettingsQuery()?.showOtherUsersLiveLocation === true;
}
