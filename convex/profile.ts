import { v } from 'convex/values';

import type { Doc } from './_generated/dataModel';
import { mutation, query, type MutationCtx } from './_generated/server';
import {
  getAuthUserRole,
  getTravelerProfileRecord,
  patchCoreAuthUserProfile,
  syncAppUserProjection,
} from './appProfiles';
import { assertCurrentTravelerSlug } from './authHelpers';
import { requireCurrentAuthRecord } from './authIdentity';

const supportedCurrencies = new Set(['USD', 'NAD', 'ZAR', 'EUR', 'GBP']);
const countryCurrencyMap: Record<string, string> = {
  NA: 'NAD',
  ZA: 'ZAR',
  US: 'USD',
  GB: 'GBP',
  DE: 'EUR',
  FR: 'EUR',
  ES: 'EUR',
  IT: 'EUR',
  NL: 'EUR',
  PT: 'EUR',
  IE: 'EUR',
};

const travelStyleValidator = v.union(
  v.literal('solo'),
  v.literal('couple'),
  v.literal('friends'),
  v.literal('family')
);

const defaultUserSettings = {
  preferredCurrency: 'USD',
  distanceUnit: 'km' as const,
  temperatureUnit: 'celsius' as const,
  profileVisibility: 'friends' as const,
  showSavedPlaces: true,
  showTripActivity: false,
  locationSharing: 'tripOnly' as const,
  tripAlertsEnabled: true,
  friendMessagesEnabled: true,
  bookingUpdatesEnabled: true,
  productUpdatesEnabled: false,
};

function getDefaultCurrencyForCountry(countryCode?: string | null) {
  const normalizedCode = countryCode?.trim().toUpperCase();
  return normalizedCode ? countryCurrencyMap[normalizedCode] ?? 'USD' : 'USD';
}

async function getDefaultSettingsForTraveler(ctx: MutationCtx, travelerSlug: string) {
  const user = await ctx.db
    .query('appUsers')
    .withIndex('by_slug', (q) => q.eq('slug', travelerSlug))
    .unique();

  return {
    ...defaultUserSettings,
    preferredCurrency: getDefaultCurrencyForCountry(user?.countryCode),
  };
}

async function getSettingsDocument(ctx: MutationCtx, travelerSlug: string) {
  return await ctx.db
    .query('userSettings')
    .withIndex('by_travelerSlug', (q) => q.eq('travelerSlug', travelerSlug))
    .unique();
}

function normalizeCurrency(currencyCode: string) {
  const normalized = currencyCode.trim().toUpperCase();
  if (!supportedCurrencies.has(normalized)) {
    throw new Error('Choose a supported currency.');
  }
  return normalized;
}

async function upsertSettings(
  ctx: MutationCtx,
  travelerSlug: string,
  patch: Partial<Omit<Doc<'userSettings'>, '_id' | '_creationTime' | 'travelerSlug' | 'updatedAt'>>
) {
  const existing = await getSettingsDocument(ctx, travelerSlug);
  const nextSettings = {
    ...patch,
    updatedAt: Date.now(),
  };

  if (existing) {
    await ctx.db.patch(existing._id, nextSettings);
    return existing._id;
  }

  const travelerDefaults = await getDefaultSettingsForTraveler(ctx, travelerSlug);

  return await ctx.db.insert('userSettings', {
    travelerSlug,
    ...travelerDefaults,
    ...patch,
    updatedAt: Date.now(),
  });
}

export const generateAvatarUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireCurrentAuthRecord(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const getUserSettings = query({
  args: {
    travelerSlug: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.travelerSlug) {
      return null;
    }
    const travelerSlug = await assertCurrentTravelerSlug(ctx, args.travelerSlug);

    const [settings, user] = await Promise.all([
      ctx.db
        .query('userSettings')
        .withIndex('by_travelerSlug', (q) => q.eq('travelerSlug', travelerSlug))
        .unique(),
      ctx.db
        .query('appUsers')
        .withIndex('by_slug', (q) => q.eq('slug', travelerSlug))
        .unique(),
    ]);

    return {
      travelerSlug,
      ...defaultUserSettings,
      preferredCurrency: getDefaultCurrencyForCountry(user?.countryCode),
      ...(settings ?? {}),
      updatedAt: settings?.updatedAt ?? null,
    };
  },
});

