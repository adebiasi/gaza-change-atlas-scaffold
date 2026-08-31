# Gaza Change Atlas

Open-source web application for comparing satellite imagery around significant events and exploring detected landscape changes with OpenStreetMap context.

## Architecture

- **Frontend:** Next.js + React + TypeScript
- **Map:** MapLibre GL JS
- **Satellite data:** Copernicus Data Space / Sentinel Hub
- **OSM context:** OpenStreetMap / Overpass-compatible adapter
- **Analysis:** browser-friendly MVP first; Python worker later for heavier change detection
- **Hosting:** GitHub Pages for the static frontend; a separate serverless API is recommended for Copernicus OAuth credentials

> Important: never put a Copernicus client secret in the browser or in GitHub Pages. The production architecture should keep OAuth credentials on a server-side proxy/API.

## Planned features

1. Event-based before/after comparison
2. Synchronized dual maps
3. True color, false color / infrared, vegetation and SAR views
4. Automatic selection of suitable acquisitions around an event
5. Change detection layer
6. OpenStreetMap feature intersection and classification
7. Confidence/uncertainty indicators
8. Reproducible methodology and source attribution

## Development

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## GitHub Pages

The project is configured for a static export. GitHub Actions can build and publish `out/` to GitHub Pages.

Because satellite API authentication is not suitable for a purely static public frontend, deploy the `src/app/api` integration as a separate serverless service (or replace it with a suitably public OGC endpoint) before enabling live Copernicus requests.

## Data and methodology

See:

- `docs/methodology.md`
- `docs/data-sources.md`
- `data/events/events.json`

OSM data should be attributed according to the OpenStreetMap Foundation requirements. Satellite data attribution and service quotas should follow Copernicus Data Space terms.
