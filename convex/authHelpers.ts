import { ConvexError } from "convex/values";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { getAuthUserRole, type AuthUserProfile } from "./appProfiles";
import { getCurrentAuthRecord, getUserBySlug } from "./authIdentity";

type AuthCtx = QueryCtx | MutationCtx;

export async function requireCurrentAuthUser(ctx: AuthCtx) {
  const authRecord = await getCurrentAuthRecord(ctx);
  if (!authRecord || !authRecord.authUser) {
    throw new ConvexError("Authentication required");
  }
  return { authRecord, user: authRecord.authUser as AuthUserProfile };
}

export async function assertCurrentTravelerSlug(ctx: AuthCtx, travelerSlug: string) {
  const authRecord = await getCurrentAuthRecord(ctx);
  if (!authRecord) {
    throw new ConvexError("Authentication required");
  }

  const authUser = authRecord.authUser as AuthUserProfile | null;
  const canonicalSlug = authUser?.slug;

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

  if (getAuthUserRole(authUser) !== "admin") {
    throw new ConvexError("Admin access required");
  }

  const slug = authUser?.slug;
  if (!slug) {
    throw new ConvexError("Admin profile incomplete");
  }

  return {
    slug,
    name: authUser?.name ?? authRecord.name,
    countryCode: authUser?.countryCode ?? "NA",
    countryLabel: authUser?.countryLabel ?? "Namibia",
    role: "admin" as const,
  };
}
