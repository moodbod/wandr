import { Platform } from 'react-native';

type MapboxModule = typeof import('@rnmapbox/maps');

let cachedMapbox: MapboxModule | null = null;
let hasTriedLoadingMapbox = false;

export function getMapboxModule() {
  if (Platform.OS === 'web') {
    return null;
  }

  if (cachedMapbox || hasTriedLoadingMapbox) {
    return cachedMapbox;
  }

  hasTriedLoadingMapbox = true;

  try {
    // Mapbox throws during import in Expo Go or in a dev client that has not been rebuilt.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cachedMapbox = require('@rnmapbox/maps') as MapboxModule;
  } catch {
    cachedMapbox = null;
  }

  return cachedMapbox;
}
