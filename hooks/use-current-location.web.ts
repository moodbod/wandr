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
    let lastHeading: number | null = null;
    let lastHeadingSetAt = 0;
    let removeOrientationPermissionRequest: (() => void) | null = null;

    const updateHeading = (heading: number | null) => {
      if (isCancelled || heading === null) {
        return;
      }

      const now = Date.now();
      const headingDelta = lastHeading === null ? 360 : getHeadingDelta(lastHeading, heading);
      if (headingDelta < 1 || (now - lastHeadingSetAt < 100 && headingDelta < 6)) {
        return;
      }

      lastHeading = heading;
      lastHeadingSetAt = now;

      setState((current) => ({
        ...current,
        heading,
      }));
    };

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
            heading: resolveGeolocationHeading(position.coords),
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
            heading: resolveGeolocationHeading(position.coords) ?? current.heading,
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

    const orientationHandler = (event: DeviceOrientationEvent) => {
      updateHeading(resolveDeviceOrientationHeading(event));
    };

    const startOrientationWatch = () => {
      window.addEventListener('deviceorientation', orientationHandler, true);
    };

    const orientationEventConstructor = window.DeviceOrientationEvent as DeviceOrientationEventConstructorWithPermission | undefined;

    if (orientationEventConstructor?.requestPermission) {
      const requestOrientationPermission = () => {
        void orientationEventConstructor
          .requestPermission?.()
          .then((permissionState) => {
            if (!isCancelled && permissionState === 'granted') {
              startOrientationWatch();
            }
          })
          .catch(() => {
            // Device orientation is optional; GPS course heading can still update while moving.
          });
      };

      window.addEventListener('pointerdown', requestOrientationPermission, { once: true });
      removeOrientationPermissionRequest = () => {
        window.removeEventListener('pointerdown', requestOrientationPermission);
      };
    } else if (orientationEventConstructor) {
      startOrientationWatch();
    }

    return () => {
      isCancelled = true;
      removeOrientationPermissionRequest?.();
      window.removeEventListener('deviceorientation', orientationHandler, true);
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []);

  return state;
}

type DeviceOrientationEventWithCompass = DeviceOrientationEvent & {
  webkitCompassHeading?: number;
};

type DeviceOrientationEventConstructorWithPermission = {
  new(type: string, eventInitDict?: DeviceOrientationEventInit): DeviceOrientationEvent;
  requestPermission?: () => Promise<PermissionState>;
};

function resolveGeolocationHeading(coords: GeolocationCoordinates) {
  return normalizeHeading(coords.heading);
}

function resolveDeviceOrientationHeading(event: DeviceOrientationEvent) {
  const compassHeading = (event as DeviceOrientationEventWithCompass).webkitCompassHeading;

  if (typeof compassHeading === 'number') {
    return normalizeHeading(compassHeading);
  }

  if (typeof event.alpha === 'number') {
    return normalizeHeading(360 - event.alpha);
  }

  return null;
}

function normalizeHeading(heading: number | null) {
  if (typeof heading !== 'number' || !Number.isFinite(heading) || heading < 0) {
    return null;
  }

  return ((heading % 360) + 360) % 360;
}

function getHeadingDelta(previousHeading: number, nextHeading: number) {
  const delta = Math.abs(nextHeading - previousHeading) % 360;
  return delta > 180 ? 360 - delta : delta;
}
