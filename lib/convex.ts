import { ConvexReactClient } from 'convex/react';
import type { FunctionReference } from 'convex/server';
import { makeFunctionReference } from 'convex/server';

import type { Id } from '@/convex/_generated/dataModel';
import type { ExploreGroupTripDetail, ExploreJoinableTrip, ExploreJoinableTripCard, ExplorePageContent } from '@/types/explore';
import type { SupportChatListPayload, SupportChatPayload } from '@/types/friends';
import type { StayBookingProfile } from '@/types/stays';
import type { TripDashboard, TripItineraryItem } from '@/types/trip';

export type ContentStatus = 'draft' | 'live' | 'archived';
export type CuratedContentKind = 'location' | 'experience' | 'stay';
export type AdminUserRole = 'traveler' | 'serviceProvider' | 'admin';
export type AdminRoleFilter = AdminUserRole | 'all';
export type AdminRequestStatus = 'pending' | 'confirmed' | 'cancelled';
export type AdminRequestStatusFilter = AdminRequestStatus | 'all';
export type AdminRequestSource = 'experienceBooking' | 'stayBooking';
export type ProviderType = 'experiences' | 'stays' | 'both';
export type ProviderStatus = 'invited' | 'active' | 'suspended';
export type ProviderStatusFilter = ProviderStatus | 'all';
export type ProviderReviewStatus = 'draft' | 'submitted' | 'approved' | 'rejected';
export type ProviderReviewStatusFilter = ProviderReviewStatus | 'all';

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

export const listManagedExperiencesRef = makeFunctionReference<
  'query',
  { managerSlug: string },
  any[]
>('explore:listManagedExperiences') as FunctionReference<
  'query',
  'public',
  { managerSlug: string },
  any[]
>;

export const createManagedExperienceRef = makeFunctionReference<
  'mutation',
  {
    managerSlug: string;
    itemKind: 'experience' | 'hiddenGem';
    title: string;
    subtitle: string;
    description: string;
    category: string;
    durationLabel: string;
    groupCapacity: number;
    priceUsd: number;
    coordinate: number[];
    imageUri: string;
    galleryImages: string[];
    availabilityLabel: string;
    confirmMode: string;
    includes: string[];
  },
  { slug: string }
>('explore:createManagedExperience') as FunctionReference<
  'mutation',
  'public',
  {
    managerSlug: string;
    itemKind: 'experience' | 'hiddenGem';
    title: string;
    subtitle: string;
    description: string;
    category: string;
    durationLabel: string;
    groupCapacity: number;
    priceUsd: number;
    coordinate: number[];
    imageUri: string;
    galleryImages: string[];
    availabilityLabel: string;
    confirmMode: string;
    includes: string[];
  },
  { slug: string }
>;

export const getExploreJoinableTripCardsRef = makeFunctionReference<
  'query',
  { travelerSlug?: string },
  ExploreJoinableTripCard[]
>('explore:getExploreJoinableTripCards') as FunctionReference<
  'query',
  'public',
  { travelerSlug?: string },
  ExploreJoinableTripCard[]
>;

export const getExploreJoinableTripsRef = makeFunctionReference<
  'query',
  { travelerSlug?: string; experienceSlug: string },
  ExploreJoinableTrip[]
>('explore:getExploreJoinableTrips') as FunctionReference<
  'query',
  'public',
  { travelerSlug?: string; experienceSlug: string },
  ExploreJoinableTrip[]
>;

export const getExploreGroupTripDetailRef = makeFunctionReference<
  'query',
  { circleId: Id<'circles'>; travelerSlug?: string },
  ExploreGroupTripDetail | null
>('explore:getExploreGroupTripDetail') as FunctionReference<
  'query',
  'public',
  { circleId: Id<'circles'>; travelerSlug?: string },
  ExploreGroupTripDetail | null
>;

export const requestJoinExploreTripRef = makeFunctionReference<
  'mutation',
  { travelerSlug: string; circleId: Id<'circles'>; experienceSlug: string },
  boolean
>('explore:requestJoinExploreTrip') as FunctionReference<
  'mutation',
  'public',
  { travelerSlug: string; circleId: Id<'circles'>; experienceSlug: string },
  boolean
>;

export const bookExperienceRef = makeFunctionReference<
  'mutation',
  {
    experienceSlug: string;
    travelerSlug: string;
    tripId?: string;
    scheduledFor?: number;
    partySize?: number;
    travelerNote?: string;
    currencyCode?: string;
    priceSnapshot?: number;
  },
  string
>('trip:addExperienceToTrip') as FunctionReference<
  'mutation',
  'public',
  {
    experienceSlug: string;
    travelerSlug: string;
    tripId?: string;
    scheduledFor?: number;
    partySize?: number;
    travelerNote?: string;
    currencyCode?: string;
    priceSnapshot?: number;
  },
  string
>;

export const getLocationLikeStateRef = makeFunctionReference<
  'query',
  { travelerSlug: string; locationKind: 'location' | 'experience' | 'hiddenGem'; locationSlug: string },
  { liked: boolean }
>('explore:getLocationLikeState') as FunctionReference<
  'query',
  'public',
  { travelerSlug: string; locationKind: 'location' | 'experience' | 'hiddenGem'; locationSlug: string },
  { liked: boolean }
>;

export const toggleLocationLikeRef = makeFunctionReference<
  'mutation',
  { travelerSlug: string; locationKind: 'location' | 'experience' | 'hiddenGem'; locationSlug: string },
  { liked: boolean }
>('explore:toggleLocationLike') as FunctionReference<
  'mutation',
  'public',
  { travelerSlug: string; locationKind: 'location' | 'experience' | 'hiddenGem'; locationSlug: string },
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
  { travelerSlug?: string },
  any
>('trip:getCurrentTravelerProfile') as FunctionReference<
  'query',
  'public',
  { travelerSlug?: string },
  any
>;

