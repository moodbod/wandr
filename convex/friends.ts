import { v } from 'convex/values';

import { internal } from './_generated/api';
import type { Doc, Id } from './_generated/dataModel';
import { internalMutation, internalQuery, mutation, query, type MutationCtx, type QueryCtx } from './_generated/server';
import { getPublicTravelerProfile, type PublicTravelerProfile } from './appProfiles';
import { assertCurrentTravelerSlug } from './authHelpers';

type FriendCircleDoc = Doc<'friendCircles'>;
type FriendMemberDoc = Doc<'friendCircleMembers'>;
type FriendDirectThreadDoc = Doc<'friendDirectThreads'>;
const INCOMING_CALL_WINDOW_MS = 90_000;

type PhoneContactMatch = {
  travelerSlug: string;
  name: string;
  avatarUri: string | null;
  baseLabel: string;
  phoneNumber: string;
  isFriend: boolean;
};

function isPendingFriendRequestNotification(
  notification: Doc<'appNotifications'>
): notification is Doc<'appNotifications'> & { actorSlug: string } {
  if (
    notification.kind !== 'friend_invite' ||
    !notification.actorSlug ||
    notification.actionStatus === 'approved' ||
    notification.actionStatus === 'declined'
  ) {
    return false;
  }

  return (
    notification.actionStatus === 'pending' ||
    notification.href === '/notifications' ||
    notification.entityId === notification.actorSlug
  );
}

function normalizeThreadPair(firstSlug: string, secondSlug: string) {
  return [firstSlug, secondSlug].sort((a, b) => a.localeCompare(b)) as [string, string];
}

function buildRegionFromCountry(countryCode: string, countryLabel: string) {
  if (countryCode === 'NA') {
    return { regionCode: 'KH', regionName: 'Khomas' };
  }
  if (countryCode === 'ZA') {
    return { regionCode: 'WC', regionName: 'Western Cape' };
  }
  return {
    regionCode: countryCode,
    regionName: countryLabel,
  };
}

async function resolveCurrentTravelerSlug(ctx: QueryCtx | MutationCtx, travelerSlug?: string) {
  if (travelerSlug) {
    return travelerSlug;
  }

  const trips = await ctx.db.query('trips').collect();
  const mostRecentTrip = [...trips].sort((a, b) => b.createdAt - a.createdAt)[0];
  if (mostRecentTrip?.travelerSlug) {
    return mostRecentTrip.travelerSlug;
  }

  const travelers = await ctx.db.query('users').collect();
  const sortedTravelers = [...travelers].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  return sortedTravelers[0]?.slug ?? null;
}

async function getAppUser(ctx: QueryCtx | MutationCtx, travelerSlug: string) {
  return await ctx.db
    .query('users')
    .withIndex('by_slug', (q) => q.eq('slug', travelerSlug))
    .unique();
}

async function getTravelerProfile(ctx: QueryCtx | MutationCtx, travelerSlug: string) {
  return await getPublicTravelerProfile(ctx, travelerSlug);
}

async function getFriendProfile(ctx: QueryCtx | MutationCtx, travelerSlug: string) {
  return await getPublicTravelerProfile(ctx, travelerSlug);
}

async function getActiveCircleMemberships(ctx: QueryCtx | MutationCtx, travelerSlug: string) {
  return await ctx.db
    .query('friendCircleMembers')
    .withIndex('by_travelerSlug_and_status', (q) => q.eq('travelerSlug', travelerSlug).eq('status', 'active'))
    .collect();
}

async function getActiveCircleForTraveler(
  ctx: QueryCtx | MutationCtx,
  travelerSlug: string
): Promise<FriendCircleDoc | null> {
  const memberships = await getActiveCircleMemberships(ctx, travelerSlug);
  const firstMembership = memberships.sort((a, b) => b.joinedAt - a.joinedAt)[0];

  if (!firstMembership) {
    return null;
  }

  return await ctx.db.get(firstMembership.circleId);
}

async function getActiveCirclesForTraveler(
  ctx: QueryCtx | MutationCtx,
  travelerSlug: string
): Promise<FriendCircleDoc[]> {
  const memberships = await getActiveCircleMemberships(ctx, travelerSlug);
  const circles = await Promise.all(
    memberships
      .sort((a, b) => b.joinedAt - a.joinedAt)
      .map((membership) => ctx.db.get(membership.circleId))
  );

  return circles.filter((circle): circle is FriendCircleDoc => circle !== null);
}

async function getCircleMembers(
  ctx: QueryCtx | MutationCtx,
  circleId: Id<'friendCircles'>
): Promise<FriendMemberDoc[]> {
  const members = await ctx.db
    .query('friendCircleMembers')
    .withIndex('by_circleId', (q) => q.eq('circleId', circleId))
    .collect();

  return members.sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === 'active' ? -1 : 1;
    }
    if (a.role !== b.role) {
      return a.role === 'host' ? -1 : 1;
    }
    return a.joinedAt - b.joinedAt;
  });
}

async function getActionMap(ctx: QueryCtx | MutationCtx, travelerSlug: string) {
  const actions = await ctx.db
    .query('friendMatchActions')
    .withIndex('by_travelerSlug_and_state', (q) => q.eq('travelerSlug', travelerSlug))
    .collect();

  return new Map(actions.map((action) => [action.candidateSlug, action]));
}

async function getFriendConnectionSet(ctx: QueryCtx | MutationCtx, travelerSlug: string) {
  const connections = await ctx.db
    .query('friendConnections')
    .withIndex('by_travelerSlug', (q) => q.eq('travelerSlug', travelerSlug))
    .collect();

  return new Set(connections.map((connection) => connection.friendSlug));
}

async function getFriendPickerItems(ctx: QueryCtx | MutationCtx, travelerSlug: string) {
  const connections = await ctx.db
    .query('friendConnections')
    .withIndex('by_travelerSlug', (q) => q.eq('travelerSlug', travelerSlug))
    .collect();

  const friends = await Promise.all(
    connections.map(async (connection) => {
      const [user, profile] = await Promise.all([
        getAppUser(ctx, connection.friendSlug),
        getTravelerProfile(ctx, connection.friendSlug),
      ]);

      if (!user) {
        return null;
      }

      return {
        travelerSlug: user.slug,
        name: user.name,
        avatarUri: profile?.avatarUri ?? null,
        baseLabel: profile?.regionName ?? user.countryLabel,
      };
    })
  );

  return friends
    .filter((friend): friend is NonNullable<typeof friend> => friend !== null)
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
}

async function getDirectThreadsForTraveler(ctx: QueryCtx | MutationCtx, travelerSlug: string) {
  const [asA, asB] = await Promise.all([
    ctx.db
      .query('friendDirectThreads')
      .withIndex('by_participantA_and_updatedAt', (q) => q.eq('participantA', travelerSlug))
      .collect(),
    ctx.db
      .query('friendDirectThreads')
      .withIndex('by_participantB_and_updatedAt', (q) => q.eq('participantB', travelerSlug))
      .collect(),
  ]);

  const seen = new Set<string>();
  const merged: FriendDirectThreadDoc[] = [];

  for (const thread of [...asA, ...asB]) {
    if (seen.has(thread._id)) {
      continue;
    }
    seen.add(thread._id);
    merged.push(thread);
  }

  return merged.sort((a, b) => b.updatedAt - a.updatedAt);
}

async function getOrCreateDirectThread(ctx: MutationCtx, travelerSlug: string, otherSlug: string) {
  const [participantA, participantB] = normalizeThreadPair(travelerSlug, otherSlug);
  const existing = await ctx.db
    .query('friendDirectThreads')
    .withIndex('by_participantA_and_participantB', (q) =>
      q.eq('participantA', participantA).eq('participantB', participantB)
    )
    .unique();

  if (existing) {
    return existing;
  }

  const now = Date.now();
  const threadId = await ctx.db.insert('friendDirectThreads', {
    participantA,
    participantB,
    createdAt: now,
    updatedAt: now,
  });

  return await ctx.db.get(threadId);
}

async function ensureFriendConnectionPair(
  ctx: MutationCtx,
  travelerSlug: string,
  friendSlug: string,
  source: 'discovery' | 'invite' | 'manual'
) {
  const now = Date.now();
  const [existingConnection, existingReverseConnection] = await Promise.all([
    ctx.db
      .query('friendConnections')
      .withIndex('by_travelerSlug_and_friendSlug', (q) =>
        q.eq('travelerSlug', travelerSlug).eq('friendSlug', friendSlug)
      )
      .unique(),
    ctx.db
      .query('friendConnections')
      .withIndex('by_travelerSlug_and_friendSlug', (q) =>
        q.eq('travelerSlug', friendSlug).eq('friendSlug', travelerSlug)
      )
      .unique(),
  ]);

  if (!existingConnection) {
    await ctx.db.insert('friendConnections', {
      travelerSlug,
      friendSlug,
      createdAt: now,
      source,
    });
  }

  if (!existingReverseConnection) {
    await ctx.db.insert('friendConnections', {
      travelerSlug: friendSlug,
      friendSlug: travelerSlug,
      createdAt: now,
      source,
    });
  }
}

async function deleteFriendCircleDocuments(ctx: MutationCtx, circleId: Id<'friendCircles'>) {
  const [messages, members, readStates, trips] = await Promise.all([
    ctx.db
      .query('friendMessages')
      .withIndex('by_circleId_and_createdAt', (q) => q.eq('circleId', circleId))
      .take(200),
    ctx.db
      .query('friendCircleMembers')
      .withIndex('by_circleId', (q) => q.eq('circleId', circleId))
      .take(100),
    ctx.db
      .query('friendCircleReadStates')
      .withIndex('by_circleId', (q) => q.eq('circleId', circleId))
      .take(100),
    ctx.db
      .query('trips')
      .withIndex('by_circleId', (q) => q.eq('circleId', circleId))
      .take(100),
  ]);

  for (const message of messages) {
    await ctx.db.delete(message._id);
  }
  for (const member of members) {
    await ctx.db.delete(member._id);
  }
  for (const readState of readStates) {
    await ctx.db.delete(readState._id);
  }
  for (const trip of trips) {
    await ctx.db.delete(trip._id);
  }

  await ctx.db.delete(circleId);
}

async function deleteDirectThreadDocuments(ctx: MutationCtx, threadId: Id<'friendDirectThreads'>) {
  const [messages, readStates] = await Promise.all([
    ctx.db
      .query('friendDirectMessages')
      .withIndex('by_threadId_and_createdAt', (q) => q.eq('threadId', threadId))
      .take(200),
    ctx.db
      .query('friendDirectReadStates')
      .withIndex('by_threadId', (q) => q.eq('threadId', threadId))
      .take(100),
  ]);

  for (const message of messages) {
    await ctx.db.delete(message._id);
  }
  for (const readState of readStates) {
    await ctx.db.delete(readState._id);
  }

  await ctx.db.delete(threadId);
}

async function insertAppNotification(
  ctx: MutationCtx,
  args: {
    recipientSlug: string;
    actorSlug?: string;
    kind:
      | 'friend_invite'
      | 'friend_added'
      | 'trip_join_request'
      | 'trip_arrival'
      | 'trip_rating'
      | 'friend_call'
      | 'friend_call_reminder';
    title: string;
    body: string;
    href?: string;
    entityId?: string;
    entityLabel?: string;
    actionStatus?: 'pending' | 'approved' | 'declined';
  }
) {
  await ctx.db.insert('appNotifications', {
    recipientSlug: args.recipientSlug,
    actorSlug: args.actorSlug,
    kind: args.kind,
    title: args.title,
    body: args.body,
    href: args.href,
    entityId: args.entityId,
    entityLabel: args.entityLabel,
    actionStatus: args.actionStatus,
    createdAt: Date.now(),
  });
}

function buildCallRoomName(scopeId: Id<'friendCircles'> | Id<'friendDirectThreads'>, createdAt: number) {
  return `wandr-${scopeId}-${createdAt}`;
}

function formatCallMode(mode: 'voice' | 'video') {
  return mode === 'voice' ? 'voice call' : 'video call';
}

async function requireActiveCircleMember(
  ctx: QueryCtx | MutationCtx,
  circleId: Id<'friendCircles'>,
  travelerSlug: string
) {
  const circle = await ctx.db.get(circleId);
  if (!circle) {
    return null;
  }

  const membership = await ctx.db
    .query('friendCircleMembers')
    .withIndex('by_circleId_and_travelerSlug', (q) => q.eq('circleId', circleId).eq('travelerSlug', travelerSlug))
    .unique();

  if (!membership || membership.status !== 'active') {
    return null;
  }

  return { circle, membership };
}

