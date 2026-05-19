import { defineTable } from 'convex/server';
import { v } from 'convex/values';

export const bookingsTable = defineTable({
  experienceSlug: v.string(),
  travelerSlug: v.string(),
  tripId: v.optional(v.id('trips')),
  bookedAt: v.number(),
  status: v.optional(v.union(v.literal('pending'), v.literal('confirmed'), v.literal('cancelled'))),
  bookingType: v.optional(v.union(v.literal('experience'), v.literal('stay'))),
  checkIn: v.optional(v.number()),
  checkOut: v.optional(v.number()),
  totalPrice: v.optional(v.number()),
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
  .index('by_tripId', ['tripId']);
