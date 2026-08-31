import type { ChangeFeature } from "../domain/change";

export interface ChangeDetector {
  detect(beforeRasterUrl: string, afterRasterUrl: string): Promise<ChangeFeature[]>;
}

/** Production contract for a raster/segmentation worker. */
