import Google from "@auth/core/providers/google";
import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { normalizeEmail } from "./authIdentity";

const getProviderProfileValue = (
  profile: Record<string, unknown>,
  key: string
) => {
  const value = profile[key];
  return typeof value === "string" ? value.trim() : undefined;
};

const getProviderProfileBoolean = (
  profile: Record<string, unknown>,
  key: string
) => {
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
  return normalizeEmail(
    typeof profile.email === "string" ? profile.email : undefined
  );
}

function getProfileName(profile: Record<string, unknown>, email?: string) {
  const name =
    typeof profile.name === "string" && profile.name.trim()
      ? profile.name.trim()
      : undefined;
  return name ?? email?.split("@")[0] ?? "Traveler";
}

const passwordProvider = Password({
  profile(params: Record<string, unknown>) {
    const email = normalizeEmail(
      typeof params.email === "string" ? params.email : undefined
    );
    if (!email) {
      throw new Error("Enter a valid email address.");
    }

    const name =
      typeof params.name === "string" && params.name.trim()
        ? params.name.trim()
        : email.split("@")[0];
    return { email, name };
  },
});

const googleProvider = Google({
  profile(profile) {
    const source = profile as Record<string, unknown>;
    const email = normalizeEmail(getProviderProfileValue(source, "email"));
    const id =
      getProviderProfileValue(source, "sub") ??
      getProviderProfileValue(source, "id") ??
      email;

    if (!id) {
      throw new Error("Google did not return an account id.");
    }

    return {
      id,
      email,
      name:
        getProviderProfileValue(source, "name") ??
        getProviderProfileValue(source, "given_name") ??
        email?.split("@")[0],
      image: getProviderProfileValue(source, "picture"),
      emailVerified:
        getProviderProfileBoolean(source, "email_verified") ?? Boolean(email),
    };
  },
});

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [passwordProvider, googleProvider],
  callbacks: {
    async createOrUpdateUser(ctx, { existingUserId, type, profile }) {
      const appCtx = ctx as unknown as MutationCtx;
      const email = getProfileEmail(profile);
      const shouldLinkVerifiedEmail =
        type === "oauth" && profile.emailVerified !== false;
      let userId = existingUserId as Id<"users"> | null;

      // For OAuth with a verified email, link to existing user with that email
      if (!userId && email && shouldLinkVerifiedEmail) {
        const existingByEmail = await appCtx.db
          .query("users")
          .withIndex("email", (q) => q.eq("email", email))
          .first();

        if (existingByEmail) {
          userId = existingByEmail._id;
        }
      }

      const image =
        typeof profile.image === "string" && profile.image.trim()
          ? profile.image.trim()
          : undefined;
      const userPatch = stripUndefined({
        email,
        name: getProfileName(profile, email),
        image,
        ...(shouldLinkVerifiedEmail && email
          ? { emailVerificationTime: Date.now() }
          : {}),
      });

      if (userId) {
        await appCtx.db.patch(userId, userPatch);
        return userId;
      }

      return await appCtx.db.insert("users", {
        ...userPatch,
        role: "traveler",
      });
    },
    async redirect({ redirectTo }) {
      const configuredSiteUrl = process.env.SITE_URL?.replace(/\/$/, "");
      const allowedRedirects = configuredSiteUrl ? [configuredSiteUrl] : [];
      const isTrustedRedirect =
        allowedRedirects.some((origin) => redirectTo.startsWith(origin)) ||
        TRUSTED_REDIRECT_PREFIXES.some((prefix) =>
          redirectTo.startsWith(prefix)
        );

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
