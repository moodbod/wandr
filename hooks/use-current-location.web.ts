import { useEffect, useState } from 'react';

type Coordinate = readonly [number, number];

type CurrentLocationState = {
  accuracy: number | null;
  coordinate: Coordinate | null;
  heading: number | null;
  hasPermission: boolean;
  isLoading: boolean;
};

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
const GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 5_000,
  timeout: 15_000,
};
const WATCH_STOP_DELAY_MS = 15_000;
const POSITION_CLOSE_METERS = 1.5;

let currentState = INITIAL_STATE;
let isWatchStarting = false;
let startPromise: Promise<void> | null = null;
let watchId: number | null = null;
let stopTimer: ReturnType<typeof setTimeout> | null = null;
let lastHeading: number | null = null;
let lastHeadingSetAt = 0;
let removeOrientationPermissionRequest: (() => void) | null = null;
let orientationListening = false;
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

  if (watchId !== null || isWatchStarting) {
    return;
  }

  if (!navigator.geolocation) {
    hydrateStoredLocationState();
    emitLocationState({
      ...currentState,
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

  startPromise = startWebLocationWatch()
    .catch(() => {
      emitLocationState({
        ...currentState,
        hasPermission: false,
        isLoading: false,
      });
    })
    .finally(() => {
      isWatchStarting = false;
      startPromise = null;
    });
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
  void startPromise;
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
  writeStoredLocationPosition({
    accuracy,
    coordinate,
    heading,
    savedAt: Date.now(),
  });
}

async function startWebLocationWatch() {
  hydrateStoredLocationState();

  const browserPermission = await readBrowserGeolocationPermissionState();
  const storedPermission = readStoredLocationPermission();

  if (browserPermission === 'denied') {
    writeStoredLocationPermission('denied');
    emitLocationState({
      ...currentState,
      hasPermission: false,
      isLoading: false,
    });
    return;
  }

  if (browserPermission === 'prompt' && storedPermission !== null) {
    emitLocationState({
      ...currentState,
      hasPermission: false,
      isLoading: false,
    });
    return;
  }

  if (browserPermission === null && storedPermission !== null) {
    emitLocationState({
      ...currentState,
      hasPermission: false,
      isLoading: false,
    });
    return;
  }

  if (browserPermission === 'granted') {
    writeStoredLocationPermission('granted');
    startPositionWatch();
    await refreshCurrentPosition();
    return;
  }

  await requestInitialPosition();
}

async function requestInitialPosition() {
  try {
    const position = await getCurrentBrowserPosition();
    writeStoredLocationPermission('granted');
    applyGeolocationPosition(position);

    if (subscribers.size > 0) {
      startPositionWatch();
    }
  } catch (error) {
    handleGeolocationError(error);
  }
}

async function refreshCurrentPosition() {
  try {
    const position = await getCurrentBrowserPosition();
    applyGeolocationPosition(position);
  } catch (error) {
    handleGeolocationError(error);
  }
}

function startPositionWatch() {
  if (watchId !== null || subscribers.size === 0 || !navigator.geolocation) {
    return;
  }

  watchId = navigator.geolocation.watchPosition(
    (position) => {
      applyGeolocationPosition(position);
    },
    (error) => {
      handleGeolocationError(error);
    },
    GEOLOCATION_OPTIONS
  );

  startOrientationWatch();
}

function getCurrentBrowserPosition() {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, GEOLOCATION_OPTIONS);
  });
}

function handleGeolocationError(error: unknown) {
  const permissionDenied = isPermissionDeniedError(error);
  if (permissionDenied) {
    writeStoredLocationPermission('denied');
  }

  emitLocationState({
    ...currentState,
    hasPermission: permissionDenied ? false : currentState.hasPermission,
    isLoading: false,
  });
}

function isPermissionDeniedError(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error && Number(error.code) === 1;
}

function hydrateStoredLocationState() {
  if (storedLocationHydrated) {
    return;
  }

  storedLocationHydrated = true;
  const storedPosition = readStoredLocationPosition();
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

async function readBrowserGeolocationPermissionState(): Promise<PermissionState | null> {
  if (!navigator.permissions?.query) {
    return null;
  }

  try {
    const permission = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
    return permission.state;
  } catch {
    return null;
  }
}

function readStoredLocationPermission(): StoredLocationPermission | null {
  const value = readStorageItem(LOCATION_PERMISSION_STORAGE_KEY);
  return value === 'granted' || value === 'denied' ? value : null;
}

function writeStoredLocationPermission(permission: StoredLocationPermission) {
  writeStorageItem(LOCATION_PERMISSION_STORAGE_KEY, permission);
}

function readStoredLocationPosition(): StoredLocationPosition | null {
  const value = readStorageItem(LAST_POSITION_STORAGE_KEY);
  if (!value) {
    return null;
  }

  return parseStoredLocationPosition(value);
}

function writeStoredLocationPosition(position: StoredLocationPosition) {
  writeStorageItem(LAST_POSITION_STORAGE_KEY, JSON.stringify(position));
}

function readStorageItem(key: string) {
  try {
    return typeof window === 'undefined' ? null : window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorageItem(key: string, value: string) {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(key, value);
    }
  } catch {
    // Location still works without the local preference cache.
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
