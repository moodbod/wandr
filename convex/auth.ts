import Google from '@auth/core/providers/google';
import { Password } from '@convex-dev/auth/providers/Password';
import { convexAuth } from '@convex-dev/auth/server';

const WANDR_WEB_ORIGINS = new Set(['https://wandr.website', 'https://www.wandr.website']);
const LOCAL_WEB_ORIGINS = new Set(['http://localhost:8081', 'http://127.0.0.1:8081', 'http://[::1]:8081']);

function getConfiguredSiteUrl() {
  const siteUrl = process.env.SITE_URL?.replace(/\/$/, '');
  if (!siteUrl) {
    throw new Error('SITE_URL must be configured for Convex Auth redirects.');
  }

  return siteUrl;
}

function isAllowedWebRedirect(url: URL, configuredSiteUrl: string) {
  return url.origin === configuredSiteUrl || WANDR_WEB_ORIGINS.has(url.origin) || LOCAL_WEB_ORIGINS.has(url.origin);
}

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password, Google],
  callbacks: {
    async redirect({ redirectTo }) {
      const configuredSiteUrl = getConfiguredSiteUrl();

      if (redirectTo.startsWith('?') || redirectTo.startsWith('/')) {
        return `${configuredSiteUrl}${redirectTo}`;
      }

      const redirectUrl = new URL(redirectTo);
      if (redirectUrl.protocol === 'wandr:' || isAllowedWebRedirect(redirectUrl, configuredSiteUrl)) {
        return redirectTo;
      }

      throw new Error('Invalid auth redirect target.');
    },
  },
});
