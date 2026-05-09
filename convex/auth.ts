import Google from "@auth/core/providers/google";
import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx } from "./_generated/server";
import {
  getAuthUserRole,
  hydrateAuthUserFromProjection,
  syncAppUserProjection,
  type AuthUserProfile,
} from "./appProfiles";
import {
  findAppUserForAuth,
  getCurrentAuthRecord,
  normalizeEmail,
} from "./authIdentity";

const getProviderProfileValue = (profile: Record<string, unknown>, key: string) => {
  const value = profile[key];
  return typeof value === "string" ? value.trim() : undefined;
};

const getProviderProfileBoolean = (profile: Record<string, unknown>, key: string) => {
  const value = profile[key];
  return typeof value === "boolean" ? value : undefined;
};

const TRUSTED_REDIRECT_PREFIXES = [
  "wandr://",
  "exp://",
  "exps://",
  "http://localhost",
  "http://127.0.0.1",
];

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

function getProfileEmail(profile: Record<string, unknown>) {
  return normalizeEmail(typeof profile.email === "string" ? profile.email : undefined);
}

function getProfileName(profile: Record<string, unknown>, email?: string) {
  const name = typeof profile.name === "string" && profile.name.trim() ? profile.name.trim() : undefined;
  return name ?? email?.split("@")[0] ?? "Traveler";
}

function chooseCanonicalAuthUser(users: AuthUserProfile[]) {
  const sortedUsers = [...users].sort((first, second) => first._creationTime - second._creationTime);
  return sortedUsers.find((user) => user.onboardingCompletedAt) ?? sortedUsers[0] ?? null;
}

async function findCanonicalAuthUserByEmail(ctx: MutationCtx, email: string) {
  const users = (await ctx.db
    .query("users")
    .withIndex("email", (q) => q.eq("email", email))
    .take(20)) as AuthUserProfile[];

  return chooseCanonicalAuthUser(users);
}

const passwordProvider = Password({
  profile(params: Record<string, unknown>) {
    const email = normalizeEmail(typeof params.email === "string" ? params.email : undefined);
    if (!email) {
      throw new Error("Enter a valid email address.");
    }

    const name = typeof params.name === "string" && params.name.trim() ? params.name.trim() : email.split("@")[0];
    return { email, name };
  },
});

const googleProvider = Google({
  profile(profile) {
    const source = profile as Record<string, unknown>;
    const email = normalizeEmail(getProviderProfileValue(source, "email"));
    const id = getProviderProfileValue(source, "sub") ?? getProviderProfileValue(source, "id") ?? email;

    if (!id) {
      throw new Error("Google did not return an account id.");
    }

    return {
      id,
      email,
      name: getProviderProfileValue(source, "name") ?? getProviderProfileValue(source, "given_name") ?? email?.split("@")[0],
      image: getProviderProfileValue(source, "picture"),
      emailVerified: getProviderProfileBoolean(source, "email_verified") ?? Boolean(email),
    };
  },
});

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [passwordProvider, googleProvider],
  callbacks: {
    async createOrUpdateUser(ctx, { existingUserId, type, profile }) {
      const appCtx = ctx as unknown as MutationCtx;
      const email = getProfileEmail(profile);
      const emailUser = email ? await findCanonicalAuthUserByEmail(appCtx, email) : null;
      const shouldLinkVerifiedEmail = type === "oauth" && profile.emailVerified !== false;
      let userId = existingUserId as Id<"users"> | null;

      if (emailUser && shouldLinkVerifiedEmail) {
        userId = emailUser._id;
      } else if (!userId && emailUser) {
        throw new Error("An account already exists for this email. Sign in with the existing method first.");
      }

      const image = typeof profile.image === "string" && profile.image.trim() ? profile.image.trim() : undefined;
      const userPatch = stripUndefined({
        email,
        name: getProfileName(profile, email),
        image,
        ...(shouldLinkVerifiedEmail && email ? { emailVerificationTime: Date.now() } : {}),
      });

      if (userId) {
        await appCtx.db.patch(userId, userPatch);
        return userId;
      }

      return await appCtx.db.insert("users", userPatch);
    },
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
  jwt: {
    async customClaims(ctx, { userId }) {
      const user = await ctx.db.get(userId);
      const email = normalizeEmail(user?.email);

      return {
        ...(email ? { email } : {}),
        ...(user?.name ? { name: user.name } : {}),
      };
    },
  },
});

