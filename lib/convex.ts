import { ConvexReactClient } from 'convex/react';
import type { FunctionReference } from 'convex/server';
import { makeFunctionReference } from 'convex/server';

import type { Id } from '@/convex/_generated/dataModel';
import type { ExploreGroupTripDetail, ExploreJoinableTrip, ExploreJoinableTripCard, ExplorePageContent } from '@/types/explore';
import type {
  DirectChatPayload,
  FriendCallDetail,
  FriendChatListPayload,
  FriendChatPayload,
  FriendDiscoveryPayload,
  FriendViewerProfile,
  FriendsDashboard,
  PhoneContactMatch,
} from '@/types/friends';
import type { AppNotification } from '@/types/notifications';
import type { StayBookingDetails } from '@/types/stays';
import type {
  ProfilePlaceItem,
  TravelerBookingItem,
  TravelerHistoryItem,
  TripDashboard,
  TripItineraryItem,
  TripListItem,
  TripSettings,
} from '@/types/trip';

export type CurrentTravelerProfile = {
  slug: string;
  name: string;
  countryCode: string;
  countryLabel: string;
  phoneNumber: string | null;
  avatarUri: string | null;
  regionCode: string | null;
  regionName: string | null;
};

export type LocationPhoto = {
  id: string;
  imageUri: string;
  travelerSlug: string;
  source: 'user' | 'host';
  caption: string | null;
  createdAt: number;
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

export const getExploreJoinableTripsRef = makeFunctionReference<
  'query',
  { experienceSlug: string; travelerSlug: string },
  ExploreJoinableTrip[]
>('explore:getJoinableTripsForExperience') as FunctionReference<
  'query',
  'public',
  { experienceSlug: string; travelerSlug: string },
  ExploreJoinableTrip[]
>;

export const getExploreJoinableTripCardsRef = makeFunctionReference<
  'query',
  { travelerSlug: string },
  ExploreJoinableTripCard[]
>('explore:getJoinableTripCards') as FunctionReference<
  'query',
  'public',
  { travelerSlug: string },
  ExploreJoinableTripCard[]
>;

export const getExploreGroupTripDetailRef = makeFunctionReference<
  'query',
  { circleId: Id<'friendCircles'>; travelerSlug?: string },
  ExploreGroupTripDetail | null
>('explore:getGroupTripDetail') as FunctionReference<
  'query',
  'public',
  { circleId: Id<'friendCircles'>; travelerSlug?: string },
  ExploreGroupTripDetail | null
>;

export const requestJoinExploreTripRef = makeFunctionReference<
  'mutation',
  { travelerSlug: string; circleId: Id<'friendCircles'>; experienceSlug: string },
  boolean
>('explore:requestJoinTripFromExperience') as FunctionReference<
  'mutation',
  'public',
  { travelerSlug: string; circleId: Id<'friendCircles'>; experienceSlug: string },
  boolean
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

export const generateLocationPhotoUploadUrlRef = makeFunctionReference<
  'mutation',
  Record<string, never>,
  string
>('locationPhotos:generateUploadUrl') as FunctionReference<
  'mutation',
  'public',
  Record<string, never>,
  string
>;

export const submitLocationPhotoRef = makeFunctionReference<
  'mutation',
  {
    locationKind: 'experience' | 'stay';
    locationSlug: string;
    travelerSlug: string;
    storageId: Id<'_storage'>;
    caption?: string;
  },
  string
>('locationPhotos:submitLocationPhoto') as FunctionReference<
  'mutation',
  'public',
  {
    locationKind: 'experience' | 'stay';
    locationSlug: string;
    travelerSlug: string;
    storageId: Id<'_storage'>;
    caption?: string;
  },
  string
>;

export const listLocationPhotosRef = makeFunctionReference<
  'query',
  { locationKind: 'experience' | 'stay'; locationSlug: string },
  LocationPhoto[]
>('locationPhotos:listLocationPhotos') as FunctionReference<
  'query',
  'public',
  { locationKind: 'experience' | 'stay'; locationSlug: string },
  LocationPhoto[]
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
  TripListItem[]
>('trip:listUserTrips') as FunctionReference<
  'query',
  'public',
  { travelerSlug: string },
  TripListItem[]
>;

export const listTravelerHistoryRef = makeFunctionReference<
  'query',
  { travelerSlug: string },
  TravelerHistoryItem[]
>('trip:listTravelerHistory') as FunctionReference<
  'query',
  'public',
  { travelerSlug: string },
  TravelerHistoryItem[]
>;

export const listTravelerBookingsRef = makeFunctionReference<
  'query',
  { travelerSlug: string },
  TravelerBookingItem[]
>('trip:listTravelerBookings') as FunctionReference<
  'query',
  'public',
  { travelerSlug: string },
  TravelerBookingItem[]
>;

export const listSavedPlacesRef = makeFunctionReference<
  'query',
  { travelerSlug: string },
  ProfilePlaceItem[]
>('explore:listSavedPlaces') as FunctionReference<
  'query',
  'public',
  { travelerSlug: string },
  ProfilePlaceItem[]
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

export const getTripSettingsRef = makeFunctionReference<
  'query',
  { travelerSlug: string; tripId: string },
  TripSettings | null
>('trip:getTripSettings') as FunctionReference<
  'query',
  'public',
  { travelerSlug: string; tripId: string },
  TripSettings | null
>;

export const renameTripRef = makeFunctionReference<
  'mutation',
  { tripId: string; travelerSlug: string; name: string },
  boolean
>('trip:renameTrip') as FunctionReference<
  'mutation',
  'public',
  { tripId: string; travelerSlug: string; name: string },
  boolean
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

export const getTravelerStayBookingRef = makeFunctionReference<
  'query',
  { staySlug: string; travelerSlug: string },
  {
    _id: Id<'stayBookings'>;
    staySlug: string;
    travelerSlug: string;
    checkIn: number;
    checkOut: number;
    status: 'pending' | 'confirmed' | 'cancelled';
    totalPrice: number;
    bookedAt: number;
    stayBookingDetails?: StayBookingDetails;
  } | null
>('trip:getTravelerStayBooking') as FunctionReference<
  'query',
  'public',
  { staySlug: string; travelerSlug: string },
  {
    _id: Id<'stayBookings'>;
    staySlug: string;
    travelerSlug: string;
    checkIn: number;
    checkOut: number;
    status: 'pending' | 'confirmed' | 'cancelled';
    totalPrice: number;
    bookedAt: number;
    stayBookingDetails?: StayBookingDetails;
  } | null
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

export const getFriendViewerProfileRef = makeFunctionReference<
  'query',
  { travelerSlug: string; profileSlug: string },
  FriendViewerProfile
>('friends:getFriendViewerProfile') as FunctionReference<
  'query',
  'public',
  { travelerSlug: string; profileSlug: string },
  FriendViewerProfile
>;

export const trackFriendDiscoveryViewRef = makeFunctionReference<
  'mutation',
  { travelerSlug: string },
  boolean
>('friends:trackFriendDiscoveryView') as FunctionReference<
  'mutation',
  'public',
  { travelerSlug: string },
  boolean
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

export const getFriendChatListRef = makeFunctionReference<
  'query',
  { travelerSlug: string },
  FriendChatListPayload
>('friends:getFriendChatList') as FunctionReference<
  'query',
  'public',
  { travelerSlug: string },
  FriendChatListPayload
>;

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
  { travelerSlug: string; threadId: Id<'friendDirectThreads'> },
  DirectChatPayload
>('friends:getDirectChat') as FunctionReference<
  'query',
  'public',
  { travelerSlug: string; threadId: Id<'friendDirectThreads'> },
  DirectChatPayload
>;

export const createOpenFriendGroupRef = makeFunctionReference<
  'mutation',
  { travelerSlug: string; name?: string; tripId?: Id<'trips'>; inviteeSlugs?: string[] },
  Id<'friendCircles'> | null
>('friends:createOpenFriendGroup') as FunctionReference<
  'mutation',
  'public',
  { travelerSlug: string; name?: string; tripId?: Id<'trips'>; inviteeSlugs?: string[] },
  Id<'friendCircles'> | null
>;

export const joinFriendCircleRef = makeFunctionReference<
  'mutation',
  { travelerSlug: string; circleId: Id<'friendCircles'> },
  boolean
>('friends:joinFriendCircle') as FunctionReference<
  'mutation',
  'public',
  { travelerSlug: string; circleId: Id<'friendCircles'> },
  boolean
>;

export const renameFriendCircleRef = makeFunctionReference<
  'mutation',
  { travelerSlug: string; circleId: Id<'friendCircles'>; name: string },
  boolean
>('friends:renameFriendCircle') as FunctionReference<
  'mutation',
  'public',
  { travelerSlug: string; circleId: Id<'friendCircles'>; name: string },
  boolean
>;

export const leaveFriendCircleRef = makeFunctionReference<
  'mutation',
  { travelerSlug: string; circleId: Id<'friendCircles'> },
  boolean
>('friends:leaveFriendCircle') as FunctionReference<
  'mutation',
  'public',
  { travelerSlug: string; circleId: Id<'friendCircles'> },
  boolean
>;

export const deleteFriendCircleRef = makeFunctionReference<
  'mutation',
  { travelerSlug: string; circleId: Id<'friendCircles'> },
  boolean
>('friends:deleteFriendCircle') as FunctionReference<
  'mutation',
  'public',
  { travelerSlug: string; circleId: Id<'friendCircles'> },
  boolean
>;

export const approveTripJoinRequestRef = makeFunctionReference<
  'mutation',
  { travelerSlug: string; notificationId: Id<'appNotifications'> },
  boolean
>('friends:approveTripJoinRequest') as FunctionReference<
  'mutation',
  'public',
  { travelerSlug: string; notificationId: Id<'appNotifications'> },
  boolean
>;

export const declineTripJoinRequestRef = makeFunctionReference<
  'mutation',
  { travelerSlug: string; notificationId: Id<'appNotifications'> },
  boolean
>('friends:declineTripJoinRequest') as FunctionReference<
  'mutation',
  'public',
  { travelerSlug: string; notificationId: Id<'appNotifications'> },
  boolean
>;

export const matchFriendContactsRef = makeFunctionReference<
  'query',
  { travelerSlug: string; phoneNumbers: string[] },
  { matched: PhoneContactMatch[]; unmatched: string[] }
>('friends:matchFriendContacts') as FunctionReference<
  'query',
  'public',
  { travelerSlug: string; phoneNumbers: string[] },
  { matched: PhoneContactMatch[]; unmatched: string[] }
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

export const deleteFriendMessageRef = makeFunctionReference<
  'mutation',
  { messageId: Id<'friendMessages'>; travelerSlug: string },
  boolean
>('friends:deleteFriendMessage') as FunctionReference<
  'mutation',
  'public',
  { messageId: Id<'friendMessages'>; travelerSlug: string },
  boolean
>;

export const markFriendChatReadRef = makeFunctionReference<
  'mutation',
  { circleId: Id<'friendCircles'>; travelerSlug: string },
  boolean
>('friends:markFriendChatRead') as FunctionReference<
  'mutation',
  'public',
  { circleId: Id<'friendCircles'>; travelerSlug: string },
  boolean
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

export const startFriendCallRef = makeFunctionReference<
  'mutation',
  { circleId: Id<'friendCircles'>; travelerSlug: string; mode: 'voice' | 'video' },
  FriendCallDetail | null
>('friends:startFriendCall') as FunctionReference<
  'mutation',
  'public',
  { circleId: Id<'friendCircles'>; travelerSlug: string; mode: 'voice' | 'video' },
  FriendCallDetail | null
>;

export const scheduleFriendCallRef = makeFunctionReference<
  'mutation',
  {
    circleId: Id<'friendCircles'>;
    travelerSlug: string;
    mode: 'voice' | 'video';
    scheduledFor: number;
    endsAt?: number;
    reminderMinutesBefore?: number;
    title?: string;
    description?: string;
  },
  FriendCallDetail | null
>('friends:scheduleFriendCall') as FunctionReference<
  'mutation',
  'public',
  {
    circleId: Id<'friendCircles'>;
    travelerSlug: string;
    mode: 'voice' | 'video';
    scheduledFor: number;
    endsAt?: number;
    reminderMinutesBefore?: number;
    title?: string;
    description?: string;
  },
  FriendCallDetail | null
>;

export const joinScheduledFriendCallRef = makeFunctionReference<
  'mutation',
  { callId: Id<'friendCalls'>; travelerSlug: string },
  FriendCallDetail | null
>('friends:joinScheduledFriendCall') as FunctionReference<
  'mutation',
  'public',
  { callId: Id<'friendCalls'>; travelerSlug: string },
  FriendCallDetail | null
>;

export const endFriendCallRef = makeFunctionReference<
  'mutation',
  { callId: Id<'friendCalls'>; travelerSlug: string },
  FriendCallDetail | null
>('friends:endFriendCall') as FunctionReference<
  'mutation',
  'public',
  { callId: Id<'friendCalls'>; travelerSlug: string },
  FriendCallDetail | null
>;

export const getFriendCallRef = makeFunctionReference<
  'query',
  { callId: Id<'friendCalls'>; travelerSlug: string },
  FriendCallDetail | null
>('friends:getFriendCall') as FunctionReference<
  'query',
  'public',
  { callId: Id<'friendCalls'>; travelerSlug: string },
  FriendCallDetail | null
>;

export const createFriendCallTokenRef = makeFunctionReference<
  'action',
  { callId: Id<'friendCalls'>; travelerSlug: string },
  { serverUrl: string; token: string; roomName: string } | null
>('calls:createFriendCallToken') as FunctionReference<
  'action',
  'public',
  { callId: Id<'friendCalls'>; travelerSlug: string },
  { serverUrl: string; token: string; roomName: string } | null
>;

export const sendDirectFriendMessageRef = makeFunctionReference<
  'mutation',
  { threadId: Id<'friendDirectThreads'>; travelerSlug: string; body: string },
  Id<'friendDirectMessages'> | null
>('friends:sendDirectFriendMessage') as FunctionReference<
  'mutation',
  'public',
  { threadId: Id<'friendDirectThreads'>; travelerSlug: string; body: string },
  Id<'friendDirectMessages'> | null
>;

export const renameDirectFriendThreadRef = makeFunctionReference<
  'mutation',
  { threadId: Id<'friendDirectThreads'>; travelerSlug: string; title: string },
  boolean
>('friends:renameDirectFriendThread') as FunctionReference<
  'mutation',
  'public',
  { threadId: Id<'friendDirectThreads'>; travelerSlug: string; title: string },
  boolean
>;

export const deleteDirectFriendThreadRef = makeFunctionReference<
  'mutation',
  { threadId: Id<'friendDirectThreads'>; travelerSlug: string },
  boolean
>('friends:deleteDirectFriendThread') as FunctionReference<
  'mutation',
  'public',
  { threadId: Id<'friendDirectThreads'>; travelerSlug: string },
  boolean
>;

export const deleteDirectFriendMessageRef = makeFunctionReference<
  'mutation',
  { messageId: Id<'friendDirectMessages'>; travelerSlug: string },
  boolean
>('friends:deleteDirectFriendMessage') as FunctionReference<
  'mutation',
  'public',
  { messageId: Id<'friendDirectMessages'>; travelerSlug: string },
  boolean
>;

export const markDirectChatReadRef = makeFunctionReference<
  'mutation',
  { threadId: Id<'friendDirectThreads'>; travelerSlug: string },
  boolean
>('friends:markDirectChatRead') as FunctionReference<
  'mutation',
  'public',
  { threadId: Id<'friendDirectThreads'>; travelerSlug: string },
  boolean
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

export const markNotificationsViewedRef = makeFunctionReference<
  'mutation',
  { travelerSlug: string; notificationIds?: Id<'appNotifications'>[] },
  boolean
>('notifications:markNotificationsViewed') as FunctionReference<
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
