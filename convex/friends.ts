import { v } from 'convex/values';

import type { Doc, Id } from './_generated/dataModel';
import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server';
import { demoExploreTravelers } from './seeds/demoExploreTravelers';
import { seedFriendProfiles } from './seeds/seedFriends';

type FriendProfileDoc = Doc<'friendProfiles'>;
type FriendCircleDoc = Doc<'friendCircles'>;
type FriendMemberDoc = Doc<'friendCircleMembers'>;

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

  const travelers = await ctx.db.query('appUsers').collect();
  const sortedTravelers = [...travelers].sort((a, b) => a.name.localeCompare(b.name));
  return sortedTravelers[0]?.slug ?? null;
}

async function getAppUser(ctx: QueryCtx | MutationCtx, travelerSlug: string) {
  return await ctx.db
    .query('appUsers')
    .withIndex('by_slug', (q) => q.eq('slug', travelerSlug))
    .unique();
}

async function getTravelerProfile(ctx: QueryCtx | MutationCtx, travelerSlug: string) {
  return await ctx.db
    .query('travelerProfiles')
    .withIndex('by_slug', (q) => q.eq('travelerSlug', travelerSlug))
    .unique();
}

async function getFriendProfile(ctx: QueryCtx | MutationCtx, travelerSlug: string) {
  return await ctx.db
    .query('friendProfiles')
    .withIndex('by_travelerSlug', (q) => q.eq('travelerSlug', travelerSlug))
    .unique();
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

async function insertAppNotification(
  ctx: MutationCtx,
  args: {
    recipientSlug: string;
    actorSlug?: string;
    kind: 'friend_invite' | 'friend_added' | 'trip_arrival' | 'trip_rating';
    title: string;
    body: string;
    href?: string;
    entityId?: string;
    entityLabel?: string;
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
    createdAt: Date.now(),
  });
}

