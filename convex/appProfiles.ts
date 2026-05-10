import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';

type ProfileCtx = QueryCtx | MutationCtx;
type TravelStyle = 'solo' | 'couple' | 'friends' | 'family';
type TravelPace = 'slow' | 'balanced' | 'fast';
type TravelVibe = 'adventure' | 'culture' | 'social' | 'relaxation' | 'food';
type UserRole = 'traveler' | 'admin';

type CoreProfileInput = {
  name: string;
  countryCode: string;
  countryLabel: string;
  homeCity?: string;
  travelStyle?: TravelStyle;
  avatarStorageId?: Id<'_storage'>;
  clearAvatar?: boolean;
};

export type AuthUserProfile = Doc<'users'> & {
  arrivalWindowLabel?: string;
  avatarStorageId?: Id<'_storage'>;
  avatarUri?: string;
  baseLabel?: string;
  bio?: string;
  destinationLabel?: string;
  discoverViewCount?: number;
  headline?: string;
  interests?: string[];
  profileUpdatedAt?: number;
  regionCode?: string;
  regionName?: string;
  travelPace?: TravelPace;
  travelStyle?: TravelStyle;
  vibe?: TravelVibe;
};

export type PublicTravelerProfile = {
  _id: Id<'users'>;
  arrivalWindowLabel: string;
  avatarUri: string | null;
  baseLabel: string;
  bio: string;
  countryCode: string;
  countryLabel: string;
  destinationLabel: string;
  discoverViewCount: number;
  email: string | null;
  headline: string;
  homeCity: string | null;
  interests: string[];
  name: string;
  onboardingCompletedAt: number | null;
  regionCode: string;
  regionName: string;
  role: 'traveler' | 'admin';
  slug: string;
  travelerSlug: string;
  travelPace: TravelPace;
  travelStyle: TravelStyle | null;
  user: AuthUserProfile;
  vibe: TravelVibe;
};

function getRegion(input: { countryCode: string; countryLabel: string; homeCity?: string | null; regionCode?: string; regionName?: string }) {
  return {
    regionCode: input.regionCode || input.countryCode,
    regionName: input.regionName || input.homeCity || input.countryLabel,
  };
}

function getDefaultVibe(travelStyle?: TravelStyle | null): TravelVibe {
  return travelStyle === 'family' ? 'relaxation' : travelStyle === 'friends' ? 'social' : 'culture';
}

export function getAuthUserRole(user: AuthUserProfile | null | undefined): UserRole {
  return user?.role === 'admin' ? 'admin' : 'traveler';
}

export function getDefaultAuthProfileFields(input: {
  countryCode: string;
  countryLabel: string;
  homeCity?: string | null;
  travelStyle?: TravelStyle | null;
}) {
  const region = getRegion(input);

  return {
    arrivalWindowLabel: '',
    baseLabel: region.regionName,
    bio: '',
    destinationLabel: '',
    discoverViewCount: 0,
    headline: '',
    interests: [] as string[],
    profileUpdatedAt: Date.now(),
    regionCode: region.regionCode,
    regionName: region.regionName,
    travelPace: 'balanced' as TravelPace,
    vibe: getDefaultVibe(input.travelStyle),
  };
}

function stripUndefined<T extends Record<string, unknown>>(value: T) {
  const result: Partial<T> = {};
  const entries = Object.entries(value) as [keyof T, T[keyof T]][];

  for (const [key, fieldValue] of entries) {
    if (fieldValue !== undefined) {
      result[key] = fieldValue;
    }
  }

  return result;
}

async function getResolvedAvatarUri(ctx: ProfileCtx, user: AuthUserProfile) {
  if (user.avatarStorageId) {
    return await ctx.storage.getUrl(user.avatarStorageId);
  }

  return user.avatarUri ?? user.image ?? null;
}

