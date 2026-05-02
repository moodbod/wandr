export async function fetchRoutePath(
  coordinates: readonly (readonly [number, number])[]
): Promise<{ latitude: number; longitude: number }[]> {
  // Filter out invalid coordinates to prevent URL parsing errors
  const validCoords = coordinates.filter(
    (c) => Array.isArray(c) && typeof c[0] === 'number' && typeof c[1] === 'number' && !isNaN(c[0]) && !isNaN(c[1])
  );

  if (validCoords.length < 2) {
    return [];
  }

  // Prefer Mapbox if token is available, otherwise fall back to public OSRM
  const mapboxToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;
  
  if (mapboxToken) {
    const orderedRoute = await fetchMapboxRoute(validCoords, mapboxToken);
    if (orderedRoute.length > 0) {
      return orderedRoute;
    }

    if (validCoords.length > 2) {
      return await fetchPairwiseRoute(validCoords, (segment) => fetchMapboxRoute(segment, mapboxToken));
    }
    
    // If Mapbox fails completely, return empty array to prevent straight lines
    return [];
  }

  // List of public OSRM servers to try (if Mapbox token is missing)
  const osrmServers = [
    'https://routing.openstreetmap.de/routed-car',
    'https://router.project-osrm.org',
  ];

  for (const server of osrmServers) {
    const orderedRoute = await fetchOsrmRoute(validCoords, server);
    if (orderedRoute.length > 0) {
      return orderedRoute;
    }

    if (validCoords.length > 2) {
      const pairwiseRoute = await fetchPairwiseRoute(validCoords, (segment) => fetchOsrmRoute(segment, server));
      if (pairwiseRoute.length > 0) {
        return pairwiseRoute;
      }
    }
  }

  // No fallback to straight lines as requested by user. Return empty array if all APIs fail.
  return [];
}

type RoutePoint = { latitude: number; longitude: number };

async function fetchMapboxRoute(
  coordinates: readonly (readonly [number, number])[],
  token: string
): Promise<RoutePoint[]> {
  const coordString = formatCoordinateString(coordinates);
  const routeUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordString}?overview=full&geometries=geojson&access_token=${token}`;

  try {
    const routeResponse = await fetch(routeUrl, {
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
    const routeResponse = await fetch(routeUrl, {
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

function geojsonToRoutePoints(geojson: { coordinates?: number[][] }): RoutePoint[] {
  return (geojson.coordinates ?? []).map((coord) => ({
    latitude: coord[1],
    longitude: coord[0],
  }));
}
