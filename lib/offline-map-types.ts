import type { OfflineMapRegion } from '@/lib/offline-map-regions';

export type OfflineMapPackStatus = 'idle' | 'downloading' | 'downloaded' | 'stale' | 'error' | 'unavailable';

export type OfflineMapPackRecord = {
  bytesDownloaded?: number;
  error?: string;
  localStyleUrl?: string;
  progress: number;
  region: OfflineMapRegion;
  status: OfflineMapPackStatus;
  updatedAt?: number;
};

export type OfflineMapPackProgress = {
  bytesDownloaded?: number;
  error?: string;
  localStyleUrl?: string;
  progress?: number;
  status?: OfflineMapPackStatus;
  updatedAt?: number;
};

export type OfflineMapPackAdapter = {
  deletePack(regionId: string): Promise<void>;
  downloadPack(region: OfflineMapRegion, onProgress: (progress: OfflineMapPackProgress) => void): Promise<OfflineMapPackRecord>;
  getLocalStyleUrlForRegion(region: OfflineMapRegion): Promise<string | null>;
  listPacks(): Promise<OfflineMapPackRecord[]>;
};
