# Offline map packs

The repo includes starter PWA packs for the supported planning regions. They are
small app-owned coverage packs, so the mobile PWA can download something real and
render app markers/routes offline without waiting for a full street-level tile
pipeline.

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

For full detailed offline basemaps, replace the starter `style.json` and
`region.geojson` files with a style that points at your own licensed tile assets
and list every required asset in `metadata.json`.
