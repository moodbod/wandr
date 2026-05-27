import { ConvexError, v } from 'convex/values';

import type { Doc, Id } from './_generated/dataModel';
import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server';
import { getAuthUserRole, getPublicTravelerProfile, type AuthUserProfile } from './appProfiles';
import { assertCurrentTravelerSlug } from './authHelpers';

type SupportCtx = QueryCtx | MutationCtx;
type SupportThreadDoc = Doc<'supportThreads'>;
type SupportMessageDoc = Doc<'supportMessages'>;

async function getAppUser(ctx: SupportCtx, travelerSlug: string) {
  return await ctx.db
    .query('users')
    .withIndex('by_slug', (q) => q.eq('slug', travelerSlug))
    .unique();
}

async function getCurrentUser(ctx: SupportCtx, travelerSlug: string) {
  const user = await getAppUser(ctx, travelerSlug);
  if (!user) {
    throw new ConvexError('Traveler profile not found');
  }

  return user as AuthUserProfile;
}

function isAdminUser(user: AuthUserProfile | null | undefined) {
  return getAuthUserRole(user) === 'admin';
}

async function getSupportThreadForTraveler(ctx: SupportCtx, travelerSlug: string) {
  return await ctx.db
    .query('supportThreads')
    .withIndex('by_travelerSlug', (q) => q.eq('travelerSlug', travelerSlug))
    .unique();
}

async function getOrCreateSupportThread(ctx: MutationCtx, travelerSlug: string) {
  const existing = await getSupportThreadForTraveler(ctx, travelerSlug);
  if (existing) {
    return existing;
  }

  const now = Date.now();
  const threadId = await ctx.db.insert('supportThreads', {
    travelerSlug,
    status: 'open',
    createdAt: now,
    updatedAt: now,
  });

  return await ctx.db.get(threadId);
}

async function getLatestSupportMessage(ctx: SupportCtx, threadId: Id<'supportThreads'>) {
  const latestMessages = await ctx.db
    .query('supportMessages')
    .withIndex('by_threadId_and_createdAt', (q) => q.eq('threadId', threadId))
    .order('desc')
    .take(1);

  return latestMessages[0] ?? null;
}

async function getLatestSupportMessages(ctx: QueryCtx, threadId: Id<'supportThreads'>, limit: number) {
  const messages = await ctx.db
    .query('supportMessages')
    .withIndex('by_threadId_and_createdAt', (q) => q.eq('threadId', threadId))
    .order('desc')
    .take(limit);

  return messages.reverse();
}

function getMessageReplyPreview(message: Pick<SupportMessageDoc, 'body'>) {
  return message.body.slice(0, 140);
}

async function getSupportReplySnapshot(
  ctx: MutationCtx,
  threadId: Id<'supportThreads'>,
  replyToMessageId?: Id<'supportMessages'>
) {
  if (!replyToMessageId) {
    return null;
  }

  const replyMessage = await ctx.db.get(replyToMessageId);
  if (!replyMessage || replyMessage.threadId !== threadId) {
    return null;
  }

  const sender = await getAppUser(ctx, replyMessage.senderSlug);
  return {
    replyToMessageId,
    replyToSenderName:
      replyMessage.senderRole === 'admin'
        ? sender?.name ?? 'Wandr Support'
        : sender?.name ?? replyMessage.senderSlug,
    replyToPreview: getMessageReplyPreview(replyMessage),
  };
}

async function canAccessSupportThread(
  ctx: SupportCtx,
  thread: SupportThreadDoc | null,
  travelerSlug: string,
  isAdmin: boolean
) {
  if (!thread) {
    return false;
  }

  if (isAdmin) {
    return true;
  }

  return thread.travelerSlug === travelerSlug;
}