export const updateTravelerProfile = mutation({
  args: {
    travelerSlug: v.string(),
    name: v.string(),
    countryCode: v.string(),
    countryLabel: v.string(),
    homeCity: v.optional(v.string()),
    travelStyle: v.optional(travelStyleValidator),
    avatarStorageId: v.optional(v.id('_storage')),
    clearAvatar: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const travelerSlug = await assertCurrentTravelerSlug(ctx, args.travelerSlug);
    const name = args.name.trim();
    const countryCode = args.countryCode.trim().toUpperCase();
    const countryLabel = args.countryLabel.trim();
    const homeCity = args.homeCity?.trim();

    if (name.length < 2) {
      throw new Error('Enter your name.');
    }

    if (!countryCode || !countryLabel) {
      throw new Error('Choose your home country.');
    }

    const authRecord = await requireCurrentAuthRecord(ctx);
    const profileRecord = await getTravelerProfileRecord(ctx, travelerSlug);

    if (!profileRecord) {
      throw new Error('Traveler profile not found.');
    }

    if (profileRecord.authUser._id !== authRecord.authUserId) {
      throw new Error('Unauthorized traveler.');
    }

    const updatedAuthUser = await patchCoreAuthUserProfile(ctx, profileRecord.authUser, {
      name,
      countryCode,
      countryLabel,
      homeCity,
      travelStyle: args.travelStyle ?? profileRecord.authUser.travelStyle,
      avatarStorageId: args.avatarStorageId,
      clearAvatar: args.clearAvatar,
    });
    const role = getAuthUserRole(updatedAuthUser ?? profileRecord.authUser);

    await syncAppUserProjection(
      ctx,
      authRecord,
      {
        slug: travelerSlug,
        name: updatedAuthUser?.name ?? name,
        countryCode: updatedAuthUser?.countryCode ?? countryCode,
        countryLabel: updatedAuthUser?.countryLabel ?? countryLabel,
        role,
        homeCity: updatedAuthUser?.homeCity ?? homeCity ?? null,
        travelStyle: updatedAuthUser?.travelStyle ?? args.travelStyle ?? null,
        onboardingCompletedAt: updatedAuthUser?.onboardingCompletedAt ?? profileRecord.authUser.onboardingCompletedAt,
      },
      profileRecord.appUser
    );

    return true;
  },
});

export const updateExperiencePreferences = mutation({
  args: {
    travelerSlug: v.string(),
    preferredCurrency: v.string(),
    distanceUnit: v.union(v.literal('km'), v.literal('mi')),
    temperatureUnit: v.union(v.literal('celsius'), v.literal('fahrenheit')),
  },
  handler: async (ctx, args) => {
    const travelerSlug = await assertCurrentTravelerSlug(ctx, args.travelerSlug);
    await upsertSettings(ctx, travelerSlug, {
      preferredCurrency: normalizeCurrency(args.preferredCurrency),
      distanceUnit: args.distanceUnit,
      temperatureUnit: args.temperatureUnit,
    });
    return true;
  },
});

export const updatePrivacySettings = mutation({
  args: {
    travelerSlug: v.string(),
    profileVisibility: v.union(v.literal('friends'), v.literal('public'), v.literal('private')),
    showSavedPlaces: v.boolean(),
    showTripActivity: v.boolean(),
    locationSharing: v.union(v.literal('off'), v.literal('whileUsing'), v.literal('tripOnly')),
  },
  handler: async (ctx, args) => {
    const travelerSlug = await assertCurrentTravelerSlug(ctx, args.travelerSlug);
    await upsertSettings(ctx, travelerSlug, {
      profileVisibility: args.profileVisibility,
      showSavedPlaces: args.showSavedPlaces,
      showTripActivity: args.showTripActivity,
      locationSharing: args.locationSharing,
    });
    return true;
  },
});

export const updateNotificationSettings = mutation({
  args: {
    travelerSlug: v.string(),
    tripAlertsEnabled: v.boolean(),
    friendMessagesEnabled: v.boolean(),
    bookingUpdatesEnabled: v.boolean(),
    productUpdatesEnabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const travelerSlug = await assertCurrentTravelerSlug(ctx, args.travelerSlug);
    await upsertSettings(ctx, travelerSlug, {
      tripAlertsEnabled: args.tripAlertsEnabled,
      friendMessagesEnabled: args.friendMessagesEnabled,
      bookingUpdatesEnabled: args.bookingUpdatesEnabled,
      productUpdatesEnabled: args.productUpdatesEnabled,
    });
    return true;
  },
});
