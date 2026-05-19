import { defineTable } from 'convex/server';
import { v } from 'convex/values';

export const noticesTable = defineTable({
  recipientSlug: v.string(),
  actorSlug: v.optional(v.string()),
  kind: v.union(
    v.literal('friend_invite'),
    v.literal('friend_added'),
    v.literal('trip_invite'),
    v.literal('trip_join_request'),
    v.literal('trip_arrival'),
    v.literal('trip_rating'),
    v.literal('friend_call'),
    v.literal('friend_call_reminder')
  ),
  title: v.string(),
  body: v.string(),
  href: v.optional(v.string()),
  entityId: v.optional(v.string()),
  entityLabel: v.optional(v.string()),
  actionStatus: v.optional(v.union(v.literal('pending'), v.literal('approved'), v.literal('declined'))),
  createdAt: v.number(),
  viewedAt: v.optional(v.number()),
  readAt: v.optional(v.number()),
})
  .index('by_recipientSlug_and_createdAt', ['recipientSlug', 'createdAt'])
  .index('by_recipientSlug_and_viewedAt', ['recipientSlug', 'viewedAt'])
  .index('by_recipientSlug_and_readAt', ['recipientSlug', 'readAt']);
