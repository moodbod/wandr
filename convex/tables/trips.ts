import { defineTable } from 'convex/server';
import { v } from 'convex/values';

export const tripsTable = defineTable({
  name: v.string(),
  travelerSlug: v.string(),
  visibility: v.optional(v.union(v.literal('private'), v.literal('public'))),
  circleId: v.optional(v.id('circles')),
  groupRole: v.optional(v.union(v.literal('host'), v.literal('member'))),
  sourceTripId: v.optional(v.id('trips')),
  createdAt: v.number(),
  status: v.union(v.literal('active'), v.literal('completed'), v.literal('archived')),
})
  .index('by_travelerSlug', ['travelerSlug'])
  .index('by_travelerSlug_and_circleId', ['travelerSlug', 'circleId'])
  .index('by_circleId', ['circleId']);
