import { defineTable } from 'convex/server';
import { v } from 'convex/values';

export const friendDirectMessagesTable = defineTable({
  threadId: v.id('friendDirectThreads'),
  senderSlug: v.string(),
  body: v.string(),
  createdAt: v.number(),
}).index('by_threadId_and_createdAt', ['threadId', 'createdAt']);
