import { useEffect, useState } from 'react';

type CurrentLocationState = {
  coordinate: readonly [number, number] | null;
  heading: number | null;
  hasPermission: boolean;
  isLoading: boolean;
};

export function useCurrentLocation() {
  const [state, setState] = useState<CurrentLocationState>({
    coordinate: null,
    heading: null,
    hasPermission: false,
    isLoading: true,
  });

  useEffect(() => {
    let isCancelled = false;
    let watchId: number | null = null;

    if (!navigator.geolocation) {
      setState({
        coordinate: null,
        heading: null,
        hasPermission: false,
        isLoading: false,
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!isCancelled) {
          setState({
            coordinate: [position.coords.longitude, position.coords.latitude],
            heading: null,
            hasPermission: true,
            isLoading: false,
          });
        }
      },
      () => {
        if (!isCancelled) {
          setState({
            coordinate: null,
            heading: null,
            hasPermission: false,
            isLoading: false,
          });
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 60_000,
        timeout: 15_000,
      }
    );

    watchId = navigator.geolocation.watchPosition(
      (position) => {
        if (!isCancelled) {
          setState((current) => ({
            ...current,
            coordinate: [position.coords.longitude, position.coords.latitude],
            hasPermission: true,
            isLoading: false,
          }));
        }
      },
      () => {
        if (!isCancelled) {
          setState((current) => ({
            ...current,
            isLoading: false,
          }));
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 15_000,
        timeout: 15_000,
      }
    );

    return () => {
      isCancelled = true;
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []);

  return state;
}
