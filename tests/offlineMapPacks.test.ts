import { describe, expect, it } from 'vitest';

import { offlineMapPackValidationForTest } from '../lib/offline-map-packs.web';

const ORIGIN = 'https://wandr.test';
const region = {
  id: 'namibia',
  label: 'Namibia',
  version: '2026.05.v1',
  centerCoordinate: [17.0832, -22.5597],
  bounds: [
    [11.7, -29],
    [25.3, -16.9],
  ],
  webPack: {
    manifestUrl: '/offline-map-packs/regions/namibia/metadata.json',
    styleUrl: '/offline-map-packs/regions/namibia/style.json',
  },
} as any;

describe('offline map pack validation', () => {
  it('rejects preview-only packs that do not include tiles or PMTiles', () => {
    const files = [
      { kind: 'style', url: `${ORIGIN}/offline-map-packs/regions/namibia/style.json` },
      { kind: 'asset', url: `${ORIGIN}/offline-map-packs/regions/namibia/region.geojson` },
    ] as any;

    expect(
      offlineMapPackValidationForTest.getManifestReadinessError(
        { id: 'namibia', styleUrl: '/offline-map-packs/regions/namibia/style.json', version: '2026.05.v1' },
        files,
        region,
        ORIGIN
      )
    ).toMatch(/tile or PMTiles assets/i);
  });

  it('accepts app-owned PMTiles archives listed in the manifest and style', () => {
    const files = [
      { kind: 'style', url: `${ORIGIN}/offline-map-packs/regions/namibia/style.json` },
      { kind: 'pmtiles', url: `${ORIGIN}/offline-map-packs/regions/namibia/map.pmtiles` },
    ] as any;
    const style = {
      sources: {
        base: {
          type: 'vector',
          url: 'pmtiles:///offline-map-packs/regions/namibia/map.pmtiles',
        },
      },
    };

    expect(
      offlineMapPackValidationForTest.getManifestReadinessError(
        { id: 'namibia', styleUrl: '/offline-map-packs/regions/namibia/style.json', version: '2026.05.v1' },
        files,
        region,
        ORIGIN
      )
    ).toBeNull();
    expect(offlineMapPackValidationForTest.getStyleReadinessError(style, region, files, ORIGIN)).toBeNull();
  });

  it('rejects PMTiles styles when the archive is not listed as a downloadable file', () => {
    const files = [
      { kind: 'style', url: `${ORIGIN}/offline-map-packs/regions/namibia/style.json` },
      { kind: 'pmtiles', url: `${ORIGIN}/offline-map-packs/regions/namibia/other.pmtiles` },
    ] as any;

    expect(
      offlineMapPackValidationForTest.getStyleReadinessError(
        {
          sources: {
            base: {
              type: 'vector',
              url: 'pmtiles:///offline-map-packs/regions/namibia/map.pmtiles',
            },
          },
        },
        region,
        files,
        ORIGIN
      )
    ).toMatch(/must list its PMTiles archive/i);
  });
});