export type UserSettings = {
  travelerSlug: string;
  preferredCurrency: string;
  distanceUnit: 'km' | 'mi';
  temperatureUnit: 'celsius' | 'fahrenheit';
  profileVisibility: 'friends' | 'public' | 'private';
  showSavedPlaces: boolean;
  showTripActivity: boolean;
  locationSharing: 'off' | 'whileUsing' | 'tripOnly';
  showOtherUsersLiveLocation: boolean;
  tripAlertsEnabled: boolean;
  messagesEnabled: boolean;
  bookingUpdatesEnabled: boolean;
  productUpdatesEnabled: boolean;
  updatedAt: number | null;
};

export type SharedUserLocation = {
  travelerSlug: string;
  name: string;
  avatarUri: string | null;
  baseLabel: string;
  coordinate: readonly [number, number];
  accuracy: number | null;
  heading: number | null;
  speed: number | null;
  updatedAt: number;
  expiresAt: number;
  locationSharing: 'off' | 'whileUsing' | 'tripOnly';
  profileVisibility: 'friends' | 'public' | 'private';
};

export const getUserSettingsRef = makeFunctionReference<
  'query',
  { travelerSlug?: string },
  UserSettings | null
>('profile:getUserSettings') as FunctionReference<
  'query',
  'public',
  { travelerSlug?: string },
  UserSettings | null
>;

export const publishSharedLocationRef = makeFunctionReference<
  'mutation',
  { travelerSlug: string; coordinate: number[]; accuracy?: number; heading?: number; speed?: number },
  { published: boolean }
>('sharedLocations:publishSharedLocation') as FunctionReference<
  'mutation',
  'public',
  { travelerSlug: string; coordinate: number[]; accuracy?: number; heading?: number; speed?: number },
  { published: boolean }
>;

export const clearSharedLocationRef = makeFunctionReference<
  'mutation',
  { travelerSlug: string },
  boolean
>('sharedLocations:clearSharedLocation') as FunctionReference<
  'mutation',
  'public',
  { travelerSlug: string },
  boolean
>;

export const listVisibleSharedLocationsRef = makeFunctionReference<
  'query',
  { travelerSlug: string },
  SharedUserLocation[]
>('sharedLocations:listVisibleSharedLocations') as FunctionReference<
  'query',
  'public',
  { travelerSlug: string },
  SharedUserLocation[]
>;

export const generateAvatarUploadUrlRef = makeFunctionReference<'mutation', Record<string, never>, string>(
  'profile:generateAvatarUploadUrl'
) as FunctionReference<'mutation', 'public', Record<string, never>, string>;

export const updateTravelerProfileRef = makeFunctionReference<
  'mutation',
  {
    travelerSlug: string;
    name: string;
    countryCode: string;
    countryLabel: string;
    homeCity?: string;
    travelStyle?: 'solo' | 'couple' | 'friends' | 'family';
    avatarStorageId?: Id<'_storage'>;
    clearAvatar?: boolean;
  },
  boolean
>('profile:updateTravelerProfile') as FunctionReference<
  'mutation',
  'public',
  {
    travelerSlug: string;
    name: string;
    countryCode: string;
    countryLabel: string;
    homeCity?: string;
    travelStyle?: 'solo' | 'couple' | 'friends' | 'family';
    avatarStorageId?: Id<'_storage'>;
    clearAvatar?: boolean;
  },
  boolean
>;

export const updateExperiencePreferencesRef = makeFunctionReference<
  'mutation',
  {
    travelerSlug: string;
    preferredCurrency: string;
    distanceUnit: 'km' | 'mi';
    temperatureUnit: 'celsius' | 'fahrenheit';
  },
  boolean
>('profile:updateExperiencePreferences') as FunctionReference<
  'mutation',
  'public',
  {
    travelerSlug: string;
    preferredCurrency: string;
    distanceUnit: 'km' | 'mi';
    temperatureUnit: 'celsius' | 'fahrenheit';
  },
  boolean
>;

export const updatePrivacySettingsRef = makeFunctionReference<
  'mutation',
  {
    travelerSlug: string;
    profileVisibility: 'friends' | 'public' | 'private';
    showSavedPlaces: boolean;
    showTripActivity: boolean;
    locationSharing: 'off' | 'whileUsing' | 'tripOnly';
    showOtherUsersLiveLocation: boolean;
  },
  boolean
>('profile:updatePrivacySettings') as FunctionReference<
  'mutation',
  'public',
  {
    travelerSlug: string;
    profileVisibility: 'friends' | 'public' | 'private';
    showSavedPlaces: boolean;
    showTripActivity: boolean;
    locationSharing: 'off' | 'whileUsing' | 'tripOnly';
    showOtherUsersLiveLocation: boolean;
  },
  boolean
>;

export const updateNotificationSettingsRef = makeFunctionReference<
  'mutation',
  {
    travelerSlug: string;
    tripAlertsEnabled: boolean;
    messagesEnabled: boolean;
    bookingUpdatesEnabled: boolean;
    productUpdatesEnabled: boolean;
  },
  boolean
>('profile:updateNotificationSettings') as FunctionReference<
  'mutation',
  'public',
  {
    travelerSlug: string;
    tripAlertsEnabled: boolean;
    messagesEnabled: boolean;
    bookingUpdatesEnabled: boolean;
    productUpdatesEnabled: boolean;
  },
  boolean
>;

export const completeOnboardingRef = makeFunctionReference<
  'mutation',
  {
    name: string;
    countryCode: string;
    countryLabel: string;
    homeCity?: string;
    travelStyle: 'solo' | 'couple' | 'friends' | 'family';
  },
  {
    slug: string;
    name: string;
    countryCode: string;
    countryLabel: string;
    homeCity: string | null;
    travelStyle: 'solo' | 'couple' | 'friends' | 'family';
    role: AdminUserRole;
  }
>('authSession:completeOnboarding') as FunctionReference<
  'mutation',
  'public',
  {
    name: string;
    countryCode: string;
    countryLabel: string;
    homeCity?: string;
    travelStyle: 'solo' | 'couple' | 'friends' | 'family';
  },
  {
    slug: string;
    name: string;
    countryCode: string;
    countryLabel: string;
    homeCity: string | null;
    travelStyle: 'solo' | 'couple' | 'friends' | 'family';
    role: AdminUserRole;
  }