async function requireDirectThreadParticipant(
  ctx: QueryCtx | MutationCtx,
  threadId: Id<'friendDirectThreads'>,
  travelerSlug: string
) {
  const thread = await ctx.db.get(threadId);
  if (!thread || (thread.participantA !== travelerSlug && thread.participantB !== travelerSlug)) {
    return null;
  }

  const otherSlug = thread.participantA === travelerSlug ? thread.participantB : thread.participantA;
  return { thread, otherSlug };
}

async function buildDirectCallMemberViews(ctx: QueryCtx | MutationCtx, thread: FriendDirectThreadDoc) {
  const participantSlugs = [thread.participantA, thread.participantB];
  return await Promise.all(
    participantSlugs.map(async (travelerSlug, index) => {
      const [user, travelerProfile] = await Promise.all([
        getAppUser(ctx, travelerSlug),
        getTravelerProfile(ctx, travelerSlug),
      ]);

      return {
        travelerSlug,
        name: user?.name ?? travelerSlug,
        avatarUri: travelerProfile?.avatarUri ?? null,
        baseLabel: travelerProfile?.regionName ?? user?.countryLabel ?? '',
        status: 'active' as const,
        role: index === 0 ? ('host' as const) : ('member' as const),
      };
    })
  );
}

async function notifyCircleMembersAboutCall(
  ctx: MutationCtx,
  args: {
    circleId: Id<'friendCircles'>;
    actorSlug: string;
    callId: Id<'friendCalls'>;
    title: string;
    body: string;
    kind: 'friend_call' | 'friend_call_reminder';
    mode?: 'voice' | 'video';
  }
) {
  const members = await getCircleMembers(ctx, args.circleId);
  const actor = args.kind === 'friend_call' ? await getAppUser(ctx, args.actorSlug) : null;
  for (const member of members) {
    if (member.travelerSlug === args.actorSlug || member.status !== 'active') {
      continue;
    }

    await insertAppNotification(ctx, {
      recipientSlug: member.travelerSlug,
      actorSlug: args.actorSlug,
      kind: args.kind,
      title: args.title,
      body: args.body,
      href: `/friends/call/${args.callId}`,
      entityId: args.callId,
      entityLabel: args.title,
    });

    if (args.kind === 'friend_call' && args.mode) {
      await ctx.scheduler.runAfter(0, internal.notifications.sendIncomingCallPush, {
        recipientSlug: member.travelerSlug,
        callerName: actor?.name ?? args.actorSlug,
        circleName: args.title,
        callId: args.callId,
        mode: args.mode,
      });
    }
  }
}

async function notifyDirectParticipantAboutCall(
  ctx: MutationCtx,
  args: {
    thread: FriendDirectThreadDoc;
    actorSlug: string;
    callId: Id<'friendCalls'>;
    title: string;
    body: string;
    kind: 'friend_call' | 'friend_call_reminder';
    mode?: 'voice' | 'video';
  }
) {
  const recipientSlug = args.thread.participantA === args.actorSlug ? args.thread.participantB : args.thread.participantA;
  const actor = args.kind === 'friend_call' ? await getAppUser(ctx, args.actorSlug) : null;
  await insertAppNotification(ctx, {
    recipientSlug,
    actorSlug: args.actorSlug,
    kind: args.kind,
    title: args.title,
    body: args.body,
    href: `/friends/call/${args.callId}`,
    entityId: args.callId,
    entityLabel: args.title,
  });

  if (args.kind === 'friend_call' && args.mode) {
    await ctx.scheduler.runAfter(0, internal.notifications.sendIncomingCallPush, {
      recipientSlug,
      callerName: actor?.name ?? args.actorSlug,
      circleName: args.title,
      callId: args.callId,
      mode: args.mode,
    });
  }
}

function computeMatchScore(current: PublicTravelerProfile, candidate: PublicTravelerProfile) {
  const sharedInterests = candidate.interests.filter((interest) => current.interests.includes(interest));
  let score = 68 + sharedInterests.length * 8;

  if (current.destinationLabel === candidate.destinationLabel) {
    score += 10;
  }
  if (current.travelPace === candidate.travelPace) {
    score += 7;
  }
  if (current.vibe === candidate.vibe) {
    score += 6;
  }

  return {
    score: Math.min(98, score),
    sharedInterests,
  };
}

async function buildMemberView(
  ctx: QueryCtx | MutationCtx,
  membership: FriendMemberDoc
) {
  const [user, travelerProfile] = await Promise.all([
    getAppUser(ctx, membership.travelerSlug),
    getTravelerProfile(ctx, membership.travelerSlug),
  ]);

  return {
    travelerSlug: membership.travelerSlug,
    name: user?.name ?? membership.travelerSlug,
    avatarUri: travelerProfile?.avatarUri ?? null,
    baseLabel: travelerProfile?.regionName ?? user?.countryLabel ?? '',
    status: membership.status,
    role: membership.role,
  };
}

async function buildCircleSummary(
  ctx: QueryCtx | MutationCtx,
  circle: FriendCircleDoc
) {
  const [memberships, messages] = await Promise.all([
    getCircleMembers(ctx, circle._id),
    ctx.db
      .query('friendMessages')
      .withIndex('by_circleId_and_createdAt', (q) => q.eq('circleId', circle._id))
      .order('desc')
      .take(1),
  ]);

  const members = await Promise.all(memberships.map((membership) => buildMemberView(ctx, membership)));
  const activeMembers = members.filter((member) => member.status === 'active');
  const latestMessage = messages[0] ?? null;

  return {
    _id: circle._id,
    slug: circle.slug,
    name: circle.name,
    destinationLabel: circle.destinationLabel,
    heroLabel: circle.heroLabel,
    status: circle.status,
    memberCount: activeMembers.length,
    invitedCount: members.filter((member) => member.status === 'invited').length,
    members,
    avatarUris: activeMembers.map((member) => member.avatarUri).filter(Boolean) as string[],
    latestMessagePreview:
      latestMessage?.kind === 'route'
        ? latestMessage.routeTitle ?? 'Shared a route update'
        : latestMessage?.body ?? null,
    latestActivityAt: latestMessage?.createdAt ?? circle.updatedAt,
  };
}

function slugifyGroupName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

function normalizePhoneNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/[^\d]/g, '');
  if (digits.length < 7) {
    return null;
  }

  return `${hasPlus ? '+' : ''}${digits}`;
}

function getMessageReplyPreview(message: {
  kind?: string;
  body?: string;
  routeTitle?: string;
  callTitle?: string;
  callMode?: 'voice' | 'video';
}) {
  if (message.kind === 'route') {
    return message.routeTitle ?? 'Trip map';
  }

  if (message.kind === 'call' || message.kind === 'scheduled_call') {
    return message.callTitle ?? `${formatCallMode(message.callMode ?? 'voice')} call`;
  }

  if (message.body?.startsWith('wandr:sticker:')) {
    return 'Sticker';
  }

  if (message.body?.startsWith('wandr:gif:')) {
    return 'GIF';
  }

  if (message.body?.startsWith('wandr:media:')) {
    try {
      const media = JSON.parse(decodeURIComponent(message.body.replace('wandr:media:', ''))) as {
        kind?: string;
        title?: string;
      };
      return media.title ?? (media.kind === 'gif' ? 'GIF' : 'Sticker');
    } catch {
      return 'Media';
    }
  }

  return (message.body ?? 'Message').slice(0, 140);
}

async function getGroupReplySnapshot(
  ctx: MutationCtx,
  circleId: Id<'friendCircles'>,
  replyToMessageId?: Id<'friendMessages'>
) {
  if (!replyToMessageId) {
    return null;
  }

  const replyMessage = await ctx.db.get(replyToMessageId);
  if (!replyMessage || replyMessage.circleId !== circleId) {
    return null;
  }

  const sender = await getAppUser(ctx, replyMessage.senderSlug);
  return {
    replyToMessageId,
    replyToSenderName: sender?.name ?? replyMessage.senderSlug,
    replyToPreview: getMessageReplyPreview(replyMessage),
    replyToKind: replyMessage.kind,
  };
}

async function getDirectReplySnapshot(
  ctx: MutationCtx,
  threadId: Id<'friendDirectThreads'>,
  replyToMessageId?: Id<'friendDirectMessages'>
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
    replyToSenderName: sender?.name ?? replyMessage.senderSlug,
    replyToPreview: getMessageReplyPreview(replyMessage),
    replyToKind: replyMessage.kind ?? 'text',
  };
}

async function getLatestGroupMessages(ctx: QueryCtx, circleId: Id<'friendCircles'>, limit: number) {
  const messages = await ctx.db
    .query('friendMessages')
    .withIndex('by_circleId_and_createdAt', (q) => q.eq('circleId', circleId))
    .order('desc')
    .take(limit);

  return messages.reverse();
}

async function getLatestDirectMessages(ctx: QueryCtx, threadId: Id<'friendDirectThreads'>, limit: number) {
  const messages = await ctx.db
    .query('friendDirectMessages')
    .withIndex('by_threadId_and_createdAt', (q) => q.eq('threadId', threadId))
    .order('desc')
    .take(limit);

  return messages.reverse();
}

async function getJoinableCirclesForTraveler(ctx: QueryCtx | MutationCtx, travelerSlug: string) {
  const memberships = await ctx.db
    .query('friendCircleMembers')
    .withIndex('by_travelerSlug_and_status', (q) => q.eq('travelerSlug', travelerSlug).eq('status', 'active'))
    .collect();

  const joinedCircleIds = new Set(memberships.map((membership) => membership.circleId));
  const openCircles = (await ctx.db.query('friendCircles').collect()).filter(
    (circle) => circle.visibility === 'open' && !joinedCircleIds.has(circle._id) && circle.createdBySlug !== travelerSlug
  );

  const summaries = await Promise.all(openCircles.map((circle) => buildCircleSummary(ctx, circle)));
  return summaries.sort((a, b) => b.latestActivityAt - a.latestActivityAt);
}

async function buildCandidates(
  ctx: QueryCtx | MutationCtx,
  travelerSlug: string,
  limit?: number
) {
  const [currentProfile, currentUser] = await Promise.all([
    getFriendProfile(ctx, travelerSlug),
    getAppUser(ctx, travelerSlug),
  ]);
  if (!currentProfile || !currentUser) {
    return [];
  }

  const activeCircle = await getActiveCircleForTraveler(ctx, travelerSlug);
  const activeMembers = activeCircle ? await getCircleMembers(ctx, activeCircle._id) : [];
  const connectionSet = await getFriendConnectionSet(ctx, travelerSlug);
  const excludedSlugs = new Set<string>([travelerSlug, ...activeMembers.map((member) => member.travelerSlug)]);
  const actionMap = await getActionMap(ctx, travelerSlug);
  const users = await ctx.db.query('users').take(200);
  const allProfiles = (
    await Promise.all(
      users
        .filter((user) => user.slug !== undefined && !excludedSlugs.has(user.slug))
        .map((user) => getPublicTravelerProfile(ctx, user.slug as string))
    )
  ).filter((profile): profile is PublicTravelerProfile => profile !== null);

  const candidates = await Promise.all(
    allProfiles
      .map(async (candidate) => {
        const match = computeMatchScore(currentProfile, candidate);
        const action = actionMap.get(candidate.travelerSlug);

        return {
          travelerSlug: candidate.travelerSlug,
          name: candidate.name,
          avatarUri: candidate.avatarUri,
          countryLabel: candidate.countryLabel,
          sameCountry: candidate.countryCode === currentUser.countryCode,
          baseLabel: candidate.baseLabel,
          destinationLabel: candidate.destinationLabel,
          headline: candidate.headline,
          bio: candidate.bio,
          vibe: candidate.vibe,
          travelPace: candidate.travelPace,
          arrivalWindowLabel: candidate.arrivalWindowLabel,
          interests: candidate.interests,
          sharedInterests: match.sharedInterests,
          matchScore: match.score,
          actionState: connectionSet.has(candidate.travelerSlug) ? 'friended' : action?.state ?? null,
        };
      })
  );

  const sorted = candidates
    .filter((candidate): candidate is NonNullable<typeof candidate> => candidate !== null)
    .filter((candidate) => candidate.actionState !== 'passed')
    .filter((candidate, _index, all) => {
      const hasSameCountryTravelers = all.some((item) => item?.sameCountry);
      return hasSameCountryTravelers ? candidate.sameCountry : true;
    })
    .sort((a, b) => {
      if (a.actionState === 'invited' && b.actionState !== 'invited') {
        return -1;
      }
      if (a.actionState !== 'invited' && b.actionState === 'invited') {
        return 1;
      }
      if (a.sameCountry !== b.sameCountry) {
        return a.sameCountry ? -1 : 1;
      }
      return b.matchScore - a.matchScore;
    });

  return typeof limit === 'number' ? sorted.slice(0, limit) : sorted;
}

