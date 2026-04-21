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

  // Format coordinates as lon,lat;lon,lat
  const coordString = validCoords.map((c) => `${c[0]},${c[1]}`).join(';');
  
  // Prefer Mapbox if token is available, otherwise fall back to public OSRM
  const mapboxToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;
  
  if (mapboxToken) {
    // Mapbox Optimization API (Traveling Salesman)
    const tripUrl = `https://api.mapbox.com/optimized-trips/v1/mapbox/driving/${coordString}?overview=full&geometries=geojson&source=first&destination=last&roundtrip=false&access_token=${mapboxToken}`;

    try {
      const tripResponse = await fetch(tripUrl, {
        headers: { Accept: 'application/json' },
      });
      
      if (tripResponse.ok) {
        const data = await tripResponse.json();
        if (data.code === 'Ok' && data.trips && data.trips.length > 0) {
          const geojson = data.trips[0].geometry;
          return geojson.coordinates.map((coord: number[]) => ({
            latitude: coord[1],
            longitude: coord[0],
          }));
        }
      }
    } catch (error) {
      console.warn('Failed to fetch optimized trip from Mapbox:', error);
    }

    // Fall back to Mapbox Directions API if Optimization fails
    const routeUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordString}?overview=full&geometries=geojson&access_token=${mapboxToken}`;
    
    try {
      const routeResponse = await fetch(routeUrl, {
        headers: { Accept: 'application/json' },
      });

      if (routeResponse.ok) {
        const data = await routeResponse.json();
        if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
          const geojson = data.routes[0].geometry;
          return geojson.coordinates.map((coord: number[]) => ({
            latitude: coord[1],
            longitude: coord[0],
          }));
        }
      }
    } catch (error) {
      console.warn('Failed to fetch route from Mapbox:', error);
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
    // 1. Try the Trip API to optimize the route sequence via the Traveling Salesman Problem (TSP)
    const tripUrl = `${server}/trip/v1/driving/${coordString}?overview=full&geometries=geojson&source=first&destination=last&roundtrip=false`;

    try {
      const tripResponse = await fetch(tripUrl, {
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (tripResponse.ok) {
        const responseText = await tripResponse.text();
        try {
          const data = JSON.parse(responseText);
          if (data.code === 'Ok' && data.trips && data.trips.length > 0) {
            const geojson = data.trips[0].geometry;
            return geojson.coordinates.map((coord: number[]) => ({
              latitude: coord[1],
              longitude: coord[0],
            }));
          }
        } catch (e) {
          // Ignore JSON parse errors and fall back to route API
        }
      }
    } catch (error) {
      console.warn(`Failed to fetch trip from ${server}:`, error);
      // Ignore network errors and fall back
    }

    // 2. Fall back to the standard Route API if the Trip API fails or returns HTML
    const routeUrl = `${server}/route/v1/driving/${coordString}?overview=full&geometries=geojson`;

    try {
      const routeResponse = await fetch(routeUrl, {
        headers: {
          'Accept': 'application/json',
        },
      });

      if (routeResponse.ok) {
        const responseText = await routeResponse.text();
        try {
          const data = JSON.parse(responseText);
          if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
            const geojson = data.routes[0].geometry;
            return geojson.coordinates.map((coord: number[]) => ({
              latitude: coord[1],
              longitude: coord[0],
            }));
          }
        } catch (e) {
          console.warn(`OSRM (${server}) returned non-JSON response on Route fallback.`);
        }
      }
    } catch (error) {
      console.warn(`Failed to fetch route from ${server}:`, error);
    }
  }

  // No fallback to straight lines as requested by user. Return empty array if all APIs fail.
  return [];
}
