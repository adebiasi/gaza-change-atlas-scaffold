# Implementation status after Step 2

## Completed in this iteration

1. **Acquisition selection contract** — added acquisition domain types and a deterministic demo selector.
2. **Change detection output** — added explicit confidence, area, interpretation and OSM linkage fields to the UI.
3. **OSM enrichment shell** — added contextual OSM feature fixtures and linked-feature counts.
4. **Reproducibility report** — the UI can export event, acquisition, visualization, algorithm, change and OSM metadata as JSON.
5. **Production Copernicus boundary** — added a server-only adapter for OAuth token caching, STAC search and Sentinel Hub Processing API true-colour requests.
6. **Safety of interpretation** — every demo result is labelled as synthetic; the interface explicitly avoids causal attribution.
7. **GitHub Pages compatibility** — the frontend remains a static export; live credentials stay outside it.

## Completed in Step 4

8. **Free live imagery** — wired true color, infrared and vegetation visualizations to real NASA GIBS MODIS tiles (no API key/account), queried by the real date around each event. SAR has no free/no-signup source and now shows an explicit fallback to OpenStreetMap instead of silently doing nothing.


## Completed in Step 4 (GIBS robustness)

9. **DescribeDomains date resolution** — vegetation (and all) layers no longer use hand-rolled period arithmetic. The client asks GIBS `DescribeDomains` for the real TIME domain, picks the nearest valid date, and falls back to OpenStreetMap if tiles still 404. Vegetation switched to historical `MODIS_Terra_L3_NDVI_16Day` (the rolling 8-day product has no 2023 coverage).

## Still required before publishing real findings

- Replace GIBS/demo acquisitions with server responses from the Copernicus adapter for 10 m Sentinel-2/1 resolution (requires a free CDSE account).
- Implement a true SAR visualization (Sentinel-1, requires Copernicus) and a proper pixel-based difference renderer (currently a synthetic polygon overlay).
- Implement the raster change detector/segmentation worker and version its parameters.
- Add historical OSM extracts or another dated contextual source when historical claims are needed.
- Populate every event with independently verified sources and provenance.
- Add automated tests for acquisition pairing, geometry intersections and report schema.
- Add rate limiting, cache headers, request quotas and error telemetry to the live API.
- Perform manual review of candidate polygons before treating them as research observations.