async function buildTravelerView(ctx: SupportCtx, travelerSlug: string) {
  const [user, profile] = await Promise.all([
    getAppUser(ctx, travelerSlug),
    getPublicTravelerProfile(ctx, travelerSlug),
  ]);

  return {
    slug: travelerSlug,
    name: user?.name ?? travelerSlug,
    avatarUri: profile?.avatarUri ?? null,
    baseLabel: profile?.regionName ?? user?.countryLabel ?? '',
  };
}

async function buildSupportMessageView(ctx: SupportCtx, message: SupportMessageDoc, viewerSlug: string) {
  const [sender, senderProfile] = await Promise.all([
    getAppUser(ctx, message.senderSlug),
    getPublicTravelerProfile(ctx, message.senderSlug),
  ]);

  return {
    _id: message._id,
    kind: 'text' as const,
    body: message.body,
    createdAt: message.createdAt,
    senderSlug: message.senderSlug,
    senderRole: message.senderRole,
    senderName:
      message.senderRole === 'admin'
        ? sender?.name ?? 'Wandr Support'
        : sender?.name ?? message.senderSlug,
    senderAvatarUri: senderProfile?.avatarUri ?? null,
    isOwnMessage: message.senderSlug === viewerSlug,
    replyTo:
      message.replyToMessageId && message.replyToSenderName && message.replyToPreview
        ? {
            messageId: message.replyToMessageId,
            senderName: message.replyToSenderName,
            preview: message.replyToPreview,
            kind: 'text',
          }
        : null,
  };
}

async function buildSupportRow(ctx: SupportCtx, thread: SupportThreadDoc) {
  const [traveler, latestMessage] = await Promise.all([
    buildTravelerView(ctx, thread.travelerSlug),
    getLatestSupportMessage(ctx, thread._id),
  ]);

  return {
    id: thread._id,
    threadId: thread._id,
    kind: 'support' as const,
    title: traveler.name,
    subtitle: traveler.baseLabel ? `Support - ${traveler.baseLabel}` : 'Support',
    preview: latestMessage?.body ?? 'No messages yet',
    updatedAt: latestMessage?.createdAt ?? thread.updatedAt,
    travelerSlug: traveler.slug,
    avatarUri: traveler.avatarUri,
    href: `/friends/support/${thread._id}`,
  };
}

export const getSupportChatList = query({
  args: {
    travelerSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const travelerSlug = await assertCurrentTravelerSlug(ctx, args.travelerSlug);
    const currentUser = await getCurrentUser(ctx, travelerSlug);
    const isAdmin = isAdminUser(currentUser);
    const ownThread = await getSupportThreadForTraveler(ctx, travelerSlug);
    const latestOwnMessage = ownThread ? await getLatestSupportMessage(ctx, ownThread._id) : null;

    const ownSupportThread = {
      id: ownThread?._id ?? 'support-new',
      threadId: ownThread?._id ?? null,
      kind: 'support' as const,
      title: 'Wandr Support',
      subtitle: 'Support',
      preview: latestOwnMessage?.body ?? 'Message support',
      updatedAt: latestOwnMessage?.createdAt ?? ownThread?.updatedAt ?? 0,
      avatarUri: null,
      href: ownThread ? `/friends/support/${ownThread._id}` : '/friends/support',
    };

    if (!isAdmin) {
      return {
        isAdmin,
        ownThread: ownSupportThread,
        adminThreads: [],
      };
    }

    const supportThreads = await ctx.db.query('supportThreads').withIndex('by_updatedAt').order('desc').take(100);
    const adminThreads = await Promise.all(supportThreads.map((thread) => buildSupportRow(ctx, thread)));

    return {
      isAdmin,
      ownThread: ownSupportThread,
      adminThreads,
    };
  },
});