function isCoordinate(value: readonly number[] | undefined): value is readonly [number, number] {
  return Array.isArray(value) && value.length === 2;
}

async function buildRouteShare(ctx: QueryCtx | MutationCtx, travelerSlug: string) {
  const trips = await ctx.db
    .query('trips')
    .withIndex('by_travelerSlug', (q) => q.eq('travelerSlug', travelerSlug))
    .order('desc')
    .collect();

  const activeTrip = trips[0];
  if (!activeTrip) {
    return {
      routeTitle: 'Shared a draft route',
      routeSummary: 'A fresh route plan is ready for the group.',
      routeDistanceLabel: 'Planning update',
      routeStopCount: 0,
      routeStopsPreview: [],
      routeCenterCoordinate: null,
      routeHeroImageUri: null,
      routeMapMarkers: [],
    };
  }

  const bookings = (await ctx.db
    .query('experienceBookings')
    .withIndex('by_travelerSlug_and_experienceSlug', (q) => q.eq('travelerSlug', travelerSlug))
    .collect()).filter((booking) => booking.tripId === activeTrip._id);

  const experiences = await ctx.db.query('experiences').collect();
  const stays = await ctx.db.query('stays').collect();

  const previewStops = bookings
    .map((booking) => {
      const experience = experiences.find((item) => item.slug === booking.experienceSlug);
      if (experience) {
        return experience.title;
      }
      const stay = stays.find((item) => item.slug === booking.experienceSlug);
      return stay?.name ?? null;
    })
    .filter((value): value is string => Boolean(value))
    .slice(0, 3);

  const routeMapMarkers = bookings
    .map((booking, index) => {
      const experience = experiences.find((item) => item.slug === booking.experienceSlug);
      const stay = stays.find((item) => item.slug === booking.experienceSlug);
      const coordinate = experience?.coordinate ?? stay?.coordinate;

      if (!isCoordinate(coordinate)) {
        return null;
      }

      return {
        id: `${booking._id}-${index}`,
        coordinate,
        imageUri: experience?.imageUri ?? stay?.imageUri,
        label: experience?.title ?? stay?.name ?? 'Trip stop',
        status: index === 0 ? ('active' as const) : ('upcoming' as const),
      };
    })
    .filter((marker): marker is NonNullable<typeof marker> => marker !== null);

  const routeHeroImageUri =
    bookings
      .map((booking) => {
        const experience = experiences.find((item) => item.slug === booking.experienceSlug);
        const stay = stays.find((item) => item.slug === booking.experienceSlug);
        return experience?.imageUri ?? stay?.imageUri ?? null;
      })
      .find((imageUri): imageUri is string => Boolean(imageUri)) ?? null;

  const routeCenterCoordinate = routeMapMarkers[0]?.coordinate ?? null;

  return {
    routeTitle: activeTrip.name.toLowerCase() === 'default' ? 'My Trip Route' : activeTrip.name,
    routeSummary:
      previewStops.length > 0
        ? `Stops lined up for ${previewStops.join(', ')}.`
        : 'Shared the latest route draft for this trip.',
    routeDistanceLabel: bookings.length > 0 ? `${bookings.length} planned stops` : 'Route draft',
    routeStopCount: bookings.length,
    routeStopsPreview: previewStops,
    routeCenterCoordinate,
    routeHeroImageUri,
    routeMapMarkers,
  };
}

async function cloneTripBookingsToTrip(
  ctx: MutationCtx,
  sourceTripId: Id<'trips'>,
  targetTripId: Id<'trips'>,
  travelerSlug: string
) {
  const sourceBookings = await ctx.db
    .query('experienceBookings')
    .withIndex('by_tripId', (q) => q.eq('tripId', sourceTripId))
    .collect();

  for (const booking of sourceBookings) {
    await ctx.db.insert('experienceBookings', {
      experienceSlug: booking.experienceSlug,
      travelerSlug,
      tripId: targetTripId,
      bookedAt: booking.bookedAt,
      bookingType: booking.bookingType,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      totalPrice: booking.totalPrice,
      stayBookingDetails: booking.stayBookingDetails,
    });
  }
}

async function createGroupTripCopy(
  ctx: MutationCtx,
  args: {
    travelerSlug: string;
    circleId: Id<'friendCircles'>;
    name: string;
    role: 'host' | 'member';
    sourceTripId: Id<'trips'>;
  }
) {
  const existingTrip = await ctx.db
    .query('trips')
    .withIndex('by_travelerSlug_and_circleId', (q) =>
      q.eq('travelerSlug', args.travelerSlug).eq('circleId', args.circleId)
    )
    .unique();

  if (existingTrip) {
    return existingTrip._id;
  }

  const tripId = await ctx.db.insert('trips', {
    name: args.name,
    travelerSlug: args.travelerSlug,
    circleId: args.circleId,
    groupRole: args.role,
    sourceTripId: args.sourceTripId,
    createdAt: Date.now(),
    status: 'active',
  });

  await cloneTripBookingsToTrip(ctx, args.sourceTripId, tripId, args.travelerSlug);
  return tripId;
}

export const getFriendsDashboard = query({
  args: {
    travelerSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const travelerSlug = await assertCurrentTravelerSlug(ctx, args.travelerSlug);
    const [traveler, travelerProfile, friendProfile, circles, allCandidates] = await Promise.all([
      getAppUser(ctx, travelerSlug),
      getTravelerProfile(ctx, travelerSlug),
      getFriendProfile(ctx, travelerSlug),
      getActiveCirclesForTraveler(ctx, travelerSlug),
      buildCandidates(ctx, travelerSlug),
    ]);
    const circleSummaries = await Promise.all(circles.map((circle) => buildCircleSummary(ctx, circle)));
    const activeCircles = circleSummaries.sort((a, b) => b.latestActivityAt - a.latestActivityAt);

    return {
      traveler: traveler
        ? {
            slug: traveler.slug,
            name: traveler.name,
            countryLabel: traveler.countryLabel,
            avatarUri: travelerProfile?.avatarUri ?? null,
          }
        : null,
      profile: friendProfile
        ? {
            destinationLabel: friendProfile.destinationLabel,
            vibe: friendProfile.vibe,
            arrivalWindowLabel: friendProfile.arrivalWindowLabel,
            interests: friendProfile.interests,
          }
        : null,
      activeCircle: activeCircles[0] ?? null,
      activeCircles,
      topMatches: allCandidates.slice(0, 3),
      stats: {
        invitedCount: allCandidates.filter((candidate) => candidate.actionState === 'invited').length,
        friendCount: allCandidates.filter((candidate) => candidate.actionState === 'friended').length,
        freshCount: allCandidates.filter((candidate) => candidate.actionState === null).length,
      },
    };
  },
});

export const getFriendDiscovery = query({
  args: {
    travelerSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const travelerSlug = await assertCurrentTravelerSlug(ctx, args.travelerSlug);
    const [traveler, friendProfile, candidates] = await Promise.all([
      getAppUser(ctx, travelerSlug),
      getFriendProfile(ctx, travelerSlug),
      buildCandidates(ctx, travelerSlug),
    ]);

    const vibes = [...new Set(candidates.map((candidate) => candidate.vibe))];
    const discoverViewCount = friendProfile?.discoverViewCount ?? 0;

    return {
      intro: {
        title: 'Friends nearby',
        countryLabel: traveler?.countryLabel ?? 'your country',
        destinationLabel: friendProfile?.destinationLabel ?? 'Travel together',
        vibe: friendProfile?.vibe ?? null,
        matchCount: candidates.filter((candidate) => candidate.actionState === null).length,
        showIntro: discoverViewCount < 4,
      },
      filters: {
        vibes,
      },
      candidates,
    };
  },
});

export const getFriendViewerProfile = query({
  args: {
    travelerSlug: v.string(),
    profileSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const travelerSlug = await assertCurrentTravelerSlug(ctx, args.travelerSlug);
    const [participantA, participantB] = normalizeThreadPair(travelerSlug, args.profileSlug);
    const [
      viewerProfile,
      viewedUser,
      viewedTravelerProfile,
      viewedFriendProfile,
      connection,
      action,
      directThread,
      friendConnections,
    ] =
      await Promise.all([
        getFriendProfile(ctx, travelerSlug),
        getAppUser(ctx, args.profileSlug),
        getTravelerProfile(ctx, args.profileSlug),
        getFriendProfile(ctx, args.profileSlug),
        ctx.db
          .query('friendConnections')
          .withIndex('by_travelerSlug_and_friendSlug', (q) =>
            q.eq('travelerSlug', travelerSlug).eq('friendSlug', args.profileSlug)
          )
          .unique(),
        ctx.db
          .query('friendMatchActions')
          .withIndex('by_travelerSlug_and_candidateSlug', (q) =>
            q.eq('travelerSlug', travelerSlug).eq('candidateSlug', args.profileSlug)
          )
          .unique(),
        ctx.db
          .query('friendDirectThreads')
          .withIndex('by_participantA_and_participantB', (q) =>
            q.eq('participantA', participantA).eq('participantB', participantB)
          )
          .unique(),
        ctx.db
          .query('friendConnections')
          .withIndex('by_travelerSlug', (q) => q.eq('travelerSlug', args.profileSlug))
          .collect(),
      ]);

    if (!viewedUser) {
      return null;
    }

    const match = viewerProfile && viewedFriendProfile ? computeMatchScore(viewerProfile, viewedFriendProfile) : null;
    const relationshipState =
      travelerSlug === args.profileSlug
        ? 'self'
        : connection
          ? 'friend'
          : action?.state === 'invited'
            ? 'invited'
            : 'available';

    return {
      traveler: {
        slug: viewedUser.slug,
        name: viewedUser.name,
        countryLabel: viewedUser.countryLabel,
        baseLabel: viewedTravelerProfile?.regionName ?? viewedFriendProfile?.baseLabel ?? viewedUser.countryLabel,
        avatarUri: viewedTravelerProfile?.avatarUri ?? null,
      },
      profile: viewedFriendProfile
        ? {
            headline: viewedFriendProfile.headline,
            bio: viewedFriendProfile.bio,
            destinationLabel: viewedFriendProfile.destinationLabel,
            vibe: viewedFriendProfile.vibe,
            travelPace: viewedFriendProfile.travelPace,
            arrivalWindowLabel: viewedFriendProfile.arrivalWindowLabel,
            interests: viewedFriendProfile.interests,
            sharedInterests: match?.sharedInterests ?? [],
            matchScore: match?.score ?? null,
          }
        : null,
      relationship: {
        state: relationshipState,
        directThreadId: directThread?._id ?? null,
      },
      stats: {
        friendCount: friendConnections.length,
      },
    };
  },
});

export const trackFriendDiscoveryView = mutation({
  args: {
    travelerSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const travelerSlug = await assertCurrentTravelerSlug(ctx, args.travelerSlug);
    const profile = await getFriendProfile(ctx, travelerSlug);
    if (!profile) {
      return false;
    }

    await ctx.db.patch(profile.user._id, {
      discoverViewCount: (profile.discoverViewCount ?? 0) + 1,
      profileUpdatedAt: Date.now(),
    });

    return true;
  },
});

