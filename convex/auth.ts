import Google from "@auth/core/providers/google";
import { convexAuth } from "@convex-dev/auth/server";
import { query } from "./_generated/server";
import { mutation } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

type AuthIdentity = NonNullable<Awaited<ReturnType<QueryCtx["auth"]["getUserIdentity"]>>>;

const TRUSTED_REDIRECT_PREFIXES = [
  "wandr://",
  "exp://",
  "exps://",
  "http://localhost",
  "http://127.0.0.1",
];

const normalizeEmail = (email?: string | null) => {
  const normalized = email?.trim().toLowerCase();
  return normalized && normalized.includes("@") ? normalized : undefined;
};

const getIdentityEmail = (identity: AuthIdentity) => {
  const identityWithEmail = identity as AuthIdentity & {
    email?: string;
    preferred_username?: string;
  };
  return normalizeEmail(identityWithEmail.email ?? identityWithEmail.preferred_username);
};

const getIdentityName = (identity: AuthIdentity) => {
  const identityWithName = identity as AuthIdentity & {
    name?: string;
    given_name?: string;
  };
  return (
    identityWithName.name?.trim() ??
    identityWithName.given_name?.trim() ??
    getIdentityEmail(identity)?.split("@")[0] ??
    "Traveler"
  );
};

const findAppUserForIdentity = async (
  ctx: QueryCtx | MutationCtx,
  identity: AuthIdentity,
) => {
  const byToken = await ctx.db
    .query("appUsers")
    .withIndex("by_tokenIdentifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .first();

  if (byToken) {
    return byToken;
  }

  const email = getIdentityEmail(identity);
  if (!email) {
    return null;
  }

  return await ctx.db
    .query("appUsers")
    .withIndex("by_email", (q) => q.eq("email", email))
    .first();
};

const getAppUserRole = (user: Doc<"appUsers"> | null | undefined) =>
  user?.role === "admin" ? "admin" : "traveler";

const getAuthUserId = (identity: AuthIdentity) => identity.subject as Id<"users">;

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Google],
  callbacks: {
    async redirect({ redirectTo }) {
      const configuredSiteUrl = process.env.SITE_URL?.replace(/\/$/, "");
      const allowedRedirects = configuredSiteUrl ? [configuredSiteUrl] : [];
      const isTrustedRedirect =
        allowedRedirects.some((origin) => redirectTo.startsWith(origin)) ||
        TRUSTED_REDIRECT_PREFIXES.some((prefix) => redirectTo.startsWith(prefix));

      if (isTrustedRedirect) {
        return redirectTo;
      }

      return configuredSiteUrl ?? redirectTo;
    },
  },
});

export const getCurrentAuthIdentity = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return null;
    }

    const appUser = await findAppUserForIdentity(ctx, identity);
    const email = getIdentityEmail(identity);

    return {
      subject: identity.subject,
      tokenIdentifier: identity.tokenIdentifier,
      email,
      name: getIdentityName(identity),
      travelerSlug: appUser?.slug ?? null,
      onboardingCompleted: Boolean(appUser?.onboardingCompletedAt),
      role: getAppUserRole(appUser),
    };
  },
});

export const linkCurrentAuthIdentity = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return null;
    }

    const appUser = await findAppUserForIdentity(ctx, identity);
    if (!appUser) {
      return {
        linked: false,
        travelerSlug: null,
        role: "traveler" as const,
      };
    }

    const email = getIdentityEmail(identity);
    const patch: Partial<Doc<"appUsers">> = {};
    if (appUser.tokenIdentifier !== identity.tokenIdentifier) {
      patch.tokenIdentifier = identity.tokenIdentifier;
    }
    if (appUser.authUserId !== getAuthUserId(identity)) {
      patch.authUserId = getAuthUserId(identity);
    }
    if (email && appUser.email !== email) {
      patch.email = email;
    }
    if (!appUser.name?.trim()) {
      patch.name = getIdentityName(identity);
    }
    if (!appUser.role) {
      patch.role = "traveler";
    }

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(appUser._id, patch);
    }

    return {
      linked: true,
      travelerSlug: appUser.slug,
      role: getAppUserRole({ ...appUser, ...patch }),
    };
  },
});

export const getCurrentAuthSession = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return null;
    }

    const appUser = await findAppUserForIdentity(ctx, identity);
    if (!appUser?.onboardingCompletedAt) {
      return null;
    }

    return {
      travelerSlug: appUser.slug,
      name: appUser.name,
      email: appUser.email,
      role: getAppUserRole(appUser),
    };
  },
});

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return null;
    }

    const appUser = await findAppUserForIdentity(ctx, identity);

    return {
      identity: {
        subject: identity.subject,
        tokenIdentifier: identity.tokenIdentifier,
        email: getIdentityEmail(identity),
        name: getIdentityName(identity),
      },
      appUser,
      role: getAppUserRole(appUser),
    };
  },
});
