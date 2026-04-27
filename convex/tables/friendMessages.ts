import { defineTable } from 'convex/server';
import { v } from 'convex/values';

export const friendMessagesTable = defineTable({
  circleId: v.id('friendCircles'),
  senderSlug: v.string(),
  kind: v.union(v.literal('text'), v.literal('route'), v.literal('system')),
  body: v.optional(v.string()),
  routeTitle: v.optional(v.string()),
  routeSummary: v.optional(v.string()),
  routeDistanceLabel: v.optional(v.string()),
  routeStopCount: v.optional(v.number()),
  routeStopsPreview: v.optional(v.array(v.string())),
  createdAt: v.number(),
}).index('by_circleId_and_createdAt', ['circleId', 'createdAt']);
