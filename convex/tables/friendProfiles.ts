import { defineTable } from 'convex/server';
import { v } from 'convex/values';

export const friendProfilesTable = defineTable({
  travelerSlug: v.string(),
  headline: v.string(),
  bio: v.string(),
  baseLabel: v.string(),
  destinationLabel: v.string(),
  travelPace: v.union(v.literal('slow'), v.literal('balanced'), v.literal('fast')),
  vibe: v.union(
    v.literal('adventure'),
    v.literal('culture'),
    v.literal('social'),
    v.literal('relaxation'),
    v.literal('food')
  ),
  arrivalWindowLabel: v.string(),
  interests: v.array(v.string()),
}).index('by_travelerSlug', ['travelerSlug']);
