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
    if (!navigator.geolocation) {
      setState({
        coordinate: null,
        hasPermission: false,
        isLoading: false,
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          coordinate: [position.coords.longitude, position.coords.latitude],
          hasPermission: true,
          isLoading: false,
        });
      },
      () => {
        setState({
          coordinate: null,
          hasPermission: false,
          isLoading: false,
        });
      },
      {
        enableHighAccuracy: false,
        maximumAge: 300000,
        timeout: 8000,
      }
    );
  }, []);

  return state;
}
