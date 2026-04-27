import { v } from 'convex/values';

import { mutation, query } from './_generated/server';

export const listNotifications = query({
  args: {
    travelerSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const notifications = await ctx.db
      .query('appNotifications')
      .withIndex('by_recipientSlug_and_createdAt', (q) => q.eq('recipientSlug', args.travelerSlug))
      .order('desc')
      .take(100);

    return notifications.map((notification) => ({
      ...notification,
      isRead: Boolean(notification.readAt),
    }));
  },
});

export const markNotificationsRead = mutation({
  args: {
    travelerSlug: v.string(),
    notificationIds: v.optional(v.array(v.id('appNotifications'))),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    if (args.notificationIds && args.notificationIds.length > 0) {
      for (const notificationId of args.notificationIds) {
        const notification = await ctx.db.get(notificationId);
        if (!notification || notification.recipientSlug !== args.travelerSlug || notification.readAt) {
          continue;
        }

        await ctx.db.patch(notificationId, { readAt: now });
      }

      return true;
    }

    const unread = await ctx.db
      .query('appNotifications')
      .withIndex('by_recipientSlug_and_readAt', (q) => q.eq('recipientSlug', args.travelerSlug))
      .collect();

    for (const notification of unread) {
      if (notification.readAt) {
        continue;
      }
      await ctx.db.patch(notification._id, { readAt: now });
    }

    return true;
  },
});

export const createTripNotification = mutation({
  args: {
    recipientSlug: v.string(),
    kind: v.union(v.literal('trip_arrival'), v.literal('trip_rating')),
    title: v.string(),
    body: v.string(),
    href: v.optional(v.string()),
    entityId: v.optional(v.string()),
    entityLabel: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert('appNotifications', {
      recipientSlug: args.recipientSlug,
      kind: args.kind,
      title: args.title,
      body: args.body,
      href: args.href,
      entityId: args.entityId,
      entityLabel: args.entityLabel,
      createdAt: Date.now(),
    });

    return true;
  },
});
