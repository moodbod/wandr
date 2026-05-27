import { v } from 'convex/values';

import type { Doc } from './_generated/dataModel';
import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server';
import { getPublicTravelerProfile, type PublicTravelerProfile } from './appProfiles';
import { assertCurrentTravelerSlug } from './authHelpers';

type LocationSharing = NonNullable<Doc<'users'>['locationSharing']>;
type ProfileVisibility = NonNullable<Doc<'users'>['profileVisibility']>;

const DEFAULT_LOCATION_SHARING: LocationSharing = 'off';
const DEFAULT_PROFILE_VISIBILITY: ProfileVisibility = 'public';
const SHARED_LOCATION_TTL_MS = 10 * 60 * 1000;
const MAX_VISIBLE_LOCATIONS = 200;

async function getAppUser(ctx: QueryCtx | MutationCtx, travelerSlug: string) {
  return await ctx.db
    .query('users')
    .withIndex('by_slug', (q) => q.eq('slug', travelerSlug))
    .unique();
}

function getLocationSharing(user: Pick<Doc<'users'>, 'locationSharing'> | null | undefined): LocationSharing {
  const locationSharing = user?.locationSharing;
  return locationSharing === 'off' || locationSharing === 'whileUsing' || locationSharing === 'tripOnly'
    ? locationSharing
    : DEFAULT_LOCATION_SHARING;
}

function getProfileVisibility(user: Pick<Doc<'users'>, 'profileVisibility'> | null | undefined): ProfileVisibility {
  const visibility = user?.profileVisibility;
  return visibility === 'public' || visibility === 'friends' || visibility === 'private'
    ? visibility
    : DEFAULT_PROFILE_VISIBILITY;
}

function normalizeCoordinate(coordinate: number[]) {
  if (coordinate.length !== 2) {
    return null;
  }

  const longitude = Number(coordinate[0]);
  const latitude = Number(coordinate[1]);
  if (
    !Number.isFinite(longitude) ||
    !Number.isFinite(latitude) ||
    longitude < -180 ||
    longitude > 180 ||
    latitude < -90 ||
    latitude > 90
  ) {
    return null;
  }

  return [longitude, latitude] as const;
}

function normalizeAccuracy(accuracy: number | undefined) {
  return typeof accuracy === 'number' && Number.isFinite(accuracy) && accuracy >= 0 ? accuracy : null;
}

function normalizeHeading(heading: number | undefined) {
  if (typeof heading !== 'number' || !Number.isFinite(heading) || heading < 0) {
    return null;
  }

  return ((heading % 360) + 360) % 360;
}

function normalizeSpeed(speed: number | undefined) {
  return typeof speed === 'number' && Number.isFinite(speed) && speed >= 0 ? speed : null;
}

async function deleteSharedLocation(ctx: MutationCtx, travelerSlug: string) {
  const existing = await ctx.db
    .query('sharedLocations')
    .withIndex('by_travelerSlug', (q) => q.eq('travelerSlug', travelerSlug))
    .unique();

  if (existing) {
    await ctx.db.delete(existing._id);
  }
}

async function getFriendConnectionSet(ctx: QueryCtx, travelerSlug: string) {
  const connections = await ctx.db
    .query('connections')
    .withIndex('by_travelerSlug', (q) => q.eq('travelerSlug', travelerSlug))
    .take(500);

  return new Set(connections.map((connection) => connection.friendSlug));
}

async function getActiveCircleIdSet(ctx: QueryCtx, travelerSlug: string) {
  const memberships = await ctx.db
    .query('members')
    .withIndex('by_travelerSlug_and_status', (q) => q.eq('travelerSlug', travelerSlug).eq('status', 'active'))
    .take(100);

  return new Set(memberships.map((membership) => membership.circleId));
}

async function hasSharedActiveCircle(ctx: QueryCtx, viewerCircleIds: Set<string>, travelerSlug: string) {
  if (viewerCircleIds.size === 0) {
    return false;
  }

  const memberships = await ctx.db
    .query('members')
    .withIndex('by_travelerSlug_and_status', (q) => q.eq('travelerSlug', travelerSlug).eq('status', 'active'))
    .take(100);

  return memberships.some((membership) => viewerCircleIds.has(membership.circleId));
}

async function listFreshSharedLocations(ctx: QueryCtx, now: number) {
  try {
    return await ctx.db
      .query('sharedLocations')
      .withIndex('by_expiresAt', (q) => q.gte('expiresAt', now))
      .order('desc')
      .take(MAX_VISIBLE_LOCATIONS);
  } catch {
    return [];
  }
}

