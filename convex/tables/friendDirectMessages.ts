import { defineTable } from 'convex/server';
import { v } from 'convex/values';

export const friendDirectMessagesTable = defineTable({
  threadId: v.id('friendDirectThreads'),
  senderSlug: v.string(),
  kind: v.optional(v.union(v.literal('text'), v.literal('call'), v.literal('scheduled_call'))),
  body: v.string(),
  callId: v.optional(v.id('friendCalls')),
  callMode: v.optional(v.union(v.literal('voice'), v.literal('video'))),
  callStatus: v.optional(v.union(v.literal('active'), v.literal('scheduled'), v.literal('ended'), v.literal('cancelled'))),
  callScheduledFor: v.optional(v.number()),
  callEndsAt: v.optional(v.number()),
  callReminderMinutesBefore: v.optional(v.number()),
  callTitle: v.optional(v.string()),
  callDescription: v.optional(v.string()),
  createdAt: v.number(),
}).index('by_threadId_and_createdAt', ['threadId', 'createdAt']);
