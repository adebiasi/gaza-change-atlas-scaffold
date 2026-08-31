# Gaza Change Atlas

Open-source web application for comparing satellite imagery around significant events and exploring detected landscape changes with OpenStreetMap context.

## Current status

The project has moved beyond the Step 2 interaction shell. The frontend now includes a complete **research-MVP workflow in demo mode**: event selection, acquisition-pair selection, synchronized maps, change candidates with confidence, OSM context, and reproducibility JSON export.

**Important:** the current demo acquisition records and detected polygons are synthetic fixtures. They are not presented as observations about Gaza and must be replaced by verified live data before publication.

## Architecture

- **Frontend:** Next.js + React + TypeScript
- **Map:** MapLibre GL JS
- **Satellite data:** Copernicus Data Space / Sentinel Hub
- **OSM context:** OpenStreetMap / Overpass-compatible adapter
- **Analysis:** browser-friendly MVP first; Python/remote worker for heavier raster change detection
- **Hosting:** GitHub Pages for the static frontend; separate serverless API for Copernicus OAuth credentials

## Workflow implemented

1. Event → 2. Acquisition selection → 3. Change detection → 4. OSM context → 5. Reproducibility report

The production boundary is in `server/copernicus.ts`. It caches OAuth tokens, searches the CDSE STAC catalog and demonstrates a Sentinel-2 true-colour Processing API request. Do not move the client secret into the frontend.

## Development

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Production checklist

See `docs/next-steps.md` for the remaining work before real findings are published.

Copernicus authentication and Processing API details should be kept aligned with the current official documentation. OSM attribution and service terms must also be respected.
