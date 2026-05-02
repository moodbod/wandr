import { defineTable } from 'convex/server';
import { v } from 'convex/values';

export const friendCallsTable = defineTable({
  circleId: v.id('friendCircles'),
  roomName: v.string(),
  createdBySlug: v.string(),
  mode: v.union(v.literal('voice'), v.literal('video')),
  status: v.union(v.literal('active'), v.literal('scheduled'), v.literal('ended'), v.literal('cancelled')),
  title: v.optional(v.string()),
  description: v.optional(v.string()),
  scheduledFor: v.optional(v.number()),
  endsAt: v.optional(v.number()),
  reminderMinutesBefore: v.optional(v.number()),
  startedAt: v.optional(v.number()),
  endedAt: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index('by_circleId_and_createdAt', ['circleId', 'createdAt'])
  .index('by_roomName', ['roomName'])
  .index('by_status_and_scheduledFor', ['status', 'scheduledFor']);