>;

export const getCurrentAuthSessionRef = makeFunctionReference<
  'query',
  Record<string, never>,
  {
    travelerSlug: string;
    email: string;
    name: string;
    role: AdminUserRole;
  } | null
>('authSession:getCurrentSession') as FunctionReference<
  'query',
  'public',
  Record<string, never>,
  {
    travelerSlug: string;
    email: string;
    name: string;
    role: AdminUserRole;
  } | null
>;

export const getCurrentAuthIdentityRef = makeFunctionReference<
  'query',
  Record<string, never>,
  {
    email: string | null;
    name: string | null;
    travelerSlug: string | null;
    onboardingCompleted: boolean;
    role: AdminUserRole;
  } | null
>('authSession:getCurrentIdentity') as FunctionReference<
  'query',
  'public',
  Record<string, never>,
  {
    email: string | null;
    name: string | null;
    travelerSlug: string | null;
    onboardingCompleted: boolean;
    role: AdminUserRole;
  } | null
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
  {
    experienceSlug: string;
    travelerSlug: string;
    tripId?: string;
    scheduledFor?: number;
    partySize?: number;
    travelerNote?: string;
    currencyCode?: string;
    priceSnapshot?: number;
  },
  string
>('trip:addExperienceToTrip') as FunctionReference<
  'mutation',
  'public',
  {
    experienceSlug: string;
    travelerSlug: string;
    tripId?: string;
    scheduledFor?: number;
    partySize?: number;
    travelerNote?: string;
    currencyCode?: string;
    priceSnapshot?: number;
  },
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

export const getTripSettingsRef = makeFunctionReference<
  'query',
  { travelerSlug: string; tripId: string },
  any
>('trip:getTripSettings') as FunctionReference<
  'query',
  'public',
  { travelerSlug: string; tripId: string },
  any
>;

export const updateTripSettingsRef = makeFunctionReference<
  'mutation',
  { tripId: string; travelerSlug: string; name: string; visibility: 'private' | 'public' },
  boolean
>('trip:updateTripSettings') as FunctionReference<
  'mutation',
  'public',
  { tripId: string; travelerSlug: string; name: string; visibility: 'private' | 'public' },
  boolean
>;

export const inviteFriendsToTripRef = makeFunctionReference<
  'mutation',
  { tripId: string; travelerSlug: string; friendSlugs: string[] },
  boolean
>('trip:inviteFriendsToTrip') as FunctionReference<
  'mutation',
  'public',
  { tripId: string; travelerSlug: string; friendSlugs: string[] },
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
    stayBookingDetails?: any;
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
    stayBookingDetails?: any;
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

export const listAllStaysRef = makeFunctionReference<'query', Record<string, never>, any[]>(
  'trip:listAllStays'
) as FunctionReference<'query', 'public', Record<string, never>, any[]>;

export const listManagedStaysRef = makeFunctionReference<'query', { managerSlug: string }, any[]>(
  'trip:listManagedStays'
) as FunctionReference<'query', 'public', { managerSlug: string }, any[]>;

export const createManagedStayRef = makeFunctionReference<
  'mutation',
  {
    managerSlug: string;
    name: string;
    locationLabel: string;
    town: string;
    region: string;
    countryCode?: string;
    countryLabel?: string;
    planningLocationId?: string;
    summary: string;
    coordinate: number[];
    imageUri: string;
    galleryImages: string[];
    priceUsd: number;
    currencyCode: string;
    rating: number;
    reviewCount: number;
    bookingNote: string;
    stayStyle: 'design' | 'lodge' | 'roadside' | 'wellness';
    routeVibe: 'city reset' | 'coast base' | 'wildlife stop' | 'desert night';
    sleepSignal: string;
    idealFor: string[];
    amenities: string[];
    nearbyHighlights: string[];
    bookingProfile: StayBookingProfile;
  },
  { slug: string; roomId: string }
>('trip:createManagedStay') as FunctionReference<
  'mutation',
  'public',
  {
    managerSlug: string;
    name: string;
    locationLabel: string;
    town: string;
    region: string;
    countryCode?: string;
    countryLabel?: string;
    planningLocationId?: string;
    summary: string;
    coordinate: number[];
    imageUri: string;
    galleryImages: string[];
    priceUsd: number;
    currencyCode: string;
    rating: number;
    reviewCount: number;
    bookingNote: string;
    stayStyle: 'design' | 'lodge' | 'roadside' | 'wellness';
    routeVibe: 'city reset' | 'coast base' | 'wildlife stop' | 'desert night';
    sleepSignal: string;
    idealFor: string[];
    amenities: string[];
    nearbyHighlights: string[];
    bookingProfile: StayBookingProfile;
  },
  { slug: string; roomId: string }
>;

export const getStayBySlugRef = makeFunctionReference<'query', { slug: string }, any | null>(
  'trip:getStayBySlug'
) as FunctionReference<'query', 'public', { slug: string }, any | null>;

export const getTravelerStayBookingRef = makeFunctionReference<
  'query',
  { staySlug: string; travelerSlug: string },
  any | null
>('trip:getTravelerStayBooking') as FunctionReference<
  'query',
  'public',
  { staySlug: string; travelerSlug: string },
  any | null
>;

export const recordTripArrivalRef = makeFunctionReference<
  'mutation',
  {
    bookingId: Id<'bookings'>;
    travelerSlug: string;
    source: 'gps' | 'manual';
    coordinate?: number[];
  },
  { created: boolean; experienceSlug: string | null }
>('trip:recordTripArrival') as FunctionReference<
  'mutation',
  'public',
  {
    bookingId: Id<'bookings'>;
    travelerSlug: string;
    source: 'gps' | 'manual';
    coordinate?: number[];
  },
  { created: boolean; experienceSlug: string | null }
>;

export const submitExperienceRatingRef = makeFunctionReference<
  'mutation',
  {
    experienceSlug: string;
    travelerSlug: string;
    rating: number;
    review?: string;
  },
  Id<'ratings'>
