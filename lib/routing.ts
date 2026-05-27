type RoutePoint = { latitude: number; longitude: number };
type CachedRoute = {
  expiresAt: number;
  route: RoutePoint[];
};
type PersistedRouteCache = {
  entries: Record<string, CachedRoute>;
  version: 1;
};

const ROUTE_CACHE_TTL_MS = 5 * 60_000;
const ROUTE_FETCH_TIMEOUT_MS = 10_000;
const ROUTE_COORDINATE_PRECISION = 5;
const ROUTE_CACHE_STORAGE_KEY = 'wandr.route-cache.v1';
const ROUTE_CACHE_STORAGE_FILE = 'wandr-route-cache.json';
const ROUTE_CACHE_MAX_PERSISTED_ENTRIES = 80;
const ROUTE_CACHE_MAX_STORAGE_BYTES = 900_000;
const ROUTE_CACHE_WRITE_DEBOUNCE_MS = 300;
const routeCache = new Map<string, CachedRoute>();
const inFlightRoutes = new Map<string, Promise<RoutePoint[]>>();
let routeCacheHydrated = false;
let routeCacheHydrationPromise: Promise<void> | null = null;
let routeCacheWriteTimer: ReturnType<typeof setTimeout> | null = null;

export async function fetchRoutePath(
  coordinates: readonly (readonly [number, number])[]
): Promise<{ latitude: number; longitude: number }[]> {
  // Filter out invalid coordinates to prevent URL parsing errors
  const validCoords = coordinates.filter(
    (c) => Array.isArray(c) && typeof c[0] === 'number' && typeof c[1] === 'number' && !isNaN(c[0]) && !isNaN(c[1])
  ).map(roundCoordinateForRoute);

  if (validCoords.length < 2) {
    return [];
  }

  await hydratePersistentRouteCache();

  const cacheKey = getRouteCacheKey(validCoords);
  const cachedRoute = routeCache.get(cacheKey);
  if (cachedRoute && cachedRoute.expiresAt > Date.now()) {
    return cachedRoute.route;
  }

  if (cachedRoute && isLikelyOffline()) {
    return cachedRoute.route;
  }

  const inFlightRoute = inFlightRoutes.get(cacheKey);
  if (inFlightRoute) {
    return inFlightRoute;
  }

  const routePromise = fetchRoutePathUncached(validCoords)
    .then((route) => {
      if (route.length > 0) {
        routeCache.set(cacheKey, {
          expiresAt: Date.now() + ROUTE_CACHE_TTL_MS,
          route,
        });
        schedulePersistentRouteCacheWrite();
        return route;
      }

      return cachedRoute?.route ?? route;
    })
    .finally(() => {
      inFlightRoutes.delete(cacheKey);
    });

  inFlightRoutes.set(cacheKey, routePromise);
  return routePromise;
}

async function fetchRoutePathUncached(
  validCoords: readonly (readonly [number, number])[]
): Promise<RoutePoint[]> {
  const osrmServers = [
    'https://routing.openstreetmap.de/routed-car',
    'https://router.project-osrm.org',
  ];

  // Prefer Mapbox if token is available, then fall back to public OSRM
  const mapboxToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;

  if (mapboxToken) {
    const orderedRoute = await fetchMapboxRoute(validCoords, mapboxToken);
    if (orderedRoute.length > 0) {
      return orderedRoute;
    }

    if (validCoords.length > 2) {
      const pairwiseMapboxRoute = await fetchPairwiseRoute(validCoords, (segment) =>
        fetchMapboxRoute(segment, mapboxToken)
      );
      if (pairwiseMapboxRoute.length > 0) {
        return pairwiseMapboxRoute;
      }
    }

    const osrmRoute = await fetchFirstOsrmRoute(validCoords, osrmServers);
    if (osrmRoute.length > 0) {
      return osrmRoute;
    }

    return [];
  }

  return await fetchFirstOsrmRoute(validCoords, osrmServers);
}

