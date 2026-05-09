import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx } from "./_generated/server";
import {
  getAuthUserRole,
  getDefaultAuthProfileFields,
  patchAuthUserProfile,
  type AuthUserProfile,
} from "./appProfiles";
import {
  getCurrentAuthRecord,
  requireCurrentAuthRecord,
} from "./authIdentity";

/* ───────────────────────── queries ───────────────────────── */

/** Lightweight identity check — used by sign-in page to decide auth vs onboarding step. */
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
      onboardingCompleted: Boolean(authUser?.onboardingCompletedAt),
      role: getAuthUserRole(authUser),
    };
  },
});

/** Full session — returns data only when onboarding is complete. Used by AuthSessionProvider. */
export const getCurrentSession = query({
  args: {},
  handler: async (ctx) => {
    const authRecord = await getCurrentAuthRecord(ctx);
    if (!authRecord) {
      return null;
    }

    const authUser = authRecord.authUser as AuthUserProfile | null;
    const travelerSlug = authUser?.slug;
    const onboardingCompletedAt = authUser?.onboardingCompletedAt;

    if (!travelerSlug || !onboardingCompletedAt) {
      return null;
    }

    return {
      travelerSlug,
      name: authUser?.name ?? authRecord.name,
      email: authUser?.email ?? authRecord.email ?? "",
      role: getAuthUserRole(authUser),
    };
  },
});

/* ───────────────────────── mutations ───────────────────────── */

function slugBaseFromName(name: string) {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "traveler"
  );
}

function randomSlugSuffix() {
  const bytes = new Uint8Array(4);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((byte) => byte.toString(36).padStart(2, "0"))
    .join("")
    .slice(0, 8);
}

async function createUniqueTravelerSlug(ctx: MutationCtx, name: string) {
  const base = slugBaseFromName(name);

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const slug = `${base}-${randomSlugSuffix()}`;
    const existing = await ctx.db
      .query("users")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();

    if (!existing) {
      return slug;
    }
  }

  return `${base}-${Date.now().toString(36)}`;
}

/** Complete profile onboarding — sets name, country, travel style, generates slug. */
export const completeOnboarding = mutation({
  args: {
    name: v.string(),
    countryCode: v.string(),
    countryLabel: v.string(),
    homeCity: v.optional(v.string()),
    travelStyle: v.union(
      v.literal("solo"),
      v.literal("couple"),
      v.literal("friends"),
      v.literal("family")
    ),
  },
  handler: async (ctx, args) => {
    const authRecord = await requireCurrentAuthRecord(ctx);
    const name = args.name.trim();
    const homeCity = args.homeCity?.trim();

    if (name.length < 2) {
      throw new Error("Enter your name.");
    }

    const now = Date.now();
    const existingAuthUser = authRecord.authUser as AuthUserProfile | null;
    const slug =
      existingAuthUser?.slug ?? (await createUniqueTravelerSlug(ctx, name));
    const role = getAuthUserRole(existingAuthUser);
    const profileDefaults = getDefaultAuthProfileFields({
      countryCode: args.countryCode,
      countryLabel: args.countryLabel,
      homeCity,
      travelStyle: args.travelStyle,
    });
    const onboardingCompletedAt =
      existingAuthUser?.onboardingCompletedAt ?? now;

    await patchAuthUserProfile(ctx, authRecord.authUserId, {
      email: authRecord.email ?? existingAuthUser?.email,
      slug,
      name,
      countryCode: args.countryCode,
      countryLabel: args.countryLabel,
      role,
      homeCity: homeCity || undefined,
      travelStyle: args.travelStyle,
      onboardingCompletedAt,
      arrivalWindowLabel:
        existingAuthUser?.arrivalWindowLabel ??
        profileDefaults.arrivalWindowLabel,
      baseLabel: existingAuthUser?.baseLabel ?? profileDefaults.baseLabel,
      bio: existingAuthUser?.bio ?? profileDefaults.bio,
      destinationLabel:
        existingAuthUser?.destinationLabel ?? profileDefaults.destinationLabel,
      discoverViewCount:
        existingAuthUser?.discoverViewCount ?? profileDefaults.discoverViewCount,
      headline: existingAuthUser?.headline ?? profileDefaults.headline,
      interests: existingAuthUser?.interests ?? profileDefaults.interests,
      regionCode: existingAuthUser?.regionCode ?? profileDefaults.regionCode,
      regionName: existingAuthUser?.regionName ?? profileDefaults.regionName,
      travelPace: existingAuthUser?.travelPace ?? profileDefaults.travelPace,
      vibe: existingAuthUser?.vibe ?? profileDefaults.vibe,
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
