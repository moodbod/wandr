import { defineTable } from 'convex/server';
import { v } from 'convex/values';

export const friendConnectionsTable = defineTable({
  travelerSlug: v.string(),
  friendSlug: v.string(),
  createdAt: v.number(),
  source: v.union(v.literal('discovery'), v.literal('invite'), v.literal('manual')),
})
  .index('by_travelerSlug', ['travelerSlug'])
  .index('by_travelerSlug_and_friendSlug', ['travelerSlug', 'friendSlug']);
