import { v } from 'convex/values';
import type { Id } from './_generated/dataModel';
import { mutation, query, type MutationCtx } from './_generated/server';
import {
  getAuthUserRole,
  getDefaultAuthProfileFields,
  patchAuthUserProfile,
  type AuthUserProfile,
} from './appProfiles';
import { getCurrentAuthRecord, requireCurrentAuthRecord } from './authIdentity';

const DEFAULT_USER_ROLE = 'traveler' as const;

export const getCurrentIdentity = query({
  args: {},
  handler: async (ctx) => {
    const authRecord = await getCurrentAuthRecord(ctx);
    if (!authRecord) {
      return null;
    }

    const authUser = authRecord.authUser as AuthUserProfile | null;

    return {
      authUserId: authRecord.authUserId,
      email: authRecord.email ?? null,
      name: authUser?.name ?? authRecord.name,
      travelerSlug: authUser?.slug ?? null,
      onboardingCompleted: Boolean(authUser?.onboardingCompletedAt && authUser?.slug),
      role: getAuthUserRole(authUser),
    };
  },
});

export const getCurrentSession = query({
  args: {},
  handler: async (ctx) => {
    const authRecord = await getCurrentAuthRecord(ctx);
    if (!authRecord) {
      return null;
    }

    const authUser = authRecord.authUser as AuthUserProfile | null;
    if (!authUser?.slug || !authUser.onboardingCompletedAt) {
      return null;
    }

    return {
      travelerSlug: authUser.slug,
      email: authUser.email ?? authRecord.email ?? '',
      name: authUser.name ?? authRecord.name,
      role: getAuthUserRole(authUser),
    };
  },
});

function slugBaseFromName(name: string) {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'traveler'
  );
}

function randomSlugSuffix() {
  const bytes = new Uint8Array(4);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((byte) => byte.toString(36).padStart(2, '0'))
    .join('')
    .slice(0, 8);
}

async function createUniqueTravelerSlug(ctx: MutationCtx, name: string) {
  const base = slugBaseFromName(name);

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const slug = `${base}-${randomSlugSuffix()}`;
    const existing = await ctx.db
      .query('users')
      .withIndex('by_slug', (q) => q.eq('slug', slug))
      .first();

    if (!existing) {
      return slug;
    }
  }

  return `${base}-${Date.now().toString(36)}`;
}

function getBackendManagedRole(existingUser: AuthUserProfile | null) {
  return existingUser?.role === 'admin' ? 'admin' : DEFAULT_USER_ROLE;
}

export const completeOnboarding = mutation({
  args: {
    name: v.string(),
    countryCode: v.string(),
    countryLabel: v.string(),
    homeCity: v.optional(v.string()),
    travelStyle: v.union(
      v.literal('solo'),
      v.literal('couple'),
      v.literal('friends'),
      v.literal('family')
    ),
  },
  handler: async (ctx, args) => {
    const authRecord = await requireCurrentAuthRecord(ctx);
    const existingUser = authRecord.authUser as AuthUserProfile | null;
    const name = args.name.trim();
    const homeCity = args.homeCity?.trim();

    if (name.length < 2) {
      throw new Error('Enter your name.');
    }

    const now = Date.now();
    const slug = existingUser?.slug ?? (await createUniqueTravelerSlug(ctx, name));
    const role = getBackendManagedRole(existingUser);
    const defaults = getDefaultAuthProfileFields({
      countryCode: args.countryCode,
      countryLabel: args.countryLabel,
      homeCity,
      travelStyle: args.travelStyle,
    });

    await patchAuthUserProfile(ctx, authRecord.authUserId as Id<'users'>, {
      email: authRecord.email ?? existingUser?.email,
      slug,
      name,
      countryCode: args.countryCode,
      countryLabel: args.countryLabel,
      role,
      homeCity: homeCity || undefined,
      travelStyle: args.travelStyle,
      onboardingCompletedAt: existingUser?.onboardingCompletedAt ?? now,
      arrivalWindowLabel: existingUser?.arrivalWindowLabel ?? defaults.arrivalWindowLabel,
      baseLabel: existingUser?.baseLabel ?? defaults.baseLabel,
      bio: existingUser?.bio ?? defaults.bio,
      destinationLabel: existingUser?.destinationLabel ?? defaults.destinationLabel,
      discoverViewCount: existingUser?.discoverViewCount ?? defaults.discoverViewCount,
      headline: existingUser?.headline ?? defaults.headline,
      interests: existingUser?.interests ?? defaults.interests,
      regionCode: existingUser?.regionCode ?? defaults.regionCode,
      regionName: existingUser?.regionName ?? defaults.regionName,
      travelPace: existingUser?.travelPace ?? defaults.travelPace,
      vibe: existingUser?.vibe ?? defaults.vibe,
      profileUpdatedAt: now,
    });

    return {
      slug,
      name,
      countryCode: args.countryCode,
      countryLabel: args.countryLabel,
      homeCity: homeCity || null,
      travelStyle: args.travelStyle,
      role,
    };
  },
});
