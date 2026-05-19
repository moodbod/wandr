import { defineTable } from 'convex/server';
import { v } from 'convex/values';

export const invitesTable = defineTable({
  tripId: v.id('trips'),
  circleId: v.optional(v.id('circles')),
  inviterSlug: v.string(),
  inviteeSlug: v.string(),
  createdAt: v.number(),
  status: v.union(v.literal('invited'), v.literal('accepted')),
})
  .index('by_tripId', ['tripId'])
  .index('by_inviteeSlug_and_createdAt', ['inviteeSlug', 'createdAt'])
  .index('by_tripId_and_inviteeSlug', ['tripId', 'inviteeSlug']);
