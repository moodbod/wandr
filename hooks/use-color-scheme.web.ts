import { useEffect, useState } from 'react';
import type { ColorSchemeName } from 'react-native';

/**
 * Static web renders do not have access to the user's device theme, so fall back
 * to light on the server and then follow the browser preference on the client.
 */
export function useColorScheme() {
  const [browserColorScheme, setBrowserColorScheme] = useState<NonNullable<ColorSchemeName>>(
    getBrowserColorScheme
  );

  useEffect(() => {
    const mediaQuery = getColorSchemeMediaQuery();

    if (!mediaQuery) {
      return;
    }

    const updateBrowserColorScheme = () => {
      setBrowserColorScheme(getBrowserColorScheme());
    };

    updateBrowserColorScheme();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', updateBrowserColorScheme);

      return () => {
        mediaQuery.removeEventListener('change', updateBrowserColorScheme);
      };
    }

    mediaQuery.addListener(updateBrowserColorScheme);

    return () => {
      mediaQuery.removeListener(updateBrowserColorScheme);
    };
  }, []);

  return browserColorScheme;
}

function getColorSchemeMediaQuery() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return null;
  }

  return window.matchMedia('(prefers-color-scheme: dark)');
}

function getBrowserColorScheme(): NonNullable<ColorSchemeName> {
  return getColorSchemeMediaQuery()?.matches ? 'dark' : 'light';
}