>('trip:submitExperienceRating') as FunctionReference<
  'mutation',
  'public',
  {
    experienceSlug: string;
    travelerSlug: string;
    rating: number;
    review?: string;
  },
  Id<'ratings'>
>;

export const listTravelerHistoryRef = makeFunctionReference<'query', { travelerSlug: string }, any[]>(
  'trip:listTravelerHistory'
) as FunctionReference<'query', 'public', { travelerSlug: string }, any[]>;

export const listTravelerBookingsRef = makeFunctionReference<'query', { travelerSlug: string }, any[]>(
  'trip:listTravelerBookings'
) as FunctionReference<'query', 'public', { travelerSlug: string }, any[]>;

export const listManagedBookingsRef = makeFunctionReference<
  'query',
  { managerSlug: string; status?: 'pending' | 'confirmed' | 'cancelled' },
  any[]
>('trip:listManagedBookings') as FunctionReference<
  'query',
  'public',
  { managerSlug: string; status?: 'pending' | 'confirmed' | 'cancelled' },
  any[]
>;

export const updateManagedBookingStatusRef = makeFunctionReference<
  'mutation',
  {
    bookingId: Id<'bookings'> | Id<'reservations'>;
    source: 'experienceBooking' | 'stayBooking';
    status: 'confirmed' | 'cancelled';
  },
  boolean
>('trip:updateManagedBookingStatus') as FunctionReference<
  'mutation',
  'public',
  {
    bookingId: Id<'bookings'> | Id<'reservations'>;
    source: 'experienceBooking' | 'stayBooking';
    status: 'confirmed' | 'cancelled';
  },
  boolean
>;

export const listSavedPlacesRef = makeFunctionReference<'query', { travelerSlug: string }, any[]>(
  'explore:listSavedPlaces'
) as FunctionReference<'query', 'public', { travelerSlug: string }, any[]>;

export const listStayRatingsRef = makeFunctionReference<
  'query',
  { staySlug: string },
  any[]
>('trip:listStayRatings') as FunctionReference<
  'query',
  'public',
  { staySlug: string },
  any[]
>;

export const submitStayRatingRef = makeFunctionReference<
  'mutation',
  { staySlug: string; travelerSlug: string; rating: number; review?: string },
  Id<'reviews'>
>('trip:submitStayRating') as FunctionReference<
  'mutation',
  'public',
  { staySlug: string; travelerSlug: string; rating: number; review?: string },
  Id<'reviews'>
>;

export const generateLocationPhotoUploadUrlRef = makeFunctionReference<'mutation', Record<string, never>, string>(
  'photos:generateUploadUrl'
) as FunctionReference<'mutation', 'public', Record<string, never>, string>;

export const submitLocationPhotoRef = makeFunctionReference<
  'mutation',
  {
    locationKind: 'location' | 'experience' | 'stay';
    locationSlug: string;
    travelerSlug: string;
    storageId: Id<'_storage'>;
    caption?: string;
  },
  Id<'photos'>
>('photos:submitLocationPhoto') as FunctionReference<
  'mutation',
  'public',
  {
    locationKind: 'location' | 'experience' | 'stay';
    locationSlug: string;
    travelerSlug: string;
    storageId: Id<'_storage'>;
    caption?: string;
  },
  Id<'photos'>
>;

export const listLocationPhotosRef = makeFunctionReference<
  'query',
  { locationKind: 'location' | 'experience' | 'stay'; locationSlug: string },
  any[]
>('photos:listLocationPhotos') as FunctionReference<
  'query',
  'public',
  { locationKind: 'location' | 'experience' | 'stay'; locationSlug: string },
  any[]
>;

export const listManagedLocationPhotosRef = makeFunctionReference<
  'query',
  { managerSlug: string; status?: 'approved' | 'pending' | 'rejected' },
  any[]
>('photos:listManagedLocationPhotos') as FunctionReference<
  'query',
  'public',
  { managerSlug: string; status?: 'approved' | 'pending' | 'rejected' },
  any[]
>;

export const updateLocationPhotoStatusRef = makeFunctionReference<
  'mutation',
  { photoId: Id<'photos'>; status: 'approved' | 'rejected' },
  boolean
>('photos:updateLocationPhotoStatus') as FunctionReference<
  'mutation',
  'public',
  { photoId: Id<'photos'>; status: 'approved' | 'rejected' },
  boolean
>;

export const getFriendsDashboardRef = makeFunctionReference<'query', { travelerSlug: string }, any>(
  'friends:getFriendsDashboard'
) as FunctionReference<'query', 'public', { travelerSlug: string }, any>;

export const getFriendDiscoveryRef = makeFunctionReference<'query', { travelerSlug: string }, any>(
  'friends:getFriendDiscovery'
) as FunctionReference<'query', 'public', { travelerSlug: string }, any>;

export const getFriendViewerProfileRef = makeFunctionReference<
  'query',
  { travelerSlug: string; profileSlug: string },
  any
>('friends:getFriendViewerProfile') as FunctionReference<
  'query',
  'public',
  { travelerSlug: string; profileSlug: string },
  any
>;

export const trackFriendDiscoveryViewRef = makeFunctionReference<'mutation', { travelerSlug: string }, boolean>(
  'friends:trackFriendDiscoveryView'
) as FunctionReference<'mutation', 'public', { travelerSlug: string }, boolean>;

export const getFriendChatRef = makeFunctionReference<
  'query',
  { travelerSlug: string; circleId?: Id<'circles'> },
  any
>('friends:getFriendChat') as FunctionReference<
  'query',
  'public',
  { travelerSlug: string; circleId?: Id<'circles'> },
  any
>;

export const getFriendChatListRef = makeFunctionReference<'query', { travelerSlug: string }, any>(
  'friends:getFriendChatList'
) as FunctionReference<'query', 'public', { travelerSlug: string }, any>;

