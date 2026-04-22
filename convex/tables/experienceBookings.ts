import { defineTable } from 'convex/server';
import { v } from 'convex/values';

export const experienceBookingsTable = defineTable({
  experienceSlug: v.string(),
  travelerSlug: v.string(),
  tripId: v.optional(v.id('trips')),
  bookedAt: v.number(),
})
  .index('by_experienceSlug', ['experienceSlug'])
  .index('by_travelerSlug_and_experienceSlug', ['travelerSlug', 'experienceSlug'])
  .index('by_tripId', ['tripId']);