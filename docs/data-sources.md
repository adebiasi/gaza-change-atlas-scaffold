# Data sources

## NASA GIBS (currently wired into the free demo)

Free, public, no API key or account required. Used for the true-color,
infrared and vegetation imagery in the current build via
`src/services/gibs.ts`, queried by real calendar date around each event.

Trade-off: MODIS layers are ~250 m/pixel, far coarser than Sentinel-2 (10 m).
Good for regional/urban-footprint context, not for building-level damage
assessment. No free SAR layer exists; the SAR option falls back to
OpenStreetMap in the UI.

See https://nasa-gibs.github.io/gibs-api-docs/ for the full layer catalog and
terms of use.

## Copernicus Data Space (requires a free account — not yet wired in)

Primary Earth-observation source for Sentinel imagery.

Relevant APIs:
- Catalog API for finding acquisitions
- Processing API for rendered imagery
- Sentinel-1 and Sentinel-2 collections

See the official Copernicus Data Space documentation before deployment and check current quotas/terms.

## OpenStreetMap

Used for geographic context and feature classification.

Attribution and usage must follow the current OpenStreetMap Foundation requirements.

## Event sources

Events must be entered with explicit sources and provenance. Avoid relying on a single source when the application presents an event as a factual historical record.
