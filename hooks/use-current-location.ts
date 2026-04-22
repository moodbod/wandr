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
    let headingSubscription: { remove: () => void } | null = null;
    let positionSubscription: { remove: () => void } | null = null;

    async function resolveLocation() {
      try {
        const location = await import('expo-location');
        const existingPermission = await location.getForegroundPermissionsAsync();

        const permission =
          existingPermission.status !== 'granted'
            ? await location.requestForegroundPermissionsAsync()
            : existingPermission;

        if (permission.status !== 'granted') {
          if (!isCancelled) {
            setState({
              coordinate: null,
              heading: null,
              hasPermission: false,
              isLoading: false,
            });
          }
          return;
        }

        const lastKnown = await location.getLastKnownPositionAsync();
        const position =
          lastKnown ??
          (await location.getCurrentPositionAsync({
            accuracy: location.Accuracy.Balanced,
          }));

        if (!isCancelled) {
          setState({
            coordinate: [position.coords.longitude, position.coords.latitude],
            heading: null,
            hasPermission: true,
            isLoading: false,
          });
        }

        positionSubscription = await location.watchPositionAsync(
          {
            accuracy: location.Accuracy.Balanced,
            timeInterval: 5_000,
            distanceInterval: 10,
          },
          (positionUpdate) => {
            if (!isCancelled) {
              setState((current) => ({
                ...current,
                coordinate: [positionUpdate.coords.longitude, positionUpdate.coords.latitude],
                hasPermission: true,
                isLoading: false,
              }));
            }
          }
        );

        headingSubscription = await location.watchHeadingAsync((headingUpdate) => {
          if (!isCancelled) {
            const nextHeading =
              typeof headingUpdate.trueHeading === 'number' && headingUpdate.trueHeading >= 0
                ? headingUpdate.trueHeading
                : headingUpdate.magHeading;

            setState((current) => ({
              ...current,
              heading: Number.isFinite(nextHeading) ? nextHeading : null,
            }));
          }
        });
      } catch {
        if (!isCancelled) {
          setState({
            coordinate: null,
            heading: null,
            hasPermission: false,
            isLoading: false,
          });
        }
      }
    }

    resolveLocation();

    return () => {
      isCancelled = true;
      positionSubscription?.remove();
      headingSubscription?.remove();
    };
  }, []);

  return state;
}
