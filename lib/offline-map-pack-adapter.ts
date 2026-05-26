import { Platform } from 'react-native';

import type { OfflineMapRegion } from '@/lib/offline-map-regions';
import type { OfflineMapPackAdapter, OfflineMapPackProgress } from '@/lib/offline-map-types';

let adapterPromise: Promise<OfflineMapPackAdapter> | null = null;

async function getAdapter() {
  if (!adapterPromise) {
    adapterPromise =
      Platform.OS === 'web'
        ? import('@/lib/offline-map-packs.web').then((module) => module.offlineMapPackAdapter)
        : import('@/lib/offline-map-packs.native').then((module) => module.offlineMapPackAdapter);
  }

  return adapterPromise;
}

export async function listOfflineMapPacks() {
  const adapter = await getAdapter();
  return adapter.listPacks();
}

export async function downloadOfflineMapPack(
  region: OfflineMapRegion,
  onProgress: (progress: OfflineMapPackProgress) => void
) {
  const adapter = await getAdapter();
  return adapter.downloadPack(region, onProgress);
}

export async function deleteOfflineMapPack(regionId: string) {
  const adapter = await getAdapter();
  return adapter.deletePack(regionId);
}

export async function getLocalOfflineMapStyleUrl(region: OfflineMapRegion) {
  const adapter = await getAdapter();
  return adapter.getLocalStyleUrlForRegion(region);
}
