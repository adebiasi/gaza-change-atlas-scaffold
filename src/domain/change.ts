export type ChangeConfidence = "low" | "medium" | "high";

export type ChangeFeature = {
  id: string;
  geometry: GeoJSON.Geometry;
  confidence: ChangeConfidence;
  areaM2?: number;
  osmFeatureIds?: string[];
  interpretation?: string;
};
