import { useEffect, useState } from 'react';

type Coordinate = readonly [number, number];

export type CurrentLocationSource = 'live' | 'cached';
export type CurrentLocationStaleReason = 'cached' | 'timeout' | 'permissionDenied' | 'unavailable' | null;

export type CurrentLocationState = {
  accuracy: number | null;
  coordinate: Coordinate | null;
  heading: number | null;
  hasPermission: boolean;
  isBackgroundTracking: boolean;
  isGpsAvailable: boolean | null;
  isLocationServicesEnabled: boolean | null;
  isLoading: boolean;
  isNavigationTracking: boolean;
  isStale: boolean;
  positionUpdatedAt: number | null;
  source: CurrentLocationSource;
  speed: number | null;
  staleReason: CurrentLocationStaleReason;
  updatedAt: number | null;
};

export type LocationBreadcrumb = {
  accuracy: number | null;
  coordinate: Coordinate;
  heading: number | null;
  recordedAt: number;
  speed: number | null;
};
type StoredLocationBreadcrumbs = {
  breadcrumbs?: LocationBreadcrumb[];
  version?: number;
};
type StoredLocationPermission = 'granted' | 'denied';
type StoredLocationPosition = {
  accuracy: number | null;
  coordinate: Coordinate;
  heading: number | null;
  positionUpdatedAt?: number;
  savedAt: number;
  speed: number | null;
  updatedAt?: number;
};
type TrackedCoordinateResult = {
  coordinate: Coordinate;
  shouldRecordBreadcrumb: boolean;
};
type WakeLockSentinelLike = EventTarget & {
  release: () => Promise<void>;
  released?: boolean;
};
type NavigatorWithWakeLock = Navigator & {
  wakeLock?: {
    request: (type: 'screen') => Promise<WakeLockSentinelLike>;
  };
};

const INITIAL_STATE: CurrentLocationState = {
  accuracy: null,
  coordinate: null,
  heading: null,
  hasPermission: false,
  isBackgroundTracking: false,
  isGpsAvailable: null,
  isLocationServicesEnabled: null,
  isLoading: false,
  isNavigationTracking: false,
  isStale: true,
  positionUpdatedAt: null,
  source: 'cached',
  speed: null,
  staleReason: 'cached',
  updatedAt: null,
};
const subscribers = new Set<(state: CurrentLocationState) => void>();
const LOCATION_PERMISSION_STORAGE_KEY = 'wandr.current-location.permission.v1';
const LAST_POSITION_STORAGE_KEY = 'wandr.current-location.last-position.v1';
const ACTIVE_TRIP_BREADCRUMBS_STORAGE_KEY = 'wandr.active-trip.breadcrumbs.v1';
const GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 5_000,
  timeout: 15_000,
};
const WATCH_STOP_DELAY_MS = 15_000;
const POSITION_CLOSE_METERS = 0.75;
const DEVICE_HEADING_STALE_MS = 5_000;
const LIVE_LOCATION_STALE_MS = 12_000;
const FOREGROUND_WATCHDOG_INTERVAL_MS = 5_000;
const FOREGROUND_WATCHDOG_RESTART_MS = 18_000;
const FOREGROUND_WATCHDOG_RESTART_COOLDOWN_MS = 8_000;
const TRACKING_TIME_INTERVAL_MS = 500;
const MAX_USABLE_ACCURACY_METERS = 80;
const LARGE_JUMP_DISTANCE_METERS = 300;
const LARGE_JUMP_STALE_MS = 15_000;
const OUTLIER_SPEED_METERS_PER_SECOND = 55;
const STATIONARY_SPEED_METERS_PER_SECOND = 0.75;
const STATIONARY_JITTER_METERS = 2.5;
const MOVEMENT_HEADING_MIN_DISTANCE_METERS = 3;
const ACTIVE_TRIP_BREADCRUMB_VERSION = 1;
const ACTIVE_TRIP_BREADCRUMB_MAX_COUNT = 2_500;
const ACTIVE_TRIP_BREADCRUMB_MAX_AGE_MS = 48 * 60 * 60_000;
const ACTIVE_TRIP_BREADCRUMB_MIN_INTERVAL_MS = 3_000;
const ACTIVE_TRIP_BREADCRUMB_MIN_DISTANCE_METERS = 3;

