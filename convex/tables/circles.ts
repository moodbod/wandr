import { defineTable } from 'convex/server';
import { v } from 'convex/values';

export const circlesTable = defineTable({
  slug: v.string(),
  name: v.string(),
  destinationLabel: v.string(),
  heroLabel: v.string(),
  status: v.union(v.literal('active'), v.literal('planning')),
  visibility: v.optional(v.union(v.literal('private'), v.literal('open'))),
  createdBySlug: v.string(),
  tripId: v.optional(v.id('trips')),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index('by_slug', ['slug'])
  .index('by_createdBySlug_and_status', ['createdBySlug', 'status']);
