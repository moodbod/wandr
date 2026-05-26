# Offline map packs

PWA map downloads expect one folder per planning region:

```text
public/offline-map-packs/regions/{regionId}/metadata.json
public/offline-map-packs/regions/{regionId}/style.json
public/offline-map-packs/regions/{regionId}/tiles.pmtiles
public/offline-map-packs/regions/{regionId}/sprites/*
public/offline-map-packs/regions/{regionId}/glyphs/*
```

`metadata.json` should include the pack id, version, style URL, and every file that must be cached:

```json
{
  "id": "namibia",
  "version": "2026.05.v1",
  "styleUrl": "/offline-map-packs/regions/namibia/style.json",
  "files": [
    { "kind": "style", "url": "/offline-map-packs/regions/namibia/style.json" },
    { "kind": "tile", "url": "/offline-map-packs/regions/namibia/tiles.pmtiles" }
  ]
}
```

Use app-owned or properly licensed PMTiles/vector assets here. Do not bulk-cache Mapbox CDN tiles for redistribution.
