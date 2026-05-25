import { useEffect, useState } from 'react';

type Coordinate = readonly [number, number];

type CurrentLocationState = {
  accuracy: number | null;
  coordinate: Coordinate | null;
  heading: number | null;
  hasPermission: boolean;
  isLoading: boolean;
};

type ExpoLocationModule = typeof import('expo-location');
type ExpoPosition = Awaited<ReturnType<ExpoLocationModule['getCurrentPositionAsync']>>;

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
let startPromise: Promise<void> | null = null;
let positionSubscription: { remove: () => void } | null = null;
let headingSubscription: { remove: () => void } | null = null;

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

  if (positionSubscription || isWatchStarting) {
    return;
  }

  isWatchStarting = true;
  emitLocationState({
    ...currentState,
    isLoading: currentState.coordinate === null,
  });
  startPromise = startNativeLocationWatch()
    .catch(() => {
      emitLocationState({
        accuracy: null,
        coordinate: null,
        heading: null,
        hasPermission: false,
        isLoading: false,
      });
    })
    .finally(() => {
      isWatchStarting = false;
      startPromise = null;
    });
}

let stopTimer: ReturnType<typeof setTimeout> | null = null;

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

async function startNativeLocationWatch() {
  const location = await import('expo-location');
  const existingPermission = await location.getForegroundPermissionsAsync();
  const permission =
    existingPermission.status !== 'granted'
      ? await location.requestForegroundPermissionsAsync()
      : existingPermission;

  if (permission.status !== 'granted') {
    emitLocationState({
      accuracy: null,
      coordinate: null,
      heading: null,
      hasPermission: false,
      isLoading: false,
    });
    return;
  }

  emitLocationState({
    ...currentState,
    hasPermission: true,
    isLoading: currentState.coordinate === null,
  });

  positionSubscription = await location.watchPositionAsync(
    {
      accuracy: location.Accuracy.High,
      distanceInterval: 5,
      timeInterval: 2_000,
    },
    (positionUpdate) => {
      applyPosition(positionUpdate);
    }
  );

  headingSubscription = await location.watchHeadingAsync((headingUpdate) => {
    const nextHeading =
      typeof headingUpdate.trueHeading === 'number' && headingUpdate.trueHeading >= 0
        ? headingUpdate.trueHeading
        : headingUpdate.magHeading;

    if (!Number.isFinite(nextHeading)) {
      return;
    }

    emitLocationState({
      ...currentState,
      heading: nextHeading,
    });
  });

  try {
    const position = await location.getCurrentPositionAsync({
      accuracy: location.Accuracy.High,
    });
    applyPosition(position);
  } catch {
    emitLocationState({
      ...currentState,
      isLoading: false,
    });
  }
}

function stopLocationWatch() {
  void startPromise;
  positionSubscription?.remove();
  headingSubscription?.remove();
  positionSubscription = null;
  headingSubscription = null;
}

function applyPosition(position: ExpoPosition) {
  const coordinate: Coordinate = [position.coords.longitude, position.coords.latitude];
  if (!coordinateIsValid(coordinate)) {
    return;
  }

  emitLocationState({
    accuracy: Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : null,
    coordinate,
    heading: currentState.heading,
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
