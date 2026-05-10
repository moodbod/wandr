import { getAuthUserId } from '@convex-dev/auth/server';

import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';

type AuthCtx = QueryCtx | MutationCtx;
type ConvexIdentity = NonNullable<Awaited<ReturnType<AuthCtx['auth']['getUserIdentity']>>>;

export type CurrentAuthRecord = {
  authUser: Doc<'users'> | null;
  authUserId: Id<'users'>;
  email?: string;
  identity: ConvexIdentity;
  name: string;
};

export function normalizeEmail(email?: string | null) {
  const normalized = email?.trim().toLowerCase();
  return normalized && normalized.includes('@') ? normalized : undefined;
}

function identityString(identity: ConvexIdentity, key: 'email' | 'preferred_username' | 'name' | 'given_name') {
  const value = (identity as ConvexIdentity & Record<string, unknown>)[key];
  return typeof value === 'string' ? value.trim() : undefined;
}

export async function getCurrentAuthRecord(ctx: AuthCtx): Promise<CurrentAuthRecord | null> {
  const [identity, authUserId] = await Promise.all([
    ctx.auth.getUserIdentity(),
    getAuthUserId(ctx),
  ]);

  if (!identity || !authUserId) {
    return null;
  }

  const authUser = await ctx.db.get(authUserId);
  const email = normalizeEmail(
    authUser?.email ??
      identityString(identity, 'email') ??
      identityString(identity, 'preferred_username')
  );
  const name =
    authUser?.name?.trim() ||
    identityString(identity, 'name') ||
    identityString(identity, 'given_name') ||
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
  const record = await getCurrentAuthRecord(ctx);
  if (!record) {
    throw new Error('Not authenticated');
  }

  return record;
}

export async function getUserBySlug(ctx: AuthCtx, slug: string) {
  return await ctx.db
    .query('users')
    .withIndex('by_slug', (q) => q.eq('slug', slug))
    .unique();
}
