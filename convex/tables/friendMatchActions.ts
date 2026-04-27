import { defineTable } from 'convex/server';
import { v } from 'convex/values';

export const friendMatchActionsTable = defineTable({
  travelerSlug: v.string(),
  candidateSlug: v.string(),
  state: v.union(v.literal('invited'), v.literal('passed')),
  updatedAt: v.number(),
})
  .index('by_travelerSlug_and_candidateSlug', ['travelerSlug', 'candidateSlug'])
  .index('by_travelerSlug_and_state', ['travelerSlug', 'state']);