async function fetchFirstOsrmRoute(
  coordinates: readonly (readonly [number, number])[],
  osrmServers: readonly string[]
) {
  for (const server of osrmServers) {
    const orderedRoute = await fetchOsrmRoute(coordinates, server);
    if (orderedRoute.length > 0) {
      return orderedRoute;
    }

    if (coordinates.length > 2) {
      const pairwiseRoute = await fetchPairwiseRoute(coordinates, (segment) => fetchOsrmRoute(segment, server));
      if (pairwiseRoute.length > 0) {
        return pairwiseRoute;
      }
    }
  }

  return [];
}

async function fetchMapboxRoute(
  coordinates: readonly (readonly [number, number])[],
  token: string
): Promise<RoutePoint[]> {
  const coordString = formatCoordinateString(coordinates);
  const routeUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordString}?overview=full&geometries=geojson&access_token=${token}`;

  try {
    const routeResponse = await fetchWithTimeout(routeUrl, {
      headers: { Accept: 'application/json' },
    });

    if (routeResponse.ok) {
      const data = await routeResponse.json();
      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        return geojsonToRoutePoints(data.routes[0].geometry);
      }
    }
  } catch (error) {
    console.warn('Failed to fetch route from Mapbox:', error);
  }

  return [];
}

async function fetchOsrmRoute(
  coordinates: readonly (readonly [number, number])[],
  server: string
): Promise<RoutePoint[]> {
  const coordString = formatCoordinateString(coordinates);
  const routeUrl = `${server}/route/v1/driving/${coordString}?overview=full&geometries=geojson`;

  try {
    const routeResponse = await fetchWithTimeout(routeUrl, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (routeResponse.ok) {
      const responseText = await routeResponse.text();
      try {
        const data = JSON.parse(responseText);
        if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
          return geojsonToRoutePoints(data.routes[0].geometry);
        }
      } catch (error) {
        console.warn(`OSRM (${server}) returned non-JSON response on Route.`);
      }
    }
  } catch (error) {
    console.warn(`Failed to fetch route from ${server}:`, error);
  }

  return [];
}

async function fetchPairwiseRoute(
  coordinates: readonly (readonly [number, number])[],
  fetchSegment: (segment: readonly (readonly [number, number])[]) => Promise<RoutePoint[]>
) {
  const route: RoutePoint[] = [];

  for (let index = 0; index < coordinates.length - 1; index += 1) {
    const segment = await fetchSegment([coordinates[index], coordinates[index + 1]]);
    if (segment.length === 0) {
      return [];
    }

    route.push(...(route.length > 0 ? segment.slice(1) : segment));
  }

  return route;
}

function formatCoordinateString(coordinates: readonly (readonly [number, number])[]) {
  return coordinates.map((coordinate) => `${coordinate[0]},${coordinate[1]}`).join(';');
}

function roundCoordinateForRoute(coordinate: readonly [number, number]): readonly [number, number] {
  return [
    roundCoordinateValue(coordinate[0]),
    roundCoordinateValue(coordinate[1]),
  ];
}

function roundCoordinateValue(value: number) {
  return Number(value.toFixed(ROUTE_COORDINATE_PRECISION));
}

function getRouteCacheKey(coordinates: readonly (readonly [number, number])[]) {
  return coordinates.map((coordinate) => `${coordinate[0]},${coordinate[1]}`).join(';');
}

async function fetchWithTimeout(url: string, init: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, ROUTE_FETCH_TIMEOUT_MS);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

function geojsonToRoutePoints(geojson: { coordinates?: number[][] }): RoutePoint[] {
  return (geojson.coordinates ?? []).map((coord) => ({
    latitude: coord[1],
    longitude: coord[0],
  }));
}

async function hydratePersistentRouteCache() {
  if (routeCacheHydrated) {
    return;
  }

  routeCacheHydrationPromise ??= readPersistentRouteCache()
    .then((storedCache) => {
      routeCacheHydrated = true;
      if (!storedCache) {
        return;
      }

      Object.entries(storedCache.entries).forEach(([key, entry]) => {
        if (isValidCachedRoute(entry)) {
          routeCache.set(key, entry);
        }
      });
    })
    .catch(() => {
      routeCacheHydrated = true;
    })
    .finally(() => {
      routeCacheHydrationPromise = null;
    });

  await routeCacheHydrationPromise;
}

function schedulePersistentRouteCacheWrite() {
  if (routeCacheWriteTimer) {
    clearTimeout(routeCacheWriteTimer);
  }

  routeCacheWriteTimer = setTimeout(() => {
    routeCacheWriteTimer = null;
    void writePersistentRouteCache(serializePersistentRouteCache()).catch(() => undefined);
  }, ROUTE_CACHE_WRITE_DEBOUNCE_MS);
}

async function readPersistentRouteCache() {
  const browserStorage = getBrowserLocalStorage();
  if (browserStorage) {
    return parsePersistentRouteCache(browserStorage.getItem(ROUTE_CACHE_STORAGE_KEY));
  }

  try {
    const fileSystem = await import('expo-file-system/legacy');
    const fileUri = getNativeRouteCacheFileUri(fileSystem.documentDirectory);
    if (!fileUri) {
      return null;
    }

    const fileInfo = await fileSystem.getInfoAsync(fileUri);
    if (!fileInfo.exists) {
      return null;
    }

    return parsePersistentRouteCache(await fileSystem.readAsStringAsync(fileUri));
  } catch {
    return null;
  }
}

async function writePersistentRouteCache(serializedCache: string) {
  if (serializedCache.length > ROUTE_CACHE_MAX_STORAGE_BYTES) {
    return;
  }

  const browserStorage = getBrowserLocalStorage();
  if (browserStorage) {
    browserStorage.setItem(ROUTE_CACHE_STORAGE_KEY, serializedCache);
    return;
  }

  try {
    const fileSystem = await import('expo-file-system/legacy');
    const fileUri = getNativeRouteCacheFileUri(fileSystem.documentDirectory);
    if (!fileUri) {
      return;
    }
    await fileSystem.writeAsStringAsync(fileUri, serializedCache);
  } catch {
    // Route cache persistence is best effort; live routing still works without it.
  }
}

function getNativeRouteCacheFileUri(documentDirectory: string | null) {
  return documentDirectory ? `${documentDirectory}${ROUTE_CACHE_STORAGE_FILE}` : null;
}

function serializePersistentRouteCache() {
  const entries = Array.from(routeCache.entries())
    .filter(([, entry]) => isValidCachedRoute(entry))
    .sort(([, a], [, b]) => b.expiresAt - a.expiresAt)
    .slice(0, ROUTE_CACHE_MAX_PERSISTED_ENTRIES);

  return JSON.stringify({
    entries: Object.fromEntries(entries),
    version: 1,
  } satisfies PersistedRouteCache);
}

function parsePersistentRouteCache(value: string | null): PersistedRouteCache | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as Partial<PersistedRouteCache>;
    if (parsed.version !== 1 || typeof parsed.entries !== 'object' || !parsed.entries) {
      return null;
    }

    const entries: PersistedRouteCache['entries'] = {};
    Object.entries(parsed.entries).forEach(([key, entry]) => {
      if (typeof key === 'string' && isValidCachedRoute(entry)) {
        entries[key] = entry;
      }
    });

    return { entries, version: 1 };
  } catch {
    return null;
  }
}

function isValidCachedRoute(value: unknown): value is CachedRoute {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const route = (value as CachedRoute).route;
  return (
    typeof (value as CachedRoute).expiresAt === 'number' &&
    Number.isFinite((value as CachedRoute).expiresAt) &&
    Array.isArray(route) &&
    route.every(
      (point) =>
        typeof point.latitude === 'number' &&
        Number.isFinite(point.latitude) &&
        typeof point.longitude === 'number' &&
        Number.isFinite(point.longitude)
    )
  );
}

function getBrowserLocalStorage() {
  try {
    return typeof globalThis.localStorage === 'undefined' ? null : globalThis.localStorage;
  } catch {
    return null;
  }
}

function isLikelyOffline() {
  return typeof navigator !== 'undefined' && 'onLine' in navigator && navigator.onLine === false;
}

export const routingCacheForTest = {
  clearMemoryCache() {
    routeCache.clear();
    inFlightRoutes.clear();
  },
  getRouteCacheKey,
  parsePersistentRouteCache,
  primeMemoryCache(coordinates: readonly (readonly [number, number])[], route: RoutePoint[], expiresAt: number) {
    routeCache.set(getRouteCacheKey(coordinates.map(roundCoordinateForRoute)), {
      expiresAt,
      route,
    });
  },
  serializePersistentRouteCache,
};
