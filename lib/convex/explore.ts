import type { FunctionReference } from 'convex/server';
import { makeFunctionReference } from 'convex/server';

import type { Id } from '@/convex/_generated/dataModel';
import type { ExploreGroupTripDetail, ExploreJoinableTrip, ExploreJoinableTripCard, ExplorePageContent } from '@/types/explore';

export const getExplorePageContentRef = makeFunctionReference<
  'query', { slug: string; travelerSlug?: string }, ExplorePageContent | null
>('explore:getPageContent') as FunctionReference<'query', 'public', { slug: string; travelerSlug?: string }, ExplorePageContent | null>;

export const listManagedExperiencesRef = makeFunctionReference<
  'query', { managerSlug: string }, any[]
>('explore:listManagedExperiences') as FunctionReference<'query', 'public', { managerSlug: string }, any[]>;

export const createManagedExperienceRef = makeFunctionReference<
  'mutation',
  { managerSlug: string; itemKind: 'experience' | 'hiddenGem'; title: string; subtitle: string; description: string; category: string; durationLabel: string; groupCapacity: number; priceUsd: number; coordinate: number[]; imageUri: string; galleryImages: string[]; availabilityLabel: string; confirmMode: string; includes: string[] },
  { slug: string }
>('explore:createManagedExperience') as FunctionReference<'mutation', 'public', any, { slug: string }>;

export const getExploreJoinableTripCardsRef = makeFunctionReference<
  'query', { travelerSlug?: string }, ExploreJoinableTripCard[]
>('explore:getExploreJoinableTripCards') as FunctionReference<'query', 'public', { travelerSlug?: string }, ExploreJoinableTripCard[]>;

export const getExploreJoinableTripsRef = makeFunctionReference<
  'query', { travelerSlug?: string; experienceSlug: string }, ExploreJoinableTrip[]
>('explore:getExploreJoinableTrips') as FunctionReference<'query', 'public', { travelerSlug?: string; experienceSlug: string }, ExploreJoinableTrip[]>;

export const getExploreGroupTripDetailRef = makeFunctionReference<
  'query', { circleId: Id<'circles'>; travelerSlug?: string }, ExploreGroupTripDetail | null
>('explore:getExploreGroupTripDetail') as FunctionReference<'query', 'public', { circleId: Id<'circles'>; travelerSlug?: string }, ExploreGroupTripDetail | null>;

export const requestJoinExploreTripRef = makeFunctionReference<
  'mutation', { travelerSlug: string; circleId: Id<'circles'>; experienceSlug: string }, boolean
>('explore:requestJoinExploreTrip') as FunctionReference<'mutation', 'public', { travelerSlug: string; circleId: Id<'circles'>; experienceSlug: string }, boolean>;

export const getLocationLikeStateRef = makeFunctionReference<
  'query', { travelerSlug: string; locationKind: 'location' | 'experience' | 'hiddenGem'; locationSlug: string }, { liked: boolean }
>('explore:getLocationLikeState') as FunctionReference<'query', 'public', { travelerSlug: string; locationKind: 'location' | 'experience' | 'hiddenGem'; locationSlug: string }, { liked: boolean }>;

export const toggleLocationLikeRef = makeFunctionReference<
  'mutation', { travelerSlug: string; locationKind: 'location' | 'experience' | 'hiddenGem'; locationSlug: string }, { liked: boolean }
>('explore:toggleLocationLike') as FunctionReference<'mutation', 'public', { travelerSlug: string; locationKind: 'location' | 'experience' | 'hiddenGem'; locationSlug: string }, { liked: boolean }>;

export const listSavedPlacesRef = makeFunctionReference<
  'query', { travelerSlug: string }, any[]
>('explore:listSavedPlaces') as FunctionReference<'query', 'public', { travelerSlug: string }, any[]>;
