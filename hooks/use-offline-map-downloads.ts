import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  getOfflineMapStyleUrlForCoordinate,
  hasDownloadedOfflineMapForCoordinate,
  removeOfflineMapDownload,
  startOfflineMapDownload,
  subscribeOfflineMapDownloads,
} from '@/lib/offline-map-downloads';
import type { OfflineMapRegion } from '@/lib/offline-map-regions';
import type { OfflineMapPackRecord } from '@/lib/offline-map-types';
import { useNetworkStatus } from './use-network-status';

export function useOfflineMapDownloads() {
  const [records, setRecords] = useState<OfflineMapPackRecord[]>([]);

  useEffect(() => subscribeOfflineMapDownloads(setRecords), []);

  const recordsByRegionId = useMemo(
    () => new Map(records.map((record) => [record.region.id, record])),
    [records]
  );
  const download = useCallback((region: OfflineMapRegion) => startOfflineMapDownload(region), []);
  const remove = useCallback((regionId: string) => removeOfflineMapDownload(regionId), []);
  const getRecord = useCallback(
    (regionId: string) => recordsByRegionId.get(regionId) ?? null,
    [recordsByRegionId]
  );

  return {
    download,
    getRecord,
    records,
    remove,
  };
}

export function useOfflineMapStyleUrl(coordinate: readonly [number, number] | null | undefined) {
  const { isInternetReachable } = useNetworkStatus();
  const [styleState, setStyleState] = useState<{
    region: OfflineMapRegion | null;
    styleUrl: string | null;
  }>({ region: null, styleUrl: null });
  const [hasDownloadedRegion, setHasDownloadedRegion] = useState(false);

  useEffect(() => {
    if (isInternetReachable) {
      setStyleState({ region: null, styleUrl: null });
      setHasDownloadedRegion(false);
      return;
    }

    let cancelled = false;
    const load = async () => {
      const match = await getOfflineMapStyleUrlForCoordinate(coordinate);
      if (!cancelled) {
        setStyleState(match ?? { region: null, styleUrl: null });
        setHasDownloadedRegion(hasDownloadedOfflineMapForCoordinate(coordinate));
      }
    };

    void load();
    const unsubscribe = subscribeOfflineMapDownloads(() => {
      void load();
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [coordinate, isInternetReachable]);

  return {
    hasDownloadedRegion,
    isOffline: !isInternetReachable,
    region: styleState.region,
    styleUrl: styleState.styleUrl,
  };
}
