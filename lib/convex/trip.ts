import type { FunctionReference } from 'convex/server';
import { makeFunctionReference } from 'convex/server';

import type { Id } from '@/convex/_generated/dataModel';
import type { StayBookingProfile } from '@/types/stays';
import type { TripDashboard, TripItineraryItem } from '@/types/trip';
import type { AdminRequestStatusFilter } from './client';

export const getUserItineraryRef = makeFunctionReference<
  'query', { travelerSlug: string; tripId?: string }, TripItineraryItem[]
>('trip:getUserItinerary') as FunctionReference<'query', 'public', { travelerSlug: string; tripId?: string }, TripItineraryItem[]>;

export const getTripDashboardRef = makeFunctionReference<
  'query', { travelerSlug: string; tripId?: string }, TripDashboard
>('trip:getTripDashboard') as FunctionReference<'query', 'public', { travelerSlug: string; tripId?: string }, TripDashboard>;

export const listUserTripsRef = makeFunctionReference<
  'query', { travelerSlug: string }, any[]
>('trip:listUserTrips') as FunctionReference<'query', 'public', { travelerSlug: string }, any[]>;

export const createTripRef = makeFunctionReference<
  'mutation', { name: string; travelerSlug: string }, Id<'trips'>
>('trip:createTrip') as FunctionReference<'mutation', 'public', { name: string; travelerSlug: string }, Id<'trips'>>;

export const addExperienceToTripRef = makeFunctionReference<
  'mutation',
  { experienceSlug: string; travelerSlug: string; tripId?: string; scheduledFor?: number; partySize?: number; travelerNote?: string; currencyCode?: string; priceSnapshot?: number },
  string
>('trip:addExperienceToTrip') as FunctionReference<'mutation', 'public', any, string>;

export const bookExperienceRef = addExperienceToTripRef;

export const removeExperienceFromTripRef = makeFunctionReference<
  'mutation', { bookingId: string; travelerSlug: string }, boolean
>('trip:removeExperienceFromTrip') as FunctionReference<'mutation', 'public', { bookingId: string; travelerSlug: string }, boolean>;

export const deleteTripRef = makeFunctionReference<
  'mutation', { tripId: string; travelerSlug: string }, boolean
>('trip:deleteTrip') as FunctionReference<'mutation', 'public', { tripId: string; travelerSlug: string }, boolean>;

export const getTripSettingsRef = makeFunctionReference<
  'query', { travelerSlug: string; tripId: string }, any
>('trip:getTripSettings') as FunctionReference<'query', 'public', { travelerSlug: string; tripId: string }, any>;

export const updateTripSettingsRef = makeFunctionReference<
  'mutation', { tripId: string; travelerSlug: string; name: string; visibility: 'private' | 'public' }, boolean
>('trip:updateTripSettings') as FunctionReference<'mutation', 'public', any, boolean>;

export const inviteFriendsToTripRef = makeFunctionReference<
  'mutation', { tripId: string; travelerSlug: string; friendSlugs: string[] }, boolean
>('trip:inviteFriendsToTrip') as FunctionReference<'mutation', 'public', any, boolean>;

export const bookStayRef = makeFunctionReference<
  'mutation', { staySlug: string; travelerSlug: string; tripId?: string }, string
>('trip:bookStay') as FunctionReference<'mutation', 'public', any, string>;

export const createStayBookingRef = makeFunctionReference<
  'mutation',
  { staySlug: string; travelerSlug: string; checkIn: number; checkOut: number; totalPrice: number; stayBookingDetails?: any; tripId?: string },
  string
>('trip:createStayBooking') as FunctionReference<'mutation', 'public', any, string>;

export const getStayAvailabilityRef = makeFunctionReference<
  'query', { staySlug: string }, any[]
>('trip:getStayAvailability') as FunctionReference<'query', 'public', { staySlug: string }, any[]>;

export const listAllStaysRef = makeFunctionReference<'query', Record<string, never>, any[]>(
  'trip:listAllStays'
) as FunctionReference<'query', 'public', Record<string, never>, any[]>;

export const listManagedStaysRef = makeFunctionReference<'query', { managerSlug: string }, any[]>(
  'trip:listManagedStays'
) as FunctionReference<'query', 'public', { managerSlug: string }, any[]>;

export const createManagedStayRef = makeFunctionReference<
  'mutation', { managerSlug: string; [key: string]: any }, { slug: string; roomId: string }
>('trip:createManagedStay') as FunctionReference<'mutation', 'public', any, { slug: string; roomId: string }>;

export const getStayBySlugRef = makeFunctionReference<'query', { slug: string }, any | null>(
  'trip:getStayBySlug'
) as FunctionReference<'query', 'public', { slug: string }, any | null>;

export const getTravelerStayBookingRef = makeFunctionReference<
  'query', { staySlug: string; travelerSlug: string }, any | null
>('trip:getTravelerStayBooking') as FunctionReference<'query', 'public', { staySlug: string; travelerSlug: string }, any | null>;

export const recordTripArrivalRef = makeFunctionReference<
  'mutation',
  { bookingId: Id<'bookings'>; travelerSlug: string; source: 'gps' | 'manual'; coordinate?: number[] },
  { created: boolean; experienceSlug: string | null }
>('trip:recordTripArrival') as FunctionReference<'mutation', 'public', any, { created: boolean; experienceSlug: string | null }>;

export const submitExperienceRatingRef = makeFunctionReference<
  'mutation',
  { experienceSlug: string; travelerSlug: string; rating: number; review?: string },
  Id<'ratings'>
>('trip:submitExperienceRating') as FunctionReference<'mutation', 'public', any, Id<'ratings'>>;

export const listTravelerHistoryRef = makeFunctionReference<'query', { travelerSlug: string }, any[]>(
  'trip:listTravelerHistory'
) as FunctionReference<'query', 'public', { travelerSlug: string }, any[]>;

export const listTravelerBookingsRef = makeFunctionReference<'query', { travelerSlug: string }, any[]>(
  'trip:listTravelerBookings'
) as FunctionReference<'query', 'public', { travelerSlug: string }, any[]>;

export const listManagedBookingsRef = makeFunctionReference<
  'query', { managerSlug: string; status?: 'pending' | 'confirmed' | 'cancelled' }, any[]
>('trip:listManagedBookings') as FunctionReference<'query', 'public', any, any[]>;

export const updateManagedBookingStatusRef = makeFunctionReference<
  'mutation',
  { bookingId: Id<'bookings'> | Id<'reservations'>; source: 'experienceBooking' | 'stayBooking'; status: 'confirmed' | 'cancelled' },
  boolean
>('trip:updateManagedBookingStatus') as FunctionReference<'mutation', 'public', any, boolean>;

export const listStayRatingsRef = makeFunctionReference<'query', { staySlug: string }, any[]>(
  'trip:listStayRatings'
) as FunctionReference<'query', 'public', { staySlug: string }, any[]>;

export const submitStayRatingRef = makeFunctionReference<
  'mutation', { staySlug: string; travelerSlug: string; rating: number; review?: string }, Id<'reviews'>
>('trip:submitStayRating') as FunctionReference<'mutation', 'public', any, Id<'reviews'>>;
