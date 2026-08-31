import type { Imagery } from "../../components/DualMap";

export type CopernicusLayer = {
  layer: string;
  matrixSet: string;
  maxNativeZoom: number;
  format: "jpeg" | "png";
  label: string;
};

export const COPERNICUS_SERVICE_ID =
  "8351654b-4e26-4285-bc0a-5aec93ae057f";

export const COPERNICUS_WMTS_URL =
  `https://sh.dataspace.copernicus.eu/ogc/wmts/${COPERNICUS_SERVICE_ID}`;

const COPERNICUS_LAYERS: Partial<Record<Imagery, CopernicusLayer>> = {
  "true-color": {
    layer: "TRUE_COLOR",
    matrixSet: "PopularWebMercator512",
    maxNativeZoom: 15,
    format: "jpeg",
    label:
        "Copernicus Sentinel Hub — True Color (RGB)",
  },

  infrared: {
    layer: "COLOR_INFRARED",
    matrixSet: "PopularWebMercator512",
    maxNativeZoom: 15,
    format: "jpeg",
    label:
        "Copernicus Sentinel Hub — Color Infrared (NIR)",
  },

  vegetation: {
    layer: "VEGETATION_INDEX",
    matrixSet: "PopularWebMercator512",
    maxNativeZoom: 15,
    format: "jpeg",
    label:
        "Copernicus Sentinel Hub — Vegetation Index",
  },
};

/* -------------------------------------------------------------------------- */
/* Date helpers                                                               */
/* -------------------------------------------------------------------------- */

function normalizeDate(iso: string): string {
  return iso.slice(0, 10);
}

function isValidISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);

  return (
      !Number.isNaN(date.getTime()) &&
      date.toISOString().slice(0, 10) === value
  );
}

/* -------------------------------------------------------------------------- */
/* Layer configuration                                                        */
/* -------------------------------------------------------------------------- */

export function copernicusLayerInfo(
    imagery: Imagery,
): CopernicusLayer | null {
  if (
      imagery === "sar" ||
      imagery === "difference"
  ) {
    return null;
  }

  return COPERNICUS_LAYERS[imagery] ?? null;
}

export const gibsLayerInfo =
    copernicusLayerInfo;

/* -------------------------------------------------------------------------- */
/* TIME                                                                       */
/* -------------------------------------------------------------------------- */

export function buildCopernicusTimeRange(
    dateISO: string,
    daysBefore = 15,
    daysAfter = 15,
): string {
  const date = normalizeDate(dateISO);

  const base =
      new Date(`${date}T00:00:00Z`);

  const day =
      24 * 60 * 60 * 1000;

  const start =
      new Date(
          base.getTime() -
          daysBefore * day,
      )
          .toISOString()
          .slice(0, 10);

  const end =
      new Date(
          base.getTime() +
          daysAfter * day,
      )
          .toISOString()
          .slice(0, 10);

  return `${start}/${end}`;
}

/* -------------------------------------------------------------------------- */
/* WMTS capabilities                                                          */
/* -------------------------------------------------------------------------- */

export type WmtsTileMatrix = {
  identifier: string;
  scaleDenominator: number;

  topLeftX: number;
  topLeftY: number;

  tileWidth: number;
  tileHeight: number;

  matrixWidth: number;
  matrixHeight: number;
};

export type WmtsTileMatrixSet = {
  identifier: string;
  supportedCRS: string;
  matrices: WmtsTileMatrix[];
};

type XmlRoot = Document | Element;

let copernicusWmtsMatrixSet:
    | WmtsTileMatrixSet
    | null = null;

let copernicusWmtsInitPromise:
    | Promise<WmtsTileMatrixSet>
    | null = null;

function localElements(
    root: XmlRoot,
    name: string,
): Element[] {
  return Array.from(
      root.getElementsByTagNameNS(
          "*",
          name,
      ),
  );
}

function firstLocalElement(
    root: XmlRoot,
    name: string,
): Element | null {
  return (
      localElements(root, name)[0] ??
      null
  );
}

