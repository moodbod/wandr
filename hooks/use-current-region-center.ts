import { useEffect, useState } from 'react';

type Coordinate = readonly [number, number];

type CurrentRegionCenterState = {
  coordinate: Coordinate | null;
  hasPermission: boolean;
  isLoading: boolean;
};

export function useCurrentRegionCenter() {
  const [state, setState] = useState<CurrentRegionCenterState>({
    coordinate: null,
    hasPermission: false,
    isLoading: true,
  });

  useEffect(() => {
    let isCancelled = false;

    async function resolveLocation() {
      try {
        const location = await import('expo-location');
        const permission = await location.requestForegroundPermissionsAsync();

        if (permission.status !== 'granted') {
          if (!isCancelled) {
            setState({
              coordinate: null,
              hasPermission: false,
              isLoading: false,
            });
          }
          return;
        }

        const position = await location.getCurrentPositionAsync({
          accuracy: location.Accuracy.Balanced,
        });

        if (!isCancelled) {
          setState({
            coordinate: [position.coords.longitude, position.coords.latitude],
            hasPermission: true,
            isLoading: false,
          });
        }
      } catch {
        if (!isCancelled) {
          setState({
            coordinate: null,
            hasPermission: false,
            isLoading: false,
          });
        }
      }
    }

    resolveLocation();

    return () => {
      isCancelled = true;
    };
  }, []);

  return state;
}
