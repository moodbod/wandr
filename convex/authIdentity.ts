import { getAuthUserId as getConvexAuthUserId } from '@convex-dev/auth/server';

import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';

type AuthCtx = QueryCtx | MutationCtx;
type AuthIdentity = NonNullable<Awaited<ReturnType<AuthCtx['auth']['getUserIdentity']>>>;

export type CurrentAuthRecord = {
  authUser: Doc<'users'> | null;
  authUserId: Id<'users'>;
  email?: string;
  identity: AuthIdentity;
  name: string;
};

export function normalizeEmail(email?: string | null) {
  const normalized = email?.trim().toLowerCase();
  return normalized && normalized.includes('@') ? normalized : undefined;
}

function getClaimString(identity: AuthIdentity, key: 'email' | 'preferred_username' | 'name' | 'given_name') {
  const value = (identity as AuthIdentity & Record<string, unknown>)[key];
  return typeof value === 'string' ? value.trim() : undefined;
}

export async function getCurrentAuthRecord(ctx: AuthCtx): Promise<CurrentAuthRecord | null> {
  const [identity, authUserId] = await Promise.all([
    ctx.auth.getUserIdentity(),
    getConvexAuthUserId(ctx),
  ]);

  if (!identity || !authUserId) {
    return null;
  }

  const authUser = await ctx.db.get(authUserId);
  const email = normalizeEmail(authUser?.email ?? getClaimString(identity, 'email') ?? getClaimString(identity, 'preferred_username'));
  const name =
    authUser?.name?.trim() ||
    getClaimString(identity, 'name') ||
    getClaimString(identity, 'given_name') ||
    email?.split('@')[0] ||
    'Traveler';

  return {
    authUser,
    authUserId,
    email,
    identity,
    name,
  };
}

export async function requireCurrentAuthRecord(ctx: AuthCtx) {
  const authRecord = await getCurrentAuthRecord(ctx);
  if (!authRecord) {
    throw new Error('Not authenticated');
  }
  return authRecord;
}

function chooseCanonicalAppUser(users: Doc<'appUsers'>[]) {
  const sortedUsers = [...users].sort((first, second) => first._creationTime - second._creationTime);
  return sortedUsers.find((user) => user.onboardingCompletedAt) ?? sortedUsers[0] ?? null;
}

export async function findAppUserForAuth(ctx: AuthCtx, authRecord: CurrentAuthRecord) {
  const byAuthUserId = await ctx.db
    .query('appUsers')
    .withIndex('by_authUserId', (q) => q.eq('authUserId', authRecord.authUserId))
    .take(10);
  const authUserMatch = chooseCanonicalAppUser(byAuthUserId);

  if (authUserMatch) {
    return authUserMatch;
  }

  const authSlug = authRecord.authUser?.slug;
  if (authSlug) {
    const slugMatch = await ctx.db
      .query('appUsers')
      .withIndex('by_slug', (q) => q.eq('slug', authSlug))
      .unique();

    if (slugMatch) {
      return slugMatch;
    }
  }

  if (authRecord.email) {
    const byEmail = await ctx.db
      .query('appUsers')
      .withIndex('by_email', (q) => q.eq('email', authRecord.email))
      .take(10);
    const emailMatch = chooseCanonicalAppUser(byEmail);

    if (emailMatch) {
      return emailMatch;
    }
  }

  const byToken = await ctx.db
    .query('appUsers')
    .withIndex('by_tokenIdentifier', (q) => q.eq('tokenIdentifier', authRecord.identity.tokenIdentifier))
    .take(10);

  return chooseCanonicalAppUser(byToken);
}
