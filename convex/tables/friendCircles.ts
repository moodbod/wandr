import { defineTable } from 'convex/server';
import { v } from 'convex/values';

export const friendCirclesTable = defineTable({
  slug: v.string(),
  name: v.string(),
  destinationLabel: v.string(),
  heroLabel: v.string(),
  status: v.union(v.literal('active'), v.literal('planning')),
  createdBySlug: v.string(),
  tripId: v.optional(v.id('trips')),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index('by_slug', ['slug'])
  .index('by_createdBySlug_and_status', ['createdBySlug', 'status']);
