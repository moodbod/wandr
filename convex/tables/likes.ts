import { defineTable } from 'convex/server';
import { v } from 'convex/values';

export const likesTable = defineTable({
  travelerSlug: v.string(),
  locationKind: v.union(v.literal('location'), v.literal('experience'), v.literal('hiddenGem')),
  locationSlug: v.string(),
  likedAt: v.number(),
})
  .index('by_travelerSlug', ['travelerSlug'])
  .index('by_travelerSlug_and_locationKind_and_locationSlug', [
    'travelerSlug',
    'locationKind',
    'locationSlug',
  ]);
