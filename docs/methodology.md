# Methodology

## Event-to-imagery selection

For each event, select the most suitable acquisition before and after the event using:

1. temporal distance from the event;
2. cloud coverage / image quality;
3. sensor suitability;
4. availability over the area of interest.

The exact selection policy should be versioned so results remain reproducible.

## Change detection

A change detector should produce geographic observations with a confidence score. It must not automatically infer the cause of a change.

## OSM enrichment

Detected polygons are intersected with OpenStreetMap features. OSM tags provide contextual classification such as buildings, roads, amenities, land use and other mapped objects.

OSM is not automatically a historical ground-truth dataset. Historical claims require appropriate historical sources.

## Reproducibility

Every report should record:

- event ID and source list;
- acquisition IDs and acquisition timestamps;
- processing/visualization mode;
- algorithm version;
- OSM data timestamp or extract;
- confidence and known limitations.