function canViewSharedLocation({
  hasSharedCircle,
  isConnected,
  isSelf,
  locationSharing,
  profileVisibility,
  viewerCanSeeOtherUsers,
}: {
  hasSharedCircle: boolean;
  isConnected: boolean;
  isSelf: boolean;
  locationSharing: LocationSharing;
  profileVisibility: ProfileVisibility;
  viewerCanSeeOtherUsers: boolean;
}) {
  if (locationSharing === 'off') {
    return false;
  }

  if (!viewerCanSeeOtherUsers) {
    return false;
  }

  if (isSelf) {
    return false;
  }

  if (profileVisibility === 'private') {
    return false;
  }

  if (profileVisibility === 'friends' && !isConnected) {
    return false;
  }

  if (locationSharing === 'tripOnly') {
    return hasSharedCircle;
  }

  return true;
}

function buildSharedLocationView(
  profile: PublicTravelerProfile,
  location: Doc<'sharedLocations'>,
  coordinate: readonly [number, number],
  locationSharing: LocationSharing,
  profileVisibility: ProfileVisibility
) {
  return {
    travelerSlug: profile.travelerSlug,
    name: profile.name,
    avatarUri: profile.avatarUri,
    baseLabel: profile.baseLabel,
    coordinate,
    accuracy: location.accuracy ?? null,
    heading: normalizeHeading(location.heading),
    speed: normalizeSpeed(location.speed),
    updatedAt: location.updatedAt,
    expiresAt: location.expiresAt,
    locationSharing,
    profileVisibility,
  };
}

export const publishSharedLocation = mutation({
  args: {
    travelerSlug: v.string(),
    coordinate: v.array(v.number()),
    accuracy: v.optional(v.number()),
    heading: v.optional(v.number()),
    speed: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const travelerSlug = await assertCurrentTravelerSlug(ctx, args.travelerSlug);
    const coordinate = normalizeCoordinate(args.coordinate);
    if (!coordinate) {
      throw new Error('Invalid location coordinate.');
    }

    const user = await getAppUser(ctx, travelerSlug);
    if (!user) {
      throw new Error('Traveler not found.');
    }

    const locationSharing = getLocationSharing(user);
    if (locationSharing === 'off') {
      await deleteSharedLocation(ctx, travelerSlug);
      return { published: false };
    }

    const accuracy = normalizeAccuracy(args.accuracy);
    const heading = normalizeHeading(args.heading);
    const speed = normalizeSpeed(args.speed);
    const now = Date.now();
    const existing = await ctx.db
      .query('sharedLocations')
      .withIndex('by_travelerSlug', (q) => q.eq('travelerSlug', travelerSlug))
      .unique();
    const patch = {
      travelerSlug,
      coordinate: [coordinate[0], coordinate[1]],
      accuracy: accuracy ?? undefined,
      heading: heading ?? undefined,
      speed: speed ?? undefined,
      updatedAt: now,
      expiresAt: now + SHARED_LOCATION_TTL_MS,
    };

    if (existing) {
      await ctx.db.patch(existing._id, patch);
      return { published: true };
    }

    await ctx.db.insert('sharedLocations', patch);
    return { published: true };
  },
});

export const clearSharedLocation = mutation({
  args: {
    travelerSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const travelerSlug = await assertCurrentTravelerSlug(ctx, args.travelerSlug);
    await deleteSharedLocation(ctx, travelerSlug);
    return true;
  },
});

export const listVisibleSharedLocations = query({
  args: {
    travelerSlug: v.string(),
  },
  handler: async (ctx, args) => {
    let viewerSlug: string;
    try {
      viewerSlug = await assertCurrentTravelerSlug(ctx, args.travelerSlug);
    } catch {
      return [];
    }

    const now = Date.now();
    const [locations, friendSlugs, viewerCircleIds, viewerUser] = await Promise.all([
      listFreshSharedLocations(ctx, now),
      getFriendConnectionSet(ctx, viewerSlug),
      getActiveCircleIdSet(ctx, viewerSlug),
      getAppUser(ctx, viewerSlug),
    ]);
    const viewerCanSeeOtherUsers = viewerUser?.showOtherUsersLiveLocation === true;
    const visibleLocations = [];

    for (const location of locations) {
      const coordinate = normalizeCoordinate(location.coordinate);
      if (!coordinate) {
        continue;
      }

      try {
        const profile = await getPublicTravelerProfile(ctx, location.travelerSlug);
        if (!profile) {
          continue;
        }

        const isSelf = profile.travelerSlug === viewerSlug;
        const locationSharing = getLocationSharing(profile.user);
        const profileVisibility = getProfileVisibility(profile.user);
        const isConnected = friendSlugs.has(profile.travelerSlug);
        const hasSharedCircle =
          locationSharing === 'tripOnly' && !isSelf
            ? await hasSharedActiveCircle(ctx, viewerCircleIds, profile.travelerSlug)
            : false;

        if (
          !canViewSharedLocation({
            hasSharedCircle,
            isConnected,
            isSelf,
            locationSharing,
            profileVisibility,
            viewerCanSeeOtherUsers,
          })
        ) {
          continue;
        }

        visibleLocations.push(buildSharedLocationView(profile, location, coordinate, locationSharing, profileVisibility));
      } catch {
        continue;
      }
    }

    return visibleLocations;
  },
});
