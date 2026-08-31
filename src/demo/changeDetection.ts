import type { ChangeFeature } from "../domain/change";

export function demoChanges(): ChangeFeature[] {
  return [
    {
      id: "demo-change-001",
      geometry: {
        type: "Polygon",
        coordinates: [[[34.435,31.49],[34.442,31.49],[34.442,31.496],[34.435,31.496],[34.435,31.49]]],
      },
      confidence: "medium",
      areaM2: 4200,
      osmFeatureIds: ["way/demo-building-1"],
      interpretation: "Spectral/radar difference candidate; cause not inferred.",
    },
    {
      id: "demo-change-002",
      geometry: {
        type: "Polygon",
        coordinates: [[[34.475,31.405],[34.482,31.405],[34.482,31.411],[34.475,31.411],[34.475,31.405]]],
      },
      confidence: "low",
      areaM2: 3100,
      osmFeatureIds: ["way/demo-road-1"],
      interpretation: "Low-confidence candidate requiring visual and source review.",
    },
  ];
}
