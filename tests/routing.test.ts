import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchRoutePath, routingCacheForTest } from '../lib/routing';

describe('route cache fallback', () => {
  afterEach(() => {
    routingCacheForTest.clearMemoryCache();
    vi.unstubAllGlobals();
  });

  it('returns stale cached geometry when online routing fails', async () => {
    const coordinates = [
      [17.0832, -22.5597],
      [17.09, -22.57],
    ] as const;
    const cachedRoute = [
      { latitude: -22.5597, longitude: 17.0832 },
      { latitude: -22.57, longitude: 17.09 },
    ];

    routingCacheForTest.primeMemoryCache(coordinates, cachedRoute, Date.now() - 1);
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))));

    await expect(fetchRoutePath(coordinates)).resolves.toEqual(cachedRoute);
  });

  it('ignores invalid persisted route cache payloads', () => {
    expect(routingCacheForTest.parsePersistentRouteCache('{"version":1,"entries":{"bad":{"route":[{}]}}}')).toEqual({
      entries: {},
      version: 1,
    });
    expect(routingCacheForTest.parsePersistentRouteCache('not json')).toBeNull();
  });
});
