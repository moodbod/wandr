import { createClient, type AuthFunctions, type GenericCtx } from '@convex-dev/better-auth';
import { crossDomain, convex } from '@convex-dev/better-auth/plugins';
import { expo } from '@better-auth/expo';
import { betterAuth, type BetterAuthOptions } from 'better-auth/minimal';
import { query } from './_generated/server';
import { components, internal } from './_generated/api';
import type { DataModel } from './_generated/dataModel';
import authConfig from './auth.config';

const siteUrl = process.env.SITE_URL;
const trustedOrigins = [
  ...(siteUrl ? [siteUrl] : []),
  'https://wandr.website',
  'https://www.wandr.website',
  'https://wandr-liard.vercel.app',
  'https://wandr-moodbods.vercel.app',
  'https://wandr-9m9hggj01-moodbods.vercel.app',
  'https://wandr-fc2px3nb4-moodbods.vercel.app',
  'http://localhost:8081',
  'http://127.0.0.1:8081',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'wandr://',
];
const authFunctions: AuthFunctions = internal.auth;

export const authComponent = createClient<DataModel>(components.betterAuth, {
  authFunctions,
  triggers: {},
});

export const createAuth = (ctx: GenericCtx<DataModel>) =>
  betterAuth({
    trustedOrigins,
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    plugins: [
      expo(),
      convex({ authConfig }),
      ...(siteUrl ? [crossDomain({ siteUrl })] : []),
    ],
  } satisfies BetterAuthOptions);

export const { onCreate, onUpdate, onDelete } = authComponent.triggersApi();
export const { getAuthUser } = authComponent.clientApi();

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    return await authComponent.safeGetAuthUser(ctx);
  },
});

export const getCurrentAuthSession = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return null;
    }

    const email = typeof identity.email === 'string' ? identity.email.trim().toLowerCase() : '';
    const appUserByToken = await ctx.db
      .query('appUsers')
      .withIndex('by_tokenIdentifier', (q) => q.eq('tokenIdentifier', identity.tokenIdentifier))
      .unique();
    const appUser =
      appUserByToken ??
      (email
        ? await ctx.db
            .query('appUsers')
            .withIndex('by_email', (q) => q.eq('email', email))
            .unique()
        : null);

    if (!appUser || !appUser.onboardingCompletedAt) {
      return null;
    }

    return {
      travelerSlug: appUser.slug,
      email: appUser.email ?? email,
    };
  },
});