let currentState = INITIAL_STATE;
let isWatchStarting = false;
let startPromise: Promise<void> | null = null;
let watchId: number | null = null;
let stopTimer: ReturnType<typeof setTimeout> | null = null;
let lastHeading: number | null = null;
let lastHeadingSetAt = 0;
let lastAcceptedPositionAt = 0;
let smoothedCoordinate: Coordinate | null = null;
let removeOrientationPermissionRequest: (() => void) | null = null;
let orientationListening = false;
let storedLocationHydrated = false;
let watchdogTimer: ReturnType<typeof setInterval> | null = null;
let lastWatchdogRestartAt = 0;
let activeTripBreadcrumbs: LocationBreadcrumb[] = [];
let activeTripBreadcrumbsHydrated = false;
let visibilityListening = false;
let navigationWakeLock: WakeLockSentinelLike | null = null;
let navigationWakeLockRequest: Promise<void> | null = null;

export function useCurrentLocation() {
  const [state, setState] = useState<CurrentLocationState>(currentState);

  useEffect(() => subscribeCurrentLocation(setState), []);

  return state;
}

export async function startNavigationLocationTracking() {
  hydrateStoredLocationState();
  hydrateActiveTripBreadcrumbs();
  startLocationWatch();

  try {
    await startPromise;
  } catch {
    // startLocationWatch already moves state into the unavailable branch.
  }

  const canTrack = currentState.hasPermission;
  emitLocationState({
    ...currentState,
    isBackgroundTracking: false,
    isNavigationTracking: canTrack,
  });
  if (canTrack) {
    startPositionWatch();
    requestNavigationWakeLock();
    appendCurrentLocationBreadcrumb();
  }
  return canTrack;
}

export async function stopNavigationLocationTracking() {
  emitLocationState({
    ...currentState,
    isBackgroundTracking: false,
    isNavigationTracking: false,
  });
  await releaseNavigationWakeLock();
  if (subscribers.size === 0) {
    scheduleStopLocationWatch();
  }
}

export async function getNavigationLocationTrackingStatus() {
  return currentState.isNavigationTracking;
}

export async function getActiveTripLocationBreadcrumbs() {
  hydrateActiveTripBreadcrumbs();
  return [...activeTripBreadcrumbs];
}

export async function clearActiveTripLocationBreadcrumbs() {
  activeTripBreadcrumbs = [];
  activeTripBreadcrumbsHydrated = true;
  writeActiveTripBreadcrumbs();
}

function appendCurrentLocationBreadcrumb() {
  if (!currentState.coordinate) {
    return;
  }

  appendActiveTripBreadcrumb({
    accuracy: currentState.accuracy,
    coordinate: currentState.coordinate,
    heading: currentState.heading,
    recordedAt: currentState.positionUpdatedAt ?? currentState.updatedAt ?? Date.now(),
    speed: currentState.speed,
  });
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
    startForegroundLocationWatchdog();
    return;
  }

  if (!navigator.geolocation) {
    hydrateStoredLocationState();
    emitLocationState({
      ...currentState,
      hasPermission: false,
      isLocationServicesEnabled: false,
      isLoading: false,
      isStale: true,
      staleReason: 'unavailable',
    });
    return;
  }

  startForegroundLocationWatchdog();
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
        isStale: true,
        staleReason: 'unavailable',
      });
    })
    .finally(() => {
      isWatchStarting = false;
      startPromise = null;
    });
}

