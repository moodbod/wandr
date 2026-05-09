import { ConvexError } from "convex/values";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { getAuthUserRole, type AuthUserProfile } from "./appProfiles";
import { findAppUserForAuth, getCurrentAuthRecord } from "./authIdentity";

type AuthCtx = QueryCtx | MutationCtx;

export async function getCurrentAppUser(ctx: AuthCtx) {
  const authRecord = await getCurrentAuthRecord(ctx);
  if (!authRecord) {
    return null;
  }

  return await findAppUserForAuth(ctx, authRecord);
}

export async function requireCurrentAppUser(ctx: AuthCtx) {
  const appUser = await getCurrentAppUser(ctx);
  if (!appUser) {
    throw new ConvexError("Authentication required");
  }
  return appUser;
}

export async function assertCurrentTravelerSlug(ctx: AuthCtx, travelerSlug: string) {
  const authRecord = await getCurrentAuthRecord(ctx);
  if (!authRecord) {
    throw new ConvexError("Authentication required");
  }

  const authUser = authRecord.authUser as AuthUserProfile | null;
  const appUser = await findAppUserForAuth(ctx, authRecord);
  const canonicalSlug = authUser?.slug ?? appUser?.slug;

  if (!canonicalSlug) {
    throw new ConvexError("Authentication required");
  }

  if (canonicalSlug !== travelerSlug) {
    throw new ConvexError("Unauthorized traveler");
  }
  return canonicalSlug;
}

export async function requireAdmin(ctx: AuthCtx) {
  const authRecord = await getCurrentAuthRecord(ctx);
  if (!authRecord) {
    throw new ConvexError("Authentication required");
  }

  const authUser = authRecord.authUser as AuthUserProfile | null;
  const appUser = await findAppUserForAuth(ctx, authRecord);

  if (getAuthUserRole(authUser ?? appUser) !== "admin") {
    throw new ConvexError("Admin access required");
  }

  const slug = authUser?.slug ?? appUser?.slug;
  if (!slug) {
    throw new ConvexError("Admin profile incomplete");
  }

  return {
    ...appUser,
    slug,
    name: authUser?.name ?? appUser?.name ?? authRecord.name,
    countryCode: authUser?.countryCode ?? appUser?.countryCode ?? "NA",
    countryLabel: authUser?.countryLabel ?? appUser?.countryLabel ?? "Namibia",
    role: "admin" as const,
  };
}