export const getFriendChatList = query({
  args: {
    travelerSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const travelerSlug = await assertCurrentTravelerSlug(ctx, args.travelerSlug);
    const [memberships, directThreads, joinableCircles, friends] = await Promise.all([
      getActiveCircleMemberships(ctx, travelerSlug),
      getDirectThreadsForTraveler(ctx, travelerSlug),
      getJoinableCirclesForTraveler(ctx, travelerSlug),
      getFriendPickerItems(ctx, travelerSlug),
    ]);

    const groups = await Promise.all(
      memberships.map(async (membership) => {
        const circle = await ctx.db.get(membership.circleId);
        if (!circle) {
          return null;
        }
        const summary = await buildCircleSummary(ctx, circle);
        return {
          id: summary._id,
          kind: 'group' as const,
          title: summary.name,
          subtitle: `${summary.memberCount} active in ${summary.destinationLabel}`,
          preview: summary.latestMessagePreview,
          updatedAt: summary.latestActivityAt,
          avatarUris: summary.avatarUris,
          memberCount: summary.memberCount,
          href: `/friends/group/${summary._id}`,
        };
      })
    );

    const directs = await Promise.all(
      directThreads.map(async (thread) => {
        const otherSlug = thread.participantA === travelerSlug ? thread.participantB : thread.participantA;
        const [otherUser, otherProfile, latestMessages] = await Promise.all([
          getAppUser(ctx, otherSlug),
          getTravelerProfile(ctx, otherSlug),
          ctx.db
            .query('friendDirectMessages')
            .withIndex('by_threadId_and_createdAt', (q) => q.eq('threadId', thread._id))
            .order('desc')
            .take(1),
        ]);

        if (!otherUser) {
          return null;
        }

        return {
          id: thread._id,
          kind: 'direct' as const,
          title: thread.title ?? otherUser.name,
          subtitle: otherProfile?.regionName ?? otherUser.countryLabel,
          preview: latestMessages[0]?.body ?? null,
          updatedAt: latestMessages[0]?.createdAt ?? thread.updatedAt,
          travelerSlug: otherUser.slug,
          avatarUri: otherProfile?.avatarUri ?? null,
          href: `/friends/direct/${thread._id}`,
        };
      })
    );

    return {
      groups: groups
        .filter((item): item is NonNullable<typeof item> => item !== null)
        .sort((a, b) => b.updatedAt - a.updatedAt),
      directs: directs
        .filter((item): item is NonNullable<typeof item> => item !== null)
        .sort((a, b) => b.updatedAt - a.updatedAt),
      joinableGroups: joinableCircles.map((circle) => ({
        id: circle._id,
        kind: 'group' as const,
        title: circle.name,
        subtitle: `${circle.memberCount} active in ${circle.destinationLabel}`,
        preview: circle.latestMessagePreview,
        updatedAt: circle.latestActivityAt,
        avatarUris: circle.avatarUris,
        memberCount: circle.memberCount,
        href: `/friends/group/${circle._id}`,
      })),
      friends,
    };
  },
});

export const getHeaderBadgeCounts = query({
  args: {
    travelerSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const travelerSlug = await assertCurrentTravelerSlug(ctx, args.travelerSlug);
    const [activeMemberships, participantAThreads, participantBThreads, unreadNotifications] = await Promise.all([
      ctx.db
        .query('friendCircleMembers')
        .withIndex('by_travelerSlug_and_status', (q) => q.eq('travelerSlug', travelerSlug).eq('status', 'active'))
        .collect(),
      ctx.db
        .query('friendDirectThreads')
        .withIndex('by_participantA_and_updatedAt', (q) => q.eq('participantA', travelerSlug))
        .collect(),
      ctx.db
        .query('friendDirectThreads')
        .withIndex('by_participantB_and_updatedAt', (q) => q.eq('participantB', travelerSlug))
        .collect(),
      ctx.db
        .query('appNotifications')
        .withIndex('by_recipientSlug_and_readAt', (q) => q.eq('recipientSlug', travelerSlug))
        .collect(),
    ]);

    let groupUnreadCount = 0;
    for (const membership of activeMemberships) {
      const [readState, latestMessage] = await Promise.all([
        ctx.db
          .query('friendCircleReadStates')
          .withIndex('by_circleId_and_travelerSlug', (q) =>
            q.eq('circleId', membership.circleId).eq('travelerSlug', travelerSlug)
          )
          .unique(),
        ctx.db
          .query('friendMessages')
          .withIndex('by_circleId_and_createdAt', (q) => q.eq('circleId', membership.circleId))
          .order('desc')
          .take(1),
      ]);

      const latest = latestMessage[0];
      if (!latest || latest.senderSlug === travelerSlug) {
        continue;
      }

      if (latest.createdAt > (readState?.lastReadAt ?? 0)) {
        groupUnreadCount += 1;
      }
    }

    let directUnreadCount = 0;
    for (const thread of [...participantAThreads, ...participantBThreads]) {
      const [readState, latestMessage] = await Promise.all([
        ctx.db
          .query('friendDirectReadStates')
          .withIndex('by_threadId_and_travelerSlug', (q) =>
            q.eq('threadId', thread._id).eq('travelerSlug', travelerSlug)
          )
          .unique(),
        ctx.db
          .query('friendDirectMessages')
          .withIndex('by_threadId_and_createdAt', (q) => q.eq('threadId', thread._id))
          .order('desc')
          .take(1),
      ]);

      const latest = latestMessage[0];
      if (!latest || latest.senderSlug === travelerSlug) {
        continue;
      }

      if (latest.createdAt > (readState?.lastReadAt ?? 0)) {
        directUnreadCount += 1;
      }
    }

    return {
      chatUnreadCount: groupUnreadCount + directUnreadCount,
      notificationUnreadCount: unreadNotifications.filter((notification) => !notification.readAt).length,
    };
  },
});

export const matchFriendContacts = query({
  args: {
    travelerSlug: v.string(),
    phoneNumbers: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const travelerSlug = await assertCurrentTravelerSlug(ctx, args.travelerSlug);
    const normalizedNumbers = [...new Set(args.phoneNumbers.map(normalizePhoneNumber).filter(Boolean) as string[])];
    const friendSet = await getFriendConnectionSet(ctx, travelerSlug);
    const matched: PhoneContactMatch[] = [];
    const unmatched = new Set(normalizedNumbers);

    for (const phoneNumber of normalizedNumbers) {
      const user = await ctx.db
        .query('users')
        .withIndex('phone', (q) => q.eq('phone', phoneNumber))
        .unique();

      if (!user || user.slug === travelerSlug) {
        continue;
      }

      const profile = await getTravelerProfile(ctx, user.slug as string);
      matched.push({
        travelerSlug: user.slug as string,
        name: user.name ?? 'Traveler',
        avatarUri: profile?.avatarUri ?? null,
        baseLabel: profile?.regionName ?? user.countryLabel ?? 'Unknown',
        phoneNumber,
        isFriend: friendSet.has(user.slug as string),
      });
      unmatched.delete(phoneNumber);
    }

    return {
      matched,
      unmatched: [...unmatched],
    };
  },
});

