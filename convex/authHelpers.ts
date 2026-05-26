import { ConvexError } from 'convex/values';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { getAuthUserRole, type AuthUserProfile } from './appProfiles';
import { getCurrentAuthRecord } from './authIdentity';

type AuthCtx = QueryCtx | MutationCtx;

export async function requireCurrentAuthUser(ctx: AuthCtx) {
  const authRecord = await getCurrentAuthRecord(ctx);
  if (!authRecord?.authUser) {
    throw new ConvexError('Authentication required');
  }

  return { authRecord, user: authRecord.authUser as AuthUserProfile };
}

export async function assertCurrentTravelerSlug(ctx: AuthCtx, travelerSlug: string) {
  const authRecord = await getCurrentAuthRecord(ctx);
  const authUser = authRecord?.authUser as AuthUserProfile | null | undefined;
  const canonicalSlug = authUser?.slug;

  if (!canonicalSlug) {
    throw new ConvexError('Authentication required');
  }

  if (canonicalSlug !== travelerSlug) {
    throw new ConvexError('Unauthorized traveler');
  }

  return canonicalSlug;
}

export async function requireAdmin(ctx: AuthCtx) {
  const { authRecord, user } = await requireCurrentAuthUser(ctx);

  if (getAuthUserRole(user) !== 'admin') {
    throw new ConvexError('Admin access required');
  }

  if (!user.slug) {
    throw new ConvexError('Admin profile incomplete');
  }

  return {
    userId: authRecord.authUserId,
    slug: user.slug,
    name: user.name ?? authRecord.name,
    countryCode: user.countryCode ?? '',
    countryLabel: user.countryLabel ?? '',
    role: 'admin' as const,
  };
}