function textContent(
    root: XmlRoot,
    name: string,
): string | null {
  return (
      firstLocalElement(
          root,
          name,
      )?.textContent?.trim() ?? null
  );
}

function numberContent(
    root: XmlRoot,
    name: string,
): number | null {
  const value =
      textContent(root, name);

  if (value == null) {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed)
      ? parsed
      : null;
}

function parseTileMatrixSet(
    element: Element,
): WmtsTileMatrixSet | null {
  const identifier =
      textContent(
          element,
          "Identifier",
      );

  const supportedCRS =
      textContent(
          element,
          "SupportedCRS",
      ) ?? "";

  if (!identifier) {
    return null;
  }

  const matrices: WmtsTileMatrix[] =
      [];

  for (const matrixElement of
      localElements(
          element,
          "TileMatrix",
      )) {
    const matrixIdentifier =
        textContent(
            matrixElement,
            "Identifier",
        );

    const scaleDenominator =
        numberContent(
            matrixElement,
            "ScaleDenominator",
        );

    const topLeftCorner =
        textContent(
            matrixElement,
            "TopLeftCorner",
        );

    const tileWidth =
        numberContent(
            matrixElement,
            "TileWidth",
        );

    const tileHeight =
        numberContent(
            matrixElement,
            "TileHeight",
        );

    const matrixWidth =
        numberContent(
            matrixElement,
            "MatrixWidth",
        );

    const matrixHeight =
        numberContent(
            matrixElement,
            "MatrixHeight",
        );

    if (
        !matrixIdentifier ||
        scaleDenominator == null ||
        !topLeftCorner ||
        tileWidth == null ||
        tileHeight == null ||
        matrixWidth == null ||
        matrixHeight == null
    ) {
      continue;
    }

    const topLeft =
        topLeftCorner
            .trim()
            .split(/\s+/)
            .map(Number);

    if (
        topLeft.length < 2 ||
        !Number.isFinite(topLeft[0]) ||
        !Number.isFinite(topLeft[1])
    ) {
      continue;
    }

    matrices.push({
      identifier:
      matrixIdentifier,

      scaleDenominator,

      topLeftX: topLeft[0],
      topLeftY: topLeft[1],

      tileWidth,
      tileHeight,

      matrixWidth,
      matrixHeight,
    });
  }

  if (matrices.length === 0) {
    return null;
  }

  return {
    identifier,
    supportedCRS,
    matrices,
  };
}

async function fetchCopernicusCapabilities(): Promise<WmtsTileMatrixSet> {
  const url =
      `${COPERNICUS_WMTS_URL}` +
      `?SERVICE=WMTS` +
      `&REQUEST=GetCapabilities` +
      `&VERSION=1.0.0`;

  const response =
      await fetch(url);

  if (!response.ok) {
    throw new Error(
        `Copernicus WMTS GetCapabilities failed: ` +
        `${response.status} ${response.statusText}`,
    );
  }

  const xml =
      await response.text();

  const parser =
      new DOMParser();

  const document =
      parser.parseFromString(
          xml,
          "application/xml",
      );

  const parserError =
      firstLocalElement(
          document,
          "parsererror",
      );

  if (parserError) {
    throw new Error(
        "Unable to parse Copernicus WMTS GetCapabilities.",
    );
  }

  const matrixSets =
      localElements(
          document,
          "TileMatrixSet",
      );

  for (const element of matrixSets) {
    const matrixSet =
        parseTileMatrixSet(
            element,
        );

    if (
        matrixSet?.identifier ===
        "PopularWebMercator512"
    ) {
      /**
       * Ordine dal livello più basso
       * al più alto.
       */
      matrixSet.matrices.sort(
          (a, b) =>
              a.scaleDenominator -
              b.scaleDenominator,
      );

      return matrixSet;
    }
  }

  throw new Error(
      "Copernicus WMTS TileMatrixSet " +
      `"PopularWebMercator512" not found.`,
  );
}