export const getHeaderBadgeCountsRef = makeFunctionReference<
  'query',
  { travelerSlug: string },
  { chatUnreadCount: number; notificationUnreadCount: number }
>('friends:getHeaderBadgeCounts') as FunctionReference<
  'query',
  'public',
  { travelerSlug: string },
  { chatUnreadCount: number; notificationUnreadCount: number }
>;

export const getDirectChatRef = makeFunctionReference<
  'query',
  { travelerSlug: string; threadId: Id<'threads'> },
  any
>('friends:getDirectChat') as FunctionReference<
  'query',
  'public',
  { travelerSlug: string; threadId: Id<'threads'> },
  any
>;

export const createOpenFriendGroupRef = makeFunctionReference<
  'mutation',
  { travelerSlug: string; name?: string; tripId?: Id<'trips'>; inviteeSlugs?: string[] },
  Id<'circles'> | null
>('friends:createOpenFriendGroup') as FunctionReference<
  'mutation',
  'public',
  { travelerSlug: string; name?: string; tripId?: Id<'trips'>; inviteeSlugs?: string[] },
  Id<'circles'> | null
>;

export const matchFriendContactsRef = makeFunctionReference<
  'query',
  { travelerSlug: string; phoneNumbers: string[] },
  any
>('friends:matchFriendContacts') as FunctionReference<
  'query',
  'public',
  { travelerSlug: string; phoneNumbers: string[] },
  any
>;

export const actOnFriendCandidateRef = makeFunctionReference<
  'mutation',
  { travelerSlug: string; candidateSlug: string; action: 'invited' | 'passed' | 'friended' },
  any
>('friends:actOnFriendCandidate') as FunctionReference<
  'mutation',
  'public',
  { travelerSlug: string; candidateSlug: string; action: 'invited' | 'passed' | 'friended' },
  any
>;

export const joinFriendCircleRef = makeFunctionReference<
  'mutation',
  { travelerSlug: string; circleId: Id<'circles'> },
  boolean
>('friends:joinFriendCircle') as FunctionReference<
  'mutation',
  'public',
  { travelerSlug: string; circleId: Id<'circles'> },
  boolean
>;

export const renameFriendCircleRef = makeFunctionReference<
  'mutation',
  { travelerSlug: string; circleId: Id<'circles'>; name: string },
  boolean
>('friends:renameFriendCircle') as FunctionReference<
  'mutation',
  'public',
  { travelerSlug: string; circleId: Id<'circles'>; name: string },
  boolean
>;

export const leaveFriendCircleRef = makeFunctionReference<
  'mutation',
  { travelerSlug: string; circleId: Id<'circles'> },
  boolean
>('friends:leaveFriendCircle') as FunctionReference<
  'mutation',
  'public',
  { travelerSlug: string; circleId: Id<'circles'> },
  boolean
>;

export const deleteFriendCircleRef = makeFunctionReference<
  'mutation',
  { travelerSlug: string; circleId: Id<'circles'> },
  boolean
>('friends:deleteFriendCircle') as FunctionReference<
  'mutation',
  'public',
  { travelerSlug: string; circleId: Id<'circles'> },
  boolean
>;

export const sendFriendMessageRef = makeFunctionReference<
  'mutation',
  { circleId: Id<'circles'>; travelerSlug: string; body: string; replyToMessageId?: Id<'messages'> },
  Id<'messages'> | null
>('friends:sendFriendMessage') as FunctionReference<
  'mutation',
  'public',
  { circleId: Id<'circles'>; travelerSlug: string; body: string; replyToMessageId?: Id<'messages'> },
  Id<'messages'> | null
>;

export const deleteFriendMessageRef = makeFunctionReference<
  'mutation',
  { messageId: Id<'messages'>; travelerSlug: string },
  boolean
>('friends:deleteFriendMessage') as FunctionReference<
  'mutation',
  'public',
  { messageId: Id<'messages'>; travelerSlug: string },
  boolean
>;

export const markFriendChatReadRef = makeFunctionReference<
  'mutation',
  { circleId: Id<'circles'>; travelerSlug: string },
  boolean
>('friends:markFriendChatRead') as FunctionReference<
  'mutation',
  'public',
  { circleId: Id<'circles'>; travelerSlug: string },
  boolean
>;

export const shareTripRouteInFriendChatRef = makeFunctionReference<
  'mutation',
  { circleId: Id<'circles'>; travelerSlug: string },
  Id<'messages'>
>('friends:shareTripRouteInFriendChat') as FunctionReference<
  'mutation',
  'public',
  { circleId: Id<'circles'>; travelerSlug: string },
  Id<'messages'>
>;

export const startFriendCallRef = makeFunctionReference<
  'mutation',
  { circleId: Id<'circles'>; travelerSlug: string; mode: 'voice' | 'video' },
  any
>('friends:startFriendCall') as FunctionReference<
  'mutation',
  'public',
  { circleId: Id<'circles'>; travelerSlug: string; mode: 'voice' | 'video' },
  any
>;

export const scheduleFriendCallRef = makeFunctionReference<
  'mutation',
  {
    circleId: Id<'circles'>;
    travelerSlug: string;
    mode: 'voice' | 'video';
    scheduledFor: number;
    endsAt?: number;
    reminderMinutesBefore?: number;
    title?: string;
    description?: string;
  },
  any
>('friends:scheduleFriendCall') as FunctionReference<
  'mutation',
  'public',
  {
    circleId: Id<'circles'>;
    travelerSlug: string;
    mode: 'voice' | 'video';
    scheduledFor: number;
    endsAt?: number;
    reminderMinutesBefore?: number;
    title?: string;
    description?: string;
  },
  any
>;

export const joinScheduledFriendCallRef = makeFunctionReference<
  'mutation',
  { callId: Id<'calls'>; travelerSlug: string },
  any
>('friends:joinScheduledFriendCall') as FunctionReference<
  'mutation',
  'public',
  { callId: Id<'calls'>; travelerSlug: string },
  any
>;

export const endFriendCallRef = makeFunctionReference<
  'mutation',
  { callId: Id<'calls'>; travelerSlug: string },
  any
