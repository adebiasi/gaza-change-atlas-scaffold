import type { ChangeFeature } from "../domain/change";

export interface ChangeDetector {
  detect(
    beforeRasterUrl: string,
    afterRasterUrl: string
  ): Promise<ChangeFeature[]>;
}

// MVP: keep the interface separate from the implementation.
// Later this can call a Python worker for segmentation/change detection.