export const getCurrentAuthIdentity = query({
  args: {},
  handler: async (ctx) => {
    const authRecord = await getCurrentAuthRecord(ctx);
    if (!authRecord) {
      return null;
    }

    const appUser = await findAppUserForAuth(ctx, authRecord);
    const authUser = authRecord.authUser as AuthUserProfile | null;

    return {
      authUserId: authRecord.authUserId,
      subject: authRecord.identity.subject,
      tokenIdentifier: authRecord.identity.tokenIdentifier,
      email: authRecord.email ?? null,
      name: authRecord.name,
      travelerSlug: authUser?.slug ?? appUser?.slug ?? null,
      onboardingCompleted: Boolean(authUser?.onboardingCompletedAt ?? appUser?.onboardingCompletedAt),
      role: getAuthUserRole(authUser ?? appUser),
    };
  },
});

export const linkCurrentAuthIdentity = mutation({
  args: {},
  handler: async (ctx) => {
    const authRecord = await getCurrentAuthRecord(ctx);
    if (!authRecord) {
      return null;
    }

    const appUser = await findAppUserForAuth(ctx, authRecord);
    if (!appUser) {
      return {
        linked: false,
        travelerSlug: null,
        role: "traveler" as const,
      };
    }

    const authUser = await hydrateAuthUserFromProjection(ctx, authRecord, appUser);
    const travelerSlug = authUser?.slug ?? appUser.slug;

    await syncAppUserProjection(
      ctx,
      authRecord,
      {
        slug: travelerSlug,
        name: authUser?.name ?? appUser.name,
        countryCode: authUser?.countryCode ?? appUser.countryCode,
        countryLabel: authUser?.countryLabel ?? appUser.countryLabel,
        role: getAuthUserRole(authUser ?? appUser),
        homeCity: authUser?.homeCity ?? appUser.homeCity ?? null,
        travelStyle: authUser?.travelStyle ?? appUser.travelStyle ?? null,
        onboardingCompletedAt: authUser?.onboardingCompletedAt ?? appUser.onboardingCompletedAt,
      },
      appUser
    );

    return {
      linked: true,
      travelerSlug,
      role: getAuthUserRole(authUser ?? appUser),
    };
  },
});

export const getCurrentAuthSession = query({
  args: {},
  handler: async (ctx) => {
    const authRecord = await getCurrentAuthRecord(ctx);
    if (!authRecord) {
      return null;
    }

    const appUser = await findAppUserForAuth(ctx, authRecord);
    const authUser = authRecord.authUser as AuthUserProfile | null;
    const travelerSlug = authUser?.slug ?? appUser?.slug;
    const onboardingCompletedAt = authUser?.onboardingCompletedAt ?? appUser?.onboardingCompletedAt;

    if (!travelerSlug || !onboardingCompletedAt) {
      return null;
    }

    return {
      travelerSlug,
      name: authUser?.name ?? appUser?.name ?? authRecord.name,
      email: authUser?.email ?? appUser?.email ?? authRecord.email ?? "",
      role: getAuthUserRole(authUser ?? appUser),
    };
  },
});

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const authRecord = await getCurrentAuthRecord(ctx);
    if (!authRecord) {
      return null;
    }

    const appUser = await findAppUserForAuth(ctx, authRecord);

    return {
      identity: {
        authUserId: authRecord.authUserId,
        subject: authRecord.identity.subject,
        tokenIdentifier: authRecord.identity.tokenIdentifier,
        email: authRecord.email,
        name: authRecord.name,
      },
      user: authRecord.authUser as Doc<"users"> | null,
      appUser,
      role: getAuthUserRole((authRecord.authUser as AuthUserProfile | null) ?? appUser),
    };
  },
});
