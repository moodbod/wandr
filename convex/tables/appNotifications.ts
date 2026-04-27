import { defineTable } from 'convex/server';
import { v } from 'convex/values';

export const appNotificationsTable = defineTable({
  recipientSlug: v.string(),
  actorSlug: v.optional(v.string()),
  kind: v.union(
    v.literal('friend_invite'),
    v.literal('friend_added'),
    v.literal('trip_arrival'),
    v.literal('trip_rating')
  ),
  title: v.string(),
  body: v.string(),
  href: v.optional(v.string()),
  entityId: v.optional(v.string()),
  entityLabel: v.optional(v.string()),
  createdAt: v.number(),
  readAt: v.optional(v.number()),
})
  .index('by_recipientSlug_and_createdAt', ['recipientSlug', 'createdAt'])
  .index('by_recipientSlug_and_readAt', ['recipientSlug', 'readAt']);
