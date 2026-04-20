import type { FunctionReference } from 'convex/server';
import { makeFunctionReference } from 'convex/server';
import { ConvexReactClient } from 'convex/react';

import type { ExplorePageContent } from '@/types/explore';

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

export const getUserItineraryRef = makeFunctionReference<
  'query',
  { travelerSlug: string },
  any[]
>('trip:getUserItinerary') as FunctionReference<
  'query',
  'public',
  { travelerSlug: string },
  any[]
>;
