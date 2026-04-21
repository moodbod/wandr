export async function fetchRoutePath(
  coordinates: readonly (readonly [number, number])[]
): Promise<{ latitude: number; longitude: number }[]> {
  if (coordinates.length < 2) {
    return coordinates.map((c) => ({ latitude: c[1], longitude: c[0] }));
  }

  // Format coordinates as lon,lat;lon,lat
  const coordString = coordinates.map((c) => `${c[0]},${c[1]}`).join(';');
  
  // Use alternatives=false to always guarantee the single most optimal fastest route
  // We use the trip API to optimize the route sequence via the Traveling Salesman Problem (TSP)
  const url = `https://router.project-osrm.org/trip/v1/driving/${coordString}?overview=full&geometries=geojson&source=first&destination=last&roundtrip=false`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'WandrApp/1.0 (Mobile Travel App)',
        Accept: 'application/json',
      },
    });
    const data = await response.json();

    if (data.code === 'Ok' && data.trips && data.trips.length > 0) {
      const geojson = data.trips[0].geometry; // { type: 'LineString', coordinates: [[lon, lat], ...] }
      return geojson.coordinates.map((coord: number[]) => ({
        latitude: coord[1],
        longitude: coord[0],
      }));
    }
  } catch (error) {
    console.error('Failed to fetch route:', error);
  }

  // Fallback to straight lines if the API fails
  return coordinates.map((c) => ({ latitude: c[1], longitude: c[0] }));
}