>('friends:endFriendCall') as FunctionReference<
  'mutation',
  'public',
  { callId: Id<'calls'>; travelerSlug: string },
  any
>;

export const getFriendCallRef = makeFunctionReference<
  'query',
  { callId: Id<'calls'>; travelerSlug: string },
  any
>('friends:getFriendCall') as FunctionReference<
  'query',
  'public',
  { callId: Id<'calls'>; travelerSlug: string },
  any
>;

export const listIncomingFriendCallsRef = makeFunctionReference<
  'query',
  { travelerSlug: string },
  any[]
>('friends:listIncomingFriendCalls') as FunctionReference<
  'query',
  'public',
  { travelerSlug: string },
  any[]
>;

export const createFriendCallTokenRef = makeFunctionReference<
  'action',
  { callId: Id<'calls'>; travelerSlug: string },
  { serverUrl: string; token: string; roomName: string } | null
>('calls:createFriendCallToken') as FunctionReference<
  'action',
  'public',
  { callId: Id<'calls'>; travelerSlug: string },
  { serverUrl: string; token: string; roomName: string } | null
>;

export const sendDirectFriendMessageRef = makeFunctionReference<
  'mutation',
  { threadId: Id<'threads'>; travelerSlug: string; body: string; replyToMessageId?: Id<'dms'> },
  Id<'dms'> | null
>('friends:sendDirectFriendMessage') as FunctionReference<
  'mutation',
  'public',
  { threadId: Id<'threads'>; travelerSlug: string; body: string; replyToMessageId?: Id<'dms'> },
  Id<'dms'> | null
>;

export const startDirectFriendCallRef = makeFunctionReference<
  'mutation',
  { threadId: Id<'threads'>; travelerSlug: string; mode: 'voice' | 'video' },
  any
>('friends:startDirectFriendCall') as FunctionReference<
  'mutation',
  'public',
  { threadId: Id<'threads'>; travelerSlug: string; mode: 'voice' | 'video' },
  any
>;

export const renameDirectFriendThreadRef = makeFunctionReference<
  'mutation',
  { threadId: Id<'threads'>; travelerSlug: string; title: string },
  boolean
>('friends:renameDirectFriendThread') as FunctionReference<
  'mutation',
  'public',
  { threadId: Id<'threads'>; travelerSlug: string; title: string },
  boolean
>;

export const deleteDirectFriendThreadRef = makeFunctionReference<
  'mutation',
  { threadId: Id<'threads'>; travelerSlug: string },
  boolean
>('friends:deleteDirectFriendThread') as FunctionReference<
  'mutation',
  'public',
  { threadId: Id<'threads'>; travelerSlug: string },
  boolean
>;

export const deleteDirectFriendMessageRef = makeFunctionReference<
  'mutation',
  { messageId: Id<'dms'>; travelerSlug: string },
  boolean
>('friends:deleteDirectFriendMessage') as FunctionReference<
  'mutation',
  'public',
  { messageId: Id<'dms'>; travelerSlug: string },
  boolean
>;

export const markDirectChatReadRef = makeFunctionReference<
  'mutation',
  { threadId: Id<'threads'>; travelerSlug: string },
  boolean
>('friends:markDirectChatRead') as FunctionReference<
  'mutation',
  'public',
  { threadId: Id<'threads'>; travelerSlug: string },
  boolean
>;

export const getSupportChatListRef = makeFunctionReference<
  'query',
  { travelerSlug: string },
  SupportChatListPayload
>('support:getSupportChatList') as FunctionReference<
  'query',
  'public',
  { travelerSlug: string },
  SupportChatListPayload
>;

export const getSupportChatRef = makeFunctionReference<
  'query',
  { travelerSlug: string; threadId?: Id<'supportThreads'> },
  SupportChatPayload
>('support:getSupportChat') as FunctionReference<
  'query',
  'public',
  { travelerSlug: string; threadId?: Id<'supportThreads'> },
  SupportChatPayload
>;

export const sendSupportMessageRef = makeFunctionReference<
  'mutation',
  {
    travelerSlug: string;
    body: string;
    threadId?: Id<'supportThreads'>;
    replyToMessageId?: Id<'supportMessages'>;
  },
  { threadId: Id<'supportThreads'>; messageId: Id<'supportMessages'> } | null
>('support:sendSupportMessage') as FunctionReference<
  'mutation',
  'public',
  {
    travelerSlug: string;
    body: string;
    threadId?: Id<'supportThreads'>;
    replyToMessageId?: Id<'supportMessages'>;
  },
  { threadId: Id<'supportThreads'>; messageId: Id<'supportMessages'> } | null
>;

export const markSupportChatReadRef = makeFunctionReference<
  'mutation',
  { travelerSlug: string; threadId?: Id<'supportThreads'> },
  boolean
>('support:markSupportChatRead') as FunctionReference<
  'mutation',
  'public',
  { travelerSlug: string; threadId?: Id<'supportThreads'> },
  boolean
>;

export const approveTripJoinRequestRef = makeFunctionReference<
  'mutation',
  { travelerSlug: string; notificationId: Id<'notices'> },
  boolean
>('friends:approveTripJoinRequest') as FunctionReference<
  'mutation',
  'public',
  { travelerSlug: string; notificationId: Id<'notices'> },
  boolean
>;

export const getLiveCatalogRef = makeFunctionReference<
  'query',
  Record<string, never>,
  {
    locations: any[];
    experiences: any[];
    stays: any[];
    markers: any[];
    updatedAt: number;
  }
>('catalog:getLiveCatalog') as FunctionReference<
  'query',
  'public',
  Record<string, never>,
  {
    locations: any[];
    experiences: any[];
    stays: any[];
    markers: any[];
    updatedAt: number;
  }
>;

export const listManagedCatalogRef = makeFunctionReference<
  'query',
  { status?: ContentStatus },
  any
>('catalog:listManagedCatalog') as FunctionReference<'query', 'public', { status?: ContentStatus }, any>;