function scheduleStopLocationWatch() {
  if (currentState.isNavigationTracking) {
    return;
  }

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
  if (!currentState.isNavigationTracking) {
    stopForegroundLocationWatchdog();
  }
  stopVisibilityWatch();
}

function startForegroundLocationWatchdog() {
  if (watchdogTimer) {
    return;
  }

  watchdogTimer = setInterval(checkForegroundLocationWatchdog, FOREGROUND_WATCHDOG_INTERVAL_MS);
}

function stopForegroundLocationWatchdog() {
  if (!watchdogTimer) {
    return;
  }

  clearInterval(watchdogTimer);
  watchdogTimer = null;
}

function startVisibilityWatch() {
  if (visibilityListening || typeof document === 'undefined') {
    return;
  }

  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('focus', handleVisibilityResume);
  window.addEventListener('pageshow', handleVisibilityResume);
  window.addEventListener('pagehide', handleVisibilitySuspend);
  visibilityListening = true;
}

function stopVisibilityWatch() {
  if (!visibilityListening || typeof document === 'undefined') {
    return;
  }

  document.removeEventListener('visibilitychange', handleVisibilityChange);
  window.removeEventListener('focus', handleVisibilityResume);
  window.removeEventListener('pageshow', handleVisibilityResume);
  window.removeEventListener('pagehide', handleVisibilitySuspend);
  visibilityListening = false;
}

function handleVisibilityChange() {
  if (isDocumentVisible()) {
    handleVisibilityResume();
    return;
  }

  handleVisibilitySuspend();
}

function handleVisibilitySuspend() {
  void releaseNavigationWakeLock();
  if (currentState.hasPermission && currentState.source === 'live' && !currentState.isStale) {
    emitLocationState({
      ...currentState,
      isBackgroundTracking: false,
      isStale: true,
      staleReason: 'timeout',
    });
  }
}

function handleVisibilityResume() {
  if (!isDocumentVisible()) {
    return;
  }

  if (currentState.isNavigationTracking) {
    requestNavigationWakeLock();
  }

  if (currentState.hasPermission) {
    startPositionWatch();
    void refreshCurrentPosition();
    return;
  }

  if (subscribers.size > 0 || currentState.isNavigationTracking) {
    startLocationWatch();
  }
}

function isDocumentVisible() {
  return typeof document === 'undefined' || document.visibilityState !== 'hidden';
}

function requestNavigationWakeLock() {
  if (!currentState.isNavigationTracking || !isDocumentVisible() || navigationWakeLock || navigationWakeLockRequest) {
    return;
  }

  const wakeLock = (navigator as NavigatorWithWakeLock).wakeLock;
  if (!wakeLock?.request) {
    return;
  }

  navigationWakeLockRequest = wakeLock
    .request('screen')
    .then((wakeLockSentinel) => {
      navigationWakeLock = wakeLockSentinel;
      navigationWakeLock.addEventListener('release', handleNavigationWakeLockReleased);
    })
    .catch(() => {
      // Wake Lock is best-effort. GPS still tracks while the browser keeps the page active.
    })
    .finally(() => {
      navigationWakeLockRequest = null;
    });
}

async function releaseNavigationWakeLock() {
  const wakeLock = navigationWakeLock;
  navigationWakeLock = null;
  if (!wakeLock) {
    return;
  }

  wakeLock.removeEventListener('release', handleNavigationWakeLockReleased);
  if (wakeLock.released) {
    return;
  }

  await wakeLock.release().catch(() => undefined);
}

function handleNavigationWakeLockReleased() {
  navigationWakeLock?.removeEventListener('release', handleNavigationWakeLockReleased);
  navigationWakeLock = null;
  if (currentState.isNavigationTracking && isDocumentVisible()) {
    requestNavigationWakeLock();
  }
}

