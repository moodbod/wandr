import {
  coordinateInOfflineMapRegion,
  findOfflineMapRegionForCoordinate,
  offlineMapRegions,
  type OfflineMapRegion,
} from '@/lib/offline-map-regions';
import {
  deleteOfflineMapPack,
  downloadOfflineMapPack,
  getLocalOfflineMapStyleUrl,
  listOfflineMapPacks,
} from '@/lib/offline-map-pack-adapter';
import type { OfflineMapPackProgress, OfflineMapPackRecord } from '@/lib/offline-map-types';

type Listener = (records: OfflineMapPackRecord[]) => void;

const recordsByRegionId = new Map<string, OfflineMapPackRecord>();
const listeners = new Set<Listener>();
let hasLoaded = false;
let loadPromise: Promise<void> | null = null;

offlineMapRegions.forEach((region) => {
  recordsByRegionId.set(region.id, createIdleRecord(region));
});

export function subscribeOfflineMapDownloads(listener: Listener) {
  listeners.add(listener);
  listener(getOfflineMapDownloadSnapshot());
  void refreshOfflineMapDownloads();

  return () => {
    listeners.delete(listener);
  };
}

export function getOfflineMapDownloadSnapshot() {
  return Array.from(recordsByRegionId.values()).sort((a, b) => a.region.label.localeCompare(b.region.label));
}

export function getOfflineMapDownloadRecord(regionId: string) {
  return recordsByRegionId.get(regionId) ?? null;
}

export async function refreshOfflineMapDownloads() {
  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = listOfflineMapPacks()
    .then((records) => {
      hasLoaded = true;
      records.forEach((record) => {
        recordsByRegionId.set(record.region.id, record);
      });
      offlineMapRegions.forEach((region) => {
        if (!recordsByRegionId.has(region.id)) {
          recordsByRegionId.set(region.id, createIdleRecord(region));
        }
      });
      emit();
    })
    .finally(() => {
      loadPromise = null;
    });

  return loadPromise;
}

export async function startOfflineMapDownload(region: OfflineMapRegion) {
  setRecord(region.id, {
    ...getExistingRecord(region),
    error: undefined,
    progress: 0,
    status: 'downloading',
  });

  try {
    const record = await downloadOfflineMapPack(region, (progress) => applyProgress(region, progress));
    setRecord(region.id, {
      ...record,
      progress: 100,
      status: record.status === 'stale' ? 'stale' : 'downloaded',
      updatedAt: record.updatedAt ?? Date.now(),
    });
  } catch (error) {
    setRecord(region.id, {
      ...getExistingRecord(region),
      error: error instanceof Error ? error.message : 'Map download failed.',
      progress: 0,
      status: 'error',
    });
  }
}

export async function removeOfflineMapDownload(regionId: string) {
  const existing = recordsByRegionId.get(regionId);
  await deleteOfflineMapPack(regionId);
  if (existing) {
    if (existing.region.kind === 'planning') {
      setRecord(regionId, createIdleRecord(existing.region));
    } else {
      recordsByRegionId.delete(regionId);
      emit();
    }
  }
}

export async function getOfflineMapStyleUrlForCoordinate(coordinate: readonly [number, number] | null | undefined) {
  if (!hasLoaded) {
    await refreshOfflineMapDownloads();
  }

  const downloadedRegions = getOfflineMapDownloadSnapshot()
    .filter((record) => record.status === 'downloaded' || record.status === 'stale')
    .map((record) => record.region);
  const region = findOfflineMapRegionForCoordinate(coordinate, downloadedRegions);
  if (!region) {
    return null;
  }

  const localStyleUrl = await getLocalOfflineMapStyleUrl(region);
  return localStyleUrl ? { region, styleUrl: localStyleUrl } : null;
}

export function hasDownloadedOfflineMapForCoordinate(coordinate: readonly [number, number] | null | undefined) {
  return getOfflineMapDownloadSnapshot().some(
    (record) =>
      (record.status === 'downloaded' || record.status === 'stale') &&
      coordinateInOfflineMapRegion(coordinate, record.region)
  );
}

function applyProgress(region: OfflineMapRegion, progress: OfflineMapPackProgress) {
  const existing = getExistingRecord(region);
  setRecord(region.id, {
    ...existing,
    ...progress,
    progress: progress.progress ?? existing.progress,
    status: progress.status ?? existing.status,
    updatedAt: progress.updatedAt ?? existing.updatedAt,
  });
}

function getExistingRecord(region: OfflineMapRegion) {
  return recordsByRegionId.get(region.id) ?? createIdleRecord(region);
}

function createIdleRecord(region: OfflineMapRegion): OfflineMapPackRecord {
  return {
    progress: 0,
    region,
    status: 'idle',
  };
}

function setRecord(regionId: string, record: OfflineMapPackRecord) {
  recordsByRegionId.set(regionId, record);
  emit();
}

function emit() {
  const snapshot = getOfflineMapDownloadSnapshot();
  listeners.forEach((listener) => listener(snapshot));
}
