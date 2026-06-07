import { defineTable } from 'convex/server';
import { v } from 'convex/values';

export const bookingComAccommodationsTable = defineTable({
  accommodationId: v.number(),
  slug: v.string(),
  status: v.union(v.literal('live'), v.literal('closed'), v.literal('unknown')),
  name: v.string(),
  locationLabel: v.string(),
  town: v.string(),
  region: v.string(),
  countryCode: v.optional(v.string()),
  countryLabel: v.optional(v.string()),
  planningLocationId: v.optional(v.string()),
  cityId: v.optional(v.number()),
  regionId: v.optional(v.number()),
  coordinate: v.array(v.number()),
  imageUri: v.string(),
  galleryImages: v.array(v.string()),
  pricePerNight: v.optional(v.number()),
  currencyCode: v.optional(v.string()),
  rating: v.optional(v.number()),
  reviewCount: v.optional(v.number()),
  accommodationType: v.optional(v.string()),
  description: v.optional(v.string()),
  amenities: v.array(v.string()),
  roomNames: v.array(v.string()),
  paymentMethods: v.array(v.string()),
  policies: v.optional(v.string()),
  searchText: v.string(),
  lastSyncedAt: v.number(),
  sourceUpdatedAt: v.optional(v.string()),
})
  .index('by_slug', ['slug'])
  .index('by_accommodationId', ['accommodationId'])
  .index('by_status', ['status'])
  .index('by_status_and_countryCode', ['status', 'countryCode'])
  .index('by_status_and_cityId', ['status', 'cityId'])
  .index('by_status_and_regionId', ['status', 'regionId'])
  .index('by_lastSyncedAt', ['lastSyncedAt']);

export const bookingComSyncStateTable = defineTable({
  scope: v.union(v.literal('global'), v.literal('country'), v.literal('city'), v.literal('region'), v.literal('changes')),
  scopeKey: v.string(),
  status: v.union(v.literal('queued'), v.literal('running'), v.literal('succeeded'), v.literal('failed'), v.literal('disabled')),
  page: v.optional(v.string()),
  lastChange: v.optional(v.string()),
  lastStartedAt: v.number(),
  lastFinishedAt: v.optional(v.number()),
  lastError: v.optional(v.string()),
  totalSynced: v.optional(v.number()),
  updatedAt: v.number(),
})
  .index('by_scope_and_scopeKey', ['scope', 'scopeKey'])
  .index('by_status_and_lastStartedAt', ['status', 'lastStartedAt']);

export const bookingComOrdersTable = defineTable({
  bookingComOrderId: v.string(),
  bookingComReservationId: v.optional(v.string()),
  reservationId: v.optional(v.id('reservations')),
  mirrorBookingId: v.optional(v.id('bookings')),
  accommodationId: v.number(),
  accommodationSlug: v.string(),
  travelerSlug: v.string(),
  tripId: v.optional(v.id('trips')),
  status: v.union(
    v.literal('pending'),
    v.literal('booked'),
    v.literal('stayed'),
    v.literal('cancelled'),
    v.literal('modified'),
    v.literal('failed'),
    v.literal('unknown')
  ),
  checkIn: v.number(),
  checkOut: v.number(),
  bookedAt: v.number(),
  updatedAt: v.number(),
  syncedAt: v.optional(v.number()),
  currencyCode: v.string(),
  totalPrice: v.number(),
  commissionAmount: v.optional(v.number()),
  commissionCurrencyCode: v.optional(v.string()),
  commissionStatus: v.optional(v.union(v.literal('pending'), v.literal('payable'), v.literal('paid'), v.literal('reversed'), v.literal('unknown'))),
  paymentStatus: v.optional(v.union(v.literal('unpaid'), v.literal('pending'), v.literal('paid'), v.literal('refunded'), v.literal('failed'))),
  paymentTiming: v.optional(v.string()),
  paymentMethod: v.optional(v.string()),
  receiptUrl: v.optional(v.string()),
  pincode: v.optional(v.string()),
  cancellationPolicy: v.optional(v.string()),
  priceSnapshot: v.optional(
    v.object({
      currencyCode: v.string(),
      total: v.number(),
      base: v.optional(v.number()),
      taxesAndFees: v.optional(v.number()),
    })
  ),
  sanitizedOrderSnapshot: v.optional(v.any()),
})
  .index('by_bookingComOrderId', ['bookingComOrderId'])
  .index('by_bookingComReservationId', ['bookingComReservationId'])
  .index('by_reservationId', ['reservationId'])
  .index('by_travelerSlug_and_bookedAt', ['travelerSlug', 'bookedAt'])
  .index('by_status_and_updatedAt', ['status', 'updatedAt']);
