import { paginationOptsValidator } from 'convex/server';
import { v } from 'convex/values';

import type { Doc, Id } from '../_generated/dataModel';
import { mutation, type MutationCtx } from '../_generated/server';
import { patchAuthUserProfile, type AuthUserProfile } from '../appProfiles';
import { requireAdmin } from '../authHelpers';
import { normalizeEmail } from '../authIdentity';

function chooseCanonicalAuthUser(users: AuthUserProfile[], travelerSlug?: string) {
  if (travelerSlug) {
    const slugMatch = users.find((user) => user.slug === travelerSlug);
    if (slugMatch) {
      return slugMatch;
    }
  }

  const sortedUsers = [...users].sort((first, second) => first._creationTime - second._creationTime);
  return sortedUsers.find((user) => user.onboardingCompletedAt) ?? sortedUsers[0] ?? null;
}

async function findAuthUserForLegacyAppUser(ctx: MutationCtx, appUser: Doc<'appUsers'>) {
  if (appUser.authUserId) {
    try {
      const authUser = (await ctx.db.get(appUser.authUserId as Id<'users'>)) as AuthUserProfile | null;
      if (authUser) {
        return authUser;
      }
    } catch {
      // Legacy rows can contain provider ids that are not Convex Auth user ids.
    }
  }

  const email = normalizeEmail(appUser.email);
  if (!email) {
    return null;
  }

  const users = (await ctx.db
    .query('users')
    .withIndex('email', (q) => q.eq('email', email))
    .take(10)) as AuthUserProfile[];

  return chooseCanonicalAuthUser(users, appUser.slug);
}

export const backfillAuthUsersFromLegacyProfiles = mutation({
  args: {
    dryRun: v.optional(v.boolean()),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const page = await ctx.db.query('appUsers').order('asc').paginate(args.paginationOpts);
    const results = [];

    for (const appUser of page.page) {
      const authUser = await findAuthUserForLegacyAppUser(ctx, appUser);
      if (!authUser) {
        results.push({ slug: appUser.slug, status: 'skipped_no_auth_user' as const });
        continue;
      }

      const [travelerProfile, friendProfile] = await Promise.all([
        ctx.db
          .query('travelerProfiles')
          .withIndex('by_slug', (q) => q.eq('travelerSlug', appUser.slug))
          .unique(),
        ctx.db
          .query('friendProfiles')
          .withIndex('by_travelerSlug', (q) => q.eq('travelerSlug', appUser.slug))
          .unique(),
      ]);
      const patch = {
        slug: authUser.slug ?? appUser.slug,
        email: normalizeEmail(authUser.email ?? appUser.email),
        name: authUser.name ?? travelerProfile?.name ?? appUser.name,
        countryCode: authUser.countryCode ?? appUser.countryCode,
        countryLabel: authUser.countryLabel ?? appUser.countryLabel,
        role: authUser.role ?? appUser.role ?? 'traveler',
        homeCity: authUser.homeCity ?? appUser.homeCity,
        travelStyle: authUser.travelStyle ?? appUser.travelStyle,
        onboardingCompletedAt: authUser.onboardingCompletedAt ?? appUser.onboardingCompletedAt,
        avatarUri: authUser.avatarUri ?? travelerProfile?.avatarUri,
        avatarStorageId: authUser.avatarStorageId ?? travelerProfile?.avatarStorageId,
        regionCode: authUser.regionCode ?? travelerProfile?.regionCode ?? appUser.countryCode,
        regionName: authUser.regionName ?? travelerProfile?.regionName ?? appUser.countryLabel,
        headline: authUser.headline ?? friendProfile?.headline ?? '',
        bio: authUser.bio ?? friendProfile?.bio ?? '',
        baseLabel: authUser.baseLabel ?? friendProfile?.baseLabel ?? travelerProfile?.regionName ?? appUser.countryLabel,
        destinationLabel: authUser.destinationLabel ?? friendProfile?.destinationLabel ?? '',
        discoverViewCount: authUser.discoverViewCount ?? friendProfile?.discoverViewCount ?? 0,
        travelPace: authUser.travelPace ?? friendProfile?.travelPace ?? 'balanced',
        vibe: authUser.vibe ?? friendProfile?.vibe ?? (appUser.travelStyle === 'family' ? 'relaxation' : appUser.travelStyle === 'friends' ? 'social' : 'culture'),
        arrivalWindowLabel: authUser.arrivalWindowLabel ?? friendProfile?.arrivalWindowLabel ?? '',
        interests: authUser.interests ?? friendProfile?.interests ?? [],
        profileUpdatedAt: Date.now(),
      };

      if (!args.dryRun) {
        await patchAuthUserProfile(ctx, authUser._id, patch);

        if (appUser.authUserId !== authUser._id) {
          await ctx.db.patch(appUser._id, { authUserId: authUser._id });
        }
      }

      results.push({ slug: appUser.slug, status: args.dryRun ? ('would_backfill' as const) : ('backfilled' as const) });
    }

    return {
      continueCursor: page.continueCursor,
      isDone: page.isDone,
      results,
    };
  },
});
