import { defineTable } from 'convex/server';
import { v } from 'convex/values';

export const sharedLocationsTable = defineTable({
  travelerSlug: v.string(),
  coordinate: v.array(v.number()),
  accuracy: v.optional(v.number()),
  updatedAt: v.number(),
  expiresAt: v.number(),
})
  .index('by_travelerSlug', ['travelerSlug'])
  .index('by_expiresAt', ['expiresAt']);
