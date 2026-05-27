import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ACTIVE_TRIP_BREADCRUMBS_STORAGE_KEY = 'wandr.active-trip.breadcrumbs.v1';

type MockPositionInput = {
  accuracy?: number;
  heading?: number | null;
  latitude: number;
  longitude: number;
  speed?: number | null;
  timestamp: number;
};

type WebLocationModule = typeof import('../hooks/use-current-location.web');

describe('web current location tracking', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1_700_000_000_000);
    installLocalStorageMock();
    getLocalStorage().clear();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.resetModules();
    getLocalStorage().clear();
  });

  it('persists the active-trip breadcrumb trail, not only the latest position', async () => {
    const mocks = installWebLocationMocks({
      latitude: -22.5597,
      longitude: 17.0832,
      speed: 1.6,
      timestamp: Date.now(),
    });
    const locationModule = await importWebLocationModule();

    await expect(locationModule.startNavigationLocationTracking()).resolves.toBe(true);
    expect(await locationModule.getNavigationLocationTrackingStatus()).toBe(true);
    expect(mocks.getCurrentPosition.mock.calls[0]?.[2]).toMatchObject({ enableHighAccuracy: true });
    expect(mocks.watchPosition.mock.calls[0]?.[2]).toMatchObject({ enableHighAccuracy: true });

    mocks.emitWatchPosition({
      latitude: -22.5592,
      longitude: 17.0839,
      speed: 1.8,
      timestamp: Date.now() + 5_000,
    });

    const breadcrumbs = await locationModule.getActiveTripLocationBreadcrumbs();
    expect(breadcrumbs).toHaveLength(2);
    expect(breadcrumbs[0]?.coordinate).toEqual([17.0832, -22.5597]);
    expect(breadcrumbs[1]?.coordinate[0]).toBeCloseTo(17.083704, 6);
    expect(breadcrumbs[1]?.coordinate[1]).toBeCloseTo(-22.55934, 6);
    expect(breadcrumbs[1]?.heading).toEqual(expect.any(Number));

    const stored = JSON.parse(getLocalStorage().getItem(ACTIVE_TRIP_BREADCRUMBS_STORAGE_KEY) ?? '{}') as {
      breadcrumbs?: unknown[];
      version?: number;
    };
    expect(stored.version).toBe(1);
    expect(stored.breadcrumbs).toHaveLength(2);
  });

  it('uses the same stationary jitter filter as native tracking', async () => {
    const mocks = installWebLocationMocks({
      latitude: -22.5597,
      longitude: 17.0832,
      speed: 0,
      timestamp: Date.now(),
    });
    const locationModule = await importWebLocationModule();

    await expect(locationModule.startNavigationLocationTracking()).resolves.toBe(true);
    mocks.emitWatchPosition({
      latitude: -22.559698,
      longitude: 17.083202,
      speed: 0.1,
      timestamp: Date.now() + 5_000,
    });

    const breadcrumbs = await locationModule.getActiveTripLocationBreadcrumbs();
    expect(breadcrumbs).toHaveLength(1);
    expect(breadcrumbs[0]?.coordinate).toEqual([17.0832, -22.5597]);
  });

  it('restarts the foreground geolocation watcher when live updates stall', async () => {
    const mocks = installWebLocationMocks({
      latitude: -22.5597,
      longitude: 17.0832,
      timestamp: Date.now(),
    });
    const locationModule = await importWebLocationModule();

    await expect(locationModule.startNavigationLocationTracking()).resolves.toBe(true);
    expect(mocks.watchPosition).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(20_000);

    expect(mocks.clearWatch).toHaveBeenCalledWith(41);
    expect(mocks.watchPosition).toHaveBeenCalledTimes(2);
    expect(mocks.getCurrentPosition).toHaveBeenCalledTimes(2);
  });

  it('keeps the PWA screen awake during active web navigation tracking when supported', async () => {
    const releaseWakeLock = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
    const wakeLockSentinel = {
      addEventListener: vi.fn(),
      release: releaseWakeLock,
      released: false,
      removeEventListener: vi.fn(),
    };
    const wakeLock = {
      request: vi.fn().mockResolvedValue(wakeLockSentinel),
    };
    installWebLocationMocks(
      {
        latitude: -22.5597,
        longitude: 17.0832,
        timestamp: Date.now(),
      },
      { wakeLock }
    );
    const locationModule = await importWebLocationModule();

    await expect(locationModule.startNavigationLocationTracking()).resolves.toBe(true);
    await Promise.resolve();

    expect(wakeLock.request).toHaveBeenCalledWith('screen');

    await locationModule.stopNavigationLocationTracking();
    expect(wakeLockSentinel.removeEventListener).toHaveBeenCalledWith('release', expect.any(Function));
    expect(releaseWakeLock).toHaveBeenCalledTimes(1);
  });
});

async function importWebLocationModule(): Promise<WebLocationModule> {
  return await import('../hooks/use-current-location.web');
}

function installWebLocationMocks(initialPosition: MockPositionInput, options: { wakeLock?: unknown } = {}) {
  let watchSuccess: PositionCallback | null = null;
  const getCurrentPosition = vi.fn<Geolocation['getCurrentPosition']>((success) => {
    success(createGeolocationPosition(initialPosition));
  });
  const watchPosition = vi.fn<Geolocation['watchPosition']>((success) => {
    watchSuccess = success;
    return 41;
  });
  const clearWatch = vi.fn<Geolocation['clearWatch']>();
  const permissionsQuery = vi.fn().mockResolvedValue({ state: 'granted' });

  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: {
      geolocation: {
        clearWatch,
        getCurrentPosition,
        watchPosition,
      },
      permissions: {
        query: permissionsQuery,
      },
      ...(options.wakeLock ? { wakeLock: options.wakeLock } : {}),
    },
  });

  return {
    clearWatch,
    emitWatchPosition(position: MockPositionInput) {
      watchSuccess?.(createGeolocationPosition(position));
    },
    getCurrentPosition,
    permissionsQuery,
    watchPosition,
  };
}

function createGeolocationPosition(position: MockPositionInput): GeolocationPosition {
  return {
    coords: {
      accuracy: position.accuracy ?? 6,
      altitude: null,
      altitudeAccuracy: null,
      heading: position.heading ?? null,
      latitude: position.latitude,
      longitude: position.longitude,
      speed: position.speed ?? null,
    },
    timestamp: position.timestamp,
  } as GeolocationPosition;
}

function getLocalStorage() {
  const storage = globalThis.window?.localStorage ?? globalThis.localStorage;
  if (!storage) {
    throw new Error('localStorage is unavailable in the test environment');
  }

  return storage;
}

function installLocalStorageMock() {
  const storage = createMemoryStorage();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: storage,
  });

  if (typeof globalThis.window === 'undefined') {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        DeviceOrientationEvent: undefined,
        addEventListener: vi.fn(),
        localStorage: storage,
        removeEventListener: vi.fn(),
      },
    });
    return;
  }

  Object.defineProperty(globalThis.window, 'localStorage', {
    configurable: true,
    value: storage,
  });
}

function createMemoryStorage(): Storage {
  const items = new Map<string, string>();

  return {
    get length() {
      return items.size;
    },
    clear() {
      items.clear();
    },
    getItem(key: string) {
      return items.get(key) ?? null;
    },
    key(index: number) {
      return Array.from(items.keys())[index] ?? null;
    },
    removeItem(key: string) {
      items.delete(key);
    },
    setItem(key: string, value: string) {
      items.set(key, value);
    },
  };
}
