import { defineTable } from 'convex/server';
import { v } from 'convex/values';

export const supportThreadsTable = defineTable({
  travelerSlug: v.string(),
  status: v.union(v.literal('open'), v.literal('closed')),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index('by_travelerSlug', ['travelerSlug'])
  .index('by_updatedAt', ['updatedAt']);

export const supportMessagesTable = defineTable({
  threadId: v.id('supportThreads'),
  senderSlug: v.string(),
  senderRole: v.union(v.literal('traveler'), v.literal('admin')),
  body: v.string(),
  replyToMessageId: v.optional(v.id('supportMessages')),
  replyToSenderName: v.optional(v.string()),
  replyToPreview: v.optional(v.string()),
  createdAt: v.number(),
}).index('by_threadId_and_createdAt', ['threadId', 'createdAt']);

export const supportReadsTable = defineTable({
  threadId: v.id('supportThreads'),
  readerSlug: v.string(),
  lastReadAt: v.number(),
})
  .index('by_threadId', ['threadId'])
  .index('by_threadId_and_readerSlug', ['threadId', 'readerSlug'])
  .index('by_readerSlug', ['readerSlug']);
