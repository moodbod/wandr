import { defineTable } from 'convex/server';
import { v } from 'convex/values';

export const friendCircleMembersTable = defineTable({
  circleId: v.id('friendCircles'),
  travelerSlug: v.string(),
  role: v.union(v.literal('host'), v.literal('member')),
  status: v.union(v.literal('active'), v.literal('invited')),
  joinedAt: v.number(),
  note: v.optional(v.string()),
})
  .index('by_circleId', ['circleId'])
  .index('by_circleId_and_travelerSlug', ['circleId', 'travelerSlug'])
  .index('by_travelerSlug_and_status', ['travelerSlug', 'status']);
