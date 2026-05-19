import { defineTable } from 'convex/server';
import { v } from 'convex/values';

export const messagesTable = defineTable({
  circleId: v.id('circles'),
  senderSlug: v.string(),
  kind: v.union(
    v.literal('text'),
    v.literal('route'),
    v.literal('system'),
    v.literal('call'),
    v.literal('scheduled_call')
  ),
  body: v.optional(v.string()),
  replyToMessageId: v.optional(v.id('messages')),
  replyToSenderName: v.optional(v.string()),
  replyToPreview: v.optional(v.string()),
  replyToKind: v.optional(v.string()),
  routeTitle: v.optional(v.string()),
  routeSummary: v.optional(v.string()),
  routeDistanceLabel: v.optional(v.string()),
  routeStopCount: v.optional(v.number()),
  routeStopsPreview: v.optional(v.array(v.string())),
  callId: v.optional(v.id('calls')),
  callMode: v.optional(v.union(v.literal('voice'), v.literal('video'))),
  callStatus: v.optional(v.union(v.literal('active'), v.literal('scheduled'), v.literal('ended'), v.literal('cancelled'))),
  callScheduledFor: v.optional(v.number()),
  callEndsAt: v.optional(v.number()),
  callReminderMinutesBefore: v.optional(v.number()),
  callTitle: v.optional(v.string()),
  callDescription: v.optional(v.string()),
  createdAt: v.number(),
}).index('by_circleId_and_createdAt', ['circleId', 'createdAt']);
