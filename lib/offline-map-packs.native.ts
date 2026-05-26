import { Platform } from 'react-native';

import { getMapboxModule } from '@/components/wandr/maps/mapbox/mapbox-module';
import {
  boundsToMapboxOfflineBounds,
  OFFLINE_MAP_PACK_VERSION,
  getOfflineMapPackName,
  offlineMapRegions,
  type OfflineMapRegion,
} from '@/lib/offline-map-regions';
import type { OfflineMapPackAdapter, OfflineMapPackProgress, OfflineMapPackRecord } from '@/lib/offline-map-types';

const COMPLETE_PROGRESS = 99.5;

type NativeOfflinePack = {
  metadata?: Record<string, unknown>;
  name?: string;
  status?: () => Promise<{
    completedResourceSize?: number;
    percentage?: number;
    state?: number;
  }>;
};

function getNativeAdapter() {
  if (Platform.OS === 'web') {
    return null;
  }

  const mapbox = getMapboxModule();
  return mapbox?.offlineManager ?? null;
}

async function listPacks(): Promise<OfflineMapPackRecord[]> {
  const offlineManager = getNativeAdapter();
  if (!offlineManager) {
    return offlineMapRegions.map((region) => ({
      error: 'Native Mapbox offline maps need a custom development build.',
      progress: 0,
      region,
      status: 'unavailable',
    }));
  }

  const packs = (await offlineManager.getPacks()) as NativeOfflinePack[];
  const records: OfflineMapPackRecord[] = [];

  for (const pack of packs) {
    const metadata = pack.metadata ?? {};
    if (metadata.app !== 'wandr' || metadata.kind !== 'offline-map') {
      continue;
    }

    const region = resolveRegionFromMetadata(metadata);
    if (!region) {
      continue;
    }

    const status = await pack.status?.().catch(() => null);
    const progress = Number(status?.percentage ?? 100);
    const isCurrentVersion = metadata.version === OFFLINE_MAP_PACK_VERSION;
    records.push({
      bytesDownloaded: status?.completedResourceSize,
      progress,
      region,
      status: progress >= COMPLETE_PROGRESS ? (isCurrentVersion ? 'downloaded' : 'stale') : 'downloading',
      updatedAt: Number(metadata.updatedAt ?? Date.now()),
    });
  }

  return records;
}

async function downloadPack(
  region: OfflineMapRegion,
  onProgress: (progress: OfflineMapPackProgress) => void
): Promise<OfflineMapPackRecord> {
  const offlineManager = getNativeAdapter();
  if (!offlineManager) {
    throw new Error('Native Mapbox offline maps need a custom development build.');
  }

  const packName = getOfflineMapPackName(region);
  const existingPack = await offlineManager.getPack(packName);
  if (existingPack) {
    const existingStatus = await existingPack.status().catch(() => null);
    const progress = Number(existingStatus?.percentage ?? 100);
    if (progress >= COMPLETE_PROGRESS) {
      return {
        bytesDownloaded: existingStatus?.completedResourceSize,
        progress: 100,
        region,
        status: 'downloaded',
        updatedAt: Date.now(),
      };
    }

    await offlineManager.subscribe(
      packName,
      (_pack: unknown, status: { completedResourceSize?: number; percentage?: number }) => {
        onProgress({
          bytesDownloaded: status.completedResourceSize,
          progress: Number(status.percentage ?? 0),
          status: Number(status.percentage ?? 0) >= COMPLETE_PROGRESS ? 'downloaded' : 'downloading',
        });
      },
      (_pack: unknown, error: { message?: string }) => {
        onProgress({ error: error.message ?? 'Map download failed.', status: 'error' });
      }
    );
    await existingPack.resume();
    return {
      bytesDownloaded: existingStatus?.completedResourceSize,
      progress,
      region,
      status: progress >= COMPLETE_PROGRESS ? 'downloaded' : 'downloading',
      updatedAt: Date.now(),
    };
  }

  offlineManager.setProgressEventThrottle?.(500);
  onProgress({ progress: 0, status: 'downloading' });
  await offlineManager.createPack(
    {
      bounds: boundsToMapboxOfflineBounds(region.bounds),
      maxZoom: region.maxZoom,
      metadata: {
        app: 'wandr',
        kind: 'offline-map',
        label: region.label,
        region,
        regionId: region.id,
        updatedAt: Date.now(),
        version: region.version,
      },
      minZoom: region.minZoom,
      name: packName,
      styleURL: region.nativeStyleUrl,
    },
    (_pack: unknown, status: { completedResourceSize?: number; percentage?: number }) => {
      const progress = Number(status.percentage ?? 0);
      onProgress({
        bytesDownloaded: status.completedResourceSize,
        progress,
        status: progress >= COMPLETE_PROGRESS ? 'downloaded' : 'downloading',
      });
    },
    (_pack: unknown, error: { message?: string }) => {
      onProgress({ error: error.message ?? 'Map download failed.', status: 'error' });
    }
  );

  return {
    progress: 100,
    region,
    status: 'downloaded',
    updatedAt: Date.now(),
  };
}

async function deletePack(regionId: string) {
  const offlineManager = getNativeAdapter();
  if (!offlineManager) {
    return;
  }

  const packs = (await offlineManager.getPacks()) as NativeOfflinePack[];
  for (const pack of packs) {
    if (pack.metadata?.app === 'wandr' && pack.metadata?.kind === 'offline-map' && pack.metadata?.regionId === regionId) {
      await offlineManager.deletePack(pack.name ?? getOfflineMapPackName(pack.metadata.region as OfflineMapRegion));
    }
  }
}

async function getLocalStyleUrlForRegion(region: OfflineMapRegion) {
  const packs = await listPacks();
  const pack = packs.find((candidate) => candidate.region.id === region.id && candidate.status === 'downloaded');
  return pack ? region.nativeStyleUrl : null;
}

function resolveRegionFromMetadata(metadata: Record<string, unknown>) {
  const metadataRegion = metadata.region as OfflineMapRegion | undefined;
  if (metadataRegion?.id) {
    return offlineMapRegions.find((region) => region.id === metadataRegion.id) ?? metadataRegion;
  }

  return offlineMapRegions.find((region) => region.id === metadata.regionId) ?? null;
}

export const offlineMapPackAdapter: OfflineMapPackAdapter = {
  deletePack,
  downloadPack,
  getLocalStyleUrlForRegion,
  listPacks,
};
