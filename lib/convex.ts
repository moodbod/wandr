import { ConvexReactClient } from 'convex/react';
import type { FunctionReference } from 'convex/server';
import { makeFunctionReference } from 'convex/server';

import type { Id } from '@/convex/_generated/dataModel';
import type { ExplorePageContent } from '@/types/explore';
import type { FriendChatPayload, FriendDiscoveryPayload, FriendsDashboard } from '@/types/friends';
import type { AppNotification } from '@/types/notifications';
import type { StayBookingDetails } from '@/types/stays';
import type { TripDashboard, TripItineraryItem } from '@/types/trip';

export type CurrentTravelerProfile = {
  slug: string;
  name: string;
  countryCode: string;
  countryLabel: string;
  avatarUri: string | null;
  regionCode: string | null;
  regionName: string | null;
};

export const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;
export const hasConvexUrl = Boolean(convexUrl);

export const convexClient = convexUrl
  ? new ConvexReactClient(convexUrl, { unsavedChangesWarning: false })
  : null;

export const getExplorePageContentRef = makeFunctionReference<
  'query',
  { slug: string; travelerSlug?: string },
  ExplorePageContent | null
>('explore:getPageContent') as FunctionReference<
  'query',
  'public',
  { slug: string; travelerSlug?: string },
  ExplorePageContent | null
>;

export const ensureExploreCommunitySeedRef = makeFunctionReference<'mutation', Record<string, never>, boolean>(
  'explore:ensureExploreCommunitySeed'
) as FunctionReference<'mutation', 'public', Record<string, never>, boolean>;

export const seedExplorePageContentRef = makeFunctionReference<'mutation', Record<string, never>, string>(
  'explore:seedExplorePageContent'
) as FunctionReference<'mutation', 'public', Record<string, never>, string>;

export const seedDefaultPageContentRef = seedExplorePageContentRef;

export const bookExperienceRef = makeFunctionReference<
  'mutation',
  { experienceSlug: string; travelerSlug: string; tripId?: string },
  string
>('trip:addExperienceToTrip') as FunctionReference<
  'mutation',
  'public',
  { experienceSlug: string; travelerSlug: string; tripId?: string },
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
  { travelerSlug: string; tripId?: string },
  TripItineraryItem[]
>('trip:getUserItinerary') as FunctionReference<
  'query',
  'public',
  { travelerSlug: string; tripId?: string },
  TripItineraryItem[]
>;

export const getTripDashboardRef = makeFunctionReference<
  'query',
  { travelerSlug: string; tripId?: string },
  TripDashboard
>('trip:getTripDashboard') as FunctionReference<
  'query',
  'public',
  { travelerSlug: string; tripId?: string },
  TripDashboard
>;

export const listUserTripsRef = makeFunctionReference<
  'query',
  { travelerSlug: string },
  any[]
>('trip:listUserTrips') as FunctionReference<
  'query',
  'public',
  { travelerSlug: string },
  any[]
>;

export const getTravelerProfileRef = makeFunctionReference<
  'query',
  Record<string, never>,
  CurrentTravelerProfile | null
>('trip:getCurrentTravelerProfile') as FunctionReference<
  'query',
  'public',
  Record<string, never>,
  CurrentTravelerProfile | null
>;

export const createTripRef = makeFunctionReference<
  'mutation',
  { name: string; travelerSlug: string },
  Id<'trips'>
>('trip:createTrip') as FunctionReference<
  'mutation',
  'public',
  { name: string; travelerSlug: string },
  Id<'trips'>
>;

export const addExperienceToTripRef = makeFunctionReference<
  'mutation',
  { experienceSlug: string; travelerSlug: string; tripId?: string },
  string
>('trip:addExperienceToTrip') as FunctionReference<
  'mutation',
  'public',
  { experienceSlug: string; travelerSlug: string; tripId?: string },
  string
>;

export const removeExperienceFromTripRef = makeFunctionReference<
  'mutation',
  { bookingId: string; travelerSlug: string },
  boolean
