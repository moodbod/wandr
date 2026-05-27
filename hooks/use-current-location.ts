import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system/legacy';
import * as SecureStore from 'expo-secure-store';
import * as TaskManager from 'expo-task-manager';
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

type ExpoPosition = Awaited<ReturnType<typeof Location.getCurrentPositionAsync>>;
type BackgroundLocationTaskData = {
  locations?: ExpoPosition[];
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
type LocationProviderSnapshot = Pick<CurrentLocationState, 'isGpsAvailable' | 'isLocationServicesEnabled'>;
type TrackedCoordinateResult = {
  coordinate: Coordinate;
  shouldRecordBreadcrumb: boolean;
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
const ACTIVE_TRIP_BREADCRUMBS_STORAGE_FILE = 'wandr-active-trip-breadcrumbs.json';
const ACTIVE_NAVIGATION_LOCATION_TASK = 'wandr.active-navigation-location';
const WATCH_STOP_DELAY_MS = 15_000;
const POSITION_CLOSE_METERS = 0.75;
const DEVICE_HEADING_STALE_MS = 5_000;
const LIVE_LOCATION_STALE_MS = 12_000;
const FOREGROUND_WATCHDOG_INTERVAL_MS = 5_000;
const FOREGROUND_WATCHDOG_RESTART_MS = 18_000;
const FOREGROUND_WATCHDOG_RESTART_COOLDOWN_MS = 8_000;
const TRACKING_DISTANCE_INTERVAL_METERS = 1;
const TRACKING_TIME_INTERVAL_MS = 500;
const MAX_USABLE_ACCURACY_METERS = 80;
const LARGE_JUMP_DISTANCE_METERS = 300;
const LARGE_JUMP_STALE_MS = 15_000;
const OUTLIER_SPEED_METERS_PER_SECOND = 55;
const STATIONARY_SPEED_METERS_PER_SECOND = 0.75;
const STATIONARY_JITTER_METERS = 2.5;
const ACTIVE_TRIP_BREADCRUMB_VERSION = 1;
const ACTIVE_TRIP_BREADCRUMB_MAX_COUNT = 2_500;
const ACTIVE_TRIP_BREADCRUMB_MAX_AGE_MS = 48 * 60 * 60_000;
const ACTIVE_TRIP_BREADCRUMB_MIN_INTERVAL_MS = 3_000;
const ACTIVE_TRIP_BREADCRUMB_MIN_DISTANCE_METERS = 3;
const ACTIVE_TRIP_BREADCRUMB_WRITE_DEBOUNCE_MS = 1_000;

let currentState = INITIAL_STATE;
let isWatchStarting = false;
let startPromise: Promise<void> | null = null;
let positionSubscription: { remove: () => void } | null = null;
let headingSubscription: { remove: () => void } | null = null;
let watchdogTimer: ReturnType<typeof setInterval> | null = null;
let lastWatchdogRestartAt = 0;
let storedLocationHydrated = false;
let lastDeviceHeadingAt = 0;
let lastAcceptedPositionAt = 0;
let smoothedCoordinate: Coordinate | null = null;
let activeTripBreadcrumbs: LocationBreadcrumb[] = [];
let activeTripBreadcrumbsHydrated = false;
let activeTripBreadcrumbsHydrationPromise: Promise<void> | null = null;
let activeTripBreadcrumbsWriteTimer: ReturnType<typeof setTimeout> | null = null;

if (!TaskManager.isTaskDefined(ACTIVE_NAVIGATION_LOCATION_TASK)) {
  TaskManager.defineTask<BackgroundLocationTaskData>(
    ACTIVE_NAVIGATION_LOCATION_TASK,
    async ({ data, error }) => {
      if (error) {
        return;
      }

      const locations = Array.isArray(data?.locations) ? data.locations : [];
      for (const location of locations) {
        await applyPosition(location, {
          isNavigationUpdate: true,
          persistBreadcrumbImmediately: true,
        });
      }

      if (locations.length > 0) {
        emitLocationState({
          ...currentState,
          isBackgroundTracking: true,
          isNavigationTracking: true,
        });
      }
    }
  );
}

export function useCurrentLocation() {
  const [state, setState] = useState<CurrentLocationState>(currentState);

  useEffect(() => subscribeCurrentLocation(setState), []);

  return state;
}

export async function startNavigationLocationTracking() {
  startLocationWatch();
  await hydrateStoredLocationState();
  await hydrateActiveTripBreadcrumbs();

  const hasForegroundPermission = await ensureForegroundLocationPermission();
  if (!hasForegroundPermission) {
    return false;
  }

  const providerAvailable = await ensureNativeLocationProviderAvailable();
  if (!providerAvailable) {
    return false;
  }

  const [taskAvailable, backgroundAvailable] = await Promise.all([
    TaskManager.isAvailableAsync().catch(() => false),
    Location.isBackgroundLocationAvailableAsync().catch(() => false),
  ]);
  if (!taskAvailable || !backgroundAvailable) {
    emitLocationState({
      ...currentState,
      isBackgroundTracking: false,
      isNavigationTracking: true,
    });
    await appendCurrentLocationBreadcrumb({ flushImmediately: true });
    return true;
  }

  const existingBackgroundPermission = await Location.getBackgroundPermissionsAsync();
  const backgroundPermission =
    existingBackgroundPermission.status === 'granted'
      ? existingBackgroundPermission
      : await Location.requestBackgroundPermissionsAsync();
  if (backgroundPermission.status !== 'granted') {
    emitLocationState({
      ...currentState,
      isBackgroundTracking: false,
      isNavigationTracking: true,
    });
    await appendCurrentLocationBreadcrumb({ flushImmediately: true });
    return true;
  }

  const alreadyStarted = await Location.hasStartedLocationUpdatesAsync(ACTIVE_NAVIGATION_LOCATION_TASK).catch(() => false);
  if (!alreadyStarted) {
    try {
      await Location.startLocationUpdatesAsync(ACTIVE_NAVIGATION_LOCATION_TASK, {
        accuracy: Location.Accuracy.BestForNavigation,
        activityType: Location.ActivityType.OtherNavigation,
        deferredUpdatesDistance: TRACKING_DISTANCE_INTERVAL_METERS,
        deferredUpdatesInterval: TRACKING_TIME_INTERVAL_MS,
        distanceInterval: TRACKING_DISTANCE_INTERVAL_METERS,
        foregroundService: {
          killServiceOnDestroy: false,
          notificationBody: 'Wandr is keeping your active trip location current.',
          notificationColor: '#B9F96D',
          notificationTitle: 'Wandr trip navigation',
        },
        mayShowUserSettingsDialog: true,
        pausesUpdatesAutomatically: false,
        showsBackgroundLocationIndicator: true,
        timeInterval: TRACKING_TIME_INTERVAL_MS,
      });
    } catch {
      emitLocationState({
        ...currentState,
        isBackgroundTracking: false,
        isNavigationTracking: true,
        isStale: true,
        staleReason: 'unavailable',
      });
      await appendCurrentLocationBreadcrumb({ flushImmediately: true });
      return true;
    }
  }

  emitLocationState({
    ...currentState,
    isBackgroundTracking: true,
    isNavigationTracking: true,
  });
  await appendCurrentLocationBreadcrumb({ flushImmediately: true });
  return true;
}

export async function stopNavigationLocationTracking() {
  const alreadyStarted = await Location.hasStartedLocationUpdatesAsync(ACTIVE_NAVIGATION_LOCATION_TASK).catch(() => false);
  if (alreadyStarted) {
    await Location.stopLocationUpdatesAsync(ACTIVE_NAVIGATION_LOCATION_TASK).catch(() => undefined);
  }

  emitLocationState({
    ...currentState,
    isBackgroundTracking: false,
    isNavigationTracking: false,
  });
  if (subscribers.size === 0) {
    scheduleStopLocationWatch();
  }
}

export async function getNavigationLocationTrackingStatus() {
  const backgroundStarted = await Location.hasStartedLocationUpdatesAsync(ACTIVE_NAVIGATION_LOCATION_TASK).catch(() => false);
  return currentState.isNavigationTracking || backgroundStarted;
}

export async function getActiveTripLocationBreadcrumbs() {
  await hydrateActiveTripBreadcrumbs();
  return [...activeTripBreadcrumbs];
}

export async function clearActiveTripLocationBreadcrumbs() {
  activeTripBreadcrumbs = [];
  activeTripBreadcrumbsHydrated = true;
  if (activeTripBreadcrumbsWriteTimer) {
    clearTimeout(activeTripBreadcrumbsWriteTimer);
    activeTripBreadcrumbsWriteTimer = null;
  }
  await writeActiveTripBreadcrumbs();
}

async function appendCurrentLocationBreadcrumb(options: { flushImmediately?: boolean } = {}) {
  if (!currentState.coordinate) {
    return;
  }

  await appendActiveTripBreadcrumb(
    {
      accuracy: currentState.accuracy,
      coordinate: currentState.coordinate,
      heading: currentState.heading,
      recordedAt: currentState.positionUpdatedAt ?? currentState.updatedAt ?? Date.now(),
      speed: currentState.speed,
    },
    options
  );
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
    startForegroundLocationWatchdog();
    return;
  }

  startForegroundLocationWatchdog();
  isWatchStarting = true;
  emitLocationState({
    ...currentState,
    isLoading: currentState.coordinate === null,
  });
  startPromise = startNativeLocationWatch()
    .catch(() => {
      emitLocationState({
        ...currentState,
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

let stopTimer: ReturnType<typeof setTimeout> | null = null;

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

async function ensureForegroundLocationPermission() {
  const storedPermission = await readStoredLocationPermission();
  const existingPermission = await Location.getForegroundPermissionsAsync();
  if (existingPermission.status === 'granted') {
    if (storedPermission !== 'granted') {
      await writeStoredLocationPermission('granted');
    }
    const freshness = getCurrentLocationFreshness(Date.now(), true);
    emitLocationState({
      ...currentState,
      hasPermission: true,
      isLoading: false,
      ...freshness,
    });
    await refreshNativeLocationProviderState();
    return true;
  }

  if (storedPermission !== null) {
    emitLocationState({
      ...currentState,
      hasPermission: false,
      isLoading: false,
      isStale: true,
      staleReason: 'permissionDenied',
    });
    return false;
  }

  const permission = await Location.requestForegroundPermissionsAsync();
  await writeStoredLocationPermission(permission.status === 'granted' ? 'granted' : 'denied');
  const freshness = getCurrentLocationFreshness(Date.now(), permission.status === 'granted');
  const providerSnapshot =
    permission.status === 'granted' ? await readLocationProviderSnapshot() : getUnavailableProviderSnapshot();
  emitLocationState({
    ...currentState,
    hasPermission: permission.status === 'granted',
    isLoading: false,
    ...providerSnapshot,
    isStale: permission.status === 'granted' ? freshness.isStale : true,
    staleReason: permission.status === 'granted' ? freshness.staleReason : 'permissionDenied',
  });

  return permission.status === 'granted';
}

async function startNativeLocationWatch() {
  await hydrateStoredLocationState();

  const storedPermission = await readStoredLocationPermission();
  const existingPermission = await Location.getForegroundPermissionsAsync();
  let permission = existingPermission;

  if (existingPermission.status !== 'granted') {
    if (storedPermission !== null) {
      emitLocationState({
        ...currentState,
        hasPermission: false,
        isLoading: false,
        isStale: true,
        staleReason: 'permissionDenied',
      });
      return;
    }

    permission = await Location.requestForegroundPermissionsAsync();
    await writeStoredLocationPermission(permission.status === 'granted' ? 'granted' : 'denied');
  } else if (storedPermission !== 'granted') {
    await writeStoredLocationPermission('granted');
  }

  if (permission.status !== 'granted') {
    emitLocationState({
      ...currentState,
      hasPermission: false,
      isLoading: false,
      isStale: true,
      staleReason: 'permissionDenied',
    });
    return;
  }

  const providerAvailable = await ensureNativeLocationProviderAvailable();
  if (!providerAvailable) {
    return;
  }

  const freshness = getCurrentLocationFreshness(Date.now(), true);
  emitLocationState({
    ...currentState,
    hasPermission: true,
    isLoading: currentState.coordinate === null,
    ...freshness,
  });

  positionSubscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.BestForNavigation,
      distanceInterval: TRACKING_DISTANCE_INTERVAL_METERS,
      mayShowUserSettingsDialog: true,
      timeInterval: TRACKING_TIME_INTERVAL_MS,
    },
    (positionUpdate) => {
      void applyPosition(positionUpdate);
    },
    () => {
      emitLocationState({
        ...currentState,
        isLoading: false,
        isStale: true,
        staleReason: 'unavailable',
      });
    }
  );

  try {
    headingSubscription = await Location.watchHeadingAsync((headingUpdate) => {
      const nextHeading = resolveCompassHeading(headingUpdate);

      if (nextHeading === null) {
        return;
      }

      const now = Date.now();
      lastDeviceHeadingAt = now;
      const freshness = getCurrentLocationFreshness(now);
      emitLocationState({
        ...currentState,
        heading: nextHeading,
        ...freshness,
        updatedAt: now,
      });

      if (currentState.coordinate) {
        void writeStoredLocationPosition({
          accuracy: currentState.accuracy,
          coordinate: currentState.coordinate,
          heading: nextHeading,
          positionUpdatedAt: currentState.positionUpdatedAt ?? undefined,
          savedAt: now,
          speed: currentState.speed,
          updatedAt: now,
        });
      }
    });
  } catch {
    // GPS course from watchPositionAsync still gives direction while moving.
    headingSubscription = null;
  }

  try {
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.BestForNavigation,
      mayShowUserSettingsDialog: true,
    });
    await applyPosition(position);
  } catch {
    emitLocationState({
      ...currentState,
      isLoading: false,
      isStale: true,
      staleReason: 'unavailable',
    });
  }
}

function stopLocationWatch() {
  void startPromise;
  positionSubscription?.remove();
  headingSubscription?.remove();
  positionSubscription = null;
  headingSubscription = null;
  if (!currentState.isNavigationTracking) {
    stopForegroundLocationWatchdog();
  }
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

  if (!currentState.hasPermission || isWatchStarting) {
    return;
  }

  const lastLiveUpdateAt = currentState.positionUpdatedAt ?? currentState.updatedAt ?? 0;
  const updatesHaveStalled = lastLiveUpdateAt === 0 || now - lastLiveUpdateAt > FOREGROUND_WATCHDOG_RESTART_MS;
  if (!updatesHaveStalled && positionSubscription) {
    return;
  }

  if (now - lastWatchdogRestartAt < FOREGROUND_WATCHDOG_RESTART_COOLDOWN_MS) {
    return;
  }

  lastWatchdogRestartAt = now;
  void restartForegroundLocationWatch();
}

async function restartForegroundLocationWatch() {
  if (isWatchStarting) {
    return;
  }

  positionSubscription?.remove();
  headingSubscription?.remove();
  positionSubscription = null;
  headingSubscription = null;

  isWatchStarting = true;
  try {
    await startNativeLocationWatch();
  } catch {
    emitLocationState({
      ...currentState,
      isLoading: false,
      isStale: true,
      staleReason: 'unavailable',
    });
  } finally {
    isWatchStarting = false;
  }
}

async function ensureNativeLocationProviderAvailable() {
  const providerSnapshot = await readLocationProviderSnapshot();
  const providerUnavailable =
    providerSnapshot.isLocationServicesEnabled === false || providerSnapshot.isGpsAvailable === false;

  emitLocationState({
    ...currentState,
    ...providerSnapshot,
    isLoading: providerUnavailable ? false : currentState.isLoading,
    isStale: providerUnavailable ? true : currentState.isStale,
    staleReason: providerUnavailable ? 'unavailable' : currentState.staleReason,
  });

  return !providerUnavailable;
}

async function refreshNativeLocationProviderState() {
  const providerSnapshot = await readLocationProviderSnapshot();
  emitLocationState({
    ...currentState,
    ...providerSnapshot,
  });
}

async function readLocationProviderSnapshot(): Promise<LocationProviderSnapshot> {
  try {
    const providerStatus = await Location.getProviderStatusAsync();
    return {
      isGpsAvailable: typeof providerStatus.gpsAvailable === 'boolean' ? providerStatus.gpsAvailable : null,
      isLocationServicesEnabled: providerStatus.locationServicesEnabled,
    };
  } catch {
    const servicesEnabled = await Location.hasServicesEnabledAsync().catch(() => null);
    return {
      isGpsAvailable: null,
      isLocationServicesEnabled: servicesEnabled,
    };
  }
}

function getUnavailableProviderSnapshot(): LocationProviderSnapshot {
  return {
    isGpsAvailable: null,
    isLocationServicesEnabled: null,
  };
}

async function applyPosition(
  position: ExpoPosition,
  options: { isNavigationUpdate?: boolean; persistBreadcrumbImmediately?: boolean } = {}
) {
  const coordinate: Coordinate = [position.coords.longitude, position.coords.latitude];
  if (!coordinateIsValid(coordinate)) {
    return;
  }

  const receivedAt = Date.now();
  const observedAt = normalizeTimestamp(position.timestamp) ?? receivedAt;
  const accuracy = Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : null;
  const speed = normalizeSpeed(position.coords.speed);
  const trackedCoordinate = resolveTrackedCoordinate(coordinate, accuracy, speed, observedAt);
  if (!trackedCoordinate) {
    return;
  }

  const heading = resolvePositionHeading(position.coords);
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
  void writeStoredLocationPosition({
    accuracy,
    coordinate: trackedCoordinate.coordinate,
    heading,
    positionUpdatedAt: observedAt,
    savedAt: observedAt,
    speed,
    updatedAt: observedAt,
  });
  if ((currentState.isNavigationTracking || options.isNavigationUpdate) && trackedCoordinate.shouldRecordBreadcrumb) {
    await appendActiveTripBreadcrumb(
      {
        accuracy,
        coordinate: trackedCoordinate.coordinate,
        heading,
        recordedAt: observedAt,
        speed,
      },
      { flushImmediately: options.persistBreadcrumbImmediately }
    );
  }
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

async function hydrateActiveTripBreadcrumbs() {
  if (activeTripBreadcrumbsHydrated) {
    return;
  }

  if (activeTripBreadcrumbsHydrationPromise) {
    await activeTripBreadcrumbsHydrationPromise;
    return;
  }

  activeTripBreadcrumbsHydrationPromise = readActiveTripBreadcrumbs()
    .then((breadcrumbs) => {
      activeTripBreadcrumbs = pruneActiveTripBreadcrumbs(breadcrumbs);
      activeTripBreadcrumbsHydrated = true;
    })
    .catch(() => {
      activeTripBreadcrumbs = [];
      activeTripBreadcrumbsHydrated = true;
    })
    .finally(() => {
      activeTripBreadcrumbsHydrationPromise = null;
    });

  await activeTripBreadcrumbsHydrationPromise;
}

async function readActiveTripBreadcrumbs() {
  const fileUri = getActiveTripBreadcrumbsStorageUri();
  if (!fileUri) {
    return [];
  }

  try {
    const fileInfo = await FileSystem.getInfoAsync(fileUri);
    if (!fileInfo.exists) {
      return [];
    }

    return parseStoredLocationBreadcrumbs(await FileSystem.readAsStringAsync(fileUri));
  } catch {
    return [];
  }
}

async function appendActiveTripBreadcrumb(
  breadcrumb: LocationBreadcrumb,
  options: { flushImmediately?: boolean } = {}
) {
  const normalizedBreadcrumb = normalizeLocationBreadcrumb(breadcrumb);
  if (!normalizedBreadcrumb) {
    return;
  }

  await hydrateActiveTripBreadcrumbs();
  if (!shouldAppendActiveTripBreadcrumb(normalizedBreadcrumb)) {
    return;
  }

  activeTripBreadcrumbs = pruneActiveTripBreadcrumbs([...activeTripBreadcrumbs, normalizedBreadcrumb]);
  if (options.flushImmediately) {
    await writeActiveTripBreadcrumbs();
    return;
  }

  scheduleActiveTripBreadcrumbsWrite();
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

function scheduleActiveTripBreadcrumbsWrite() {
  if (activeTripBreadcrumbsWriteTimer) {
    return;
  }

  activeTripBreadcrumbsWriteTimer = setTimeout(() => {
    activeTripBreadcrumbsWriteTimer = null;
    void writeActiveTripBreadcrumbs();
  }, ACTIVE_TRIP_BREADCRUMB_WRITE_DEBOUNCE_MS);
}

async function writeActiveTripBreadcrumbs() {
  if (activeTripBreadcrumbsWriteTimer) {
    clearTimeout(activeTripBreadcrumbsWriteTimer);
    activeTripBreadcrumbsWriteTimer = null;
  }

  const fileUri = getActiveTripBreadcrumbsStorageUri();
  if (!fileUri) {
    return;
  }

  try {
    await FileSystem.writeAsStringAsync(
      fileUri,
      JSON.stringify({
        breadcrumbs: pruneActiveTripBreadcrumbs(activeTripBreadcrumbs),
        version: ACTIVE_TRIP_BREADCRUMB_VERSION,
      } satisfies StoredLocationBreadcrumbs)
    );
  } catch {
    // Breadcrumb persistence is best effort; the live watcher remains authoritative.
  }
}

function parseStoredLocationBreadcrumbs(value: string) {
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

function getActiveTripBreadcrumbsStorageUri() {
  return FileSystem.documentDirectory ? `${FileSystem.documentDirectory}${ACTIVE_TRIP_BREADCRUMBS_STORAGE_FILE}` : null;
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
    headingsAreClose(previous.heading, next.heading, 1) &&
    nullableNumbersAreClose(previous.speed, next.speed, 0.25) &&
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

function normalizeTimestamp(timestamp: number | null | undefined) {
  if (typeof timestamp !== 'number' || !Number.isFinite(timestamp) || timestamp <= 0) {
    return null;
  }

  return timestamp;
}

function normalizeSpeed(speed: number | null | undefined) {
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