function checkForegroundLocationWatchdog() {
  if (subscribers.size === 0 && !currentState.isNavigationTracking) {
    stopForegroundLocationWatchdog();
    return;
  }

  const now = Date.now();
  const freshness = getCurrentLocationFreshness(now);
  if (freshness.isStale !== currentState.isStale || freshness.staleReason !== currentState.staleReason) {
    emitLocationState({
      ...currentState,
      ...freshness,
    });
  }

  if (!currentState.hasPermission || isWatchStarting || !navigator.geolocation) {
    return;
  }

  const lastLiveUpdateAt = currentState.positionUpdatedAt ?? currentState.updatedAt ?? 0;
  const updatesHaveStalled = lastLiveUpdateAt === 0 || now - lastLiveUpdateAt > FOREGROUND_WATCHDOG_RESTART_MS;
  if (!updatesHaveStalled && watchId !== null) {
    return;
  }

  if (now - lastWatchdogRestartAt < FOREGROUND_WATCHDOG_RESTART_COOLDOWN_MS) {
    return;
  }

  lastWatchdogRestartAt = now;
  void restartForegroundLocationWatch();
}

async function restartForegroundLocationWatch() {
  if (isWatchStarting || !navigator.geolocation) {
    return;
  }

  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }

  isWatchStarting = true;
  try {
    startPositionWatch();
    await refreshCurrentPosition();
  } finally {
    isWatchStarting = false;
  }
}

