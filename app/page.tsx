"use client";

import { useMemo, useState } from "react";

import DualMap, {
  type Imagery,
} from "../components/DualMap";

import events from "../data/events/events.json";

import type { AtlasEvent } from "../src/domain/events";

import {
  chooseDemoPair,
} from "../src/demo/satellite";

import {
  demoChanges,
} from "../src/demo/changeDetection";

import {
  demoOSMFeatures,
} from "../src/demo/osm";

import type {
  AcquisitionPair,
} from "../src/domain/acquisition";

import type {
  ChangeFeature,
} from "../src/domain/change";

/* -------------------------------------------------------------------------- */
/* Data                                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Gli eventi nel JSON contengono anche lat/lon/zoom.
 *
 * Non è necessario modificare subito AtlasEvent:
 * estendiamo il tipo localmente per la UI.
 */
type AtlasEventWithView =
    AtlasEvent & {
  lat?: number;
  lon?: number;
  zoom?: number;
};

const atlasEvents =
    events as unknown as AtlasEventWithView[];

const imageryLabels: Record<
    Imagery,
    string
> = {
  "true-color":
      "True color",

  infrared:
      "False color / infrared",

  vegetation:
      "Vegetation index",

  sar:
      "SAR / radar (no free source)",

  difference:
      "Difference",
};

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Restituisce una data ISO YYYY-MM-DD
 * a partire da una data qualsiasi.
 */
function normalizeDate(
    value: string,
): string {
  return value.slice(0, 10);
}

/**
 * Costruisce una data ISO spostata di N giorni.
 */
function offsetDate(
    dateISO: string,
    days: number,
): string {
  const date = new Date(
      `${normalizeDate(dateISO)}T00:00:00Z`,
  );

  date.setUTCDate(
      date.getUTCDate() + days,
  );

  return date
      .toISOString()
      .slice(0, 10);
}

/**
 * Costruisce la coppia before/after
 * a partire dalla data dell'evento.
 */
function buildEventDatePair(
    event:
        | AtlasEventWithView
        | undefined,
): {
  before: string | null;
  after: string | null;
} {
  if (!event?.date) {
    return {
      before: null,
      after: null,
    };
  }

  const eventDate =
      normalizeDate(event.date);

  return {
    before:
        offsetDate(
            eventDate,
            -4,
        ),

    after:
        offsetDate(
            eventDate,
            4,
        ),
  };
}

/**
 * Restituisce la posizione iniziale
 * associata all'evento.
 *
 * L'ordine è:
 *
 * 1. lat/lon/zoom dell'evento
 * 2. fallback gestito da DualMap
 */
function getEventView(
    event:
        | AtlasEventWithView
        | undefined,
): {
  center?: [number, number];
  zoom?: number;
} {
  if (
      !event ||
      typeof event.lat !== "number" ||
      typeof event.lon !== "number"
  ) {
    return {
      center: undefined,
      zoom:
          typeof event?.zoom === "number"
              ? event.zoom
              : undefined,
    };
  }

  return {
    center: [
      event.lon,
      event.lat,
    ],

    zoom:
        typeof event.zoom === "number"
            ? event.zoom
            : undefined,
  };
}

/* -------------------------------------------------------------------------- */
/* Component                                                                   */
/* -------------------------------------------------------------------------- */

