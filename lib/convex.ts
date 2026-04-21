import type { FunctionReference } from 'convex/server';
import { makeFunctionReference } from 'convex/server';
import { ConvexReactClient } from 'convex/react';

import type { ExplorePageContent } from '@/types/explore';
import type { TripDashboard, TripItineraryItem } from '@/types/trip';

export const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;
export const hasConvexUrl = Boolean(convexUrl);

export const convexClient = convexUrl
  ? new ConvexReactClient(convexUrl, { unsavedChangesWarning: false })
  : null;

export const getExplorePageContentRef = makeFunctionReference<
  'query',
  { slug: string },
  ExplorePageContent | null
>('explore:getPageContent') as FunctionReference<'query', 'public', { slug: string }, ExplorePageContent | null>;

export const ensureExploreCommunitySeedRef = makeFunctionReference<'mutation', Record<string, never>, boolean>(
  'explore:ensureExploreCommunitySeed'
) as FunctionReference<'mutation', 'public', Record<string, never>, boolean>;

export const seedDefaultPageContentRef = makeFunctionReference<'mutation', Record<string, never>, string>(
  'explore:seedDefaultPageContent'
) as FunctionReference<'mutation', 'public', Record<string, never>, string>;

export const bookExperienceRef = makeFunctionReference<
  'mutation',
  { experienceSlug: string; travelerSlug: string },
  string
>('explore:bookExperience') as FunctionReference<
  'mutation',
  'public',
  { experienceSlug: string; travelerSlug: string },
  string
>;

export const getLocationLikeStateRef = makeFunctionReference<
  'query',
  { travelerSlug: string; locationKind: 'experience' | 'hiddenGem'; locationSlug: string },
  { liked: boolean }
>('explore:getLocationLikeState') as FunctionReference<
  'query',
  'public',
  { travelerSlug: string; locationKind: 'experience' | 'hiddenGem'; locationSlug: string },
  { liked: boolean }
>;

export const toggleLocationLikeRef = makeFunctionReference<
  'mutation',
  { travelerSlug: string; locationKind: 'experience' | 'hiddenGem'; locationSlug: string },
  { liked: boolean }
>('explore:toggleLocationLike') as FunctionReference<
  'mutation',
  'public',
  { travelerSlug: string; locationKind: 'experience' | 'hiddenGem'; locationSlug: string },
  { liked: boolean }
>;

export const getUserItineraryRef = makeFunctionReference<
  'query',
  { travelerSlug: string },
  TripItineraryItem[]
>('trip:getUserItinerary') as FunctionReference<
  'query',
  'public',
  { travelerSlug: string },
  TripItineraryItem[]
>;

export const getTripDashboardRef = makeFunctionReference<
  'query',
  { travelerSlug: string },
  TripDashboard
>('trip:getTripDashboard') as FunctionReference<
  'query',
  'public',
  { travelerSlug: string },
  TripDashboard
>;