function applyGeolocationPosition(position: GeolocationPosition) {
  const coordinate: Coordinate = [position.coords.longitude, position.coords.latitude];
  if (!coordinateIsValid(coordinate)) {
    return;
  }

  const receivedAt = Date.now();
  const observedAt = normalizeTimestamp(position.timestamp) ?? receivedAt;
  const accuracy = Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : null;
  const speed = normalizeSpeed(position.coords.speed);
  const previousCoordinate = currentState.coordinate ?? smoothedCoordinate;
  const trackedCoordinate = resolveTrackedCoordinate(coordinate, accuracy, speed, observedAt);
  if (!trackedCoordinate) {
    return;
  }

  const heading = resolvePositionHeading(position.coords, previousCoordinate, trackedCoordinate.coordinate, speed);
  const isStale = receivedAt - observedAt > LIVE_LOCATION_STALE_MS;
  emitLocationState({
    ...currentState,
    accuracy,
    coordinate: trackedCoordinate.coordinate,
    heading,
    hasPermission: true,
    isLocationServicesEnabled: true,
    isLoading: false,
    isStale,
    positionUpdatedAt: observedAt,
    source: 'live',
    speed,
    staleReason: isStale ? 'timeout' : null,
    updatedAt: observedAt,
  });
  writeStoredLocationPosition({
    accuracy,
    coordinate: trackedCoordinate.coordinate,
    heading,
    positionUpdatedAt: observedAt,
    savedAt: observedAt,
    speed,
    updatedAt: observedAt,
  });

  if (currentState.isNavigationTracking && trackedCoordinate.shouldRecordBreadcrumb) {
    appendActiveTripBreadcrumb({
      accuracy,
      coordinate: trackedCoordinate.coordinate,
      heading,
      recordedAt: observedAt,
      speed,
    });
  }
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
      isLocationServicesEnabled: true,
      isLoading: false,
      isStale: true,
      staleReason: 'permissionDenied',
    });
    return;
  }

  if (browserPermission === 'prompt' && storedPermission !== null) {
    emitLocationState({
      ...currentState,
      hasPermission: false,
      isLocationServicesEnabled: Boolean(navigator.geolocation),
      isLoading: false,
      isStale: true,
      staleReason: 'permissionDenied',
    });
    return;
  }

  if (browserPermission === null && storedPermission !== null) {
    emitLocationState({
      ...currentState,
      hasPermission: false,
      isLocationServicesEnabled: Boolean(navigator.geolocation),
      isLoading: false,
      isStale: true,
      staleReason: 'permissionDenied',
    });
    return;
  }

  if (browserPermission === 'granted') {
    writeStoredLocationPermission('granted');
    emitLocationState({
      ...currentState,
      hasPermission: true,
      isLocationServicesEnabled: true,
      isLoading: currentState.coordinate === null,
      ...getCurrentLocationFreshness(Date.now(), true),
    });
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
  if (
    watchId !== null ||
    (subscribers.size === 0 && !currentState.isNavigationTracking) ||
    !navigator.geolocation
  ) {
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

  startVisibilityWatch();
  startOrientationWatch();
  startForegroundLocationWatchdog();
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
    isLocationServicesEnabled: Boolean(navigator.geolocation),
    isLoading: false,
    isStale: true,
    staleReason: permissionDenied ? 'permissionDenied' : currentState.staleReason ?? 'unavailable',
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
    ...currentState,
    accuracy: storedPosition.accuracy,
    coordinate: storedPosition.coordinate,
    heading: storedPosition.heading,
    isLoading: false,
    isStale: true,
    positionUpdatedAt: storedPosition.positionUpdatedAt ?? storedPosition.updatedAt ?? storedPosition.savedAt,
    source: 'cached',
    speed: storedPosition.speed,
    staleReason: 'cached',
    updatedAt: storedPosition.updatedAt ?? storedPosition.savedAt,
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

function hydrateActiveTripBreadcrumbs() {
  if (activeTripBreadcrumbsHydrated) {
    return;
  }

  activeTripBreadcrumbs = pruneActiveTripBreadcrumbs(
    parseStoredLocationBreadcrumbs(readStorageItem(ACTIVE_TRIP_BREADCRUMBS_STORAGE_KEY))
  );
  activeTripBreadcrumbsHydrated = true;
}

function appendActiveTripBreadcrumb(breadcrumb: LocationBreadcrumb) {
  const normalizedBreadcrumb = normalizeLocationBreadcrumb(breadcrumb);
  if (!normalizedBreadcrumb) {
    return;
  }

  hydrateActiveTripBreadcrumbs();
  if (!shouldAppendActiveTripBreadcrumb(normalizedBreadcrumb)) {
    return;
  }

  activeTripBreadcrumbs = pruneActiveTripBreadcrumbs([...activeTripBreadcrumbs, normalizedBreadcrumb]);
  writeActiveTripBreadcrumbs();
}

function shouldAppendActiveTripBreadcrumb(nextBreadcrumb: LocationBreadcrumb) {
  const previousBreadcrumb = activeTripBreadcrumbs.at(-1);
  if (!previousBreadcrumb) {
    return true;
  }

  const elapsedMs = nextBreadcrumb.recordedAt - previousBreadcrumb.recordedAt;
  const distanceMeters = getDistanceMeters(previousBreadcrumb.coordinate, nextBreadcrumb.coordinate);
  return elapsedMs >= ACTIVE_TRIP_BREADCRUMB_MIN_INTERVAL_MS || distanceMeters >= ACTIVE_TRIP_BREADCRUMB_MIN_DISTANCE_METERS;
}

function writeActiveTripBreadcrumbs() {
  writeStorageItem(
    ACTIVE_TRIP_BREADCRUMBS_STORAGE_KEY,
    JSON.stringify({
      breadcrumbs: pruneActiveTripBreadcrumbs(activeTripBreadcrumbs),
      version: ACTIVE_TRIP_BREADCRUMB_VERSION,
    } satisfies StoredLocationBreadcrumbs)
  );
}

function parseStoredLocationBreadcrumbs(value: string | null) {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as Partial<StoredLocationBreadcrumbs>;
    if (parsed.version !== ACTIVE_TRIP_BREADCRUMB_VERSION || !Array.isArray(parsed.breadcrumbs)) {
      return [];
    }

    return parsed.breadcrumbs.flatMap((breadcrumb) => {
      const normalized = normalizeLocationBreadcrumb(breadcrumb);
      return normalized ? [normalized] : [];
    });
  } catch {
    return [];
  }
}

function normalizeLocationBreadcrumb(value: Partial<LocationBreadcrumb> | null | undefined): LocationBreadcrumb | null {
  if (!value || !Array.isArray(value.coordinate) || value.coordinate.length !== 2) {
    return null;
  }

  const coordinate: Coordinate = [Number(value.coordinate[0]), Number(value.coordinate[1])];
  if (!coordinateIsValid(coordinate)) {
    return null;
  }

  const recordedAt = normalizeTimestamp(value.recordedAt);
  if (recordedAt === null) {
    return null;
  }

  return {
    accuracy: typeof value.accuracy === 'number' && Number.isFinite(value.accuracy) ? value.accuracy : null,
    coordinate,
    heading: normalizeHeading(value.heading),
    recordedAt,
    speed: normalizeSpeed(value.speed),
  };
}

function pruneActiveTripBreadcrumbs(breadcrumbs: readonly LocationBreadcrumb[]) {
  const minRecordedAt = Date.now() - ACTIVE_TRIP_BREADCRUMB_MAX_AGE_MS;
  return breadcrumbs
    .filter((breadcrumb) => breadcrumb.recordedAt >= minRecordedAt)
    .sort((a, b) => a.recordedAt - b.recordedAt)
    .slice(-ACTIVE_TRIP_BREADCRUMB_MAX_COUNT);
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

    const savedAt = typeof parsed.savedAt === 'number' && Number.isFinite(parsed.savedAt) ? parsed.savedAt : Date.now();
    const updatedAt =
      typeof parsed.updatedAt === 'number' && Number.isFinite(parsed.updatedAt)
        ? parsed.updatedAt
        : savedAt;

    return {
      accuracy: typeof parsed.accuracy === 'number' && Number.isFinite(parsed.accuracy) ? parsed.accuracy : null,
      coordinate,
      heading: normalizeHeading(parsed.heading),
      positionUpdatedAt:
        typeof parsed.positionUpdatedAt === 'number' && Number.isFinite(parsed.positionUpdatedAt)
          ? parsed.positionUpdatedAt
          : updatedAt,
      savedAt,
      speed: normalizeSpeed(parsed.speed ?? null),
      updatedAt,
    };
  } catch {
    return null;
  }
}