>('trip:removeExperienceFromTrip') as FunctionReference<
  'mutation',
  'public',
  { bookingId: string; travelerSlug: string },
  boolean
>;

export const deleteTripRef = makeFunctionReference<
  'mutation',
  { tripId: string; travelerSlug: string },
  boolean
>('trip:deleteTrip') as FunctionReference<
  'mutation',
  'public',
  { tripId: string; travelerSlug: string },
  boolean
>;

export const bookStayRef = makeFunctionReference<
  'mutation',
  { staySlug: string; travelerSlug: string; tripId?: string },
  string
>('trip:bookStay') as FunctionReference<
  'mutation',
  'public',
  { staySlug: string; travelerSlug: string; tripId?: string },
  string
>;

export const createStayBookingRef = makeFunctionReference<
  'mutation',
  {
    staySlug: string;
    travelerSlug: string;
    checkIn: number;
    checkOut: number;
    totalPrice: number;
    stayBookingDetails: StayBookingDetails;
    tripId?: string;
  },
  string
>('trip:createStayBooking') as FunctionReference<
  'mutation',
  'public',
  {
    staySlug: string;
    travelerSlug: string;
    checkIn: number;
    checkOut: number;
    totalPrice: number;
    stayBookingDetails: StayBookingDetails;
    tripId?: string;
  },
  string
>;

export const getStayAvailabilityRef = makeFunctionReference<
  'query',
  { staySlug: string },
  any[]
>('trip:getStayAvailability') as FunctionReference<
  'query',
  'public',
  { staySlug: string },
  any[]
>;

export const listAllStaysRef = makeFunctionReference<
  'query',
  Record<string, never>,
  any[]
>('trip:listAllStays') as FunctionReference<
  'query',
  'public',
  Record<string, never>,
  any[]
>;

export const getStayBySlugRef = makeFunctionReference<
  'query',
  { slug: string },
  any | null
>('trip:getStayBySlug') as FunctionReference<
  'query',
  'public',
  { slug: string },
  any | null
>;

export const recordTripArrivalRef = makeFunctionReference<
  'mutation',
  {
    bookingId: Id<'experienceBookings'>;
    travelerSlug: string;
    source: 'gps' | 'manual';
    coordinate?: number[];
  },
  { created: boolean; experienceSlug: string | null }
>('trip:recordTripArrival') as FunctionReference<
  'mutation',
  'public',
  {
    bookingId: Id<'experienceBookings'>;
    travelerSlug: string;
    source: 'gps' | 'manual';
    coordinate?: number[];
  },
  { created: boolean; experienceSlug: string | null }
>;

export const ensureFriendsSeedRef = makeFunctionReference<
  'mutation',
  { travelerSlug?: string },
  boolean
>('friends:ensureFriendsSeed') as FunctionReference<
  'mutation',
  'public',
  { travelerSlug?: string },
  boolean
>;

export const getFriendsDashboardRef = makeFunctionReference<
  'query',
  { travelerSlug: string },
  FriendsDashboard
>('friends:getFriendsDashboard') as FunctionReference<
  'query',
  'public',
  { travelerSlug: string },
  FriendsDashboard
>;

export const getFriendDiscoveryRef = makeFunctionReference<
  'query',
  { travelerSlug: string },
  FriendDiscoveryPayload
>('friends:getFriendDiscovery') as FunctionReference<
  'query',
  'public',
  { travelerSlug: string },
  FriendDiscoveryPayload
>;

export const getFriendChatRef = makeFunctionReference<
  'query',
  { travelerSlug: string; circleId?: Id<'friendCircles'> },
  FriendChatPayload
>('friends:getFriendChat') as FunctionReference<
  'query',
  'public',
  { travelerSlug: string; circleId?: Id<'friendCircles'> },
  FriendChatPayload
>;

export const actOnFriendCandidateRef = makeFunctionReference<
  'mutation',
  { travelerSlug: string; candidateSlug: string; action: 'invited' | 'passed' | 'friended' },
  { ok: boolean; action: 'invited' | 'passed' | 'friended' }
