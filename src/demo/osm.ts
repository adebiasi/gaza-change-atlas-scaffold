import type { OSMFeature } from "../services/osm";

export const demoOSMFeatures: OSMFeature[] = [
  {
    id: "way/demo-building-1",
    type: "way",
    tags: { building: "yes" },
    geometry: { type: "Polygon", coordinates: [[[34.434,31.489],[34.443,31.489],[34.443,31.497],[34.434,31.497],[34.434,31.489]]] },
  },
  {
    id: "way/demo-road-1",
    type: "way",
    tags: { highway: "residential" },
    geometry: { type: "LineString", coordinates: [[34.474,31.404],[34.484,31.412]] },
  },
];
