import {
  coordinateInOfflineMapRegion,
  offlineMapRegions,
  type OfflineMapRegion,
} from '@/lib/offline-map-regions';
import type { OfflineMapPackAdapter, OfflineMapPackProgress, OfflineMapPackRecord } from '@/lib/offline-map-types';

const DB_NAME = 'wandr-offline-maps';
const DB_VERSION = 1;
const STORE_NAME = 'packs';
const CACHE_NAME = 'wandr-offline-map-packs-v1';

type WebPackFile = {
  bytes?: number;
  kind?: 'style' | 'tile' | 'pmtiles' | 'sprite' | 'glyph' | 'metadata' | 'asset';
  url: string;
};

type WebMapStyle = {
  sources?: Record<
    string,
    {
      data?: string;
      tiles?: string[];
      type?: string;
      url?: string;
    }
  >;
};

type WebPackManifest = {
  files?: WebPackFile[];
  id: string;
  label?: string;
  styleUrl: string;
  version: string;
};

type StoredWebPack = {
  bytesDownloaded?: number;
  localStyleUrl: string;
  manifest: WebPackManifest;
  region: OfflineMapRegion;
  updatedAt: number;
};

async function listPacks(): Promise<OfflineMapPackRecord[]> {
  const records = await readAllStoredPacks();
  return records.map((record) => {
    const readinessError = getManifestReadinessError(record.manifest, record.manifest.files ?? [], record.region);

    return {
      bytesDownloaded: record.bytesDownloaded,
      error: readinessError ?? undefined,
      localStyleUrl: readinessError ? undefined : record.localStyleUrl,
      progress: readinessError ? 0 : 100,
      region: record.region,
      status: readinessError ? 'error' : record.region.version === record.manifest.version ? 'downloaded' : 'stale',
      updatedAt: record.updatedAt,
    };
  });
}

