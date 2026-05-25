import { useEffect, useState } from 'react';

type Coordinate = readonly [number, number];

type CurrentLocationState = {
  accuracy: number | null;
  coordinate: Coordinate | null;
  heading: number | null;
  hasPermission: boolean;
  isLoading: boolean;
};

const INITIAL_STATE: CurrentLocationState = {
  accuracy: null,
  coordinate: null,
  heading: null,
  hasPermission: false,
  isLoading: false,
};
const subscribers = new Set<(state: CurrentLocationState) => void>();
const WATCH_STOP_DELAY_MS = 15_000;
const POSITION_CLOSE_METERS = 1.5;

let currentState = INITIAL_STATE;
let isWatchStarting = false;
let watchId: number | null = null;
let stopTimer: ReturnType<typeof setTimeout> | null = null;
let lastHeading: number | null = null;
let lastHeadingSetAt = 0;
let removeOrientationPermissionRequest: (() => void) | null = null;
let orientationListening = false;

export function useCurrentLocation() {
  const [state, setState] = useState<CurrentLocationState>(currentState);

  useEffect(() => subscribeCurrentLocation(setState), []);

  return state;
}

function subscribeCurrentLocation(listener: (state: CurrentLocationState) => void) {
  subscribers.add(listener);
  listener(currentState);
  startLocationWatch();

  return () => {
    subscribers.delete(listener);
    if (subscribers.size === 0) {
      scheduleStopLocationWatch();
    }
  };
}

function startLocationWatch() {
  if (stopTimer) {
    clearTimeout(stopTimer);
    stopTimer = null;
  }

  if (watchId !== null || isWatchStarting) {
    return;
  }

  if (!navigator.geolocation) {
    emitLocationState({
      accuracy: null,
      coordinate: null,
      heading: null,
      hasPermission: false,
      isLoading: false,
    });
    return;
  }

  isWatchStarting = true;
  emitLocationState({
    ...currentState,
    isLoading: currentState.coordinate === null,
  });

  navigator.geolocation.getCurrentPosition(
    (position) => {
      applyGeolocationPosition(position);
      isWatchStarting = false;
    },
    () => {
      isWatchStarting = false;
      emitLocationState({
        ...currentState,
        hasPermission: false,
        isLoading: false,
      });
    },
    {
      enableHighAccuracy: true,
      maximumAge: 5_000,
      timeout: 15_000,
    }
  );

  watchId = navigator.geolocation.watchPosition(
    (position) => {
      applyGeolocationPosition(position);
      isWatchStarting = false;
    },
    () => {
      isWatchStarting = false;
      emitLocationState({
        ...currentState,
        isLoading: false,
      });
    },
    {
      enableHighAccuracy: true,
      maximumAge: 5_000,
      timeout: 15_000,
    }
  );

  startOrientationWatch();
}

function scheduleStopLocationWatch() {
  if (stopTimer) {
    clearTimeout(stopTimer);
  }

  stopTimer = setTimeout(() => {
    if (subscribers.size > 0) {
      return;
    }

    stopLocationWatch();
  }, WATCH_STOP_DELAY_MS);
}

function stopLocationWatch() {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }

  isWatchStarting = false;
  stopOrientationWatch();
}

function applyGeolocationPosition(position: GeolocationPosition) {
  const coordinate: Coordinate = [position.coords.longitude, position.coords.latitude];
  if (!coordinateIsValid(coordinate)) {
    return;
  }

  const heading = resolveGeolocationHeading(position.coords) ?? currentState.heading;
  const accuracy = Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : null;
  emitLocationState({
    accuracy,
    coordinate,
    heading,
    hasPermission: true,
    isLoading: false,
  });
}

function emitLocationState(nextState: CurrentLocationState) {
  if (statesAreEquivalent(currentState, nextState)) {
    return;
  }

  currentState = nextState;
  subscribers.forEach((listener) => listener(currentState));
}

function startOrientationWatch() {
  if (orientationListening || typeof window === 'undefined') {
    return;
  }

  const orientationEventConstructor = window.DeviceOrientationEvent as DeviceOrientationEventConstructorWithPermission | undefined;
  if (!orientationEventConstructor) {
    return;
  }

  if (orientationEventConstructor.requestPermission) {
    const requestOrientationPermission = () => {
      void orientationEventConstructor
        .requestPermission?.()
        .then((permissionState) => {
          if (permissionState === 'granted') {
            addOrientationListener();
          }
        })
        .catch(() => {
          // Heading is optional; GPS course can still update while moving.
        });
    };

    window.addEventListener('pointerdown', requestOrientationPermission, { once: true });
    removeOrientationPermissionRequest = () => {
      window.removeEventListener('pointerdown', requestOrientationPermission);
    };
    return;
  }

  addOrientationListener();
}

function addOrientationListener() {
  if (orientationListening) {
    return;
  }

  window.addEventListener('deviceorientation', handleOrientation, true);
  orientationListening = true;
}

function stopOrientationWatch() {
  removeOrientationPermissionRequest?.();
  removeOrientationPermissionRequest = null;

  if (!orientationListening || typeof window === 'undefined') {
    return;
  }

  window.removeEventListener('deviceorientation', handleOrientation, true);
  orientationListening = false;
}

function handleOrientation(event: DeviceOrientationEvent) {
  const heading = resolveDeviceOrientationHeading(event);
  if (heading === null) {
    return;
  }

  const now = Date.now();
  const headingDelta = lastHeading === null ? 360 : getHeadingDelta(lastHeading, heading);
  if (headingDelta < 1 || (now - lastHeadingSetAt < 100 && headingDelta < 6)) {
    return;
  }

  lastHeading = heading;
  lastHeadingSetAt = now;
  emitLocationState({
    ...currentState,
    heading,
  });
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

function coordinateIsValid(coordinate: Coordinate) {
  const [longitude, latitude] = coordinate;
  return (
    Number.isFinite(longitude) &&
    Number.isFinite(latitude) &&
    longitude >= -180 &&
    longitude <= 180 &&
    latitude >= -90 &&
    latitude <= 90
  );
}

function statesAreEquivalent(previous: CurrentLocationState, next: CurrentLocationState) {
  return (
    previous.hasPermission === next.hasPermission &&
    previous.isLoading === next.isLoading &&
    nullableNumbersAreClose(previous.accuracy, next.accuracy, 1) &&
    nullableNumbersAreClose(previous.heading, next.heading, 1) &&
    coordinatesAreClose(previous.coordinate, next.coordinate, POSITION_CLOSE_METERS)
  );
}

function coordinatesAreClose(a: Coordinate | null, b: Coordinate | null, meters: number) {
  if (!a || !b) {
    return a === b;
  }

  return getDistanceMeters(a, b) <= meters;
}

function nullableNumbersAreClose(a: number | null, b: number | null, tolerance: number) {
  if (a === null || b === null) {
    return a === b;
  }

  return Math.abs(a - b) <= tolerance;
}

function getDistanceMeters(a: Coordinate, b: Coordinate) {
  const earthRadiusMeters = 6_371_000;
  const lat1 = toRadians(a[1]);
  const lat2 = toRadians(b[1]);
  const deltaLat = toRadians(b[1] - a[1]);
  const deltaLon = toRadians(b[0] - a[0]);
  const haversine =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;

  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}
