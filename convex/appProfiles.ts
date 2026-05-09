import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';
import type { CurrentAuthRecord } from './authIdentity';

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

type ProjectionInput = {
  countryCode?: string;
  countryLabel?: string;
  homeCity?: string | null;
  name?: string;
  onboardingCompletedAt?: number;
  role?: UserRole;
  slug: string;
  travelStyle?: TravelStyle | null;
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
  travelPace: TravelPace;
  travelerSlug: string;
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

export function getAuthUserRole(user: AuthUserProfile | Doc<'appUsers'> | null | undefined): UserRole {
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

export async function getAppUserBySlug(ctx: ProfileCtx, travelerSlug: string) {
  return await ctx.db
    .query('appUsers')
    .withIndex('by_slug', (q) => q.eq('slug', travelerSlug))
    .unique();
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

async function getAuthUserByEmail(ctx: ProfileCtx, email?: string | null, travelerSlug?: string) {
  const normalizedEmail = email?.trim().toLowerCase();
  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    return null;
  }

  const users = (await ctx.db
    .query('users')
    .withIndex('email', (q) => q.eq('email', normalizedEmail))
    .take(10)) as AuthUserProfile[];

  return chooseCanonicalAuthUser(users, travelerSlug);
}

async function getAuthUserByProjection(ctx: ProfileCtx, appUser: Doc<'appUsers'> | null) {
  if (!appUser) {
    return null;
  }

  if (appUser.authUserId) {
    try {
      const authUser = (await ctx.db.get(appUser.authUserId as Id<'users'>)) as AuthUserProfile | null;
      if (authUser) {
        return authUser;
      }
    } catch {
      // Older projection rows may contain non-Convex auth identifiers.
    }
  }

  return await getAuthUserByEmail(ctx, appUser.email, appUser.slug);
}

export async function getTravelerProfileRecord(ctx: ProfileCtx, travelerSlug: string) {
  const appUser = await getAppUserBySlug(ctx, travelerSlug);
  const authUserFromProjection = await getAuthUserByProjection(ctx, appUser);

  if (authUserFromProjection) {
    return {
      appUser,
      authUser: authUserFromProjection,
    };
  }

  const authUser = (await ctx.db
    .query('users')
    .withIndex('by_slug', (q) => q.eq('slug', travelerSlug))
    .unique()) as AuthUserProfile | null;

  return authUser ? { appUser, authUser } : null;
}

async function getResolvedAvatarUri(ctx: ProfileCtx, user: AuthUserProfile) {
  if (user.avatarStorageId) {
    return await ctx.storage.getUrl(user.avatarStorageId);
  }

  return user.avatarUri ?? user.image ?? null;
}

export async function getPublicTravelerProfile(ctx: ProfileCtx, travelerSlug: string): Promise<PublicTravelerProfile | null> {
  const record = await getTravelerProfileRecord(ctx, travelerSlug);

  if (!record) {
    return null;
  }

  const { appUser, authUser: user } = record;
  const countryCode = user.countryCode ?? appUser?.countryCode ?? 'NA';
  const countryLabel = user.countryLabel ?? appUser?.countryLabel ?? 'Namibia';
  const homeCity = user.homeCity ?? appUser?.homeCity ?? null;
  const travelStyle = user.travelStyle ?? appUser?.travelStyle ?? null;
  const slug = user.slug ?? appUser?.slug;

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
    name: user.name ?? appUser?.name ?? user.email?.split('@')[0] ?? 'Traveler',
    onboardingCompletedAt: user.onboardingCompletedAt ?? appUser?.onboardingCompletedAt ?? null,
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

function getProjectionPatch(appUser: Doc<'appUsers'> | null, authRecord: CurrentAuthRecord, profile: ProjectionInput) {
  const nextRole = profile.role ?? appUser?.role ?? 'traveler';
  const patch: Partial<Doc<'appUsers'>> = stripUndefined({
    authUserId: authRecord.authUserId,
    tokenIdentifier: authRecord.identity.tokenIdentifier,
    email: authRecord.email,
    name: profile.name,
    countryCode: profile.countryCode,
    countryLabel: profile.countryLabel,
    role: nextRole,
    homeCity: profile.homeCity || undefined,
    travelStyle: profile.travelStyle ?? undefined,
    onboardingCompletedAt: profile.onboardingCompletedAt,
  });

  if (appUser?.slug === profile.slug) {
    return patch;
  }

  return {
    ...patch,
    slug: profile.slug,
  };
}

export async function syncAppUserProjection(
  ctx: MutationCtx,
  authRecord: CurrentAuthRecord,
  profile: ProjectionInput,
  existingAppUser?: Doc<'appUsers'> | null
) {
  const appUser = existingAppUser ?? (await getAppUserBySlug(ctx, profile.slug));
  const patch = getProjectionPatch(appUser, authRecord, profile);

  if (appUser) {
    await ctx.db.patch(appUser._id, {
      ...patch,
      ...(profile.homeCity === null ? { homeCity: undefined } : {}),
      ...(profile.travelStyle === null ? { travelStyle: undefined } : {}),
    });
    return appUser._id;
  }

  return await ctx.db.insert('appUsers', {
    slug: profile.slug,
    authUserId: authRecord.authUserId,
    tokenIdentifier: authRecord.identity.tokenIdentifier,
    ...(authRecord.email ? { email: authRecord.email } : {}),
    name: profile.name ?? authRecord.name,
    countryCode: profile.countryCode ?? 'NA',
    countryLabel: profile.countryLabel ?? 'Namibia',
    role: profile.role ?? 'traveler',
    ...(profile.homeCity ? { homeCity: profile.homeCity } : {}),
    ...(profile.travelStyle ? { travelStyle: profile.travelStyle } : {}),
    ...(profile.onboardingCompletedAt ? { onboardingCompletedAt: profile.onboardingCompletedAt } : {}),
  });
}

export async function hydrateAuthUserFromProjection(
  ctx: MutationCtx,
  authRecord: CurrentAuthRecord,
  appUser: Doc<'appUsers'> | null
) {
  const authUser = (await ctx.db.get(authRecord.authUserId)) as AuthUserProfile | null;
  if (!authUser || !appUser) {
    return authUser;
  }

  const patch = stripUndefined({
    email: authRecord.email ?? authUser.email,
    name: authUser.name ?? appUser.name ?? authRecord.name,
    slug: authUser.slug ?? appUser.slug,
    countryCode: authUser.countryCode ?? appUser.countryCode,
    countryLabel: authUser.countryLabel ?? appUser.countryLabel,
    role: authUser.role ?? appUser.role ?? 'traveler',
    homeCity: authUser.homeCity ?? appUser.homeCity,
    travelStyle: authUser.travelStyle ?? appUser.travelStyle,
    onboardingCompletedAt: authUser.onboardingCompletedAt ?? appUser.onboardingCompletedAt,
    profileUpdatedAt: authUser.profileUpdatedAt ?? Date.now(),
  });

  return await patchAuthUserProfile(ctx, authRecord.authUserId, patch);
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
