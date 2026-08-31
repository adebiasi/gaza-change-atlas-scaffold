export type Collection = "sentinel-1" | "sentinel-2-l2a" | "modis-gibs";

export type Acquisition = {
  id: string;
  datetime: string;
  cloudCover?: number;
  collection: Collection;
  quality: "good" | "acceptable" | "poor";
  source: "demo" | "copernicus" | "gibs";
};

export type AcquisitionPair = {
  before?: Acquisition;
  after?: Acquisition;
  policy: "automatic" | "manual";
  rationale: string;
};