export const generateManagedImageUploadUrlRef = makeFunctionReference<'mutation', Record<string, never>, string>(
  'catalog:generateManagedImageUploadUrl'
) as FunctionReference<'mutation', 'public', Record<string, never>, string>;

export const upsertManagedLocationRef = makeFunctionReference<
  'mutation',
  any,
  { locationId: Id<'locations'>; slug: string }
>('catalog:upsertManagedLocation') as FunctionReference<'mutation', 'public', any, { locationId: Id<'locations'>; slug: string }>;

export const upsertManagedExperienceRef = makeFunctionReference<
  'mutation',
  any,
  { experienceId: Id<'experiences'>; slug: string }
>('catalog:upsertManagedExperience') as FunctionReference<'mutation', 'public', any, { experienceId: Id<'experiences'>; slug: string }>;

export const upsertManagedStayRef = makeFunctionReference<
  'mutation',
  any,
  { stayId: Id<'stays'>; roomId: string; slug: string }
>('catalog:upsertManagedStay') as FunctionReference<'mutation', 'public', any, { stayId: Id<'stays'>; roomId: string; slug: string }>;

export const updateManagedContentStatusRef = makeFunctionReference<
  'mutation',
  { kind: CuratedContentKind; id: Id<'locations'> | Id<'experiences'> | Id<'stays'>; status: ContentStatus },
  boolean
>('catalog:updateManagedContentStatus') as FunctionReference<
  'mutation',
  'public',
  { kind: CuratedContentKind; id: Id<'locations'> | Id<'experiences'> | Id<'stays'>; status: ContentStatus },
  boolean
>;

export const migrateLegacyContentAsLiveRef = makeFunctionReference<
  'mutation',
  { limit?: number },
  { locationsCreated: number; experiencesUpdated: number; staysUpdated: number }
>('catalog:migrateLegacyContentAsLive') as FunctionReference<
  'mutation',
  'public',
  { limit?: number },
  { locationsCreated: number; experiencesUpdated: number; staysUpdated: number }
>;

export const adminGetOverviewRef = makeFunctionReference<'query', Record<string, never>, any>(
  'admin:getOverview'
) as FunctionReference<'query', 'public', Record<string, never>, any>;

export const adminListUsersRef = makeFunctionReference<
  'query',
  { cursor?: number; limit?: number; role?: AdminRoleFilter; search?: string },
  any
>('admin:listUsers') as FunctionReference<
  'query',
  'public',
  { cursor?: number; limit?: number; role?: AdminRoleFilter; search?: string },
  any
>;

export const adminUpdateUserRoleRef = makeFunctionReference<
  'mutation',
  { role: AdminUserRole; userId: Id<'users'> },
  any
>('admin:updateUserRole') as FunctionReference<
  'mutation',
  'public',
  { role: AdminUserRole; userId: Id<'users'> },
  any
>;

export const adminListRequestsRef = makeFunctionReference<
  'query',
  { cursor?: number; limit?: number; status?: AdminRequestStatusFilter },
  any
>('admin:listRequests') as FunctionReference<
  'query',
  'public',
  { cursor?: number; limit?: number; status?: AdminRequestStatusFilter },
  any
>;

export const adminUpdateRequestStatusRef = makeFunctionReference<
  'mutation',
  { requestId: Id<'bookings'> | Id<'reservations'>; source: AdminRequestSource; status: 'confirmed' | 'cancelled' },
  boolean
>('admin:updateRequestStatus') as FunctionReference<
  'mutation',
  'public',
  { requestId: Id<'bookings'> | Id<'reservations'>; source: AdminRequestSource; status: 'confirmed' | 'cancelled' },
  boolean
>;

export const adminListAuditEventsRef = makeFunctionReference<
  'query',
  { cursor?: number; limit?: number },
  any
>('admin:listAuditEvents') as FunctionReference<'query', 'public', { cursor?: number; limit?: number }, any>;

export const adminInviteServiceProviderRef = makeFunctionReference<
  'mutation',
  {
    userId: Id<'users'>;
    businessName: string;
    providerType: ProviderType;
    contactEmail?: string;
    contactPhone?: string;
    contactName?: string;
    acceptedPaymentModes?: ('cash' | 'platform')[];
    directPaymentNotes?: string;
  },
  any
>('admin:inviteServiceProvider') as FunctionReference<
  'mutation',
  'public',
  {
    userId: Id<'users'>;
    businessName: string;
    providerType: ProviderType;
    contactEmail?: string;
    contactPhone?: string;
    contactName?: string;
    acceptedPaymentModes?: ('cash' | 'platform')[];
    directPaymentNotes?: string;
  },
  any
>;

export const adminListServiceProvidersRef = makeFunctionReference<
  'query',
  { cursor?: number; limit?: number; status?: ProviderStatusFilter; search?: string },
  any
>('admin:listServiceProviders') as FunctionReference<
  'query',
  'public',
  { cursor?: number; limit?: number; status?: ProviderStatusFilter; search?: string },
  any
>;

export const adminUpdateServiceProviderStatusRef = makeFunctionReference<
  'mutation',
  { businessProfileId: Id<'businessProfiles'>; status: ProviderStatus },
  boolean
>('admin:updateServiceProviderStatus') as FunctionReference<
  'mutation',
  'public',
  { businessProfileId: Id<'businessProfiles'>; status: ProviderStatus },
  boolean
>;

export const adminListProviderSubmissionsRef = makeFunctionReference<
  'query',
  { cursor?: number; limit?: number; reviewStatus?: ProviderReviewStatusFilter },
  any
>('admin:listProviderSubmissions') as FunctionReference<
  'query',
  'public',
  { cursor?: number; limit?: number; reviewStatus?: ProviderReviewStatusFilter },
  any
>;

export const adminReviewProviderListingRef = makeFunctionReference<
  'mutation',
  {
    kind: 'experience' | 'stay';
    id: Id<'experiences'> | Id<'stays'>;
    decision: 'approved' | 'rejected';
    note?: string;
  },
  boolean
