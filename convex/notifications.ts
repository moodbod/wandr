import { v } from 'convex/values';

import { internal } from './_generated/api';
import type { Doc } from './_generated/dataModel';
import { internalAction, internalQuery, mutation, query } from './_generated/server';

function getRequestActionStatus(notification: Doc<'appNotifications'>) {
  if (notification.actionStatus === 'approved' || notification.actionStatus === 'declined') {
    return notification.actionStatus;
  }

  if (notification.kind === 'trip_join_request') {
    return 'pending';
  }

  if (
    notification.kind === 'friend_invite' &&
    notification.actorSlug &&
    (notification.actionStatus === 'pending' ||
      notification.href === '/notifications' ||
      notification.entityId === notification.actorSlug)
  ) {
    return 'pending';
  }

  return notification.actionStatus;
}

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

    return await Promise.all(
      notifications.map(async (notification) => {
        const actorSlug = notification.actorSlug;
        const [actorUser, actorProfile] = actorSlug
          ? await Promise.all([
              ctx.db
                .query('appUsers')
                .withIndex('by_slug', (q) => q.eq('slug', actorSlug))
                .unique(),
              ctx.db
                .query('travelerProfiles')
                .withIndex('by_slug', (q) => q.eq('travelerSlug', actorSlug))
                .unique(),
            ])
          : [null, null];

        return {
          ...notification,
          actionStatus: getRequestActionStatus(notification),
          actorName: actorUser?.name ?? null,
          actorAvatarUri: actorProfile?.avatarUri ?? null,
          actorBaseLabel: actorProfile?.regionName ?? actorUser?.countryLabel ?? null,
          isViewed: Boolean(notification.viewedAt),
          isRead: Boolean(notification.readAt),
        };
      })
    );
  },
});

export const markNotificationsViewed = mutation({
  args: {
    travelerSlug: v.string(),
    notificationIds: v.optional(v.array(v.id('appNotifications'))),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    if (args.notificationIds && args.notificationIds.length > 0) {
      for (const notificationId of args.notificationIds) {
        const notification = await ctx.db.get(notificationId);
        if (!notification || notification.recipientSlug !== args.travelerSlug || notification.viewedAt) {
          continue;
        }

        await ctx.db.patch(notificationId, { viewedAt: now });
      }

      return true;
    }

    const unviewed = await ctx.db
      .query('appNotifications')
      .withIndex('by_recipientSlug_and_viewedAt', (q) => q.eq('recipientSlug', args.travelerSlug))
      .collect();

    for (const notification of unviewed) {
      if (notification.viewedAt) {
        continue;
      }
      await ctx.db.patch(notification._id, { viewedAt: now });
    }

    return true;
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

        await ctx.db.patch(notificationId, { readAt: now, viewedAt: notification.viewedAt ?? now });
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
      await ctx.db.patch(notification._id, { readAt: now, viewedAt: notification.viewedAt ?? now });
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

export const registerDevicePushToken = mutation({
  args: {
    travelerSlug: v.string(),
    installationId: v.string(),
    expoPushToken: v.string(),
    platform: v.union(v.literal('ios'), v.literal('android')),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existingForInstallation = await ctx.db
      .query('devicePushTokens')
      .withIndex('by_installationId', (q) => q.eq('installationId', args.installationId))
      .unique();

    if (existingForInstallation) {
      await ctx.db.patch(existingForInstallation._id, {
        travelerSlug: args.travelerSlug,
        expoPushToken: args.expoPushToken,
        platform: args.platform,
        updatedAt: now,
      });
      return true;
    }

    const existingForToken = await ctx.db
      .query('devicePushTokens')
      .withIndex('by_expoPushToken', (q) => q.eq('expoPushToken', args.expoPushToken))
      .unique();

    if (existingForToken) {
      await ctx.db.patch(existingForToken._id, {
        travelerSlug: args.travelerSlug,
        installationId: args.installationId,
        platform: args.platform,
        updatedAt: now,
      });
      return true;
    }

    await ctx.db.insert('devicePushTokens', {
      travelerSlug: args.travelerSlug,
      installationId: args.installationId,
      expoPushToken: args.expoPushToken,
      platform: args.platform,
      createdAt: now,
      updatedAt: now,
    });

    return true;
  },
});

export const listDevicePushTokensForTraveler = internalQuery({
  args: {
    travelerSlug: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('devicePushTokens')
      .withIndex('by_travelerSlug', (q) => q.eq('travelerSlug', args.travelerSlug))
      .collect();
  },
});

export const sendIncomingCallPush = internalAction({
  args: {
    recipientSlug: v.string(),
    callerName: v.string(),
    circleName: v.string(),
    callId: v.string(),
    mode: v.union(v.literal('voice'), v.literal('video')),
  },
  handler: async (ctx, args): Promise<{ sent: number }> => {
    const tokens: Doc<'devicePushTokens'>[] = await ctx.runQuery(internal.notifications.listDevicePushTokensForTraveler, {
      travelerSlug: args.recipientSlug,
    });
    if (tokens.length === 0) {
      return { sent: 0 };
    }

    const messages: Array<Record<string, unknown>> = tokens.map((token) => ({
      to: token.expoPushToken,
      title: `${args.callerName} is calling`,
      body: `${args.circleName} ${args.mode === 'video' ? 'video call' : 'voice call'}`,
      sound: args.mode === 'video' ? 'video_call_ring.wav' : 'voice_call_ring.wav',
      priority: 'high',
      channelId: args.mode === 'video' ? 'friend-video-calls' : 'friend-voice-calls',
      categoryId: 'friendCall',
      data: {
        kind: 'friend_call_ring',
        callId: args.callId,
        mode: args.mode,
      },
    }));

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    if (!response.ok) {
      const body = await response.text();
      console.warn('Incoming call push failed', response.status, body);
      return { sent: 0 };
    }

    return { sent: messages.length };
  },
});