async function downloadPack(
  region: OfflineMapRegion,
  onProgress: (progress: OfflineMapPackProgress) => void
): Promise<OfflineMapPackRecord> {
  if (!region.webPack) {
    throw new Error('PWA trip map packs need a published web tile pack before they can be downloaded.');
  }

  if (!('caches' in globalThis)) {
    throw new Error('This browser does not support persistent PWA map packs.');
  }

  onProgress({ progress: 0, status: 'downloading' });
  const manifestResponse = await fetch(region.webPack.manifestUrl, { cache: 'no-store' });
  if (!manifestResponse.ok) {
    throw new Error(`Offline map pack is not published for ${region.label}.`);
  }

  const manifest = (await manifestResponse.json()) as WebPackManifest;
  const files = normalizeManifestFiles(manifest, region);
  const readinessError = getManifestReadinessError(manifest, files, region);
  if (readinessError) {
    throw new Error(readinessError);
  }

  const cache = await caches.open(CACHE_NAME);
  let completedBytes = 0;
  let styleJson: WebMapStyle | null = null;

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const response = await fetch(file.url, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Missing offline map asset: ${file.url}`);
    }

    if (file.kind === 'style') {
      styleJson = await response.clone().json().catch(() => null);
    }

    const clonedResponse = response.clone();
    await cache.put(file.url, clonedResponse);
    completedBytes += file.bytes ?? Number(response.headers.get('content-length') ?? 0);
    onProgress({
      bytesDownloaded: completedBytes,
      progress: Math.round(((index + 1) / files.length) * 100),
      status: 'downloading',
    });
  }

  const styleReadinessError = getStyleReadinessError(styleJson, region, files);
  if (styleReadinessError) {
    throw new Error(styleReadinessError);
  }

  const storedPack: StoredWebPack = {
    bytesDownloaded: completedBytes || undefined,
    localStyleUrl: files.find((file) => file.kind === 'style')?.url ?? normalizeUrl(manifest.styleUrl || region.webPack.styleUrl),
    manifest: {
      ...manifest,
      files,
      styleUrl: normalizeUrl(manifest.styleUrl || region.webPack.styleUrl),
    },
    region,
    updatedAt: Date.now(),
  };
  await writeStoredPack(storedPack);

  return {
    bytesDownloaded: storedPack.bytesDownloaded,
    localStyleUrl: storedPack.localStyleUrl,
    progress: 100,
    region,
    status: 'downloaded',
    updatedAt: storedPack.updatedAt,
  };
}

async function deletePack(regionId: string) {
  const pack = await readStoredPack(regionId);
  if (pack && 'caches' in globalThis) {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all((pack.manifest.files ?? []).map((file) => cache.delete(file.url)));
  }

  await deleteStoredPack(regionId);
}

async function getLocalStyleUrlForRegion(region: OfflineMapRegion) {
  const pack = await readStoredPack(region.id);
  if (!pack || !coordinateInOfflineMapRegion(region.centerCoordinate, pack.region)) {
    return null;
  }

  if (getManifestReadinessError(pack.manifest, pack.manifest.files ?? [], pack.region)) {
    return null;
  }

  return pack.localStyleUrl;
}

function normalizeManifestFiles(manifest: WebPackManifest, region: OfflineMapRegion): WebPackFile[] {
  const styleUrl = manifest.styleUrl || region.webPack?.styleUrl;
  const files = [...(manifest.files ?? [])];

  if (styleUrl && !files.some((file) => file.url === styleUrl)) {
    files.unshift({ kind: 'style', url: styleUrl });
  }

  return files.map((file) => {
    const url = normalizeUrl(file.url);
    if (!isSameOriginUrl(url)) {
      throw new Error(`Offline map asset must be app-owned: ${file.url}`);
    }

    return {
      ...file,
      url,
    };
  });
}

function normalizeUrl(url: string, origin = getCurrentOrigin()) {
  return new URL(url, origin).toString();
}

function getManifestReadinessError(
  manifest: WebPackManifest,
  files: WebPackFile[],
  region: OfflineMapRegion,
  origin = getCurrentOrigin()
) {
  const styleUrl = manifest.styleUrl || region.webPack?.styleUrl;
  if (!styleUrl) {
    return `Offline map pack for ${region.label} is missing a local style file.`;
  }

  const normalizedStyleUrl = normalizeUrl(styleUrl, origin);
  if (!isSameOriginUrl(normalizedStyleUrl, origin)) {
    return `Offline map pack for ${region.label} must use an app-owned style file.`;
  }

  const hasStyleFile = files.some((file) => file.kind === 'style' && file.url === normalizedStyleUrl);
  if (!hasStyleFile) {
    return `Offline map pack for ${region.label} must list its style file in metadata.json.`;
  }

  const hasTileAssets = files.some((file) => file.kind === 'tile');
  const hasPmtilesAssets = files.some((file) => file.kind === 'pmtiles');
  if (!hasTileAssets && !hasPmtilesAssets) {
    return `Offline map pack for ${region.label} does not include tile or PMTiles assets yet. Publish local vector, raster, or PMTiles tiles before downloading.`;
  }

  return null;
}

function getStyleReadinessError(
  style: WebMapStyle | null,
  region: OfflineMapRegion,
  files: readonly WebPackFile[],
  origin = getCurrentOrigin()
) {
  if (!style) {
    return `Offline map pack for ${region.label} has an invalid style file.`;
  }

  const sources = Object.values(style.sources ?? {});
  if (sources.length === 0) {
    return `Offline map pack for ${region.label} has no map sources.`;
  }

  for (const source of sources) {
    const sourceUrls = [source.url, source.data, ...(source.tiles ?? [])].filter((url): url is string => Boolean(url));
    for (const sourceUrl of sourceUrls) {
      if (sourceUrl.startsWith('pmtiles://')) {
        const archiveUrl = normalizePmtilesArchiveUrl(sourceUrl, origin);
        if (!archiveUrl) {
          return `Offline map pack for ${region.label} has an invalid PMTiles source.`;
        }

        if (!isSameOriginUrl(archiveUrl, origin)) {
          return `Offline map pack for ${region.label} must use an app-owned PMTiles archive.`;
        }

        const manifestListsArchive = files.some(
          (file) => file.kind === 'pmtiles' && normalizeUrl(file.url, origin) === archiveUrl
        );
        if (!manifestListsArchive) {
          return `Offline map pack for ${region.label} must list its PMTiles archive in metadata.json.`;
        }

        continue;
      }

      if (!isSameOriginUrl(normalizeUrl(sourceUrl, origin), origin)) {
        return `Offline map pack for ${region.label} still points at remote map assets.`;
      }
    }
  }

  return null;
}

function normalizePmtilesArchiveUrl(sourceUrl: string, origin: string) {
  if (!sourceUrl.startsWith('pmtiles://')) {
    return null;
  }

  const rawArchiveUrl = sourceUrl
    .slice('pmtiles://'.length)
    .replace(/\/\{z\}\/\{x\}\/\{y\}$/u, '');

  if (!rawArchiveUrl) {
    return null;
  }

  return normalizeUrl(rawArchiveUrl, origin);
}

function isSameOriginUrl(url: string, origin = getCurrentOrigin()) {
  return new URL(url, origin).origin === origin;
}

function getCurrentOrigin() {
  return window.location.origin;
}

async function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'region.id' });
      }
    };
  });
}

async function readAllStoredPacks(): Promise<StoredWebPack[]> {
  if (typeof indexedDB === 'undefined') {
    return [];
  }

  const db = await openDatabase();
  return new Promise<StoredWebPack[]>((resolve, reject) => {
    const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).getAll();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result as StoredWebPack[]);
  }).finally(() => db.close());
}

async function readStoredPack(regionId: string): Promise<StoredWebPack | null> {
  if (typeof indexedDB === 'undefined') {
    return null;
  }

  const db = await openDatabase();
  return new Promise<StoredWebPack | null>((resolve, reject) => {
    const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(regionId);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve((request.result as StoredWebPack | undefined) ?? null);
  }).finally(() => db.close());
}

async function writeStoredPack(pack: StoredWebPack) {
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const request = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put(pack);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  }).finally(() => db.close());
}

async function deleteStoredPack(regionId: string) {
  if (typeof indexedDB === 'undefined') {
    return;
  }

  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const request = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).delete(regionId);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  }).finally(() => db.close());
}

export const offlineMapPackAdapter: OfflineMapPackAdapter = {
  deletePack,
  downloadPack,
  getLocalStyleUrlForRegion,
  listPacks,
};

export const offlineMapPackValidationForTest = {
  getManifestReadinessError,
  getStyleReadinessError,
};
