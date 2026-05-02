import { defineTable } from 'convex/server';
import { v } from 'convex/values';

export const friendCircleReadStatesTable = defineTable({
  circleId: v.id('friendCircles'),
  travelerSlug: v.string(),
  lastReadAt: v.number(),
})
  .index('by_circleId', ['circleId'])
  .index('by_circleId_and_travelerSlug', ['circleId', 'travelerSlug'])
  .index('by_travelerSlug', ['travelerSlug']);
