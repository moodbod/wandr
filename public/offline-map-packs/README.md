# Offline map packs

PWA map downloads are only real offline maps when the pack includes app-owned
tile assets or a same-origin PMTiles archive. A style file or region GeoJSON by
itself is only a preview and the app will reject it instead of marking it as
downloaded.

PWA map downloads expect one folder per planning region:

```text
public/offline-map-packs/regions/{regionId}/metadata.json
public/offline-map-packs/regions/{regionId}/style.json
public/offline-map-packs/regions/{regionId}/map.pmtiles
public/offline-map-packs/regions/{regionId}/tiles/{z}/{x}/{y}.pbf
public/offline-map-packs/regions/{regionId}/sprites/*
public/offline-map-packs/regions/{regionId}/glyphs/*
```

`metadata.json` must include the pack id, version, style URL, and every file that
must be cached. At least one file must be `kind: "tile"` or `kind: "pmtiles"`:

```json
{
  "id": "namibia",
  "version": "2026.05.v1",
  "styleUrl": "/offline-map-packs/regions/namibia/style.json",
  "files": [
    { "kind": "style", "url": "/offline-map-packs/regions/namibia/style.json" },
    { "kind": "pmtiles", "url": "/offline-map-packs/regions/namibia/map.pmtiles" }
  ]
}
```

Use app-owned or properly licensed vector/raster tile assets here. Do not
bulk-cache Mapbox CDN tiles for redistribution.

The style must point only at same-origin files in this folder. PMTiles sources
should use the registered protocol, for example
`"url": "pmtiles:///offline-map-packs/regions/namibia/map.pmtiles"`.
