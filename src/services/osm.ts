export type OSMFeature = {
  id: string;
  type: string;
  tags: Record<string, string>;
  geometry: GeoJSON.Geometry;
};

export interface OSMProvider {
  featuresIntersecting(
    geometry: GeoJSON.Geometry
  ): Promise<OSMFeature[]>;
}
