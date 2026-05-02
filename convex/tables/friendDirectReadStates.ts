import { defineTable } from 'convex/server';
import { v } from 'convex/values';

export const friendDirectReadStatesTable = defineTable({
  threadId: v.id('friendDirectThreads'),
  travelerSlug: v.string(),
  lastReadAt: v.number(),
})
  .index('by_threadId', ['threadId'])
  .index('by_threadId_and_travelerSlug', ['threadId', 'travelerSlug'])
  .index('by_travelerSlug', ['travelerSlug']);
