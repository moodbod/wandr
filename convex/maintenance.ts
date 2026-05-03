import { v } from 'convex/values';

import { mutation, type MutationCtx } from './_generated/server';
import { demoExploreTravelers } from './seeds/demoExploreTravelers';
import { seedFriendProfiles } from './seeds/seedFriends';

const demoTravelerSlugs: Set<string> = new Set([
  ...demoExploreTravelers.map((traveler) => traveler.slug),
  ...seedFriendProfiles.map((profile) => profile.travelerSlug),
]);

function isDemoSlug(slug: string | undefined) {
  return Boolean(slug && demoTravelerSlugs.has(slug));
}

function isFakeProfileImageUrl(uri: string | undefined) {
  return Boolean(
    uri &&
      (uri.includes('images.unsplash.com') ||
        uri.includes('images.pexels.com') ||
        uri.includes('randomuser.me') ||
        uri.includes('i.pravatar.cc'))
  );
}

async function deleteDemoCircleGraph(ctx: MutationCtx) {
  const circles = await ctx.db.query('friendCircles').collect();
  const demoCircleIds = new Set(
    circles
      .filter((circle) => isDemoSlug(circle.createdBySlug))
      .map((circle) => circle._id)
  );

  const trips = await ctx.db.query('trips').collect();
  for (const trip of trips) {
    if (trip.circleId && isDemoSlug(trip.travelerSlug)) {
      demoCircleIds.add(trip.circleId);
    }
  }

  for (const call of await ctx.db.query('friendCalls').collect()) {
    if (
      isDemoSlug(call.createdBySlug) ||
      (call.circleId && demoCircleIds.has(call.circleId))
    ) {
      await ctx.db.delete(call._id);
    }
  }

  for (const message of await ctx.db.query('friendMessages').collect()) {
    if (isDemoSlug(message.senderSlug) || demoCircleIds.has(message.circleId)) {
      await ctx.db.delete(message._id);
    }
  }

  for (const readState of await ctx.db.query('friendCircleReadStates').collect()) {
    if (isDemoSlug(readState.travelerSlug) || demoCircleIds.has(readState.circleId)) {
      await ctx.db.delete(readState._id);
    }
  }

  for (const member of await ctx.db.query('friendCircleMembers').collect()) {
    if (isDemoSlug(member.travelerSlug) || demoCircleIds.has(member.circleId)) {
      await ctx.db.delete(member._id);
    }
  }

  for (const circle of circles) {
    if (demoCircleIds.has(circle._id)) {
      await ctx.db.delete(circle._id);
    }
  }
}

async function deleteDemoDirectChatGraph(ctx: MutationCtx) {
  const threads = await ctx.db.query('friendDirectThreads').collect();
  const demoThreadIds = new Set(
    threads
      .filter((thread) => isDemoSlug(thread.participantA) || isDemoSlug(thread.participantB))
      .map((thread) => thread._id)
  );

  for (const call of await ctx.db.query('friendCalls').collect()) {
    if (call.directThreadId && demoThreadIds.has(call.directThreadId)) {
      await ctx.db.delete(call._id);
    }
  }

  for (const message of await ctx.db.query('friendDirectMessages').collect()) {
    if (isDemoSlug(message.senderSlug) || demoThreadIds.has(message.threadId)) {
      await ctx.db.delete(message._id);
    }
  }

  for (const readState of await ctx.db.query('friendDirectReadStates').collect()) {
    if (isDemoSlug(readState.travelerSlug) || demoThreadIds.has(readState.threadId)) {
      await ctx.db.delete(readState._id);
    }
  }

  for (const thread of threads) {
    if (demoThreadIds.has(thread._id)) {
      await ctx.db.delete(thread._id);
    }
  }
}

export const removeDemoUsers = mutation({
  args: {
    confirm: v.literal('remove-demo-users'),
  },
  handler: async (ctx) => {
    let deleted = 0;

    await deleteDemoCircleGraph(ctx);
    await deleteDemoDirectChatGraph(ctx);

    for (const notification of await ctx.db.query('appNotifications').collect()) {
      if (isDemoSlug(notification.recipientSlug) || isDemoSlug(notification.actorSlug)) {
        await ctx.db.delete(notification._id);
        deleted += 1;
      }
    }

    for (const invite of await ctx.db.query('tripInvites').collect()) {
      if (isDemoSlug(invite.inviterSlug) || isDemoSlug(invite.inviteeSlug)) {
        await ctx.db.delete(invite._id);
        deleted += 1;
      }
    }

    for (const connection of await ctx.db.query('friendConnections').collect()) {
      if (isDemoSlug(connection.travelerSlug) || isDemoSlug(connection.friendSlug)) {
        await ctx.db.delete(connection._id);
        deleted += 1;
      }
    }

    for (const action of await ctx.db.query('friendMatchActions').collect()) {
      if (isDemoSlug(action.travelerSlug) || isDemoSlug(action.candidateSlug)) {
        await ctx.db.delete(action._id);
        deleted += 1;
      }
    }

    for (const table of ['appUsers', 'travelerProfiles', 'friendProfiles'] as const) {
      for (const record of await ctx.db.query(table).collect()) {
        const slug = 'slug' in record ? record.slug : record.travelerSlug;
        if (isDemoSlug(slug)) {
          await ctx.db.delete(record._id);
          deleted += 1;
        }
      }
    }

    for (const table of [
      'trips',
      'experienceBookings',
      'locationLikes',
      'locationPhotos',
      'tripVisits',
      'stayBookings',
      'experienceRatings',
      'stayRatings',
    ] as const) {
      for (const record of await ctx.db.query(table).collect()) {
        if (isDemoSlug(record.travelerSlug)) {
          await ctx.db.delete(record._id);
          deleted += 1;
        }
      }
    }

    return {
      deleted,
      demoTravelerSlugs: [...demoTravelerSlugs],
    };
  },
});

export const clearFakeProfilePictures = mutation({
  args: {
    confirm: v.literal('clear-fake-profile-pictures'),
  },
  handler: async (ctx) => {
    let cleared = 0;

    for (const profile of await ctx.db.query('travelerProfiles').collect()) {
      if (isFakeProfileImageUrl(profile.avatarUri)) {
        await ctx.db.patch(profile._id, { avatarUri: undefined });
        cleared += 1;
      }
    }

    return { cleared };
  },
});
