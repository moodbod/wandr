import { v } from 'convex/values';

import type { Doc } from './_generated/dataModel';
import { mutation, query, type MutationCtx } from './_generated/server';
import { patchCoreAuthUserProfile } from './appProfiles';
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
  messagesEnabled: true,
  bookingUpdatesEnabled: true,
  productUpdatesEnabled: false,
};

type UserSettingsPatch = Partial<{
  preferredCurrency: string;
  distanceUnit: 'km' | 'mi';
  temperatureUnit: 'celsius' | 'fahrenheit';
  profileVisibility: 'friends' | 'public' | 'private';
  showSavedPlaces: boolean;
  showTripActivity: boolean;
  locationSharing: 'off' | 'whileUsing' | 'tripOnly';
  tripAlertsEnabled: boolean;
  messagesEnabled: boolean;
  bookingUpdatesEnabled: boolean;
  productUpdatesEnabled: boolean;
}>;

function getDefaultCurrencyForCountry(countryCode?: string | null) {
  const normalizedCode = countryCode?.trim().toUpperCase();
  return normalizedCode ? countryCurrencyMap[normalizedCode] ?? 'USD' : 'USD';
}

function normalizeCurrency(currencyCode: string) {
  const normalized = currencyCode.trim().toUpperCase();
  if (!supportedCurrencies.has(normalized)) {
    throw new Error('Choose a supported currency.');
  }
  return normalized;
}

function resolveSettingsFromUser(user: Doc<'users'>, travelerSlug: string) {
  return {
    travelerSlug,
    ...defaultUserSettings,
    preferredCurrency: user.preferredCurrency ?? getDefaultCurrencyForCountry(user.countryCode),
    distanceUnit: user.distanceUnit ?? defaultUserSettings.distanceUnit,
    temperatureUnit: user.temperatureUnit ?? defaultUserSettings.temperatureUnit,
    profileVisibility: user.profileVisibility ?? defaultUserSettings.profileVisibility,
    showSavedPlaces: user.showSavedPlaces ?? defaultUserSettings.showSavedPlaces,
    showTripActivity: user.showTripActivity ?? defaultUserSettings.showTripActivity,
    locationSharing: user.locationSharing ?? defaultUserSettings.locationSharing,
    tripAlertsEnabled: user.tripAlertsEnabled ?? defaultUserSettings.tripAlertsEnabled,
    messagesEnabled: user.messagesEnabled ?? defaultUserSettings.messagesEnabled,
    bookingUpdatesEnabled: user.bookingUpdatesEnabled ?? defaultUserSettings.bookingUpdatesEnabled,
    productUpdatesEnabled: user.productUpdatesEnabled ?? defaultUserSettings.productUpdatesEnabled,
    updatedAt: user.settingsUpdatedAt ?? null,
  };
}

async function patchUserSettings(ctx: MutationCtx, travelerSlug: string, patch: UserSettingsPatch) {
  const user = await ctx.db
    .query('users')
    .withIndex('by_slug', (q) => q.eq('slug', travelerSlug))
    .unique();

  if (!user) {
    throw new Error('Traveler not found.');
  }

  await ctx.db.patch(user._id, {
    ...patch,
    settingsUpdatedAt: Date.now(),
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

    const user = await ctx.db
      .query('users')
      .withIndex('by_slug', (q) => q.eq('slug', travelerSlug))
      .unique();

    if (!user) {
      return null;
    }

    return resolveSettingsFromUser(user, travelerSlug);
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

    if (!authRecord.authUser || authRecord.authUser.slug !== travelerSlug) {
      throw new Error('Unauthorized traveler.');
    }

    await patchCoreAuthUserProfile(ctx, authRecord.authUser as any, {
      name,
      countryCode,
      countryLabel,
      homeCity,
      travelStyle: args.travelStyle ?? (authRecord.authUser as any).travelStyle,
      avatarStorageId: args.avatarStorageId,
      clearAvatar: args.clearAvatar,
    });

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
    await patchUserSettings(ctx, travelerSlug, {
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
    await patchUserSettings(ctx, travelerSlug, {
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
    messagesEnabled: v.boolean(),
    bookingUpdatesEnabled: v.boolean(),
    productUpdatesEnabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const travelerSlug = await assertCurrentTravelerSlug(ctx, args.travelerSlug);
    await patchUserSettings(ctx, travelerSlug, {
      tripAlertsEnabled: args.tripAlertsEnabled,
      messagesEnabled: args.messagesEnabled,
      bookingUpdatesEnabled: args.bookingUpdatesEnabled,
      productUpdatesEnabled: args.productUpdatesEnabled,
    });
    return true;
  },
});
