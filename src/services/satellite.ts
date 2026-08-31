import type { Acquisition, Collection } from "../domain/acquisition";

export type Visualization = "true-color" | "infrared" | "vegetation" | "sar";

export interface SatelliteProvider {
  searchAcquisitions(
    bbox: [number, number, number, number],
    from: string,
    to: string,
    collection?: Collection
  ): Promise<Acquisition[]>;

  getImageryUrl(
    acquisitionId: string,
    visualization: Visualization
  ): Promise<string>;
}

/**
 * Production implementations belong behind a server-side proxy.
 * Never expose Copernicus OAuth client secrets in the browser or GitHub Pages.
 */
