import { crossDomainClient, convexClient } from '@convex-dev/better-auth/client/plugins';
import { expoClient } from '@better-auth/expo/client';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { createAuthClient } from 'better-auth/react';
import { Platform } from 'react-native';

const rawScheme = Constants.expoConfig?.scheme;
const scheme = Array.isArray(rawScheme) ? rawScheme[0] : rawScheme || 'wandr';

export const authClient = createAuthClient({
  baseURL: process.env.EXPO_PUBLIC_CONVEX_SITE_URL,
  plugins: [
    convexClient(),
    ...(Platform.OS === 'web'
      ? [crossDomainClient()]
      : [
          expoClient({
            scheme,
            storagePrefix: scheme,
            storage: SecureStore,
          }),
        ]),
  ],
});
