"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import maplibregl, {
  Map,
  StyleSpecification,
} from "maplibre-gl";

import type { ChangeFeature } from "../src/domain/change";

import {
  gibsLayerInfo,
  initCopernicusWmts,
  getCopernicusWmtsMatrixSet,
  copernicusGetTileUrl,
  resolveGibsDate,
  type WmtsTileMatrixSet,
} from "../src/services/gibs";

export type Imagery =
  | "true-color"
  | "infrared"
  | "vegetation"
  | "sar"
  | "difference";

type Props = {
  beforeLabel: string;
  afterLabel: string;

  beforeDate?: string;
  afterDate?: string;

  imagery: Imagery;

  changes?: ChangeFeature[];

  /*
   * Posizione iniziale dell'evento.
   *
   * Viene utilizzata SOLO quando cambia viewKey.
   */
  initialCenter?: [
    number,
    number,
  ];

  initialZoom?: number;

  /*
   * Identifica l'evento corrente.
   *
   * Cambiando evento cambia viewKey,
   * quindi la mappa viene portata
   * sulla posizione dell'evento.
   *
   * Cambiando imagery/date/change detection
   * viewKey resta uguale e la posizione
   * viene mantenuta.
   */
  viewKey?: string;
};

const GAZA_CENTER: [
  number,
  number,
] = [
  34.46,
  31.42,
];

const OSM_ATTRIBUTION =
  "© OpenStreetMap contributors";

const COPERNICUS_ATTRIBUTION =
  "© Copernicus Data Space Ecosystem";

const COPERNICUS_PROTOCOL =
  "copernicus";

/* -------------------------------------------------------------------------- */
/* Custom MapLibre protocol                                                  */
/* -------------------------------------------------------------------------- */

let copernicusProtocolRegistered =
  false;

function registerCopernicusProtocol() {
  if (
    copernicusProtocolRegistered
  ) {
    return;
  }

  maplibregl.addProtocol(
    COPERNICUS_PROTOCOL,
    async (
      requestParameters,
      abortController,
    ) => {
      const url =
        new URL(
          requestParameters.url,
        );

      const imagery =
        decodeURIComponent(
          url.hostname,
        ) as Imagery;

      const parts =
        url.pathname
          .split("/")
          .filter(Boolean)
          .map(
            decodeURIComponent,
          );

      const date =
        parts[0];

      const z =
        Number(parts[1]);

      const x =
        Number(parts[2]);

      const y =
        Number(parts[3]);

      if (
        !date ||
        !Number.isInteger(z) ||
        !Number.isInteger(x) ||
        !Number.isInteger(y)
      ) {
        throw new Error(
          `Invalid Copernicus tile URL: ${requestParameters.url}`,
        );
      }

      const tileUrl =
        copernicusGetTileUrl(
          imagery,
          date,
          z,
          x,
          y,
        );

      if (!tileUrl) {
        throw new Error(
          `Unable to build Copernicus tile URL for ${imagery}`,
        );
      }

      const response =
        await fetch(
          tileUrl,
          {
            signal:
              abortController.signal,
          },
        );

      if (!response.ok) {
        throw new Error(
          `Copernicus WMTS ${response.status}: ${response.statusText}`,
        );
      }

      const data =
        await response.arrayBuffer();

      return {
        data,
      };
    },
  );

  copernicusProtocolRegistered =
    true;
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function changeGeoJSON(
  changes: ChangeFeature[],
): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",

    features:
      changes.map(
        (c) => ({
          type: "Feature",

          properties: {
            confidence:
              c.confidence,
          },

          geometry:
            c.geometry,
        }),
      ),
  };
}

function resolveImageryForTiles(
  imagery: Imagery,
): Exclude<
  Imagery,
  "difference"
> {
  if (
    imagery ===
    "difference"
  ) {
    return "true-color";
  }

  return imagery;
}

