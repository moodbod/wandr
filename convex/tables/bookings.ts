import { defineTable } from 'convex/server';
import { v } from 'convex/values';

export const bookingsTable = defineTable({
  experienceSlug: v.string(),
  contentKind: v.optional(v.union(v.literal('location'), v.literal('experience'), v.literal('stay'))),
  contentSlug: v.optional(v.string()),
  travelerSlug: v.string(),
  tripId: v.optional(v.id('trips')),
  reservationId: v.optional(v.id('reservations')),
  bookedAt: v.number(),
  status: v.optional(v.union(v.literal('pending'), v.literal('confirmed'), v.literal('cancelled'))),
  bookingType: v.optional(v.union(v.literal('experience'), v.literal('stay'))),
  requestKind: v.optional(
    v.union(
      v.literal('experienceRequest'),
      v.literal('itineraryStop'),
      v.literal('stayItineraryMirror')
    )
  ),
  scheduledFor: v.optional(v.number()),
  partySize: v.optional(v.number()),
  travelerNote: v.optional(v.string()),
  currencyCode: v.optional(v.string()),
  priceSnapshot: v.optional(v.number()),
  checkIn: v.optional(v.number()),
  checkOut: v.optional(v.number()),
  totalPrice: v.optional(v.number()),
  paymentMode: v.optional(v.union(v.literal('cash'), v.literal('platform'))),
  paymentStatus: v.optional(
    v.union(v.literal('unpaid'), v.literal('pending'), v.literal('paid'), v.literal('refunded'), v.literal('failed'))
  ),
  platformFeeAmount: v.optional(v.number()),
  providerReceivableAmount: v.optional(v.number()),
  externalCheckoutId: v.optional(v.string()),
  externalPaymentProvider: v.optional(v.string()),
  paymentCapturedAt: v.optional(v.number()),
  roomTypeId: v.optional(v.string()),
  stayBookingDetails: v.optional(
    v.object({
      guestCounts: v.object({
        adults: v.number(),
        children: v.number(),
      }),
      roomCount: v.number(),
      roomTypeId: v.string(),
      roomTypeLabel: v.string(),
      bedOptionId: v.string(),
      bedOptionLabel: v.string(),
      arrivalWindowId: v.string(),
      arrivalWindowLabel: v.string(),
      specialRequest: v.optional(v.string()),
      guestSummary: v.string(),
      roomSummary: v.string(),
    })
  ),
})
  .index('by_experienceSlug', ['experienceSlug'])
  .index('by_status_and_bookedAt', ['status', 'bookedAt'])
  .index('by_travelerSlug_and_experienceSlug', ['travelerSlug', 'experienceSlug'])
  .index('by_travelerSlug_and_bookedAt', ['travelerSlug', 'bookedAt'])
  .index('by_tripId', ['tripId'])
  .index('by_tripId_and_requestKind', ['tripId', 'requestKind'])
  .index('by_reservationId', ['reservationId']);