export default function Home() {
  const [
    eventId,
    setEventId,
  ] = useState(
      atlasEvents[0]?.id ?? "",
  );

  const [
    imagery,
    setImagery,
  ] = useState<Imagery>(
      "true-color",
  );

  const [
    policy,
    setPolicy,
  ] = useState<
      "automatic" | "manual"
  >("automatic");

  const [
    detecting,
    setDetecting,
  ] = useState(false);

  const [
    changes,
    setChanges,
  ] = useState<
      ChangeFeature[]
  >([]);

  const [
    pair,
    setPair,
  ] = useState<
      AcquisitionPair | null
  >(null);

  /* ------------------------------------------------------------------------ */
  /* Selected event                                                            */
  /* ------------------------------------------------------------------------ */

  const selected =
      useMemo(
          () =>
              atlasEvents.find(
                  (event) =>
                      event.id === eventId,
              ),
          [eventId],
      );

  /* ------------------------------------------------------------------------ */
  /* Event map view                                                            */
  /* ------------------------------------------------------------------------ */

  const eventView =
      useMemo(
          () =>
              getEventView(
                  selected,
              ),
          [selected],
      );

  /* ------------------------------------------------------------------------ */
  /* Automatic map dates                                                       */
  /* ------------------------------------------------------------------------ */

  const eventDatePair =
      useMemo(
          () =>
              buildEventDatePair(
                  selected,
              ),
          [selected],
      );

  /**
   * Se esiste una AcquisitionPair reale/demo,
   * la preferiamo.
   *
   * Altrimenti utilizziamo la coppia
   * derivata dalla data dell'evento.
   */
  const mapBeforeDate =
      pair?.before?.datetime ??
      eventDatePair.before ??
      undefined;

  const mapAfterDate =
      pair?.after?.datetime ??
      eventDatePair.after ??
      undefined;

  /* ------------------------------------------------------------------------ */
  /* Labels                                                                    */
  /* ------------------------------------------------------------------------ */

  const mapBeforeLabel =
      pair?.before
          ? new Date(
              pair.before.datetime,
          ).toLocaleString()
          : eventDatePair.before
              ? `${eventDatePair.before} · automatic`
              : "Acquisition pending";

  const mapAfterLabel =
      pair?.after
          ? new Date(
              pair.after.datetime,
          ).toLocaleString()
          : eventDatePair.after
              ? `${eventDatePair.after} · automatic`
              : "Acquisition pending";

  /* ------------------------------------------------------------------------ */
  /* Detect changes                                                            */
  /* ------------------------------------------------------------------------ */

  const runDetection = () => {
    if (!selected) {
      return;
    }

    setDetecting(true);

    const nextPair =
        chooseDemoPair(
            selected,
        );

    window.setTimeout(
        () => {
          setPair({
            ...nextPair,
            policy,
          });

          setChanges(
              demoChanges(),
          );

          setDetecting(false);
        },
        650,
    );
  };

  /* ------------------------------------------------------------------------ */
  /* Reset                                                                     */
  /* ------------------------------------------------------------------------ */

  const reset = () => {
    setChanges([]);

    setPair(null);
  };

  /* ------------------------------------------------------------------------ */
  /* Event change                                                              */
  /* ------------------------------------------------------------------------ */

  const handleEventChange = (
      nextEventId: string,
  ) => {
    /**
     * Cambio evento.
     *
     * DualMap riceverà un nuovo viewKey
     * e utilizzerà lat/lon/zoom del nuovo evento.
     */
    setEventId(
        nextEventId,
    );

    /**
     * La coppia precedente non appartiene
     * più al nuovo evento.
     */
    setPair(null);

    /**
     * I change candidates precedenti
     * vengono eliminati.
     */
    setChanges([]);

    setDetecting(false);
  };

  /* ------------------------------------------------------------------------ */
  /* Export                                                                    */
  /* ------------------------------------------------------------------------ */

  const exportReport = () => {
    if (!selected) {
      return;
    }

    const report = {
      generatedAt:
          new Date().toISOString(),

      event:
      selected,

      acquisitionPair:
      pair,

      visualization:
      imagery,

      algorithm:
          changes.length
              ? "demo-threshold-v1"
              : null,

      changes,

      osmContext:
      demoOSMFeatures,

      limitations: [
        "Demo acquisitions and detections are synthetic fixtures.",
        "No causal attribution is inferred.",
        "OSM is contextual data, not historical ground truth.",
      ],
    };

    const blob =
        new Blob(
            [
              JSON.stringify(
                  report,
                  null,
                  2,
              ),
            ],
            {
              type:
                  "application/json",
            },
        );

    const url =
        URL.createObjectURL(
            blob,
        );

    const a =
        document.createElement(
            "a",
        );

    a.href = url;

    a.download =
        `${selected.id}-report.json`;

    a.click();

    URL.revokeObjectURL(
        url,
    );
  };

  /* ------------------------------------------------------------------------ */
  /* Render                                                                    */
  /* ------------------------------------------------------------------------ */

  return (
      <main className="shell">

        {/* ------------------------------------------------------------------ */}
        {/* Header                                                             */}
        {/* ------------------------------------------------------------------ */}

        <header className="topbar">

          <div>
            <p className="eyebrow">
              Open-source geospatial research interface
            </p>

            <h1>
              Gaza Change Atlas
            </h1>

            <p>
              Event-based satellite comparison
              and change exploration
            </p>
          </div>

          <div className="actions">

            <button
                className="secondary"
                onClick={reset}
            >
              Reset
            </button>

            <button
                className="primary"
                onClick={
                  runDetection
                }
                disabled={
                    detecting ||
                    !selected
                }
            >
              {detecting
                  ? "Analyzing…"
                  : "Detect changes"}
            </button>

          </div>

        </header>

        {/* ------------------------------------------------------------------ */}
        {/* Demo banner                                                        */}
        {/* ------------------------------------------------------------------ */}

        <section className="demo-banner">

          <strong>
            Research MVP / demo mode.
          </strong>{" "}

          Imagery (true color, infrared,
          vegetation) is real, free,
          no-signup NASA GIBS satellite data
          (~250 m/pixel, MODIS).

          SAR has no free source and falls
          back to OpenStreetMap.

          Change-detection polygons remain
          synthetic fixtures; no claim is made
          that these are real observed changes.

        </section>

        {/* ------------------------------------------------------------------ */}
        {/* Controls                                                           */}
        {/* ------------------------------------------------------------------ */}

        <section
            className="controls"
            aria-label="Atlas controls"
        >

          {/* Event */}

          <label>
            Event

            <select
                value={eventId}
                onChange={(e) =>
                    handleEventChange(
                        e.target.value,
                    )
                }
            >
              {atlasEvents.map(
                  (event) => (
                      <option
                          key={event.id}
                          value={event.id}
                      >
                        {event.date}
                        {" — "}
                        {event.title}
                      </option>
                  ),
              )}
            </select>
          </label>

          {/* Before / after */}

          <label>
            Before / after policy

            <select
                value={policy}
                onChange={(e) =>
                    setPolicy(
                        e.target.value as
                            | "automatic"
                            | "manual",
                    )
                }
            >
              <option value="automatic">
                Closest suitable acquisition
              </option>

              <option value="manual">
                Manual selection (UI)
              </option>
            </select>
          </label>

          {/* Imagery */}

          <label>
            Imagery

            <select
                value={imagery}
                onChange={(e) =>
                    setImagery(
                        e.target.value as Imagery,
                    )
                }
            >
              {Object.entries(
                  imageryLabels,
              ).map(
                  ([
                     value,
                     label,
                   ]) => (
                      <option
                          key={value}
                          value={value}
                      >
                        {label}
                      </option>
                  ),
              )}
            </select>
          </label>

        </section>

        {/* ------------------------------------------------------------------ */}
        {/* Event card                                                         */}
        {/* ------------------------------------------------------------------ */}

        {selected && (
            <section
                className="event-card"
                aria-live="polite"
            >

              <div>

            <span className="status">
              Reference event
            </span>

                <h2>
                  {selected.title}
                </h2>

                <p>
                  {selected.notes}
                </p>

              </div>

              <dl>

                <div>
                  <dt>Date</dt>

                  <dd>
                    {selected.date}
                  </dd>
                </div>

                <div>
                  <dt>Categories</dt>

                  <dd>
                    {selected.categories.join(
                        ", ",
                    )}
                  </dd>
                </div>

                <div>
                  <dt>Sources</dt>

                  <dd>
                    {
                      selected.sources.length
                    }{" "}
                    {selected.sources.length ===
                    1
                        ? "source"
                        : "sources"}
                  </dd>
                </div>

                {selected.lat !==
                    undefined &&
                    selected.lon !==
                    undefined && (
                        <div>
                          <dt>Map focus</dt>

                          <dd>
                            {selected.lat.toFixed(
                                4,
                            )}
                            ,{" "}
                            {selected.lon.toFixed(
                                4,
                            )}
                            {selected.zoom !==
                                undefined &&
                                ` · z${selected.zoom}`}
                          </dd>
                        </div>
                    )}

              </dl>

            </section>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* Maps                                                               */}
        {/* ------------------------------------------------------------------ */}

        <DualMap
            beforeLabel={
              mapBeforeLabel
            }

            afterLabel={
              mapAfterLabel
            }

            beforeDate={
              mapBeforeDate
            }

            afterDate={
              mapAfterDate
            }

            imagery={
              imagery
            }

            changes={
              changes
            }

            /**
             * Posizione iniziale dell'evento.
             *
             * Viene usata quando cambia viewKey/evento.
             */
            initialCenter={
              eventView.center
            }

            initialZoom={
              eventView.zoom
            }

            /**
             * Cambia solo quando cambia evento.
             *
             * Cambiare imagery NON cambia viewKey,
             * quindi la posizione corrente viene mantenuta.
             */
            viewKey={
              eventId
            }
        />

        {/* ------------------------------------------------------------------ */}
        {/* Results                                                            */}
        {/* ------------------------------------------------------------------ */}

        <section className="results">

          <div className="section-heading">

            <div>

            <span className="status">
              Analysis
            </span>

              <h2>
                Acquisition & change summary
              </h2>

            </div>

            {changes.length > 0 && (
                <button
                    className="secondary"
                    onClick={
                      exportReport
                    }
                >
                  Export reproducibility JSON
                </button>
            )}

          </div>

          <div className="cards">

            {/* Acquisition */}

            <article>

              <h3>
                Acquisition pair
              </h3>

              {pair ? (
                  <>
                    <p>
                      <b>
                        Before:
                      </b>{" "}
                      {pair.before?.id}
                      {" · "}
                      {
                        pair.before?.cloudCover
                      }
                      % cloud
                    </p>

                    <p>
                      <b>
                        After:
                      </b>{" "}
                      {pair.after?.id}
                      {" · "}
                      {
                        pair.after?.cloudCover
                      }
                      % cloud
                    </p>

                    <small>
                      {pair.rationale}
                    </small>
                  </>
              ) : (
                  <>
                    <p>
                      <b>
                        Before:
                      </b>{" "}
                      {eventDatePair.before ??
                          "—"}
                    </p>

                    <p>
                      <b>
                        After:
                      </b>{" "}
                      {eventDatePair.after ??
                          "—"}
                    </p>

                    <small>
                      Automatically derived from
                      the selected event date.
                      Run detection to select
                      a demo acquisition pair.
                    </small>
                  </>
              )}

            </article>

            {/* Changes */}

            <article>

              <h3>
                Detected candidates
              </h3>

              <p className="metric">
                {changes.length}
              </p>

              <p className="muted">
                Observation candidates,
                not causal conclusions.
              </p>

            </article>

            {/* OSM */}

            <article>

              <h3>
                OSM context
              </h3>

              <p className="metric">
                {
                  changes.filter(
                      (c) =>
                          c.osmFeatureIds
                              ?.length,
                  ).length
                }
              </p>

              <p className="muted">
                Candidates with linked
                demo OSM features.
              </p>

            </article>

          </div>

          {/* Change table */}

          {changes.length > 0 && (
              <div className="change-table">

                <div className="table-head">

              <span>
                ID
              </span>

                  <span>
                Confidence
              </span>

                  <span>
                Area
              </span>

                  <span>
                Interpretation
              </span>

                </div>

                {changes.map(
                    (change) => (
                        <div
                            className="table-row"
                            key={change.id}
                        >

                  <span>
                    {change.id}
                  </span>

                          <span
                              className={`confidence ${change.confidence}`}
                          >
                    {
                      change.confidence
                    }
                  </span>

                          <span>
                    {
                      change.areaM2?.toLocaleString()
                    }{" "}
                            m²
                  </span>

                          <span>
                    {
                      change.interpretation
                    }
                  </span>

                        </div>
                    ),
                )}

              </div>
          )}

        </section>

        {/* ------------------------------------------------------------------ */}
        {/* Methodology                                                        */}
        {/* ------------------------------------------------------------------ */}

        <section className="info">

          <h2>
            Methodology & provenance
          </h2>

          <p>
            A detected change is an observation,
            not proof of its cause. Production
            reports should store event sources,
            acquisition IDs/timestamps,
            processing mode, algorithm version,
            OSM extract timestamp, confidence
            and limitations.
          </p>

          <div className="pipeline">

          <span>
            1. Event
          </span>

            <span>
            →
          </span>

            <span>
            2. Acquisition
          </span>

            <span>
            →
          </span>

            <span>
            3. Detection
          </span>

            <span>
            →
          </span>

            <span>
            4. OSM context
          </span>

            <span>
            →
          </span>

            <span>
            5. Reproducibility report
          </span>

          </div>

        </section>

      </main>
  );
}