function osmSource():
  StyleSpecification["sources"][string] {
  return {
    type: "raster",

    tiles: [
      "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    ],

    tileSize: 256,

    attribution:
      OSM_ATTRIBUTION,
  };
}

/* -------------------------------------------------------------------------- */
/* Copernicus source                                                          */
/* -------------------------------------------------------------------------- */

function copernicusSource(
  imagery: Exclude<
    Imagery,
    "difference"
  >,
  date: string,
  maxzoom: number,
): StyleSpecification["sources"][string] {
  const tileTemplate =
    `${COPERNICUS_PROTOCOL}://` +
`${encodeURIComponent(
    imagery,
)}/` +
`${encodeURIComponent(
    date,
)}/{z}/{x}/{y}`;

return {
    type: "raster",

    tiles: [
        tileTemplate,
    ],

    tileSize: 512,

    maxzoom,

    attribution:
    COPERNICUS_ATTRIBUTION,
};
}

function getMaxMapLibreZoom(
    matrixSet: WmtsTileMatrixSet,
    fallback: number,
): number {
    let maxZoom =
        fallback;

    for (
        const matrix of
        matrixSet.matrices
        ) {
        if (
            matrix.tileWidth !==
            512 ||
            matrix.tileHeight !==
            512
        ) {
            continue;
        }

        const zoom =
            Math.log2(
                matrix.matrixWidth,
            );

        if (
            Number.isInteger(
                zoom,
            ) &&
            zoom > maxZoom
        ) {
            maxZoom = zoom;
        }
    }

    return maxZoom;
}

/* -------------------------------------------------------------------------- */
/* Style                                                                      */
/* -------------------------------------------------------------------------- */

function buildStyle(
    imagery: Imagery,
    resolvedDate:
        | string
        | null
        | undefined,
    changes: ChangeFeature[],
): {
    style: StyleSpecification;
    usingSatellite: boolean;
} {
    const matrixSet =
        getCopernicusWmtsMatrixSet();

    const tileImagery =
        resolveImageryForTiles(
            imagery,
        );

    const layerInfo =
        gibsLayerInfo(
            tileImagery,
        );

    const satelliteMaxZoom =
        matrixSet
            ? getMaxMapLibreZoom(
                matrixSet,
                layerInfo
                    ?.maxNativeZoom ??
                18,
            )
            : 18;

    const sources:
        StyleSpecification["sources"] =
        {
            changes: {
                type: "geojson",

                data:
                    changeGeoJSON(
                        changes,
                    ),
            },
        };

    const layers:
        StyleSpecification["layers"] =
        [];

    if (
        resolvedDate &&
        layerInfo
    ) {
        sources.satellite =
            copernicusSource(
                tileImagery,
                resolvedDate,
                satelliteMaxZoom,
            );

        layers.push({
            id: "satellite",

            type: "raster",

            source:
                "satellite",

            paint: {
                "raster-opacity":
                    1,
            },
        });
    } else {
        sources.osm =
            osmSource();

        layers.push({
            id: "osm",

            type: "raster",

            source: "osm",
        });
    }

    layers.push({
        id: "changes",

        type: "fill",

        source: "changes",

        paint: {
            "fill-opacity":
                0.42,

            "fill-outline-color":
                "#ffffff",
        },
    });

    return {
        style: {
            version: 8,

            sources,

            layers,
        },

        usingSatellite:
            Boolean(
                resolvedDate &&
                layerInfo,
            ),
    };
}

/* -------------------------------------------------------------------------- */
/* Safe map removal                                                           */
/* -------------------------------------------------------------------------- */

function safeRemove(
    map:
        | Map
        | null
        | undefined,
) {
    if (!map) {
        return;
    }

    try {
        map.remove();
    } catch {
        // Map già rimossa.
    }
}

/* -------------------------------------------------------------------------- */
/* OSM fallback                                                               */
/* -------------------------------------------------------------------------- */

function switchMapToOsm(
    map: Map,
) {
    try {
        if (
            map.getLayer(
                "satellite",
            )
        ) {
            map.removeLayer(
                "satellite",
            );
        }

        if (
            map.getSource(
                "satellite",
            )
        ) {
            map.removeSource(
                "satellite",
            );
        }

        if (
            !map.getSource("osm")
        ) {
            map.addSource(
                "osm",
                osmSource() as maplibregl.RasterSourceSpecification,
            );
        }

        if (
            !map.getLayer("osm")
        ) {
            const beforeId =
                map.getLayer(
                    "changes",
                )
                    ? "changes"
                    : undefined;

            map.addLayer(
                {
                    id: "osm",

                    type: "raster",

                    source: "osm",
                },

                beforeId,
            );
        }
    } catch {
        // Style già rimossa.
    }
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function DualMap({
                                    beforeLabel,
                                    afterLabel,
                                    beforeDate,
                                    afterDate,
                                    imagery,
                                    changes = [],
                                    initialCenter = GAZA_CENTER,
                                    initialZoom = 11,
                                    viewKey = "default",
                                }: Props) {
    const left =
        useRef<HTMLDivElement>(
            null,
        );

    const right =
        useRef<HTMLDivElement>(
            null,
        );

    const leftMap =
        useRef<Map | null>(
            null,
        );

    const rightMap =
        useRef<Map | null>(
            null,
        );

    /* ------------------------------------------------------------------------ */
    /* Persisted map view                                                       */
    /* ------------------------------------------------------------------------ */

    const viewState =
        useRef<{
            center: [
                number,
                number,
            ];

            zoom: number;

            bearing: number;

            pitch: number;
        } | null>(null);

    /*
     * L'ultimo viewKey effettivamente applicato.
     *
     * Serve per distinguere:
     *
     * - cambio evento → nuova posizione;
     * - cambio imagery/data → mantieni posizione.
     */
    const appliedViewKey =
        useRef<
            string | null
        >(null);

    const [
        resolvedBefore,
        setResolvedBefore,
    ] = useState<
        string | null
    >(null);

    const [
        resolvedAfter,
        setResolvedAfter,
    ] = useState<
        string | null
    >(null);

    const [
        leftFellBack,
        setLeftFellBack,
    ] = useState(false);

    const [
        rightFellBack,
        setRightFellBack,
    ] = useState(false);

    const [
        resolving,
        setResolving,
    ] = useState(false);

    /* ------------------------------------------------------------------------ */
    /* Initialize protocol                                                      */
    /* ------------------------------------------------------------------------ */

    useEffect(() => {
        registerCopernicusProtocol();
    }, []);

    /* ------------------------------------------------------------------------ */
    /* Resolve dates                                                            */
    /* ------------------------------------------------------------------------ */

    useEffect(() => {
        let cancelled =
            false;

        const tileImagery =
            resolveImageryForTiles(
                imagery,
            );

        const layerInfo =
            gibsLayerInfo(
                tileImagery,
            );

        setLeftFellBack(
            false,
        );

        setRightFellBack(
            false,
        );

        if (
            !layerInfo ||
            (!beforeDate &&
                !afterDate)
        ) {
            setResolvedBefore(
                null,
            );

            setResolvedAfter(
                null,
            );

            setResolving(
                false,
            );

            return;
        }

        setResolving(
            true,
        );

        (async () => {
            try {
                await initCopernicusWmts();

                if (cancelled) {
                    return;
                }

                const [
                    before,
                    after,
                ] =
                    await Promise.all([
                        beforeDate
                            ? resolveGibsDate(
                                tileImagery,
                                beforeDate,
                            )
                            : Promise.resolve(
                                null,
                            ),

                        afterDate
                            ? resolveGibsDate(
                                tileImagery,
                                afterDate,
                            )
                            : Promise.resolve(
                                null,
                            ),
                    ]);

                if (cancelled) {
                    return;
                }

                setResolvedBefore(
                    before,
                );

                setResolvedAfter(
                    after,
                );
            } catch {
                if (cancelled) {
                    return;
                }

                setResolvedBefore(
                    beforeDate
                        ? beforeDate.slice(
                            0,
                            10,
                        )
                        : null,
                );

                setResolvedAfter(
                    afterDate
                        ? afterDate.slice(
                            0,
                            10,
                        )
                        : null,
                );
            } finally {
                if (!cancelled) {
                    setResolving(
                        false,
                    );
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [
        imagery,
        beforeDate,
        afterDate,
    ]);

    /* ------------------------------------------------------------------------ */
    /* Create maps                                                              */
    /* ------------------------------------------------------------------------ */

    useEffect(() => {
        if (
            !left.current ||
            !right.current
        ) {
            return;
        }

        const tileImagery =
            resolveImageryForTiles(
                imagery,
            );

        const layerInfo =
            gibsLayerInfo(
                tileImagery,
            );

        const satelliteReady =
            Boolean(
                layerInfo &&
                resolvedBefore &&
                resolvedAfter,
            );

        if (
            layerInfo &&
            beforeDate &&
            afterDate &&
            !resolving &&
            !satelliteReady
        ) {
            return;
        }

        const leftResult =
            buildStyle(
                imagery,
                resolvedBefore,
                changes,
            );

        const rightResult =
            buildStyle(
                imagery,
                resolvedAfter,
                changes,
            );

        /*
         * --------------------------------------------------------------
         * VIEW LOGIC
         * --------------------------------------------------------------
         *
         * Se viewKey è cambiato:
         *
         *   → nuovo evento
         *   → usa initialCenter / initialZoom
         *
         * Se viewKey è uguale:
         *
         *   → imagery/date/change update
         *   → conserva viewState
         */
        const eventChanged =
            appliedViewKey.current !==
            viewKey;

        const previousView =
            viewState.current;

        const center =
            eventChanged
                ? initialCenter
                : previousView?.center ??
                initialCenter;

        const zoom =
            eventChanged
                ? initialZoom
                : previousView?.zoom ??
                initialZoom;

        const bearing =
            eventChanged
                ? 0
                : previousView?.bearing ??
                0;

        const pitch =
            eventChanged
                ? 0
                : previousView?.pitch ??
                0;

        const a =
            new maplibregl.Map({
                container:
                left.current,

                style:
                leftResult.style,

                center,

                zoom,

                bearing,

                pitch,

                minZoom: 3,

                maxZoom: 18,
            });

        const b =
            new maplibregl.Map({
                container:
                right.current,

                style:
                rightResult.style,

                center,

                zoom,

                bearing,

                pitch,

                minZoom: 3,

                maxZoom: 18,
            });

        leftMap.current =
            a;

        rightMap.current =
            b;

        appliedViewKey.current =
            viewKey;

        let leftErrors = 0;
        let rightErrors = 0;

        let leftSwitched =
            false;

        let rightSwitched =
            false;

        /* ---------------------------------------------------------------------- */
        /* Error handling                                                         */
        /* ---------------------------------------------------------------------- */

        const onLeftError =
            () => {
                leftErrors += 1;

                if (
                    leftErrors >= 3 &&
                    !leftSwitched
                ) {
                    leftSwitched =
                        true;

                    switchMapToOsm(
                        a,
                    );

                    setLeftFellBack(
                        true,
                    );
                }
            };

        const onRightError =
            () => {
                rightErrors += 1;

                if (
                    rightErrors >= 3 &&
                    !rightSwitched
                ) {
                    rightSwitched =
                        true;

                    switchMapToOsm(
                        b,
                    );

                    setRightFellBack(
                        true,
                    );
                }
            };

        a.on(
            "error",
            onLeftError,
        );

        b.on(
            "error",
            onRightError,
        );

        /* ---------------------------------------------------------------------- */
        /* Synchronization                                                        */
        /* ---------------------------------------------------------------------- */

        let syncing =
            false;

        const saveViewState =
            (map: Map) => {
                try {
                    const center =
                        map.getCenter();

                    viewState.current =
                        {
                            center: [
                                center.lng,
                                center.lat,
                            ],

                            zoom:
                                map.getZoom(),

                            bearing:
                                map.getBearing(),

                            pitch:
                                map.getPitch(),
                        };
                } catch {
                    // Map non disponibile.
                }
            };

        const sync = (
            source: Map,
            target: Map,
        ) => {
            if (syncing) {
                return;
            }

            syncing = true;

            saveViewState(
                source,
            );

            try {
                target.jumpTo({
                    center:
                        source.getCenter(),

                    zoom:
                        source.getZoom(),

                    bearing:
                        source.getBearing(),

                    pitch:
                        source.getPitch(),
                });
            } catch {
                // Target già rimossa.
            }

            requestAnimationFrame(
                () => {
                    syncing = false;
                },
            );
        };

        const onA =
            () => {
                saveViewState(a);

                sync(
                    a,
                    b,
                );
            };

        const onB =
            () => {
                saveViewState(b);

                sync(
                    b,
                    a,
                );
            };

        a.on(
            "move",
            onA,
        );

        b.on(
            "move",
            onB,
        );

        /*
         * Salviamo la posizione iniziale.
         */
        saveViewState(a);

        /* ---------------------------------------------------------------------- */
        /* Cleanup                                                                */
        /* ---------------------------------------------------------------------- */

        return () => {
            /*
             * Prima di distruggere le mappe,
             * conserviamo sempre l'ultima posizione.
             */
            if (
                leftMap.current === a
            ) {
                saveViewState(a);
            }

            a.off(
                "move",
                onA,
            );

            b.off(
                "move",
                onB,
            );

            a.off(
                "error",
                onLeftError,
            );

            b.off(
                "error",
                onRightError,
            );

            leftMap.current =
                null;

            rightMap.current =
                null;

            safeRemove(a);
            safeRemove(b);
        };
    }, [
        imagery,
        resolvedBefore,
        resolvedAfter,
        changes,
        resolving,
        beforeDate,
        afterDate,
        viewKey,
        initialCenter,
        initialZoom,
    ]);

    /* ------------------------------------------------------------------------ */
    /* Captions                                                                 */
    /* ------------------------------------------------------------------------ */

    const tileImagery =
        resolveImageryForTiles(
            imagery,
        );

    const layerInfo =
        gibsLayerInfo(
            tileImagery,
        );

    let unavailableNote:
        | string
        | null = null;

    if (!layerInfo) {
        unavailableNote =
            "SAR non disponibile in questa configurazione Copernicus.";
    } else if (
        !beforeDate ||
        !afterDate
    ) {
        unavailableNote =
            'Seleziona due date sulla timeline.';
    } else if (resolving) {
        unavailableNote =
            "Preparo le immagini Copernicus…";
    } else if (
        leftFellBack ||
        rightFellBack
    ) {
        unavailableNote =
            "Tile Copernicus non disponibili per questa richiesta — fallback automatico a OpenStreetMap.";
    }

    const beforeCaption =
        unavailableNote ??
        (
            resolvedBefore
                ? `${layerInfo?.label ?? ""} · Copernicus TIME ${resolvedBefore}`
                : layerInfo?.label ??
                "OpenStreetMap"
        );

    const afterCaption =
        changes.length > 0
            ? `${changes.length} change candidates`
            : unavailableNote ??
            (
                resolvedAfter
                    ? `${layerInfo?.label ?? ""} · Copernicus TIME ${resolvedAfter}`
                    : layerInfo?.label ??
                    "OpenStreetMap"
            );

    /* ------------------------------------------------------------------------ */
    /* Render                                                                   */
    /* ------------------------------------------------------------------------ */

    return (
        <section
            className="map-grid"
            aria-label={`Synchronized before and after maps, ${imagery}`}
        >

            <div className="map-panel">

                <div className="map-label">

                    <strong>
                        Before
                    </strong>

                    <span>
            {beforeLabel}
          </span>

                    <small>
                        {beforeCaption}
                    </small>

                </div>

                <div
                    ref={left}
                    className="map"
                />

            </div>

            <div className="map-panel">

                <div className="map-label">

                    <strong>
                        After
                    </strong>

                    <span>
            {afterLabel}
          </span>

                    <small>
                        {afterCaption}
                    </small>

                </div>

                <div
                    ref={right}
                    className="map"
                />

            </div>

        </section>
    );
}