export async function getPublicTravelerProfile(ctx: ProfileCtx, travelerSlug: string): Promise<PublicTravelerProfile | null> {
  const user = (await ctx.db
    .query('users')
    .withIndex('by_slug', (q) => q.eq('slug', travelerSlug))
    .unique()) as AuthUserProfile | null;

  if (!user) {
    return null;
  }

  const countryCode = user.countryCode ?? '';
  const countryLabel = user.countryLabel ?? '';
  const homeCity = user.homeCity ?? null;
  const travelStyle = user.travelStyle ?? null;
  const slug = user.slug;

  if (!slug) {
    return null;
  }

  const region = getRegion({
    countryCode,
    countryLabel,
    homeCity,
    regionCode: user.regionCode,
    regionName: user.regionName,
  });
  const defaults = getDefaultAuthProfileFields({
    countryCode,
    countryLabel,
    homeCity,
    travelStyle,
  });
  const avatarUri = await getResolvedAvatarUri(ctx, user);

  return {
    _id: user._id,
    arrivalWindowLabel: user.arrivalWindowLabel ?? defaults.arrivalWindowLabel,
    avatarUri,
    baseLabel: user.baseLabel ?? region.regionName,
    bio: user.bio ?? defaults.bio,
    countryCode,
    countryLabel,
    destinationLabel: user.destinationLabel ?? defaults.destinationLabel,
    discoverViewCount: user.discoverViewCount ?? defaults.discoverViewCount,
    email: user.email ?? null,
    headline: user.headline ?? defaults.headline,
    homeCity,
    interests: user.interests ?? defaults.interests,
    name: user.name ?? user.email?.split('@')[0] ?? 'Traveler',
    onboardingCompletedAt: user.onboardingCompletedAt ?? null,
    regionCode: region.regionCode,
    regionName: region.regionName,
    role: getAuthUserRole(user),
    slug,
    travelerSlug: slug,
    travelPace: user.travelPace ?? defaults.travelPace,
    travelStyle,
    user,
    vibe: user.vibe ?? defaults.vibe,
  };
}

export async function patchAuthUserProfile(
  ctx: MutationCtx,
  authUserId: Id<'users'>,
  patch: Partial<AuthUserProfile>
) {
  const cleanPatch = stripUndefined(patch);

  if (Object.keys(cleanPatch).length > 0) {
    await ctx.db.patch(authUserId, cleanPatch);
  }

  return (await ctx.db.get(authUserId)) as AuthUserProfile | null;
}

export async function patchCoreAuthUserProfile(ctx: MutationCtx, user: AuthUserProfile, input: CoreProfileInput) {
  const region = getRegion({
    countryCode: input.countryCode,
    countryLabel: input.countryLabel,
    homeCity: input.homeCity,
  });
  const avatarUri = input.avatarStorageId ? await ctx.storage.getUrl(input.avatarStorageId) : undefined;

  const updatedUser = await patchAuthUserProfile(ctx, user._id, {
    name: input.name,
    countryCode: input.countryCode,
    countryLabel: input.countryLabel,
    homeCity: input.homeCity || undefined,
    travelStyle: input.travelStyle ?? user.travelStyle,
    baseLabel: user.baseLabel ?? region.regionName,
    regionCode: region.regionCode,
    regionName: region.regionName,
    profileUpdatedAt: Date.now(),
    ...(input.clearAvatar
      ? { avatarUri: undefined, avatarStorageId: undefined }
      : input.avatarStorageId
        ? { avatarUri: avatarUri ?? undefined, avatarStorageId: input.avatarStorageId }
        : {}),
  });

  if (input.clearAvatar || !input.homeCity) {
    await ctx.db.patch(user._id, {
      ...(input.clearAvatar ? { avatarUri: undefined, avatarStorageId: undefined } : {}),
      ...(!input.homeCity ? { homeCity: undefined } : {}),
    });
    return (await ctx.db.get(user._id)) as AuthUserProfile | null;
  }

  return updatedUser;
}
