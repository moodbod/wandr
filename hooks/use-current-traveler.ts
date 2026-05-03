import { useQuery } from 'convex/react';

import { useAuthSession } from '@/providers/auth-session';
import { getTravelerProfileRef } from '@/lib/convex';

export function useCurrentTraveler() {
  const { session } = useAuthSession();
  return useQuery(getTravelerProfileRef, session?.travelerSlug ? { travelerSlug: session.travelerSlug } : 'skip');
}
