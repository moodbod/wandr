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
const POSITION_CLOSE_METERS = 0.75;
const DEVICE_HEADING_STALE_MS = 5_000;
const TRACKING_DISTANCE_INTERVAL_METERS = 1;
const TRACKING_TIME_INTERVAL_MS = 500;
const MAX_USABLE_ACCURACY_METERS = 80;
const LARGE_JUMP_DISTANCE_METERS = 300;
const LARGE_JUMP_STALE_MS = 15_000;
const OUTLIER_SPEED_METERS_PER_SECOND = 55;
const STATIONARY_SPEED_METERS_PER_SECOND = 0.75;
const STATIONARY_JITTER_METERS = 2.5;

let currentState = INITIAL_STATE;
let isWatchStarting = false;
let startPromise: Promise<void> | null = null;
let positionSubscription: { remove: () => void } | null = null;
let headingSubscription: { remove: () => void } | null = null;
let storedLocationHydrated = false;
let lastDeviceHeadingAt = 0;
let lastAcceptedPositionAt = 0;
let smoothedCoordinate: Coordinate | null = null;

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
      accuracy: location.Accuracy.BestForNavigation,
      distanceInterval: TRACKING_DISTANCE_INTERVAL_METERS,
      timeInterval: TRACKING_TIME_INTERVAL_MS,
    },
    (positionUpdate) => {
      applyPosition(positionUpdate);
    }
  );

  try {
    headingSubscription = await location.watchHeadingAsync((headingUpdate) => {
      const nextHeading = resolveCompassHeading(headingUpdate);

      if (nextHeading === null) {
        return;
      }

      lastDeviceHeadingAt = Date.now();
      emitLocationState({
        ...currentState,
        heading: nextHeading,
      });

      if (currentState.coordinate) {
        void writeStoredLocationPosition({
          accuracy: currentState.accuracy,
          coordinate: currentState.coordinate,
          heading: nextHeading,
          savedAt: Date.now(),
        });
      }
    });
  } catch {
    // GPS course from watchPositionAsync still gives direction while moving.
    headingSubscription = null;
  }

  try {
    const position = await location.getCurrentPositionAsync({
      accuracy: location.Accuracy.BestForNavigation,
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
  const trackedCoordinate = resolveTrackedCoordinate(coordinate, accuracy, position.coords.speed, Date.now());
  if (!trackedCoordinate) {
    return;
  }

  const heading = resolvePositionHeading(position.coords);
  emitLocationState({
    accuracy,
    coordinate: trackedCoordinate,
    heading,
    hasPermission: true,
    isLoading: false,
  });
  void writeStoredLocationPosition({
    accuracy,
    coordinate: trackedCoordinate,
    heading,
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
      heading: normalizeHeading(parsed.heading),
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
    headingsAreClose(previous.heading, next.heading, 1) &&
    coordinatesAreClose(previous.coordinate, next.coordinate, POSITION_CLOSE_METERS)
  );
}

function resolveCompassHeading(headingUpdate: { trueHeading: number; magHeading: number }) {
  return normalizeHeading(headingUpdate.trueHeading) ?? normalizeHeading(headingUpdate.magHeading);
}

function resolvePositionHeading(coords: ExpoPosition['coords']) {
  if (hasRecentDeviceHeading()) {
    return currentState.heading;
  }

  return resolveGpsHeading(coords) ?? currentState.heading;
}

function resolveGpsHeading(coords: ExpoPosition['coords']) {
  const heading = normalizeHeading(coords.heading);
  if (heading === null) {
    return null;
  }

  const speed = normalizeSpeed(coords.speed);
  if (speed !== null && speed < 0.75) {
    return null;
  }

  return heading;
}

function hasRecentDeviceHeading() {
  return lastDeviceHeadingAt > 0 && Date.now() - lastDeviceHeadingAt < DEVICE_HEADING_STALE_MS;
}

function resolveTrackedCoordinate(
  rawCoordinate: Coordinate,
  accuracy: number | null,
  speed: number | null,
  observedAt: number
) {
  if (!smoothedCoordinate) {
    smoothedCoordinate = rawCoordinate;
    lastAcceptedPositionAt = observedAt;
    return rawCoordinate;
  }

  if (accuracy !== null && accuracy > MAX_USABLE_ACCURACY_METERS) {
    return null;
  }

  const speedMetersPerSecond = normalizeSpeed(speed);
  const elapsedMs = lastAcceptedPositionAt > 0 ? observedAt - lastAcceptedPositionAt : TRACKING_TIME_INTERVAL_MS;
  const elapsedSeconds = Math.max(elapsedMs / 1000, TRACKING_TIME_INTERVAL_MS / 1000);
  const distanceMeters = getDistanceMeters(smoothedCoordinate, rawCoordinate);
  const jitterRadius = getStationaryJitterRadius(accuracy);

  if (
    speedMetersPerSecond !== null &&
    speedMetersPerSecond < STATIONARY_SPEED_METERS_PER_SECOND &&
    distanceMeters <= jitterRadius
  ) {
    return null;
  }

  const isStale = elapsedMs > LARGE_JUMP_STALE_MS;
  if (isStale || distanceMeters > LARGE_JUMP_DISTANCE_METERS) {
    smoothedCoordinate = rawCoordinate;
    lastAcceptedPositionAt = observedAt;
    return rawCoordinate;
  }

  const inferredSpeedMetersPerSecond = distanceMeters / elapsedSeconds;
  const maxPlausibleJumpMeters = Math.max((accuracy ?? 20) * 3, 45);
  if (
    inferredSpeedMetersPerSecond > OUTLIER_SPEED_METERS_PER_SECOND &&
    distanceMeters > maxPlausibleJumpMeters
  ) {
    return null;
  }

  const smoothingAlpha = getTrackingSmoothingAlpha(distanceMeters, speedMetersPerSecond, accuracy);
  smoothedCoordinate = interpolateCoordinate(smoothedCoordinate, rawCoordinate, smoothingAlpha);
  lastAcceptedPositionAt = observedAt;
  return smoothedCoordinate;
}

function getStationaryJitterRadius(accuracy: number | null) {
  return Math.max(STATIONARY_JITTER_METERS, (accuracy ?? 0) * 0.2);
}

function getTrackingSmoothingAlpha(distanceMeters: number, speedMetersPerSecond: number | null, accuracy: number | null) {
  if (distanceMeters > 40 || (speedMetersPerSecond !== null && speedMetersPerSecond >= 6)) {
    return 0.72;
  }

  if (distanceMeters > 12 || (speedMetersPerSecond !== null && speedMetersPerSecond >= 1.2)) {
    return 0.58;
  }

  if (accuracy !== null && accuracy <= 10) {
    return 0.5;
  }

  return 0.35;
}

function interpolateCoordinate(from: Coordinate, to: Coordinate, progress: number): Coordinate {
  return [
    from[0] + (to[0] - from[0]) * progress,
    from[1] + (to[1] - from[1]) * progress,
  ];
}

function normalizeSpeed(speed: number | null) {
  return typeof speed === 'number' && Number.isFinite(speed) && speed >= 0 ? speed : null;
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

function headingsAreClose(a: number | null, b: number | null, tolerance: number) {
  if (a === null || b === null) {
    return a === b;
  }

  return getHeadingDelta(a, b) <= tolerance;
}

function normalizeHeading(heading: number | null | undefined) {
  if (typeof heading !== 'number' || !Number.isFinite(heading) || heading < 0) {
    return null;
  }

  return ((heading % 360) + 360) % 360;
}

function getHeadingDelta(a: number, b: number) {
  const normalizedA = normalizeHeading(a);
  const normalizedB = normalizeHeading(b);

  if (normalizedA === null || normalizedB === null) {
    return Number.POSITIVE_INFINITY;
  }

  const delta = Math.abs(normalizedA - normalizedB);
  return Math.min(delta, 360 - delta);
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