export async function initCopernicusWmts(): Promise<WmtsTileMatrixSet> {
  if (copernicusWmtsMatrixSet) {
    return copernicusWmtsMatrixSet;
  }

  if (copernicusWmtsInitPromise) {
    return copernicusWmtsInitPromise;
  }

  copernicusWmtsInitPromise =
      fetchCopernicusCapabilities()
          .then((matrixSet) => {
            copernicusWmtsMatrixSet =
                matrixSet;

            return matrixSet;
          })
          .finally(() => {
            copernicusWmtsInitPromise =
                null;
          });

  return copernicusWmtsInitPromise;
}

export function isCopernicusWmtsInitialized(): boolean {
  return (
      copernicusWmtsMatrixSet !==
      null
  );
}

export function getCopernicusWmtsMatrixSet():
    | WmtsTileMatrixSet
    | null {
  return copernicusWmtsMatrixSet;
}

/* -------------------------------------------------------------------------- */
/* MapLibre -> WMTS                                                           */
/* -------------------------------------------------------------------------- */

/**
 * PopularWebMercator512:
 *
 * MapLibre source tileSize = 512.
 *
 * Quindi:
 *
 * MapLibre z=0 -> matrix width 1
 * MapLibre z=1 -> matrix width 2
 * MapLibre z=2 -> matrix width 4
 * ...
 *
 * NON facciamo più:
 *
 *     matrix = z + 1
 *
 * perché l'identifier della matrix è un dettaglio
 * del WMTS e deve essere letto dai capabilities.
 */
function findWmtsMatrixForMapLibreZoom(
    z: number,
    matrixSet: WmtsTileMatrixSet,
): WmtsTileMatrix {
  const expectedWidth =
      Math.pow(2, z);

  /**
   * Prima scelta:
   * MatrixWidth coerente con la piramide
   * MapLibre 512.
   */
  const exact =
      matrixSet.matrices.find(
          (matrix) =>
              matrix.tileWidth === 512 &&
              matrix.tileHeight === 512 &&
              matrix.matrixWidth ===
              expectedWidth &&
              matrix.matrixHeight ===
              expectedWidth,
      );

  if (exact) {
    return exact;
  }

  /**
   * Fallback basato sulla risoluzione.
   *
   * Per Web Mercator 512:
   *
   * worldSize / (512 * 2^z)
   */
  const worldSize =
      2 *
      Math.PI *
      6378137;

  const targetResolution =
      worldSize /
      (512 * expectedWidth);

  const pixelSize =
      0.00028;

  let best =
      matrixSet.matrices[0];

  let bestDiff =
      Infinity;

  for (const matrix of
      matrixSet.matrices) {
    const resolution =
        matrix.scaleDenominator *
        pixelSize;

    const diff =
        Math.abs(
            resolution -
            targetResolution,
        );

    if (diff < bestDiff) {
      best = matrix;
      bestDiff = diff;
    }
  }

  return best;
}

/**
 * Converte z/x/y MapLibre nella tile WMTS.
 *
 * Poiché la source MapLibre usa tileSize=512,
 * x e y sono già nella stessa griglia geografica
 * della PopularWebMercator512.
 */
export function mapLibreToWmts(
    z: number,
    x: number,
    y: number,
    matrixSet: WmtsTileMatrixSet,
): {
  matrix: WmtsTileMatrix;
  col: number;
  row: number;
} {
  const matrix =
      findWmtsMatrixForMapLibreZoom(
          z,
          matrixSet,
      );

  const col = Math.max(
      0,
      Math.min(
          x,
          matrix.matrixWidth - 1,
      ),
  );

  const row = Math.max(
      0,
      Math.min(
          y,
          matrix.matrixHeight - 1,
      ),
  );

  return {
    matrix,
    col,
    row,
  };
}

/* -------------------------------------------------------------------------- */
/* WMTS URL                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Costruisce una singola richiesta WMTS.
 */