function emitLocationState(nextState: CurrentLocationState) {
  if (statesAreEquivalent(currentState, nextState)) {
    currentState = nextState;
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
    ...getCurrentLocationFreshness(now),
    updatedAt: now,
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
  const heading = normalizeHeading(coords.heading);
  if (heading === null) {
    return null;
  }

  const speed = normalizeSpeed(coords.speed);
  if (speed !== null && speed < STATIONARY_SPEED_METERS_PER_SECOND) {
    return null;
  }

  return heading;
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

function getCurrentLocationFreshness(
  now = Date.now(),
  hasPermission = currentState.hasPermission
): Pick<CurrentLocationState, 'isStale' | 'staleReason'> {
  if (!hasPermission) {
    return {
      isStale: true,
      staleReason: currentState.staleReason ?? 'permissionDenied',
    };
  }

  if (currentState.source === 'cached') {
    return {
      isStale: true,
      staleReason: 'cached',
    };
  }

  if (isCurrentLivePositionStale(now)) {
    return {
      isStale: true,
      staleReason: 'timeout',
    };
  }

  return {
    isStale: false,
    staleReason: null,
  };
}

function isCurrentLivePositionStale(now = Date.now()) {
  if (currentState.source !== 'live' || currentState.positionUpdatedAt === null) {
    return true;
  }

  return now - currentState.positionUpdatedAt > LIVE_LOCATION_STALE_MS;
}

function resolvePositionHeading(
  coords: GeolocationCoordinates,
  previousCoordinate: Coordinate | null,
  nextCoordinate: Coordinate,
  speed: number | null
) {
  if (hasRecentDeviceHeading()) {
    return currentState.heading;
  }

  return resolveGeolocationHeading(coords) ?? resolveMovementHeading(previousCoordinate, nextCoordinate, speed) ?? currentState.heading;
}

function hasRecentDeviceHeading() {
  return lastHeadingSetAt > 0 && Date.now() - lastHeadingSetAt < DEVICE_HEADING_STALE_MS;
}

function resolveMovementHeading(previousCoordinate: Coordinate | null, nextCoordinate: Coordinate, speed: number | null) {
  if (!previousCoordinate) {
    return null;
  }

  const distanceMeters = getDistanceMeters(previousCoordinate, nextCoordinate);
  if (distanceMeters < MOVEMENT_HEADING_MIN_DISTANCE_METERS) {
    return null;
  }

  if (speed !== null && speed < STATIONARY_SPEED_METERS_PER_SECOND) {
    return null;
  }

  return getBearingDegrees(previousCoordinate, nextCoordinate);
}

function resolveTrackedCoordinate(
  rawCoordinate: Coordinate,
  accuracy: number | null,
  speed: number | null,
  observedAt: number
): TrackedCoordinateResult | null {
  if (!smoothedCoordinate) {
    smoothedCoordinate = rawCoordinate;
    lastAcceptedPositionAt = observedAt;
    return { coordinate: rawCoordinate, shouldRecordBreadcrumb: true };
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
    lastAcceptedPositionAt = observedAt;
    return { coordinate: smoothedCoordinate, shouldRecordBreadcrumb: false };
  }

  const isStale = elapsedMs > LARGE_JUMP_STALE_MS;
  if (isStale || distanceMeters > LARGE_JUMP_DISTANCE_METERS) {
    smoothedCoordinate = rawCoordinate;
    lastAcceptedPositionAt = observedAt;
    return { coordinate: rawCoordinate, shouldRecordBreadcrumb: true };
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
  return { coordinate: smoothedCoordinate, shouldRecordBreadcrumb: true };
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

function normalizeHeading(heading: number | null | undefined) {
  if (typeof heading !== 'number' || !Number.isFinite(heading) || heading < 0) {
    return null;
  }

  return ((heading % 360) + 360) % 360;
}

function normalizeTimestamp(timestamp: number | null | undefined) {
  if (typeof timestamp !== 'number' || !Number.isFinite(timestamp) || timestamp <= 0) {
    return null;
  }

  return timestamp;
}

function normalizeSpeed(speed: number | null | undefined) {
  return typeof speed === 'number' && Number.isFinite(speed) && speed >= 0 ? speed : null;
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
    previous.isBackgroundTracking === next.isBackgroundTracking &&
    previous.isGpsAvailable === next.isGpsAvailable &&
    previous.isLocationServicesEnabled === next.isLocationServicesEnabled &&
    previous.isLoading === next.isLoading &&
    previous.isNavigationTracking === next.isNavigationTracking &&
    previous.isStale === next.isStale &&
    previous.source === next.source &&
    previous.staleReason === next.staleReason &&
    nullableNumbersAreClose(previous.accuracy, next.accuracy, 1) &&
    nullableNumbersAreClose(previous.heading, next.heading, 1) &&
    nullableNumbersAreClose(previous.speed, next.speed, 0.25) &&
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

function getBearingDegrees(from: Coordinate, to: Coordinate) {
  const fromLat = toRadians(from[1]);
  const toLat = toRadians(to[1]);
  const deltaLon = toRadians(to[0] - from[0]);
  const y = Math.sin(deltaLon) * Math.cos(toLat);
  const x =
    Math.cos(fromLat) * Math.sin(toLat) -
    Math.sin(fromLat) * Math.cos(toLat) * Math.cos(deltaLon);

  return normalizeHeading((Math.atan2(y, x) * 180) / Math.PI);
}

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}