export const getSupportChat = query({
  args: {
    travelerSlug: v.string(),
    threadId: v.optional(v.id('supportThreads')),
  },
  handler: async (ctx, args) => {
    const travelerSlug = await assertCurrentTravelerSlug(ctx, args.travelerSlug);
    const currentUser = await getCurrentUser(ctx, travelerSlug);
    const isAdmin = isAdminUser(currentUser);
    const thread = args.threadId
      ? await ctx.db.get(args.threadId)
      : await getSupportThreadForTraveler(ctx, travelerSlug);

    if (thread && !(await canAccessSupportThread(ctx, thread, travelerSlug, isAdmin))) {
      return null;
    }

    const supportTravelerSlug = thread?.travelerSlug ?? travelerSlug;
    const traveler = await buildTravelerView(ctx, supportTravelerSlug);
    const messages = thread ? await getLatestSupportMessages(ctx, thread._id, 100) : [];
    const messageViews = await Promise.all(messages.map((message) => buildSupportMessageView(ctx, message, travelerSlug)));
    const title = isAdmin && thread ? traveler.name : 'Wandr Support';

    return {
      threadId: thread?._id ?? null,
      status: thread?.status ?? 'open',
      title,
      subtitle: isAdmin && thread ? 'Support inbox' : 'Support',
      traveler,
      isAdmin,
      messages: messageViews,
      composer: {
        placeholder: 'Message support',
      },
    };
  },
});

export const sendSupportMessage = mutation({
  args: {
    travelerSlug: v.string(),
    body: v.string(),
    threadId: v.optional(v.id('supportThreads')),
    replyToMessageId: v.optional(v.id('supportMessages')),
  },
  handler: async (ctx, args) => {
    const travelerSlug = await assertCurrentTravelerSlug(ctx, args.travelerSlug);
    const currentUser = await getCurrentUser(ctx, travelerSlug);
    const isAdmin = isAdminUser(currentUser);
    const trimmedBody = args.body.trim();

    if (!trimmedBody) {
      return null;
    }

    const thread = args.threadId
      ? await ctx.db.get(args.threadId)
      : await getOrCreateSupportThread(ctx, travelerSlug);

    if (!thread || !(await canAccessSupportThread(ctx, thread, travelerSlug, isAdmin))) {
      return null;
    }

    const now = Date.now();
    const replySnapshot = await getSupportReplySnapshot(ctx, thread._id, args.replyToMessageId);
    const messageId = await ctx.db.insert('supportMessages', {
      threadId: thread._id,
      senderSlug: travelerSlug,
      senderRole: isAdmin ? 'admin' : 'traveler',
      body: trimmedBody,
      ...(replySnapshot ?? {}),
      createdAt: now,
    });

    await ctx.db.patch(thread._id, {
      status: 'open',
      updatedAt: now,
    });

    return {
      threadId: thread._id,
      messageId,
    };
  },
});

export const markSupportChatRead = mutation({
  args: {
    travelerSlug: v.string(),
    threadId: v.optional(v.id('supportThreads')),
  },
  handler: async (ctx, args) => {
    const travelerSlug = await assertCurrentTravelerSlug(ctx, args.travelerSlug);
    const currentUser = await getCurrentUser(ctx, travelerSlug);
    const isAdmin = isAdminUser(currentUser);
    const thread = args.threadId
      ? await ctx.db.get(args.threadId)
      : await getSupportThreadForTraveler(ctx, travelerSlug);

    if (!thread) {
      return true;
    }

    if (!(await canAccessSupportThread(ctx, thread, travelerSlug, isAdmin))) {
      return false;
    }

    const latestMessage = await getLatestSupportMessage(ctx, thread._id);
    const lastReadAt = Math.max(Date.now(), latestMessage?.createdAt ?? 0);
    const existing = await ctx.db
      .query('supportReads')
      .withIndex('by_threadId_and_readerSlug', (q) =>
        q.eq('threadId', thread._id).eq('readerSlug', travelerSlug)
      )
      .unique();

    if (existing) {
      if (existing.lastReadAt >= lastReadAt) {
        return true;
      }
      await ctx.db.patch(existing._id, { lastReadAt });
      return true;
    }

    await ctx.db.insert('supportReads', {
      threadId: thread._id,
      readerSlug: travelerSlug,
      lastReadAt,
    });

    return true;
  },
});
