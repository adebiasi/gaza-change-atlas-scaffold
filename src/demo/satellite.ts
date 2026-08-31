import type { Acquisition, AcquisitionPair } from "../domain/acquisition";
import type { AtlasEvent } from "../domain/events";
import { realBeforeAfterDates } from "../services/gibs";

const OFFSET_DAYS = 4;

/**
 * Chooses a before/after acquisition pair around the real event date, backed
 * by NASA GIBS (free, no-signup) daily MODIS imagery — not a fixed synthetic
 * date. Cloud cover is unknown for GIBS' pre-rendered "best available"
 * mosaic, so it is left undefined rather than fabricated.
 */
export function chooseDemoPair(event: AtlasEvent): AcquisitionPair {
  const { before: beforeDate, after: afterDate } = realBeforeAfterDates(event.date, OFFSET_DAYS);

  const before: Acquisition = {
    id: `GIBS-MODIS-${beforeDate}`,
    datetime: `${beforeDate}T00:00:00Z`,
    collection: "modis-gibs",
    quality: "acceptable",
    source: "gibs",
  };
  const after: Acquisition = {
    id: `GIBS-MODIS-${afterDate}`,
    datetime: `${afterDate}T00:00:00Z`,
    collection: "modis-gibs",
    quality: "acceptable",
    source: "gibs",
  };

  return {
    before,
    after,
    policy: "automatic",
    rationale: `Real NASA GIBS (MODIS, ~250 m, free/no-signup) imagery selected ${OFFSET_DAYS} days before and after ${event.date}. Not Sentinel-2 resolution — regional context only, not building-level detail.`,
  };
}
