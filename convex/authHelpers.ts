import { ConvexError } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

type AuthCtx = QueryCtx | MutationCtx;

const getIdentityEmail = (
  identity: NonNullable<Awaited<ReturnType<AuthCtx["auth"]["getUserIdentity"]>>>,
) => {
  const identityWithEmail = identity as typeof identity & {
    email?: string;
    preferred_username?: string;
  };
  const email = identityWithEmail.email ?? identityWithEmail.preferred_username;
  const normalized = email?.trim().toLowerCase();
  return normalized && normalized.includes("@") ? normalized : undefined;
};

export async function getCurrentAppUser(ctx: AuthCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null;
  }

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
}

export async function requireCurrentAppUser(ctx: AuthCtx) {
  const appUser = await getCurrentAppUser(ctx);
  if (!appUser) {
    throw new ConvexError("Authentication required");
  }
  return appUser;
}

export async function assertCurrentTravelerSlug(ctx: AuthCtx, travelerSlug: string) {
  const appUser = await requireCurrentAppUser(ctx);
  if (appUser.slug !== travelerSlug) {
    throw new ConvexError("Unauthorized traveler");
  }
  return appUser.slug;
}

export async function requireAdmin(ctx: AuthCtx) {
  const appUser = await requireCurrentAppUser(ctx);
  if ((appUser as Doc<"appUsers">).role !== "admin") {
    throw new ConvexError("Admin access required");
  }
  return appUser;
}