>('admin:reviewProviderListing') as FunctionReference<
  'mutation',
  'public',
  {
    kind: 'experience' | 'stay';
    id: Id<'experiences'> | Id<'stays'>;
    decision: 'approved' | 'rejected';
    note?: string;
  },
  boolean
>;

export const providerGetMyBusinessProfileRef = makeFunctionReference<'query', Record<string, never>, any>(
  'provider:getMyBusinessProfile'
) as FunctionReference<'query', 'public', Record<string, never>, any>;

export const providerListMyListingsRef = makeFunctionReference<'query', Record<string, never>, any>(
  'provider:listMyListings'
) as FunctionReference<'query', 'public', Record<string, never>, any>;

export const providerGenerateImageUploadUrlRef = makeFunctionReference<'mutation', Record<string, never>, string>(
  'provider:generateProviderImageUploadUrl'
) as FunctionReference<'mutation', 'public', Record<string, never>, string>;

export const providerUpsertMyExperienceDraftRef = makeFunctionReference<'mutation', any, any>(
  'provider:upsertMyExperienceDraft'
) as FunctionReference<'mutation', 'public', any, any>;

export const providerSubmitMyExperienceForReviewRef = makeFunctionReference<
  'mutation',
  { experienceId: Id<'experiences'> },
  boolean
>('provider:submitMyExperienceForReview') as FunctionReference<
  'mutation',
  'public',
  { experienceId: Id<'experiences'> },
  boolean
>;

export const providerUpsertMyStayDraftRef = makeFunctionReference<'mutation', any, any>(
  'provider:upsertMyStayDraft'
) as FunctionReference<'mutation', 'public', any, any>;

export const providerSubmitMyStayForReviewRef = makeFunctionReference<'mutation', { stayId: Id<'stays'> }, boolean>(
  'provider:submitMyStayForReview'
) as FunctionReference<'mutation', 'public', { stayId: Id<'stays'> }, boolean>;

export const providerListMyRequestsRef = makeFunctionReference<
  'query',
  { status?: AdminRequestStatusFilter },
  any[]
>('provider:listMyRequests') as FunctionReference<'query', 'public', { status?: AdminRequestStatusFilter }, any[]>;

export const providerUpdateMyRequestStatusRef = makeFunctionReference<
  'mutation',
  {
    requestId: Id<'bookings'> | Id<'reservations'>;
    source: AdminRequestSource;
    status: 'confirmed' | 'cancelled';
  },
  boolean
>('provider:updateMyRequestStatus') as FunctionReference<
  'mutation',
  'public',
  {
    requestId: Id<'bookings'> | Id<'reservations'>;
    source: AdminRequestSource;
    status: 'confirmed' | 'cancelled';
  },
  boolean
>;

export const providerArchiveMyListingRef = makeFunctionReference<
  'mutation',
  { kind: 'experience' | 'stay'; id: Id<'experiences'> | Id<'stays'> },
  boolean
>('provider:archiveMyListing') as FunctionReference<
  'mutation',
  'public',
  { kind: 'experience' | 'stay'; id: Id<'experiences'> | Id<'stays'> },
  boolean
>;

export const acceptTripInviteRef = makeFunctionReference<
  'mutation',
  { travelerSlug: string; notificationId: Id<'notices'> },
  boolean
>('friends:acceptTripInvite') as FunctionReference<
  'mutation',
  'public',
  { travelerSlug: string; notificationId: Id<'notices'> },
  boolean
>;

export const declineTripInviteRef = makeFunctionReference<
  'mutation',
  { travelerSlug: string; notificationId: Id<'notices'> },
  boolean
>('friends:declineTripInvite') as FunctionReference<
  'mutation',
  'public',
  { travelerSlug: string; notificationId: Id<'notices'> },
  boolean
>;

export const declineTripJoinRequestRef = makeFunctionReference<
  'mutation',
  { travelerSlug: string; notificationId: Id<'notices'> },
  boolean
>('friends:declineTripJoinRequest') as FunctionReference<
  'mutation',
  'public',
  { travelerSlug: string; notificationId: Id<'notices'> },
  boolean
>;

export const acceptFriendRequestRef = makeFunctionReference<
  'mutation',
  { travelerSlug: string; notificationId: Id<'notices'> },
  boolean
>('friends:acceptFriendRequest') as FunctionReference<
  'mutation',
  'public',
  { travelerSlug: string; notificationId: Id<'notices'> },
  boolean
>;

export const rejectFriendRequestRef = makeFunctionReference<
  'mutation',
  { travelerSlug: string; notificationId: Id<'notices'> },
  boolean
>('friends:rejectFriendRequest') as FunctionReference<
  'mutation',
  'public',
  { travelerSlug: string; notificationId: Id<'notices'> },
  boolean
>;

export const listNotificationsRef = makeFunctionReference<'query', { travelerSlug: string }, any[]>(
  'notifications:listNotifications'
) as FunctionReference<'query', 'public', { travelerSlug: string }, any[]>;

export const markNotificationsReadRef = makeFunctionReference<
  'mutation',
  { travelerSlug: string; notificationIds?: Id<'notices'>[] },
  boolean
>('notifications:markNotificationsRead') as FunctionReference<
  'mutation',
  'public',
  { travelerSlug: string; notificationIds?: Id<'notices'>[] },
  boolean
>;

export const markNotificationsViewedRef = makeFunctionReference<
  'mutation',
  { travelerSlug: string; notificationIds?: Id<'notices'>[] },
  boolean
>('notifications:markNotificationsViewed') as FunctionReference<
  'mutation',
  'public',
  { travelerSlug: string; notificationIds?: Id<'notices'>[] },
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

export const registerDevicePushTokenRef = makeFunctionReference<
  'mutation',
  {
    travelerSlug: string;
    installationId: string;
    expoPushToken: string;
    platform: 'ios' | 'android';
  },
  boolean
>('notifications:registerDevicePushToken') as FunctionReference<
  'mutation',
  'public',
  {
    travelerSlug: string;
    installationId: string;
    expoPushToken: string;
    platform: 'ios' | 'android';
  },
  boolean
>;