>('friends:actOnFriendCandidate') as FunctionReference<
  'mutation',
  'public',
  { travelerSlug: string; candidateSlug: string; action: 'invited' | 'passed' | 'friended' },
  { ok: boolean; action: 'invited' | 'passed' | 'friended' }
>;

export const sendFriendMessageRef = makeFunctionReference<
  'mutation',
  { circleId: Id<'friendCircles'>; travelerSlug: string; body: string },
  Id<'friendMessages'> | null
>('friends:sendFriendMessage') as FunctionReference<
  'mutation',
  'public',
  { circleId: Id<'friendCircles'>; travelerSlug: string; body: string },
  Id<'friendMessages'> | null
>;

export const shareTripRouteInFriendChatRef = makeFunctionReference<
  'mutation',
  { circleId: Id<'friendCircles'>; travelerSlug: string },
  Id<'friendMessages'>
>('friends:shareTripRouteInFriendChat') as FunctionReference<
  'mutation',
  'public',
  { circleId: Id<'friendCircles'>; travelerSlug: string },
  Id<'friendMessages'>
>;

export const listNotificationsRef = makeFunctionReference<
  'query',
  { travelerSlug: string },
  AppNotification[]
>('notifications:listNotifications') as FunctionReference<
  'query',
  'public',
  { travelerSlug: string },
  AppNotification[]
>;

export const markNotificationsReadRef = makeFunctionReference<
  'mutation',
  { travelerSlug: string; notificationIds?: Id<'appNotifications'>[] },
  boolean
>('notifications:markNotificationsRead') as FunctionReference<
  'mutation',
  'public',
  { travelerSlug: string; notificationIds?: Id<'appNotifications'>[] },
  boolean
>;

export const createTripNotificationRef = makeFunctionReference<
  'mutation',
  {
    recipientSlug: string;
    kind: 'trip_arrival' | 'trip_rating';
    title: string;
    body: string;
    href?: string;
    entityId?: string;
    entityLabel?: string;
  },
  boolean
>('notifications:createTripNotification') as FunctionReference<
  'mutation',
  'public',
  {
    recipientSlug: string;
    kind: 'trip_arrival' | 'trip_rating';
    title: string;
    body: string;
    href?: string;
    entityId?: string;
    entityLabel?: string;
  },
  boolean
>;

export const submitExperienceRatingRef = makeFunctionReference<
  'mutation',
  {
    experienceSlug: string;
    travelerSlug: string;
    rating: number;
    review?: string;
  },
  Id<'experienceRatings'>
>('trip:submitExperienceRating') as FunctionReference<
  'mutation',
  'public',
  {
    experienceSlug: string;
    travelerSlug: string;
    rating: number;
    review?: string;
  },
  Id<'experienceRatings'>
>;

export const listStayRatingsRef = makeFunctionReference<
  'query',
  {
    staySlug: string;
  },
  {
    _id: Id<'stayRatings'>;
    rating: number;
    review: string;
    createdAt: number;
    travelerSlug: string;
    travelerName: string;
    travelerAvatarUri: string | null;
    travelerRegionName: string | null;
  }[]
>('trip:listStayRatings') as FunctionReference<
  'query',
  'public',
  {
    staySlug: string;
  },
  {
    _id: Id<'stayRatings'>;
    rating: number;
    review: string;
    createdAt: number;
    travelerSlug: string;
    travelerName: string;
    travelerAvatarUri: string | null;
    travelerRegionName: string | null;
  }[]
>;

export const submitStayRatingRef = makeFunctionReference<
  'mutation',
  {
    staySlug: string;
    travelerSlug: string;
    rating: number;
    review?: string;
  },
  Id<'stayRatings'>
>('trip:submitStayRating') as FunctionReference<
  'mutation',
  'public',
  {
    staySlug: string;
    travelerSlug: string;
    rating: number;
    review?: string;
  },
  Id<'stayRatings'>
>;