export function copernicusGetTileUrl(
    imagery: Imagery,
    dateISO: string,
    z: number,
    x: number,
    y: number,
): string | null {
  const cfg =
      copernicusLayerInfo(imagery);

  if (!cfg) {
    return null;
  }

  const date =
      normalizeDate(dateISO);

  if (!isValidISODate(date)) {
    return null;
  }

  const matrixSet =
      copernicusWmtsMatrixSet;

  if (!matrixSet) {
    return null;
  }

  const {
    matrix,
    col,
    row,
  } =
      mapLibreToWmts(
          z,
          x,
          y,
          matrixSet,
      );

  const timeRange =
      buildCopernicusTimeRange(
          date,
      );

  return (
      `${COPERNICUS_WMTS_URL}?` +
      `SERVICE=WMTS` +
      `&VERSION=1.0.0` +
      `&REQUEST=GetTile` +
      `&LAYER=${encodeURIComponent(
          cfg.layer,
      )}` +
      `&TILEMATRIXSET=${encodeURIComponent(
          cfg.matrixSet,
      )}` +
      `&TILEMATRIX=${encodeURIComponent(
          matrix.identifier,
      )}` +
      `&TILEROW=${row}` +
      `&TILECOL=${col}` +
      `&FORMAT=${encodeURIComponent(
          `image/${cfg.format}`,
      )}` +
      `&TIME=${encodeURIComponent(
          timeRange,
      )}` +
      `&MAXCC=30`
  );
}

/**
 * Manteniamo questa funzione per compatibilità.
 *
 * ATTENZIONE:
 * questa URL viene usata solo quando il consumer
 * è in grado di sostituire z/x/y.
 *
 * Per DualMap usiamo invece il protocollo custom
 * copernicus://.
 */
export function copernicusTileUrl(
    imagery: Imagery,
    dateISO: string,
): string | null {
  const cfg =
      copernicusLayerInfo(imagery);

  if (!cfg) {
    return null;
  }

  const date =
      normalizeDate(dateISO);

  if (!isValidISODate(date)) {
    return null;
  }

  if (!copernicusWmtsMatrixSet) {
    return null;
  }

  /**
   * Questo template NON viene usato da DualMap.
   */
  return (
      `https://invalid.local/copernicus/` +
      `${encodeURIComponent(
          imagery,
      )}/` +
      `${encodeURIComponent(
          date,
      )}/{z}/{x}/{y}`
  );
}

export const gibsTileUrl =
    copernicusTileUrl;

/**
 * URL di debug per una tile specifica.
 */
export function buildCopernicusTileUrl(
    imagery: Imagery,
    dateISO: string,
    z = 14,
    x = 1220,
    y = 834,
): string | null {
  return copernicusGetTileUrl(
      imagery,
      dateISO,
      z,
      x,
      y,
  );
}

/* -------------------------------------------------------------------------- */
/* Date resolution                                                            */
/* -------------------------------------------------------------------------- */

export async function resolveCopernicusDate(
    imagery: Imagery,
    dateISO: string,
): Promise<string | null> {
  const cfg =
      copernicusLayerInfo(imagery);

  if (!cfg) {
    return null;
  }

  const date =
      normalizeDate(dateISO);

  if (!isValidISODate(date)) {
    return null;
  }

  return date;
}

export const resolveGibsDate =
    resolveCopernicusDate;

/* -------------------------------------------------------------------------- */
/* Before / After                                                             */
/* -------------------------------------------------------------------------- */

export function realBeforeAfterDates(
    eventDateISO: string,
    offsetDays = 4,
): {
  before: string;
  after: string;
} {
  const base =
      new Date(
          `${normalizeDate(
              eventDateISO,
          )}T00:00:00Z`,
      ).getTime();

  const day =
      24 * 60 * 60 * 1000;

  const before =
      new Date(
          base -
          offsetDays * day,
      )
          .toISOString()
          .slice(0, 10);

  const after =
      new Date(
          base +
          offsetDays * day,
      )
          .toISOString()
          .slice(0, 10);

  return {
    before,
    after,
  };
}