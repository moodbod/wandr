import type { FunctionReference } from 'convex/server';
import { makeFunctionReference } from 'convex/server';

import type { Id } from '@/convex/_generated/dataModel';

export type BookingComGuests = {
  number_of_adults: number;
  children?: number[];
  number_of_rooms: number;
};

export type BookingComProductSelection = {
  id: string;
  allocation?: unknown;
};

export type BookingComCreateProduct = {
  id: string;
  label: string;
  allocation?: unknown;
  priceTotal: number;
  currencyCode: string;
};

export const listBookingComCachedAccommodationsRef = makeFunctionReference<
  'query',
  { countryCode?: string; cityId?: number; regionId?: number; search?: string; limit?: number },
  any[]
>('bookingCom:listCachedAccommodations') as FunctionReference<'query', 'public', any, any[]>;

export const getBookingComCachedAccommodationRef = makeFunctionReference<'query', { slug: string }, any | null>(
  'bookingCom:getCachedAccommodation'
) as FunctionReference<'query', 'public', { slug: string }, any | null>;

export const searchBookingComAvailabilityRef = makeFunctionReference<
  'action',
  {
    accommodationId: number;
    checkIn: string;
    checkOut: string;
    guests: BookingComGuests;
    currency: string;
    bookerCountry: string;
  },
  any[]
>('bookingCom:searchAvailability') as FunctionReference<'action', 'public', any, any[]>;

export const previewBookingComOrderRef = makeFunctionReference<
  'action',
  {
    accommodationId: number;
    checkIn: string;
    checkOut: string;
    products: BookingComProductSelection[];
    booker: {
      country: string;
      platform: 'desktop' | 'mobile';
      travel_purpose?: string;
      user_groups?: string[];
    };
    currency: string;
  },
  any
>('bookingCom:previewOrder') as FunctionReference<'action', 'public', any, any>;

export const createBookingComOrderRef = makeFunctionReference<
  'action',
  {
    travelerSlug: string;
    tripId?: Id<'trips'>;
    orderToken: string;
    accommodation: {
      accommodationId: number;
      accommodationSlug: string;
      checkIn: string;
      checkOut: string;
      products: BookingComCreateProduct[];
      remarks?: {
        special_requests?: string;
        estimated_arrival_time?: { hour: number };
      };
    };
    booker: {
      address?: {
        address_line?: string;
        city?: string;
        country: string;
        post_code?: string;
      };
      company?: string;
      email: string;
      language?: string;
      name: {
        first_name: string;
        last_name: string;
      };
      telephone: string;
    };
    payment: {
      method: string;
      timing: string;
      include_receipt?: boolean;
      card?: {
        cardholder: string;
        cvc: string;
        expiry_date: string;
        number: string;
      };
    };
  },
  any
>('bookingCom:createOrder') as FunctionReference<'action', 'public', any, any>;

export const syncBookingComOrderRef = makeFunctionReference<'action', { orderId: string }, any>(
  'bookingCom:syncOrder'
) as FunctionReference<'action', 'public', { orderId: string }, any>;

export const startBookingComStaticCacheSyncRef = makeFunctionReference<
  'action',
  { countries?: string[]; cityIds?: number[]; regionIds?: number[]; maxPages?: number },
  { targets: number; totalSynced: number }
>('bookingCom:startStaticCacheSync') as FunctionReference<'action', 'public', any, any>;

export const continueBookingComStaticCacheSyncRef = makeFunctionReference<
  'action',
  { scope: 'country' | 'city' | 'region'; value: string | number; page?: string },
  { totalSynced: number; nextPage?: string }
>('bookingCom:continueStaticCacheSync') as FunctionReference<'action', 'public', any, any>;

export const listTravelerBookingComOrdersRef = makeFunctionReference<'query', { travelerSlug: string }, any[]>(
  'bookingCom:listTravelerOrders'
) as FunctionReference<'query', 'public', { travelerSlug: string }, any[]>;
