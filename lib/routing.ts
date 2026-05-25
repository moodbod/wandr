type RoutePoint = { latitude: number; longitude: number };
type CachedRoute = {
  expiresAt: number;
  route: RoutePoint[];
};

const ROUTE_CACHE_TTL_MS = 5 * 60_000;
const ROUTE_FETCH_TIMEOUT_MS = 10_000;
const ROUTE_COORDINATE_PRECISION = 5;
const routeCache = new Map<string, CachedRoute>();
const inFlightRoutes = new Map<string, Promise<RoutePoint[]>>();

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

  const cacheKey = getRouteCacheKey(validCoords);
  const cachedRoute = routeCache.get(cacheKey);
  if (cachedRoute && cachedRoute.expiresAt > Date.now()) {
    return cachedRoute.route;
  }

  if (cachedRoute) {
    routeCache.delete(cacheKey);
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
      }

      return route;
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
