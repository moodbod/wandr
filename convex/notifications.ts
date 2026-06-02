import { v } from 'convex/values';

import { internal } from './_generated/api';
import type { Doc } from './_generated/dataModel';
import { internalAction, internalQuery, mutation, query } from './_generated/server';
import { getPublicTravelerProfile } from './appProfiles';
import { assertCurrentTravelerSlug } from './authHelpers';

function getRequestActionStatus(notification: Doc<'notices'>) {
  if (notification.actionStatus === 'approved' || notification.actionStatus === 'declined') {
    return notification.actionStatus;
  }

  if (notification.kind === 'trip_invite' || notification.kind === 'trip_join_request') {
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
    const travelerSlug = await assertCurrentTravelerSlug(ctx, args.travelerSlug);
    const notifications = await ctx.db
      .query('notices')
      .withIndex('by_recipientSlug_and_createdAt', (q) => q.eq('recipientSlug', travelerSlug))
      .order('desc')
      .take(100);

    return await Promise.all(
      notifications.map(async (notification) => {
        const actorProfile = notification.actorSlug
          ? await getPublicTravelerProfile(ctx, notification.actorSlug)
          : null;

        return {
          ...notification,
          actionStatus: getRequestActionStatus(notification),
          actorName: actorProfile?.name ?? null,
          actorAvatarUri: actorProfile?.avatarUri ?? null,
          actorBaseLabel: actorProfile?.baseLabel ?? null,
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
    notificationIds: v.optional(v.array(v.id('notices'))),
  },
  handler: async (ctx, args) => {
    const travelerSlug = await assertCurrentTravelerSlug(ctx, args.travelerSlug);
    const now = Date.now();

    if (args.notificationIds && args.notificationIds.length > 0) {
      for (const notificationId of args.notificationIds) {
        const notification = await ctx.db.get(notificationId);
        if (!notification || notification.recipientSlug !== travelerSlug || notification.viewedAt) {
          continue;
        }

        await ctx.db.patch(notificationId, { viewedAt: now });
      }

      return true;
    }

    const unviewed = await ctx.db
      .query('notices')
      .withIndex('by_recipientSlug_and_viewedAt', (q) => q.eq('recipientSlug', travelerSlug))
      .take(100);

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
    notificationIds: v.optional(v.array(v.id('notices'))),
  },
  handler: async (ctx, args) => {
    const travelerSlug = await assertCurrentTravelerSlug(ctx, args.travelerSlug);
    const now = Date.now();

    if (args.notificationIds && args.notificationIds.length > 0) {
      for (const notificationId of args.notificationIds) {
        const notification = await ctx.db.get(notificationId);
        if (!notification || notification.recipientSlug !== travelerSlug || notification.readAt) {
          continue;
        }

        await ctx.db.patch(notificationId, { readAt: now, viewedAt: notification.viewedAt ?? now });
      }

      return true;
    }

    const unread = await ctx.db
      .query('notices')
      .withIndex('by_recipientSlug_and_readAt', (q) => q.eq('recipientSlug', travelerSlug))
      .take(100);

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
    const recipientSlug = await assertCurrentTravelerSlug(ctx, args.recipientSlug);
    await ctx.db.insert('notices', {
      recipientSlug,
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
    const travelerSlug = await assertCurrentTravelerSlug(ctx, args.travelerSlug);
    const now = Date.now();
    const existingForInstallation = await ctx.db
      .query('tokens')
      .withIndex('by_installationId', (q) => q.eq('installationId', args.installationId))
      .unique();

    if (existingForInstallation) {
      await ctx.db.patch(existingForInstallation._id, {
        travelerSlug,
        expoPushToken: args.expoPushToken,
        platform: args.platform,
        updatedAt: now,
      });
      return true;
    }

    const existingForToken = await ctx.db
      .query('tokens')
      .withIndex('by_expoPushToken', (q) => q.eq('expoPushToken', args.expoPushToken))
      .unique();

    if (existingForToken) {
      await ctx.db.patch(existingForToken._id, {
        travelerSlug,
        installationId: args.installationId,
        platform: args.platform,
        updatedAt: now,
      });
      return true;
    }

    await ctx.db.insert('tokens', {
      travelerSlug,
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
      .query('tokens')
      .withIndex('by_travelerSlug', (q) => q.eq('travelerSlug', args.travelerSlug))
      .take(20);
  },
});

export const listChatPushTokensForTraveler = internalQuery({
  args: {
    travelerSlug: v.string(),
  },
  handler: async (ctx, args) => {
    // Respect the recipient's "Messages" notification toggle (defaults on when unset).
    const user = await ctx.db
      .query('users')
      .withIndex('by_slug', (q) => q.eq('slug', args.travelerSlug))
      .unique();

    if (user?.messagesEnabled === false) {
      return [];
    }

    return await ctx.db
      .query('tokens')
      .withIndex('by_travelerSlug', (q) => q.eq('travelerSlug', args.travelerSlug))
      .take(20);
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
    const tokens: Doc<'tokens'>[] = await ctx.runQuery(internal.notifications.listDevicePushTokensForTraveler, {
      travelerSlug: args.recipientSlug,
    });
    if (tokens.length === 0) {
      return { sent: 0 };
    }

    const messages: Record<string, unknown>[] = tokens.map((token) => ({
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

export const sendChatPush = internalAction({
  args: {
    recipientSlugs: v.array(v.string()),
    senderName: v.string(),
    title: v.string(),
    body: v.string(),
    href: v.string(),
    threadKind: v.union(v.literal('group'), v.literal('direct')),
    entityId: v.string(),
  },
  handler: async (ctx, args): Promise<{ sent: number }> => {
    const recipientSlugs = [...new Set(args.recipientSlugs)];
    const tokenGroups = await Promise.all(
      recipientSlugs.map((travelerSlug) =>
        ctx.runQuery(internal.notifications.listChatPushTokensForTraveler, { travelerSlug })
      )
    );
    const tokens: Doc<'tokens'>[] = tokenGroups.flat();
    if (tokens.length === 0) {
      return { sent: 0 };
    }

    const messages: Record<string, unknown>[] = tokens.map((token) => ({
      to: token.expoPushToken,
      title: args.title,
      body: args.body,
      sound: 'default',
      priority: 'high',
      channelId: 'friend-chat-messages',
      data: {
        kind: 'friend_chat_message',
        senderName: args.senderName,
        threadKind: args.threadKind,
        entityId: args.entityId,
        href: args.href,
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
      console.warn('Chat push failed', response.status, body);
      return { sent: 0 };
    }

    return { sent: messages.length };
  },
});
