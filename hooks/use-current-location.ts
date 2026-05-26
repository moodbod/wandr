import * as SecureStore from 'expo-secure-store';
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
type StoredLocationPermission = 'granted' | 'denied';
type StoredLocationPosition = {
  accuracy: number | null;
  coordinate: Coordinate;
  heading: number | null;
  savedAt: number;
};

const INITIAL_STATE: CurrentLocationState = {
  accuracy: null,
  coordinate: null,
  heading: null,
  hasPermission: false,
  isLoading: false,
};
const subscribers = new Set<(state: CurrentLocationState) => void>();
const LOCATION_PERMISSION_STORAGE_KEY = 'wandr.current-location.permission.v1';
const LAST_POSITION_STORAGE_KEY = 'wandr.current-location.last-position.v1';
const WATCH_STOP_DELAY_MS = 15_000;
const POSITION_CLOSE_METERS = 1.5;

let currentState = INITIAL_STATE;
let isWatchStarting = false;
let startPromise: Promise<void> | null = null;
let positionSubscription: { remove: () => void } | null = null;
let headingSubscription: { remove: () => void } | null = null;
let storedLocationHydrated = false;

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
  await hydrateStoredLocationState();

  const storedPermission = await readStoredLocationPermission();
  const existingPermission = await location.getForegroundPermissionsAsync();
  let permission = existingPermission;

  if (existingPermission.status !== 'granted') {
    if (storedPermission !== null) {
      emitLocationState({
        ...currentState,
        hasPermission: false,
        isLoading: false,
      });
      return;
    }

    permission = await location.requestForegroundPermissionsAsync();
    await writeStoredLocationPermission(permission.status === 'granted' ? 'granted' : 'denied');
  } else if (storedPermission !== 'granted') {
    await writeStoredLocationPermission('granted');
  }

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

  const accuracy = Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : null;
  emitLocationState({
    accuracy,
    coordinate,
    heading: currentState.heading,
    hasPermission: true,
    isLoading: false,
  });
  void writeStoredLocationPosition({
    accuracy,
    coordinate,
    heading: currentState.heading,
    savedAt: Date.now(),
  });
}

async function hydrateStoredLocationState() {
  if (storedLocationHydrated) {
    return;
  }

  storedLocationHydrated = true;
  const storedPosition = await readStoredLocationPosition();
  if (!storedPosition) {
    return;
  }

  emitLocationState({
    accuracy: storedPosition.accuracy,
    coordinate: storedPosition.coordinate,
    heading: storedPosition.heading,
    hasPermission: currentState.hasPermission,
    isLoading: false,
  });
}

async function readStoredLocationPermission(): Promise<StoredLocationPermission | null> {
  try {
    const value = await SecureStore.getItemAsync(LOCATION_PERMISSION_STORAGE_KEY);
    return value === 'granted' || value === 'denied' ? value : null;
  } catch {
    return null;
  }
}

async function writeStoredLocationPermission(permission: StoredLocationPermission) {
  try {
    await SecureStore.setItemAsync(LOCATION_PERMISSION_STORAGE_KEY, permission);
  } catch {
    // Location still works without the local preference cache.
  }
}

async function readStoredLocationPosition(): Promise<StoredLocationPosition | null> {
  try {
    const value = await SecureStore.getItemAsync(LAST_POSITION_STORAGE_KEY);
    if (!value) {
      return null;
    }

    return parseStoredLocationPosition(value);
  } catch {
    return null;
  }
}

async function writeStoredLocationPosition(position: StoredLocationPosition) {
  try {
    await SecureStore.setItemAsync(LAST_POSITION_STORAGE_KEY, JSON.stringify(position));
  } catch {
    // A failed cache write should not interrupt live location updates.
  }
}

function parseStoredLocationPosition(value: string): StoredLocationPosition | null {
  try {
    const parsed = JSON.parse(value) as Partial<StoredLocationPosition>;
    if (!Array.isArray(parsed.coordinate) || parsed.coordinate.length !== 2) {
      return null;
    }

    const coordinate: Coordinate = [Number(parsed.coordinate[0]), Number(parsed.coordinate[1])];
    if (!coordinateIsValid(coordinate)) {
      return null;
    }

    return {
      accuracy: typeof parsed.accuracy === 'number' && Number.isFinite(parsed.accuracy) ? parsed.accuracy : null,
      coordinate,
      heading: typeof parsed.heading === 'number' && Number.isFinite(parsed.heading) ? parsed.heading : null,
      savedAt: typeof parsed.savedAt === 'number' && Number.isFinite(parsed.savedAt) ? parsed.savedAt : Date.now(),
    };
  } catch {
    return null;
  }
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