export const createOpenFriendGroup = mutation({
  args: {
    travelerSlug: v.string(),
    name: v.optional(v.string()),
    tripId: v.optional(v.id('trips')),
    inviteeSlugs: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const travelerSlug = await assertCurrentTravelerSlug(ctx, args.travelerSlug);
    const [hostUser, hostProfile] = await Promise.all([
      getAppUser(ctx, travelerSlug),
      getFriendProfile(ctx, travelerSlug),
    ]);

    if (!hostUser) {
      return null;
    }

    const now = Date.now();
    const firstName = (hostUser.name || 'A traveler').split(' ')[0];
    const destinationLabel = hostProfile?.destinationLabel ?? 'Travel group';
    const trimmedName = args.name?.trim();
    const sourceTrip =
      args.tripId ? await ctx.db.get(args.tripId) : null;

    if (sourceTrip && sourceTrip.travelerSlug !== travelerSlug) {
      return null;
    }

    const circleId = await ctx.db.insert('friendCircles', {
      slug: `${slugifyGroupName(`${firstName}-${destinationLabel}`)}-${now.toString().slice(-5)}`,
      name: trimmedName || `${firstName}'s ${destinationLabel}`,
      destinationLabel,
      heroLabel: 'Open join group',
      status: 'active',
      visibility: 'open',
      createdBySlug: travelerSlug,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert('friendCircleMembers', {
      circleId,
      travelerSlug: travelerSlug,
      role: 'host',
      status: 'active',
      joinedAt: now,
      note: 'Created as an open joinable group',
    });

    await ctx.db.insert('friendMessages', {
      circleId,
      senderSlug: travelerSlug,
      kind: 'system',
      body: `${firstName} opened this group for new travelers to join.`,
      createdAt: now,
    });

    const inviteeSlugs = [...new Set(args.inviteeSlugs ?? [])].filter((slug) => slug !== travelerSlug);
    for (const inviteeSlug of inviteeSlugs) {
      const existingMembership = await ctx.db
        .query('friendCircleMembers')
        .withIndex('by_circleId_and_travelerSlug', (q) =>
          q.eq('circleId', circleId).eq('travelerSlug', inviteeSlug)
        )
        .unique();

      if (!existingMembership) {
        await ctx.db.insert('friendCircleMembers', {
          circleId,
          travelerSlug: inviteeSlug,
          role: 'member',
          status: 'invited',
          joinedAt: now,
          note: 'Selected while creating group',
        });
      }

      await insertAppNotification(ctx, {
        recipientSlug: inviteeSlug,
        actorSlug: travelerSlug,
        kind: 'friend_invite',
        title: `${hostUser.name} added you to a group`,
        body: `Join ${trimmedName || `${firstName}'s ${destinationLabel}`} to plan together.`,
        href: `/friends/group/${circleId}`,
        entityId: circleId,
        entityLabel: trimmedName || `${firstName}'s ${destinationLabel}`,
      });
    }

    if (inviteeSlugs.length > 0) {
      await ctx.db.insert('friendMessages', {
        circleId,
        senderSlug: travelerSlug,
        kind: 'system',
        body: `${hostUser.name} invited ${inviteeSlugs.length} friend${inviteeSlugs.length === 1 ? '' : 's'} to the group.`,
        createdAt: now + 1,
      });
    }

    if (sourceTrip) {
      const hostGroupTripId = await createGroupTripCopy(ctx, {
        travelerSlug: travelerSlug,
        circleId,
        name: trimmedName || `${sourceTrip.name} Group`,
        role: 'host',
        sourceTripId: sourceTrip._id,
      });

      await ctx.db.patch(circleId, {
        tripId: hostGroupTripId,
      });
    }

    return circleId;
  },
});

export const joinFriendCircle = mutation({
  args: {
    travelerSlug: v.string(),
    circleId: v.id('friendCircles'),
  },
  handler: async (ctx, args) => {
    const travelerSlug = await assertCurrentTravelerSlug(ctx, args.travelerSlug);
    const circle = await ctx.db.get(args.circleId);
    if (!circle || circle.visibility !== 'open') {
      return false;
    }

    const [existingMembership, joiningUser] = await Promise.all([
      ctx.db
        .query('friendCircleMembers')
        .withIndex('by_circleId_and_travelerSlug', (q) =>
          q.eq('circleId', args.circleId).eq('travelerSlug', travelerSlug)
        )
        .unique(),
      getAppUser(ctx, travelerSlug),
    ]);

    const now = Date.now();

    if (!existingMembership) {
      await ctx.db.insert('friendCircleMembers', {
        circleId: args.circleId,
        travelerSlug: travelerSlug,
        role: 'member',
        status: 'active',
        joinedAt: now,
        note: 'Joined open group',
      });
    } else if (existingMembership.status !== 'active') {
      await ctx.db.patch(existingMembership._id, {
        status: 'active',
        joinedAt: now,
      });
    } else {
      return true;
    }

    await ctx.db.insert('friendMessages', {
      circleId: args.circleId,
      senderSlug: travelerSlug,
      kind: 'system',
      body: joiningUser ? `${joiningUser.name} joined the group.` : 'A traveler joined the group.',
      createdAt: now,
    });

    await ctx.db.patch(args.circleId, {
      updatedAt: now,
    });

    if (circle.tripId) {
      await createGroupTripCopy(ctx, {
        travelerSlug: travelerSlug,
        circleId: args.circleId,
        name: circle.name,
        role: 'member',
        sourceTripId: circle.tripId,
      });
    }

    return true;
  },
});

export const renameFriendCircle = mutation({
  args: {
    travelerSlug: v.string(),
    circleId: v.id('friendCircles'),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const travelerSlug = await assertCurrentTravelerSlug(ctx, args.travelerSlug);
    const nextName = args.name.trim().slice(0, 80);
    if (!nextName) {
      return false;
    }

    const [circle, membership, user] = await Promise.all([
      ctx.db.get(args.circleId),
      ctx.db
        .query('friendCircleMembers')
        .withIndex('by_circleId_and_travelerSlug', (q) =>
          q.eq('circleId', args.circleId).eq('travelerSlug', travelerSlug)
        )
        .unique(),
      getAppUser(ctx, travelerSlug),
    ]);

    if (!circle || !membership || membership.status !== 'active') {
      return false;
    }

    if (circle.name === nextName) {
      return true;
    }

    const now = Date.now();
    await ctx.db.patch(args.circleId, {
      name: nextName,
      updatedAt: now,
    });

    const travelerTrips = await ctx.db
      .query('trips')
      .withIndex('by_travelerSlug_and_circleId', (q) =>
        q.eq('travelerSlug', travelerSlug).eq('circleId', args.circleId)
      )
      .take(5);

    for (const trip of travelerTrips) {
      await ctx.db.patch(trip._id, { name: nextName });
    }

    await ctx.db.insert('friendMessages', {
      circleId: args.circleId,
      senderSlug: travelerSlug,
      kind: 'system',
      body: user ? `${user.name} renamed the group to ${nextName}.` : `The group was renamed to ${nextName}.`,
      createdAt: now,
    });

    return true;
  },
});

export const leaveFriendCircle = mutation({
  args: {
    travelerSlug: v.string(),
    circleId: v.id('friendCircles'),
  },
  handler: async (ctx, args) => {
    const travelerSlug = await assertCurrentTravelerSlug(ctx, args.travelerSlug);
    const [circle, membership, user] = await Promise.all([
      ctx.db.get(args.circleId),
      ctx.db
        .query('friendCircleMembers')
        .withIndex('by_circleId_and_travelerSlug', (q) =>
          q.eq('circleId', args.circleId).eq('travelerSlug', travelerSlug)
        )
        .unique(),
      getAppUser(ctx, travelerSlug),
    ]);

    if (!circle || !membership || membership.status !== 'active') {
      return false;
    }

    const now = Date.now();
    const activeMembers = (await getCircleMembers(ctx, args.circleId)).filter((member) => member.status === 'active');
    const remainingMembers = activeMembers.filter((member) => member.travelerSlug !== travelerSlug);

    if (remainingMembers.length === 0) {
      await deleteFriendCircleDocuments(ctx, args.circleId);
      return true;
    }

    if (membership.role === 'host' && !remainingMembers.some((member) => member.role === 'host')) {
      await ctx.db.patch(remainingMembers[0]._id, { role: 'host' });
    }

    await ctx.db.delete(membership._id);

    const readState = await ctx.db
      .query('friendCircleReadStates')
      .withIndex('by_circleId_and_travelerSlug', (q) =>
        q.eq('circleId', args.circleId).eq('travelerSlug', travelerSlug)
      )
      .unique();
    if (readState) {
      await ctx.db.delete(readState._id);
    }

    const travelerTrips = await ctx.db
      .query('trips')
      .withIndex('by_travelerSlug_and_circleId', (q) =>
        q.eq('travelerSlug', travelerSlug).eq('circleId', args.circleId)
      )
      .take(20);
    for (const trip of travelerTrips) {
      await ctx.db.delete(trip._id);
    }

    await ctx.db.insert('friendMessages', {
      circleId: args.circleId,
      senderSlug: travelerSlug,
      kind: 'system',
      body: user ? `${user.name} left the group.` : 'A traveler left the group.',
      createdAt: now,
    });

    await ctx.db.patch(args.circleId, { updatedAt: now });

    return true;
  },
});

export const deleteFriendCircle = mutation({
  args: {
    travelerSlug: v.string(),
    circleId: v.id('friendCircles'),
  },
  handler: async (ctx, args) => {
    const travelerSlug = await assertCurrentTravelerSlug(ctx, args.travelerSlug);
    const [circle, membership] = await Promise.all([
      ctx.db.get(args.circleId),
      ctx.db
        .query('friendCircleMembers')
        .withIndex('by_circleId_and_travelerSlug', (q) =>
          q.eq('circleId', args.circleId).eq('travelerSlug', travelerSlug)
        )
        .unique(),
    ]);

    if (!circle || !membership || membership.status !== 'active') {
      return false;
    }

    if (circle.createdBySlug !== travelerSlug && membership.role !== 'host') {
      return false;
    }

    await deleteFriendCircleDocuments(ctx, args.circleId);
    return true;
  },
});

export const acceptFriendRequest = mutation({
  args: {
    travelerSlug: v.string(),
    notificationId: v.id('appNotifications'),
  },
  handler: async (ctx, args) => {
    const travelerSlug = await assertCurrentTravelerSlug(ctx, args.travelerSlug);
    const notification = await ctx.db.get(args.notificationId);
    if (
      !notification ||
      notification.recipientSlug !== travelerSlug ||
      !isPendingFriendRequestNotification(notification)
    ) {
      return false;
    }

    const now = Date.now();
    const requesterSlug = notification.actorSlug;
    const [requester, recipient, requesterAction, recipientAction] = await Promise.all([
      getAppUser(ctx, requesterSlug),
      getAppUser(ctx, travelerSlug),
      ctx.db
        .query('friendMatchActions')
        .withIndex('by_travelerSlug_and_candidateSlug', (q) =>
          q.eq('travelerSlug', requesterSlug).eq('candidateSlug', travelerSlug)
        )
        .unique(),
      ctx.db
        .query('friendMatchActions')
        .withIndex('by_travelerSlug_and_candidateSlug', (q) =>
          q.eq('travelerSlug', travelerSlug).eq('candidateSlug', requesterSlug)
        )
        .unique(),
    ]);

    await ensureFriendConnectionPair(ctx, travelerSlug, requesterSlug, 'discovery');
    await getOrCreateDirectThread(ctx, travelerSlug, requesterSlug);

    if (requesterAction) {
      await ctx.db.delete(requesterAction._id);
    }
    if (recipientAction) {
      await ctx.db.delete(recipientAction._id);
    }

    await ctx.db.patch(args.notificationId, {
      actionStatus: 'approved',
      readAt: notification.readAt ?? now,
      viewedAt: notification.viewedAt ?? now,
    });

    if (requester && recipient) {
      await insertAppNotification(ctx, {
        recipientSlug: requester.slug as string,
        actorSlug: recipient.slug,
        kind: 'friend_added',
        title: `${recipient.name} accepted your friend request`,
        body: 'You can now plan trips and chat together.',
        href: '/friends/chat',
        entityLabel: recipient.name,
      });
    }

    return true;
  },
});

export const rejectFriendRequest = mutation({
  args: {
    travelerSlug: v.string(),
    notificationId: v.id('appNotifications'),
  },
  handler: async (ctx, args) => {
    const travelerSlug = await assertCurrentTravelerSlug(ctx, args.travelerSlug);
    const notification = await ctx.db.get(args.notificationId);
    if (
      !notification ||
      notification.recipientSlug !== travelerSlug ||
      !isPendingFriendRequestNotification(notification)
    ) {
      return false;
    }

    const requesterSlug = notification.actorSlug;
    const requesterAction = await ctx.db
      .query('friendMatchActions')
      .withIndex('by_travelerSlug_and_candidateSlug', (q) =>
        q.eq('travelerSlug', requesterSlug).eq('candidateSlug', travelerSlug)
      )
      .unique();

    if (requesterAction) {
      await ctx.db.delete(requesterAction._id);
    }

    const now = Date.now();
    await ctx.db.patch(args.notificationId, {
      actionStatus: 'declined',
      readAt: notification.readAt ?? now,
      viewedAt: notification.viewedAt ?? now,
    });

    return true;
  },
});

export const repairOneSidedFriendConnections = mutation({
  args: {
    confirm: v.literal('repair-one-sided-friend-connections'),
  },
  handler: async (ctx) => {
    let deleted = 0;
    const connections = await ctx.db.query('friendConnections').collect();

    for (const connection of connections) {
      const reverseConnection = await ctx.db
        .query('friendConnections')
        .withIndex('by_travelerSlug_and_friendSlug', (q) =>
          q.eq('travelerSlug', connection.friendSlug).eq('friendSlug', connection.travelerSlug)
        )
        .unique();

      if (reverseConnection) {
        continue;
      }

      await ctx.db.delete(connection._id);
      deleted += 1;
    }

    return { deleted };
  },
});

export const approveTripJoinRequest = mutation({
  args: {
    travelerSlug: v.string(),
    notificationId: v.id('appNotifications'),
  },
  handler: async (ctx, args) => {
    const travelerSlug = await assertCurrentTravelerSlug(ctx, args.travelerSlug);
    const notification = await ctx.db.get(args.notificationId);
    if (
      !notification ||
      notification.recipientSlug !== travelerSlug ||
      notification.kind !== 'trip_join_request' ||
      !notification.actorSlug ||
      !notification.entityId ||
      notification.actionStatus === 'approved' ||
      notification.actionStatus === 'declined'
    ) {
      return false;
    }

    const circle = await ctx.db.get(notification.entityId as Id<'friendCircles'>);
    if (!circle || circle.createdBySlug !== travelerSlug) {
      return false;
    }

    const now = Date.now();
    const requesterSlug = notification.actorSlug;
    const [existingMembership, joiningUser] = await Promise.all([
      ctx.db
        .query('friendCircleMembers')
        .withIndex('by_circleId_and_travelerSlug', (q) =>
          q.eq('circleId', circle._id).eq('travelerSlug', requesterSlug)
        )
        .unique(),
      getAppUser(ctx, requesterSlug),
    ]);

    if (!existingMembership) {
      await ctx.db.insert('friendCircleMembers', {
        circleId: circle._id,
        travelerSlug: requesterSlug,
        role: 'member',
        status: 'active',
        joinedAt: now,
        note: 'Approved from trip join request',
      });
    } else if (existingMembership.status !== 'active') {
      await ctx.db.patch(existingMembership._id, {
        status: 'active',
        joinedAt: now,
        note: 'Approved from trip join request',
      });
    }

    await ctx.db.insert('friendMessages', {
      circleId: circle._id,
      senderSlug: requesterSlug,
      kind: 'system',
      body: joiningUser ? `${joiningUser.name} joined the group.` : 'A traveler joined the group.',
      createdAt: now,
    });

    await ctx.db.patch(circle._id, {
      updatedAt: now,
    });

    if (circle.tripId) {
      await createGroupTripCopy(ctx, {
        travelerSlug: requesterSlug,
        circleId: circle._id,
        name: circle.name,
        role: 'member',
        sourceTripId: circle.tripId,
      });
    }

    await ctx.db.patch(args.notificationId, {
      actionStatus: 'approved',
      readAt: notification.readAt ?? now,
      viewedAt: notification.viewedAt ?? now,
    });

    await insertAppNotification(ctx, {
      recipientSlug: requesterSlug,
      actorSlug: travelerSlug,
      kind: 'friend_added',
      title: `You're in ${circle.name}`,
      body: 'The trip now appears in your trip list, and the group chat is ready.',
      href: '/trip',
      entityId: circle._id,
      entityLabel: circle.name,
    });

    return true;
  },
});

export const declineTripJoinRequest = mutation({
  args: {
    travelerSlug: v.string(),
    notificationId: v.id('appNotifications'),
  },
  handler: async (ctx, args) => {
    const travelerSlug = await assertCurrentTravelerSlug(ctx, args.travelerSlug);
    const notification = await ctx.db.get(args.notificationId);
    if (
      !notification ||
      notification.recipientSlug !== travelerSlug ||
      notification.kind !== 'trip_join_request' ||
      !notification.entityId ||
      notification.actionStatus === 'approved' ||
      notification.actionStatus === 'declined'
    ) {
      return false;
    }

    const circle = await ctx.db.get(notification.entityId as Id<'friendCircles'>);
    if (!circle || circle.createdBySlug !== travelerSlug) {
      return false;
    }

    const now = Date.now();
    await ctx.db.patch(args.notificationId, {
      actionStatus: 'declined',
      readAt: notification.readAt ?? now,
      viewedAt: notification.viewedAt ?? now,
    });

    return true;
  },
});

export const getFriendChat = query({
  args: {
    travelerSlug: v.string(),
    circleId: v.optional(v.id('friendCircles')),
  },
  handler: async (ctx, args) => {
    const travelerSlug = await assertCurrentTravelerSlug(ctx, args.travelerSlug);
    const circle =
      (args.circleId ? await ctx.db.get(args.circleId) : null) ??
      (await getActiveCircleForTraveler(ctx, travelerSlug));

    if (!circle) {
      return null;
    }

    const [summary, memberships, messages] = await Promise.all([
      buildCircleSummary(ctx, circle),
      getCircleMembers(ctx, circle._id),
      getLatestGroupMessages(ctx, circle._id, 80),
    ]);

    const routeShareBySender = new Map<string, Awaited<ReturnType<typeof buildRouteShare>>>();

    const messageViews = await Promise.all(
      messages.map(async (message) => {
        const [sender, senderProfile] = await Promise.all([
          getAppUser(ctx, message.senderSlug),
          getTravelerProfile(ctx, message.senderSlug),
        ]);

        let routeShare: Awaited<ReturnType<typeof buildRouteShare>> | null = null;
        if (message.kind === 'route') {
          routeShare = routeShareBySender.get(message.senderSlug) ?? null;
          if (!routeShare) {
            routeShare = await buildRouteShare(ctx, message.senderSlug);
            routeShareBySender.set(message.senderSlug, routeShare);
          }
        }

        return {
          _id: message._id,
          kind: message.kind,
          body: message.body ?? null,
          createdAt: message.createdAt,
          senderSlug: message.senderSlug,
          senderName: sender?.name ?? message.senderSlug,
          senderAvatarUri: senderProfile?.avatarUri ?? null,
          isOwnMessage: message.senderSlug === travelerSlug,
          replyTo:
            message.replyToMessageId && message.replyToSenderName && message.replyToPreview
              ? {
                  messageId: message.replyToMessageId,
                  senderName: message.replyToSenderName,
                  preview: message.replyToPreview,
                  kind: message.replyToKind ?? 'text',
                }
              : null,
          routeCard:
            message.kind === 'route'
              ? {
                  title: message.routeTitle ?? 'Route update',
                  summary: message.routeSummary ?? '',
                  distanceLabel: message.routeDistanceLabel ?? '',
                  stopCount: message.routeStopCount ?? 0,
                  stopsPreview: message.routeStopsPreview ?? [],
                  centerCoordinate: routeShare?.routeCenterCoordinate ?? null,
                  heroImageUri: routeShare?.routeHeroImageUri ?? null,
                  mapMarkers: routeShare?.routeMapMarkers ?? [],
                }
              : null,
          callCard:
            message.kind === 'call' || message.kind === 'scheduled_call'
              ? {
                  callId: message.callId ?? null,
                  mode: message.callMode ?? 'voice',
                  status: message.callStatus ?? (message.kind === 'scheduled_call' ? 'scheduled' : 'active'),
                  scheduledFor: message.callScheduledFor ?? null,
                  endsAt: message.callEndsAt ?? null,
                  reminderMinutesBefore: message.callReminderMinutesBefore ?? null,
                  title:
                    message.callTitle ??
                    (message.kind === 'scheduled_call'
                      ? `Scheduled ${formatCallMode(message.callMode ?? 'voice')}`
                      : `${formatCallMode(message.callMode ?? 'voice')} started`),
                  description: message.callDescription ?? null,
                }
              : null,
        };
      })
    );

    const routeShare = await buildRouteShare(ctx as MutationCtx, travelerSlug);

    return {
      circle: summary,
      members: await Promise.all(memberships.map((membership) => buildMemberView(ctx, membership))),
      messages: messageViews,
      composer: {
        placeholder: `Message ${summary.name}`,
        quickActions: [
          { key: 'route', label: 'Share route', description: 'Send the current itinerary as a trip card.' },
        ],
        routeShare,
      },
    };
  },
});

export const getDirectChat = query({
  args: {
    travelerSlug: v.string(),
    threadId: v.id('friendDirectThreads'),
  },
  handler: async (ctx, args) => {
    const travelerSlug = await assertCurrentTravelerSlug(ctx, args.travelerSlug);
    const thread = await ctx.db.get(args.threadId);
    if (!thread) {
      return null;
    }

    const participants = [thread.participantA, thread.participantB];
    if (!participants.includes(travelerSlug)) {
      return null;
    }

    const otherSlug = thread.participantA === travelerSlug ? thread.participantB : thread.participantA;
    const [otherUser, otherProfile, messages] = await Promise.all([
      getAppUser(ctx, otherSlug),
      getTravelerProfile(ctx, otherSlug),
      getLatestDirectMessages(ctx, thread._id, 100),
    ]);

    if (!otherUser) {
      return null;
    }

    const messageViews = await Promise.all(
      messages.map(async (message) => {
        const [sender, senderProfile] = await Promise.all([
          getAppUser(ctx, message.senderSlug),
          getTravelerProfile(ctx, message.senderSlug),
        ]);

        return {
          _id: message._id,
          kind: message.kind ?? 'text',
          body: message.body,
          createdAt: message.createdAt,
          senderSlug: message.senderSlug,
          senderName: sender?.name ?? message.senderSlug,
          senderAvatarUri: senderProfile?.avatarUri ?? null,
          isOwnMessage: message.senderSlug === travelerSlug,
          replyTo:
            message.replyToMessageId && message.replyToSenderName && message.replyToPreview
              ? {
                  messageId: message.replyToMessageId,
                  senderName: message.replyToSenderName,
                  preview: message.replyToPreview,
                  kind: message.replyToKind ?? 'text',
                }
              : null,
          callCard:
            message.kind === 'call' || message.kind === 'scheduled_call'
              ? {
                  callId: message.callId ?? null,
                  mode: message.callMode ?? 'voice',
                  status: message.callStatus ?? (message.kind === 'scheduled_call' ? 'scheduled' : 'active'),
                  scheduledFor: message.callScheduledFor ?? null,
                  endsAt: message.callEndsAt ?? null,
                  reminderMinutesBefore: message.callReminderMinutesBefore ?? null,
                  title:
                    message.callTitle ??
                    (message.kind === 'scheduled_call'
                      ? `Scheduled ${formatCallMode(message.callMode ?? 'voice')}`
                      : `${formatCallMode(message.callMode ?? 'voice')} started`),
                  description: message.callDescription ?? null,
                }
              : null,
        };
      })
    );

    return {
      threadId: thread._id,
      title: thread.title ?? otherUser.name,
      participant: {
        slug: otherSlug,
        name: otherUser.name,
        avatarUri: otherProfile?.avatarUri ?? null,
        baseLabel: otherProfile?.regionName ?? otherUser.countryLabel,
      },
      messages: messageViews,
      composer: {
        placeholder: `Message ${otherUser.name}`,
      },
    };
  },
});

export const actOnFriendCandidate = mutation({
  args: {
    travelerSlug: v.string(),
    candidateSlug: v.string(),
    action: v.union(v.literal('invited'), v.literal('passed'), v.literal('friended')),
  },
  handler: async (ctx, args) => {
    const travelerSlug = await assertCurrentTravelerSlug(ctx, args.travelerSlug);
    const actor = await getAppUser(ctx, travelerSlug);
    const candidate = await getAppUser(ctx, args.candidateSlug);

    const matchAction = await ctx.db
      .query('friendMatchActions')
      .withIndex('by_travelerSlug_and_candidateSlug', (q) =>
        q.eq('travelerSlug', travelerSlug).eq('candidateSlug', args.candidateSlug)
      )
      .unique();

    if (args.action === 'friended') {
      const [existingConnection, existingReverseConnection] = await Promise.all([
        ctx.db
          .query('friendConnections')
          .withIndex('by_travelerSlug_and_friendSlug', (q) =>
            q.eq('travelerSlug', travelerSlug).eq('friendSlug', args.candidateSlug)
          )
          .unique(),
        ctx.db
          .query('friendConnections')
          .withIndex('by_travelerSlug_and_friendSlug', (q) =>
            q.eq('travelerSlug', args.candidateSlug).eq('friendSlug', travelerSlug)
          )
          .unique(),
      ]);

      if (existingConnection && existingReverseConnection) {
        return {
          ok: true,
          action: args.action,
        };
      }

      if (existingConnection && !existingReverseConnection) {
        await ctx.db.delete(existingConnection._id);
      }
      if (!existingConnection && existingReverseConnection) {
        await ctx.db.delete(existingReverseConnection._id);
      }

      const reversePendingRequest = await ctx.db
        .query('appNotifications')
        .withIndex('by_recipientSlug_and_createdAt', (q) => q.eq('recipientSlug', travelerSlug))
        .filter((q) =>
          q.and(
            q.eq(q.field('kind'), 'friend_invite'),
            q.eq(q.field('actorSlug'), args.candidateSlug),
            q.eq(q.field('actionStatus'), 'pending')
          )
        )
        .order('desc')
        .first();

      if (reversePendingRequest) {
        await ensureFriendConnectionPair(ctx, travelerSlug, args.candidateSlug, 'discovery');
        await getOrCreateDirectThread(ctx, travelerSlug, args.candidateSlug);
        await ctx.db.patch(reversePendingRequest._id, {
          actionStatus: 'approved',
          readAt: reversePendingRequest.readAt ?? Date.now(),
          viewedAt: reversePendingRequest.viewedAt ?? Date.now(),
        });
      } else if (candidate && actor) {
        const existingRequest = await ctx.db
          .query('appNotifications')
          .withIndex('by_recipientSlug_and_createdAt', (q) => q.eq('recipientSlug', candidate.slug as string))
          .filter((q) =>
            q.and(
              q.eq(q.field('kind'), 'friend_invite'),
              q.eq(q.field('actorSlug'), actor.slug as string),
              q.eq(q.field('actionStatus'), 'pending')
            )
          )
          .order('desc')
          .first();

        if (!existingRequest) {
          await insertAppNotification(ctx, {
            recipientSlug: candidate.slug as string,
            actorSlug: actor.slug as string,
            kind: 'friend_invite',
            title: `${actor.name} sent a friend request`,
            body: 'Accept to add each other on Wandr.',
            href: '/notifications',
            entityId: actor.slug,
            entityLabel: actor.name,
            actionStatus: 'pending',
          });
        }
      }

      if (matchAction) {
        await ctx.db.patch(matchAction._id, {
          state: 'invited',
          updatedAt: Date.now(),
        });
      } else {
        await ctx.db.insert('friendMatchActions', {
          travelerSlug: travelerSlug,
          candidateSlug: args.candidateSlug,
          state: 'invited',
          updatedAt: Date.now(),
        });
      }
    } else {
      if (matchAction) {
        await ctx.db.patch(matchAction._id, {
          state: args.action,
          updatedAt: Date.now(),
        });
      } else {
        await ctx.db.insert('friendMatchActions', {
          travelerSlug: travelerSlug,
          candidateSlug: args.candidateSlug,
          state: args.action,
          updatedAt: Date.now(),
        });
      }
    }

    const circle = await getActiveCircleForTraveler(ctx, travelerSlug);
    if (args.action === 'invited' && circle) {
      const existingMembership = await ctx.db
        .query('friendCircleMembers')
        .withIndex('by_circleId_and_travelerSlug', (q) =>
          q.eq('circleId', circle._id).eq('travelerSlug', args.candidateSlug)
        )
        .unique();

      if (!existingMembership) {
        await ctx.db.insert('friendCircleMembers', {
          circleId: circle._id,
          travelerSlug: args.candidateSlug,
          role: 'member',
          status: 'invited',
          joinedAt: Date.now(),
          note: 'Invited from discovery',
        });
      } else if (existingMembership.status !== 'invited') {
        await ctx.db.patch(existingMembership._id, {
          status: 'invited',
          joinedAt: Date.now(),
        });
      }

      await ctx.db.insert('friendMessages', {
        circleId: circle._id,
        senderSlug: travelerSlug,
        kind: 'system',
        body: candidate ? `${candidate.name} was invited to the circle.` : 'A new traveler was invited to the circle.',
        createdAt: Date.now(),
      });

      await ctx.db.patch(circle._id, {
        updatedAt: Date.now(),
      });

      if (candidate && actor) {
        await insertAppNotification(ctx, {
          recipientSlug: candidate.slug as string,
          actorSlug: actor.slug as string,
          kind: 'friend_invite',
          title: `${actor.name} invited you to a friends circle`,
          body: `Join ${circle.name} to plan the next stretch together.`,
          href: `/friends/group/${circle._id}`,
          entityId: circle._id,
          entityLabel: circle.name,
        });
      }
    }

    return {
      ok: true,
      action: args.action,
    };
  },
});

export const sendFriendMessage = mutation({
  args: {
    circleId: v.id('friendCircles'),
    travelerSlug: v.string(),
    body: v.string(),
    replyToMessageId: v.optional(v.id('friendMessages')),
  },
  handler: async (ctx, args) => {
    const travelerSlug = await assertCurrentTravelerSlug(ctx, args.travelerSlug);
    const trimmedBody = args.body.trim();
    if (!trimmedBody) {
      return null;
    }

    const replySnapshot = await getGroupReplySnapshot(ctx, args.circleId, args.replyToMessageId);
    const messageId = await ctx.db.insert('friendMessages', {
      circleId: args.circleId,
      senderSlug: travelerSlug,
      kind: 'text',
      body: trimmedBody,
      ...(replySnapshot ?? {}),
      createdAt: Date.now(),
    });

    await ctx.db.patch(args.circleId, {
      updatedAt: Date.now(),
    });
    const [circle, sender, members] = await Promise.all([
      ctx.db.get(args.circleId),
      getAppUser(ctx, travelerSlug),
      getCircleMembers(ctx, args.circleId),
    ]);
    const recipientSlugs = members
      .filter((member) => member.status === 'active' && member.travelerSlug !== travelerSlug)
      .map((member) => member.travelerSlug);
    if (circle && recipientSlugs.length > 0) {
      await ctx.scheduler.runAfter(0, internal.notifications.sendChatPush, {
        recipientSlugs,
        senderName: sender?.name ?? travelerSlug,
        title: circle.name,
        body: `${sender?.name ?? travelerSlug}: ${trimmedBody}`,
        href: `/friends/group/${args.circleId}`,
        threadKind: 'group',
        entityId: args.circleId,
      });
    }

    return messageId;
  },
});

export const sendDirectFriendMessage = mutation({
  args: {
    threadId: v.id('friendDirectThreads'),
    travelerSlug: v.string(),
    body: v.string(),
    replyToMessageId: v.optional(v.id('friendDirectMessages')),
  },
  handler: async (ctx, args) => {
    const travelerSlug = await assertCurrentTravelerSlug(ctx, args.travelerSlug);
    const trimmedBody = args.body.trim();
    if (!trimmedBody) {
      return null;
    }

    const thread = await ctx.db.get(args.threadId);
    if (!thread) {
      return null;
    }

    if (thread.participantA !== travelerSlug && thread.participantB !== travelerSlug) {
      return null;
    }

    const replySnapshot = await getDirectReplySnapshot(ctx, args.threadId, args.replyToMessageId);
    const messageId = await ctx.db.insert('friendDirectMessages', {
      threadId: args.threadId,
      senderSlug: travelerSlug,
      body: trimmedBody,
      ...(replySnapshot ?? {}),
      createdAt: Date.now(),
    });

    await ctx.db.patch(args.threadId, {
      updatedAt: Date.now(),
    });
    const recipientSlug = thread.participantA === travelerSlug ? thread.participantB : thread.participantA;
    const sender = await getAppUser(ctx, travelerSlug);
    await ctx.scheduler.runAfter(0, internal.notifications.sendChatPush, {
      recipientSlugs: [recipientSlug],
      senderName: sender?.name ?? travelerSlug,
      title: sender?.name ?? 'Wandr chat',
      body: trimmedBody,
      href: `/friends/direct/${args.threadId}`,
      threadKind: 'direct',
      entityId: args.threadId,
    });

    return messageId;
  },
});

export const startDirectFriendCall = mutation({
  args: {
    threadId: v.id('friendDirectThreads'),
    travelerSlug: v.string(),
    mode: v.union(v.literal('voice'), v.literal('video')),
  },
  handler: async (ctx, args) => {
    const travelerSlug = await assertCurrentTravelerSlug(ctx, args.travelerSlug);
    const access = await requireDirectThreadParticipant(ctx, args.threadId, travelerSlug);
    if (!access) {
      return null;
    }

    const now = Date.now();
    const callLabel = formatCallMode(args.mode);
    const [actor, otherUser] = await Promise.all([
      getAppUser(ctx, travelerSlug),
      getAppUser(ctx, access.otherSlug),
    ]);
    const title = `${actor?.name ?? travelerSlug} ${callLabel}`;
    const callId = await ctx.db.insert('friendCalls', {
      directThreadId: args.threadId,
      roomName: buildCallRoomName(args.threadId, now),
      createdBySlug: travelerSlug,
      mode: args.mode,
      status: 'active',
      startedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert('friendDirectMessages', {
      threadId: args.threadId,
      senderSlug: travelerSlug,
      kind: 'call',
      body: `Started a ${callLabel}.`,
      callId,
      callMode: args.mode,
      callStatus: 'active',
      callTitle: `${otherUser?.name ?? access.otherSlug} ${callLabel}`,
      createdAt: now,
    });

    await ctx.db.patch(args.threadId, { updatedAt: now });
    await notifyDirectParticipantAboutCall(ctx, {
      thread: access.thread,
      actorSlug: travelerSlug,
      callId,
      kind: 'friend_call',
      title,
      body: `Join the ${callLabel} now.`,
      mode: args.mode,
    });

    return await ctx.db.get(callId);
  },
});

export const renameDirectFriendThread = mutation({
  args: {
    travelerSlug: v.string(),
    threadId: v.id('friendDirectThreads'),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const travelerSlug = await assertCurrentTravelerSlug(ctx, args.travelerSlug);
    const nextTitle = args.title.trim().slice(0, 80);
    if (!nextTitle) {
      return false;
    }

    const thread = await ctx.db.get(args.threadId);
    if (!thread || (thread.participantA !== travelerSlug && thread.participantB !== travelerSlug)) {
      return false;
    }

    await ctx.db.patch(args.threadId, {
      title: nextTitle,
      updatedAt: Date.now(),
    });

    return true;
  },
});

export const deleteDirectFriendThread = mutation({
  args: {
    travelerSlug: v.string(),
    threadId: v.id('friendDirectThreads'),
  },
  handler: async (ctx, args) => {
    const travelerSlug = await assertCurrentTravelerSlug(ctx, args.travelerSlug);
    const thread = await ctx.db.get(args.threadId);
    if (!thread || (thread.participantA !== travelerSlug && thread.participantB !== travelerSlug)) {
      return false;
    }

    await deleteDirectThreadDocuments(ctx, args.threadId);
    return true;
  },
});

export const deleteFriendMessage = mutation({
  args: {
    messageId: v.id('friendMessages'),
    travelerSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const travelerSlug = await assertCurrentTravelerSlug(ctx, args.travelerSlug);
    const message = await ctx.db.get(args.messageId);
    if (!message || message.senderSlug !== travelerSlug || message.kind === 'system') {
      return false;
    }

    await ctx.db.delete(args.messageId);
    await ctx.db.patch(message.circleId, {
      updatedAt: Date.now(),
    });

    return true;
  },
});

export const deleteDirectFriendMessage = mutation({
  args: {
    messageId: v.id('friendDirectMessages'),
    travelerSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const travelerSlug = await assertCurrentTravelerSlug(ctx, args.travelerSlug);
    const message = await ctx.db.get(args.messageId);
    if (!message || message.senderSlug !== travelerSlug) {
      return false;
    }

    await ctx.db.delete(args.messageId);

    const thread = await ctx.db.get(message.threadId);
    if (thread) {
      await ctx.db.patch(thread._id, {
        updatedAt: Date.now(),
      });
    }

    return true;
  },
});

export const markFriendChatRead = mutation({
  args: {
    circleId: v.id('friendCircles'),
    travelerSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const travelerSlug = await assertCurrentTravelerSlug(ctx, args.travelerSlug);
    const membership = await ctx.db
      .query('friendCircleMembers')
      .withIndex('by_circleId_and_travelerSlug', (q) =>
        q.eq('circleId', args.circleId).eq('travelerSlug', travelerSlug)
      )
      .unique();

    if (!membership || membership.status !== 'active') {
      return false;
    }

    const latestMessage = await ctx.db
      .query('friendMessages')
      .withIndex('by_circleId_and_createdAt', (q) => q.eq('circleId', args.circleId))
      .order('desc')
      .take(1);

    const lastReadAt = Math.max(Date.now(), latestMessage[0]?.createdAt ?? 0);
    const existing = await ctx.db
      .query('friendCircleReadStates')
      .withIndex('by_circleId_and_travelerSlug', (q) =>
        q.eq('circleId', args.circleId).eq('travelerSlug', travelerSlug)
      )
      .unique();

    if (existing) {
      if (existing.lastReadAt >= lastReadAt) {
        return true;
      }
      await ctx.db.patch(existing._id, { lastReadAt });
      return true;
    }

    await ctx.db.insert('friendCircleReadStates', {
      circleId: args.circleId,
      travelerSlug: travelerSlug,
      lastReadAt,
    });

    return true;
  },
});

export const markDirectChatRead = mutation({
  args: {
    threadId: v.id('friendDirectThreads'),
    travelerSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const travelerSlug = await assertCurrentTravelerSlug(ctx, args.travelerSlug);
    const thread = await ctx.db.get(args.threadId);
    if (!thread) {
      return false;
    }

    if (thread.participantA !== travelerSlug && thread.participantB !== travelerSlug) {
      return false;
    }

    const latestMessage = await ctx.db
      .query('friendDirectMessages')
      .withIndex('by_threadId_and_createdAt', (q) => q.eq('threadId', args.threadId))
      .order('desc')
      .take(1);

    const lastReadAt = Math.max(Date.now(), latestMessage[0]?.createdAt ?? 0);
    const existing = await ctx.db
      .query('friendDirectReadStates')
      .withIndex('by_threadId_and_travelerSlug', (q) =>
        q.eq('threadId', args.threadId).eq('travelerSlug', travelerSlug)
      )
      .unique();

    if (existing) {
      if (existing.lastReadAt >= lastReadAt) {
        return true;
      }
      await ctx.db.patch(existing._id, { lastReadAt });
      return true;
    }

    await ctx.db.insert('friendDirectReadStates', {
      threadId: args.threadId,
      travelerSlug: travelerSlug,
      lastReadAt,
    });

    return true;
  },
});

export const shareTripRouteInFriendChat = mutation({
  args: {
    circleId: v.id('friendCircles'),
    travelerSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const travelerSlug = await assertCurrentTravelerSlug(ctx, args.travelerSlug);
    const routeShare = await buildRouteShare(ctx, travelerSlug);
    const messageId = await ctx.db.insert('friendMessages', {
      circleId: args.circleId,
      senderSlug: travelerSlug,
      kind: 'route',
      body: 'Shared the latest route draft.',
      routeTitle: routeShare.routeTitle,
      routeSummary: routeShare.routeSummary,
      routeDistanceLabel: routeShare.routeDistanceLabel,
      routeStopCount: routeShare.routeStopCount,
      routeStopsPreview: routeShare.routeStopsPreview,
      createdAt: Date.now(),
    });

    await ctx.db.patch(args.circleId, {
      updatedAt: Date.now(),
    });

    return messageId;
  },
});

export const startFriendCall = mutation({
  args: {
    circleId: v.id('friendCircles'),
    travelerSlug: v.string(),
    mode: v.union(v.literal('voice'), v.literal('video')),
  },
  handler: async (ctx, args) => {
    const travelerSlug = await assertCurrentTravelerSlug(ctx, args.travelerSlug);
    const access = await requireActiveCircleMember(ctx, args.circleId, travelerSlug);
    if (!access) {
      return null;
    }

    const now = Date.now();
    const callId = await ctx.db.insert('friendCalls', {
      circleId: args.circleId,
      roomName: buildCallRoomName(args.circleId, now),
      createdBySlug: travelerSlug,
      mode: args.mode,
      status: 'active',
      startedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    const callLabel = formatCallMode(args.mode);
    await ctx.db.insert('friendMessages', {
      circleId: args.circleId,
      senderSlug: travelerSlug,
      kind: 'call',
      body: `Started a ${callLabel}.`,
      callId,
      callMode: args.mode,
      callStatus: 'active',
      callTitle: `${access.circle.name} ${callLabel}`,
      createdAt: now,
    });

    await ctx.db.patch(args.circleId, { updatedAt: now });
    await notifyCircleMembersAboutCall(ctx, {
      circleId: args.circleId,
      actorSlug: travelerSlug,
      callId,
      kind: 'friend_call',
      title: `${access.circle.name} ${callLabel}`,
      body: `Join the ${callLabel} now.`,
      mode: args.mode,
    });

    const call = await ctx.db.get(callId);
    return call;
  },
});

export const scheduleFriendCall = mutation({
  args: {
    circleId: v.id('friendCircles'),
    travelerSlug: v.string(),
    mode: v.union(v.literal('voice'), v.literal('video')),
    scheduledFor: v.number(),
    endsAt: v.optional(v.number()),
    reminderMinutesBefore: v.optional(v.number()),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const travelerSlug = await assertCurrentTravelerSlug(ctx, args.travelerSlug);
    const access = await requireActiveCircleMember(ctx, args.circleId, travelerSlug);
    if (!access) {
      return null;
    }

    const now = Date.now();
    const scheduledFor = Math.max(args.scheduledFor, now + 60_000);
    const endsAt = args.endsAt && args.endsAt > scheduledFor ? args.endsAt : undefined;
    const reminderMinutesBefore = args.reminderMinutesBefore ?? 15;
    const callLabel = formatCallMode(args.mode);
    const title = args.title?.trim() || `${access.circle.name} ${callLabel}`;
    const description = args.description?.trim() || undefined;
    const callId = await ctx.db.insert('friendCalls', {
      circleId: args.circleId,
      roomName: buildCallRoomName(args.circleId, now),
      createdBySlug: travelerSlug,
      mode: args.mode,
      status: 'scheduled',
      title,
      description,
      scheduledFor,
      endsAt,
      reminderMinutesBefore,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert('friendMessages', {
      circleId: args.circleId,
      senderSlug: travelerSlug,
      kind: 'scheduled_call',
      body: `Scheduled a ${callLabel}.`,
      callId,
      callMode: args.mode,
      callStatus: 'scheduled',
      callScheduledFor: scheduledFor,
      callEndsAt: endsAt,
      callReminderMinutesBefore: reminderMinutesBefore,
      callTitle: title,
      callDescription: description,
      createdAt: now,
    });

    await ctx.db.patch(args.circleId, { updatedAt: now });
    await notifyCircleMembersAboutCall(ctx, {
      circleId: args.circleId,
      actorSlug: travelerSlug,
      callId,
      kind: 'friend_call',
      title,
      body: `A ${callLabel} was scheduled for this group.`,
    });

    if (reminderMinutesBefore > 0) {
      await ctx.scheduler.runAt(
        Math.max(now + 1_000, scheduledFor - reminderMinutesBefore * 60_000),
        internal.friends.sendScheduledCallReminder,
        {
          callId,
        }
      );
    }

    const call = await ctx.db.get(callId);
    return call;
  },
});

export const joinScheduledFriendCall = mutation({
  args: {
    callId: v.id('friendCalls'),
    travelerSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const travelerSlug = await assertCurrentTravelerSlug(ctx, args.travelerSlug);
    const call = await ctx.db.get(args.callId);
    if (!call) {
      return null;
    }

    const circleAccess = call.circleId
      ? await requireActiveCircleMember(ctx, call.circleId, travelerSlug)
      : null;
    const directAccess = call.directThreadId
      ? await requireDirectThreadParticipant(ctx, call.directThreadId, travelerSlug)
      : null;
    if (!circleAccess && !directAccess) {
      return null;
    }

    if (call.status === 'scheduled') {
      const now = Date.now();
      await ctx.db.patch(call._id, {
        status: 'active',
        startedAt: now,
        updatedAt: now,
      });
      if (call.circleId) {
        await ctx.db.patch(call.circleId, { updatedAt: now });
      }
      if (call.directThreadId) {
        await ctx.db.patch(call.directThreadId, { updatedAt: now });
      }
    }

    return await ctx.db.get(call._id);
  },
});

export const endFriendCall = mutation({
  args: {
    callId: v.id('friendCalls'),
    travelerSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const travelerSlug = await assertCurrentTravelerSlug(ctx, args.travelerSlug);
    const call = await ctx.db.get(args.callId);
    if (!call) {
      return null;
    }

    const circleAccess = call.circleId
      ? await requireActiveCircleMember(ctx, call.circleId, travelerSlug)
      : null;
    const directAccess = call.directThreadId
      ? await requireDirectThreadParticipant(ctx, call.directThreadId, travelerSlug)
      : null;
    if (!circleAccess && !directAccess) {
      return null;
    }

    const now = Date.now();
    await ctx.db.patch(call._id, {
      status: 'ended',
      endedAt: now,
      updatedAt: now,
    });

    if (call.circleId) {
      const callMessages = await ctx.db
        .query('friendMessages')
        .withIndex('by_circleId_and_createdAt', (q) => q.eq('circleId', call.circleId!))
        .order('desc')
        .take(50);

      await Promise.all(
        callMessages
          .filter((message) => message.callId === call._id && message.callStatus !== 'ended')
          .map((message) => ctx.db.patch(message._id, { callStatus: 'ended' }))
      );
      await ctx.db.patch(call.circleId, { updatedAt: now });
    }

    if (call.directThreadId) {
      const callMessages = await ctx.db
        .query('friendDirectMessages')
        .withIndex('by_threadId_and_createdAt', (q) => q.eq('threadId', call.directThreadId!))
        .order('desc')
        .take(50);

      await Promise.all(
        callMessages
          .filter((message) => message.callId === call._id && message.callStatus !== 'ended')
          .map((message) => ctx.db.patch(message._id, { callStatus: 'ended' }))
      );
      await ctx.db.patch(call.directThreadId, { updatedAt: now });
    }

    return await ctx.db.get(call._id);
  },
});

export const getFriendCall = query({
  args: {
    callId: v.id('friendCalls'),
    travelerSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const travelerSlug = await assertCurrentTravelerSlug(ctx, args.travelerSlug);
    const call = await ctx.db.get(args.callId);
    if (!call || call.status === 'ended' || call.status === 'cancelled') {
      return null;
    }

    const circleAccess = call.circleId
      ? await requireActiveCircleMember(ctx, call.circleId, travelerSlug)
      : null;
    const directAccess = call.directThreadId
      ? await requireDirectThreadParticipant(ctx, call.directThreadId, travelerSlug)
      : null;
    if (!circleAccess && !directAccess) {
      return null;
    }

    const [creator, members] = await Promise.all([
      getAppUser(ctx, call.createdBySlug),
      call.circleId ? getCircleMembers(ctx, call.circleId) : Promise.resolve([]),
    ]);
    const memberViews = call.circleId
      ? await Promise.all(members.map((member) => buildMemberView(ctx, member)))
      : directAccess
        ? await buildDirectCallMemberViews(ctx, directAccess.thread)
        : [];
    const directOther = directAccess ? await getAppUser(ctx, directAccess.otherSlug) : null;
    const callName = circleAccess?.circle.name ?? directOther?.name ?? directAccess?.otherSlug ?? 'Wandr';

    return {
      _id: call._id,
      circleId: call.circleId ?? null,
      directThreadId: call.directThreadId ?? null,
      circleName: callName,
      roomName: call.roomName,
      createdBySlug: call.createdBySlug,
      createdByName: creator?.name ?? call.createdBySlug,
      mode: call.mode,
      status: call.status,
      title: call.title ?? `${callName} ${formatCallMode(call.mode)}`,
      description: call.description ?? null,
      scheduledFor: call.scheduledFor ?? null,
      endsAt: call.endsAt ?? null,
      reminderMinutesBefore: call.reminderMinutesBefore ?? null,
      startedAt: call.startedAt ?? null,
      members: memberViews,
    };
  },
});

export const listIncomingFriendCalls = query({
  args: {
    travelerSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const travelerSlug = await assertCurrentTravelerSlug(ctx, args.travelerSlug);
    const [memberships, directThreads] = await Promise.all([
      getActiveCircleMemberships(ctx, travelerSlug),
      getDirectThreadsForTraveler(ctx, travelerSlug),
    ]);
    const now = Date.now();
    const incomingCalls = [];

    for (const membership of memberships) {
      const calls = await ctx.db
        .query('friendCalls')
        .withIndex('by_circleId_and_createdAt', (q) => q.eq('circleId', membership.circleId))
        .order('desc')
        .take(6);

      for (const call of calls) {
        if (
          call.status !== 'active' ||
          call.createdBySlug === travelerSlug ||
          now - (call.startedAt ?? call.createdAt) > INCOMING_CALL_WINDOW_MS
        ) {
          continue;
        }

        const [circle, creator, creatorProfile] = await Promise.all([
          ctx.db.get(membership.circleId),
          getAppUser(ctx, call.createdBySlug),
          getTravelerProfile(ctx, call.createdBySlug),
        ]);

        if (!circle) {
          continue;
        }

        incomingCalls.push({
          _id: call._id,
          circleId: membership.circleId,
          directThreadId: call.directThreadId ?? null,
          circleName: circle.name,
          createdBySlug: call.createdBySlug,
          createdByName: creator?.name ?? call.createdBySlug,
          createdByAvatarUri: creatorProfile?.avatarUri ?? null,
          mode: call.mode,
          title: call.title ?? `${circle.name} ${formatCallMode(call.mode)}`,
          startedAt: call.startedAt ?? call.createdAt,
        });
      }
    }

    for (const thread of directThreads) {
      const calls = await ctx.db
        .query('friendCalls')
        .withIndex('by_directThreadId_and_createdAt', (q) => q.eq('directThreadId', thread._id))
        .order('desc')
        .take(6);

      for (const call of calls) {
        if (
          call.status !== 'active' ||
          call.createdBySlug === travelerSlug ||
          now - (call.startedAt ?? call.createdAt) > INCOMING_CALL_WINDOW_MS
        ) {
          continue;
        }

        const [creator, creatorProfile] = await Promise.all([
          getAppUser(ctx, call.createdBySlug),
          getTravelerProfile(ctx, call.createdBySlug),
        ]);

        incomingCalls.push({
          _id: call._id,
          circleId: call.circleId ?? null,
          directThreadId: thread._id,
          circleName: creator?.name ?? call.createdBySlug,
          createdBySlug: call.createdBySlug,
          createdByName: creator?.name ?? call.createdBySlug,
          createdByAvatarUri: creatorProfile?.avatarUri ?? null,
          mode: call.mode,
          title: call.title ?? `${creator?.name ?? call.createdBySlug} ${formatCallMode(call.mode)}`,
          startedAt: call.startedAt ?? call.createdAt,
        });
      }
    }

    return incomingCalls.sort((a, b) => b.startedAt - a.startedAt);
  },
});

export const getFriendCallTokenContext = internalQuery({
  args: {
    callId: v.id('friendCalls'),
    travelerSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const travelerSlug = await assertCurrentTravelerSlug(ctx, args.travelerSlug);
    const call = await ctx.db.get(args.callId);
    if (!call) {
      return null;
    }

    const circleAccess = call.circleId
      ? await requireActiveCircleMember(ctx, call.circleId, travelerSlug)
      : null;
    const directAccess = call.directThreadId
      ? await requireDirectThreadParticipant(ctx, call.directThreadId, travelerSlug)
      : null;
    if (!circleAccess && !directAccess) {
      return null;
    }

    const user = await getAppUser(ctx, travelerSlug);
    return {
      roomName: call.roomName,
      identity: travelerSlug,
      name: user?.name ?? travelerSlug,
      canPublishSources: call.mode === 'voice' ? ['microphone'] : ['camera', 'microphone'],
    };
  },
});

export const sendScheduledCallReminder = internalMutation({
  args: {
    callId: v.id('friendCalls'),
  },
  handler: async (ctx, args) => {
    const call = await ctx.db.get(args.callId);
    if (!call || call.status !== 'scheduled') {
      return false;
    }

    if (call.circleId) {
      const circle = await ctx.db.get(call.circleId);
      if (!circle) {
        return false;
      }

      const title = call.title ?? `${circle.name} ${formatCallMode(call.mode)}`;
      await notifyCircleMembersAboutCall(ctx, {
        circleId: call.circleId,
        actorSlug: call.createdBySlug,
        callId: call._id,
        kind: 'friend_call_reminder',
        title,
        body: `Reminder: ${formatCallMode(call.mode)} starts soon.`,
      });
      return true;
    }

    if (call.directThreadId) {
      const access = await requireDirectThreadParticipant(ctx, call.directThreadId, call.createdBySlug);
      if (!access) {
        return false;
      }
      const actor = await getAppUser(ctx, call.createdBySlug);
      const title = call.title ?? `${actor?.name ?? call.createdBySlug} ${formatCallMode(call.mode)}`;
      await notifyDirectParticipantAboutCall(ctx, {
        thread: access.thread,
        actorSlug: call.createdBySlug,
        callId: call._id,
        kind: 'friend_call_reminder',
        title,
        body: `Reminder: ${formatCallMode(call.mode)} starts soon.`,
      });
      return true;
    }

    return false;
  },
});
