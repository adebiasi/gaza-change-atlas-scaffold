export type Acquisition = {
  id: string;
  datetime: string;
  cloudCover?: number;
  collection: "sentinel-1" | "sentinel-2-l2a";
};

export interface SatelliteProvider {
  searchAcquisitions(
    bbox: [number, number, number, number],
    from: string,
    to: string
  ): Promise<Acquisition[]>;

  getImageryUrl(
    acquisitionId: string,
    visualization: "true-color" | "infrared" | "vegetation" | "sar"
  ): Promise<string>;
}

// Production implementation should call a server-side proxy.
// Do not expose Copernicus OAuth client secrets in this frontend.