function computeMatchScore(current: FriendProfileDoc, candidate: FriendProfileDoc) {
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

async function buildCandidates(
  ctx: QueryCtx | MutationCtx,
  travelerSlug: string,
  limit?: number
) {
  const currentProfile = await getFriendProfile(ctx, travelerSlug);
  if (!currentProfile) {
    return [];
  }

  const activeCircle = await getActiveCircleForTraveler(ctx, travelerSlug);
  const activeMembers = activeCircle ? await getCircleMembers(ctx, activeCircle._id) : [];
  const connectionSet = await getFriendConnectionSet(ctx, travelerSlug);
  const excludedSlugs = new Set<string>([travelerSlug, ...activeMembers.map((member) => member.travelerSlug)]);
  const actionMap = await getActionMap(ctx, travelerSlug);
  const allProfiles = await ctx.db.query('friendProfiles').collect();

  const candidates = await Promise.all(
    allProfiles
      .filter((candidate) => !excludedSlugs.has(candidate.travelerSlug))
      .map(async (candidate) => {
        const [user, travelerProfile] = await Promise.all([
          getAppUser(ctx, candidate.travelerSlug),
          getTravelerProfile(ctx, candidate.travelerSlug),
        ]);

        if (!user) {
          return null;
        }

        const match = computeMatchScore(currentProfile, candidate);
        const action = actionMap.get(candidate.travelerSlug);

        return {
          travelerSlug: candidate.travelerSlug,
          name: user.name,
          avatarUri: travelerProfile?.avatarUri ?? null,
          countryLabel: user.countryLabel,
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
    .sort((a, b) => {
      if (a.actionState === 'invited' && b.actionState !== 'invited') {
        return -1;
      }
      if (a.actionState !== 'invited' && b.actionState === 'invited') {
        return 1;
      }
      return b.matchScore - a.matchScore;
    });

  return typeof limit === 'number' ? sorted.slice(0, limit) : sorted;
}

async function ensureBaseTravelers(ctx: MutationCtx) {
  for (const traveler of demoExploreTravelers) {
    const existingUser = await getAppUser(ctx, traveler.slug);
    if (!existingUser) {
      await ctx.db.insert('appUsers', {
        slug: traveler.slug,
        name: traveler.name,
        countryCode: traveler.countryCode,
        countryLabel: traveler.countryLabel,
      });
    }

    const existingProfile = await getTravelerProfile(ctx, traveler.slug);
    if (!existingProfile) {
      const region = buildRegionFromCountry(traveler.countryCode, traveler.countryLabel);
      await ctx.db.insert('travelerProfiles', {
        travelerSlug: traveler.slug,
        name: traveler.name,
        avatarUri: traveler.avatarUri,
        regionCode: region.regionCode,
        regionName: region.regionName,
      });
    }
  }

  for (const profile of seedFriendProfiles) {
    const existing = await getFriendProfile(ctx, profile.travelerSlug);
    if (!existing) {
      await ctx.db.insert('friendProfiles', {
        ...profile,
        interests: [...profile.interests],
      });
    }
  }
}

async function buildRouteShare(ctx: MutationCtx, travelerSlug: string) {
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

  return {
    routeTitle: activeTrip.name.toLowerCase() === 'default' ? 'My Trip Route' : activeTrip.name,
    routeSummary:
      previewStops.length > 0
        ? `Stops lined up for ${previewStops.join(', ')}.`
        : 'Shared the latest route draft for this trip.',
    routeDistanceLabel: bookings.length > 0 ? `${bookings.length} planned stops` : 'Route draft',
    routeStopCount: bookings.length,
    routeStopsPreview: previewStops,
  };
}

export const ensureFriendsSeed = mutation({
  args: {
    travelerSlug: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ensureBaseTravelers(ctx);

    const resolvedTravelerSlug = await resolveCurrentTravelerSlug(ctx, args.travelerSlug);
    if (!resolvedTravelerSlug) {
      return false;
    }

    const existingCircle = await getActiveCircleForTraveler(ctx, resolvedTravelerSlug);
    if (existingCircle) {
      return true;
    }

    const hostUser = await getAppUser(ctx, resolvedTravelerSlug);
    if (!hostUser) {
      return false;
    }

    const trips = await ctx.db
      .query('trips')
      .withIndex('by_travelerSlug', (q) => q.eq('travelerSlug', resolvedTravelerSlug))
      .order('desc')
      .collect();

    const now = Date.now();
    const firstName = hostUser.name.split(' ')[0] ?? hostUser.name;
    const circleId = await ctx.db.insert('friendCircles', {
      slug: `${resolvedTravelerSlug}-friends`,
      name: `${firstName}'s Namibia Friends`,
      destinationLabel: 'Namibia loop',
      heroLabel: 'Road-plan crew',
      status: 'active',
      createdBySlug: resolvedTravelerSlug,
      tripId: trips[0]?._id,
      createdAt: now - 1000 * 60 * 30,
      updatedAt: now,
    });

    const fallbackMembers = seedFriendProfiles
      .map((profile) => profile.travelerSlug)
      .filter((slug) => slug !== resolvedTravelerSlug)
      .slice(0, 3);

    const activeMembers = [resolvedTravelerSlug, ...fallbackMembers];
    for (const [index, travelerSlug] of activeMembers.entries()) {
      await ctx.db.insert('friendCircleMembers', {
        circleId,
        travelerSlug,
        role: index === 0 ? 'host' : 'member',
        status: 'active',
        joinedAt: now - (activeMembers.length - index) * 1000 * 60 * 60,
      });
    }

    const routeShare = await buildRouteShare(ctx, resolvedTravelerSlug);
    const initialMessages = [
      {
        senderSlug: fallbackMembers[0] ?? resolvedTravelerSlug,
        kind: 'text' as const,
        body: 'I checked the dunes timing and we should leave before sunrise if we want the light to feel clean.',
        createdAt: now - 1000 * 60 * 40,
      },
      {
        senderSlug: resolvedTravelerSlug,
        kind: 'route' as const,
        body: 'Shared the route update.',
        createdAt: now - 1000 * 60 * 25,
        ...routeShare,
      },
      {
        senderSlug: fallbackMembers[1] ?? resolvedTravelerSlug,
        kind: 'text' as const,
        body: 'That route looks good to me. I can take the first driving leg if we want a quieter start.',
        createdAt: now - 1000 * 60 * 16,
      },
      {
        senderSlug: resolvedTravelerSlug,
        kind: 'text' as const,
        body: 'Perfect. Let us keep one slow breakfast stop on the coast before we head inland again.',
        createdAt: now - 1000 * 60 * 8,
      },
    ];

    for (const message of initialMessages) {
      await ctx.db.insert('friendMessages', {
        circleId,
        senderSlug: message.senderSlug,
        kind: message.kind,
        body: message.body,
        routeTitle: 'routeTitle' in message ? message.routeTitle : undefined,
        routeSummary: 'routeSummary' in message ? message.routeSummary : undefined,
        routeDistanceLabel: 'routeDistanceLabel' in message ? message.routeDistanceLabel : undefined,
        routeStopCount: 'routeStopCount' in message ? message.routeStopCount : undefined,
        routeStopsPreview: 'routeStopsPreview' in message ? message.routeStopsPreview : undefined,
        createdAt: message.createdAt,
      });
    }

    return true;
  },
});

export const getFriendsDashboard = query({
  args: {
    travelerSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const [traveler, travelerProfile, friendProfile, circle, allCandidates] = await Promise.all([
      getAppUser(ctx, args.travelerSlug),
      getTravelerProfile(ctx, args.travelerSlug),
      getFriendProfile(ctx, args.travelerSlug),
      getActiveCircleForTraveler(ctx, args.travelerSlug),
      buildCandidates(ctx, args.travelerSlug),
    ]);

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
      activeCircle: circle ? await buildCircleSummary(ctx, circle) : null,
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
    const [friendProfile, activeCircle, candidates] = await Promise.all([
      getFriendProfile(ctx, args.travelerSlug),
      getActiveCircleForTraveler(ctx, args.travelerSlug),
      buildCandidates(ctx, args.travelerSlug),
    ]);

    const vibes = [...new Set(candidates.map((candidate) => candidate.vibe))];

    return {
      intro: {
        title: 'Friends discovery',
        destinationLabel: friendProfile?.destinationLabel ?? 'Travel together',
        vibe: friendProfile?.vibe ?? null,
        matchCount: candidates.filter((candidate) => candidate.actionState === null).length,
      },
      activeCircle: activeCircle ? await buildCircleSummary(ctx, activeCircle) : null,
      filters: {
        vibes,
      },
      candidates,
    };
  },
});

export const getFriendChat = query({
  args: {
    travelerSlug: v.string(),
    circleId: v.optional(v.id('friendCircles')),
  },
  handler: async (ctx, args) => {
    const circle =
      (args.circleId ? await ctx.db.get(args.circleId) : null) ??
      (await getActiveCircleForTraveler(ctx, args.travelerSlug));

    if (!circle) {
      return null;
    }

    const [summary, memberships, messages] = await Promise.all([
      buildCircleSummary(ctx, circle),
      getCircleMembers(ctx, circle._id),
      ctx.db
        .query('friendMessages')
        .withIndex('by_circleId_and_createdAt', (q) => q.eq('circleId', circle._id))
        .order('asc')
        .take(80),
    ]);

    const messageViews = await Promise.all(
      messages.map(async (message) => {
        const [sender, senderProfile] = await Promise.all([
          getAppUser(ctx, message.senderSlug),
          getTravelerProfile(ctx, message.senderSlug),
        ]);

        return {
          _id: message._id,
          kind: message.kind,
          body: message.body ?? null,
          createdAt: message.createdAt,
          senderSlug: message.senderSlug,
          senderName: sender?.name ?? message.senderSlug,
          senderAvatarUri: senderProfile?.avatarUri ?? null,
          isOwnMessage: message.senderSlug === args.travelerSlug,
          routeCard:
            message.kind === 'route'
              ? {
                  title: message.routeTitle ?? 'Route update',
                  summary: message.routeSummary ?? '',
                  distanceLabel: message.routeDistanceLabel ?? '',
                  stopCount: message.routeStopCount ?? 0,
                  stopsPreview: message.routeStopsPreview ?? [],
                }
              : null,
        };
      })
    );

    const routeShare = await buildRouteShare(ctx as MutationCtx, args.travelerSlug);

    return {
      circle: summary,
      members: await Promise.all(memberships.map((membership) => buildMemberView(ctx, membership))),
      messages: messageViews,
      composer: {
        placeholder: `Message ${summary.name}`,
        quickActions: [
          { key: 'route', label: 'Share route' },
          { key: 'sunrise', label: 'Sunrise plan' },
          { key: 'checkin', label: 'Quick check-in' },
        ],
        routeShare,
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
    const actor = await getAppUser(ctx, args.travelerSlug);
    const candidate = await getAppUser(ctx, args.candidateSlug);

    const matchAction = await ctx.db
      .query('friendMatchActions')
      .withIndex('by_travelerSlug_and_candidateSlug', (q) =>
        q.eq('travelerSlug', args.travelerSlug).eq('candidateSlug', args.candidateSlug)
      )
      .unique();

    if (args.action === 'friended') {
      const existingConnection = await ctx.db
        .query('friendConnections')
        .withIndex('by_travelerSlug_and_friendSlug', (q) =>
          q.eq('travelerSlug', args.travelerSlug).eq('friendSlug', args.candidateSlug)
        )
        .unique();

      if (!existingConnection) {
        await ctx.db.insert('friendConnections', {
          travelerSlug: args.travelerSlug,
          friendSlug: args.candidateSlug,
          createdAt: Date.now(),
          source: 'discovery',
        });
      }

      if (matchAction) {
        await ctx.db.delete(matchAction._id);
      }

      if (candidate && actor) {
        await insertAppNotification(ctx, {
          recipientSlug: candidate.slug,
          actorSlug: actor.slug,
          kind: 'friend_added',
          title: `${actor.name} added you to their friend list`,
          body: `You are now on ${actor.name}'s Wandr friends list for future trip planning.`,
          href: '/notifications',
          entityLabel: actor.name,
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
          travelerSlug: args.travelerSlug,
          candidateSlug: args.candidateSlug,
          state: args.action,
          updatedAt: Date.now(),
        });
      }
    }

    const circle = await getActiveCircleForTraveler(ctx, args.travelerSlug);
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
        senderSlug: args.travelerSlug,
        kind: 'system',
        body: candidate ? `${candidate.name} was invited to the circle.` : 'A new traveler was invited to the circle.',
        createdAt: Date.now(),
      });

      await ctx.db.patch(circle._id, {
        updatedAt: Date.now(),
      });

      if (candidate && actor) {
        await insertAppNotification(ctx, {
          recipientSlug: candidate.slug,
          actorSlug: actor.slug,
          kind: 'friend_invite',
          title: `${actor.name} invited you to a friends circle`,
          body: `Join ${circle.name} to plan the next stretch together.`,
          href: '/friends/chat',
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
  },
  handler: async (ctx, args) => {
    const trimmedBody = args.body.trim();
    if (!trimmedBody) {
      return null;
    }

    const messageId = await ctx.db.insert('friendMessages', {
      circleId: args.circleId,
      senderSlug: args.travelerSlug,
      kind: 'text',
      body: trimmedBody,
      createdAt: Date.now(),
    });

    await ctx.db.patch(args.circleId, {
      updatedAt: Date.now(),
    });

    return messageId;
  },
});

export const shareTripRouteInFriendChat = mutation({
  args: {
    circleId: v.id('friendCircles'),
    travelerSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const routeShare = await buildRouteShare(ctx, args.travelerSlug);
    const messageId = await ctx.db.insert('friendMessages', {
      circleId: args.circleId,
      senderSlug: args.travelerSlug,
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
