"use client";

import { useMemo, useState } from "react";

import DualMap, {
  type Imagery,
} from "../components/DualMap";

import Timeline from "../components/Timeline";

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
/* Data                                                                       */
/* -------------------------------------------------------------------------- */

const atlasEvents =
  events as unknown as AtlasEvent[];

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
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function normalizeDate(
  value: string,
): string {
  return value.slice(0, 10);
}

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

function buildEventDatePair(
  event: AtlasEvent | undefined,
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
 * Costruisce l'insieme delle date disponibili
 * per la timeline.
 *
 * Usiamo una data per ogni giorno compreso
 * nell'intervallo degli eventi presenti nel JSON.
 */
function buildTimelineDates(
  eventsList: AtlasEvent[],
): string[] {
  if (!eventsList.length) {
    return [];
  }

  const dates =
    eventsList
      .map((event) =>
        normalizeDate(event.date),
      )
      .filter(Boolean)
      .sort();

  if (!dates.length) {
    return [];
  }

  const start =
    new Date(
      `${dates[0]}T00:00:00Z`,
    );

  const end =
    new Date(
      `${dates[dates.length - 1]}T00:00:00Z`,
    );

  const result: string[] = [];

  const cursor =
    new Date(start);

  while (
    cursor <= end
  ) {
    result.push(
      cursor
        .toISOString()
        .slice(0, 10),
    );

    cursor.setUTCDate(
      cursor.getUTCDate() + 1,
    );
  }

  return result;
}

function clampDateToRange(
  value: string,
  min: string,
  max: string,
): string {
  if (value < min) {
    return min;
  }

  if (value > max) {
    return max;
  }

  return value;
}

/* -------------------------------------------------------------------------- */
/* Timeline data                                                              */
/* -------------------------------------------------------------------------- */

const timelineDates =
  buildTimelineDates(
    atlasEvents,
  );

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
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

  /*
   * Le date effettivamente visualizzate
   * dalle due mappe.
   *
   * Sono indipendenti dalla AcquisitionPair:
   * la timeline può modificarle direttamente.
   */
  const [
    beforeDate,
    setBeforeDate,
  ] = useState<
    string | undefined
  >(undefined);

  const [
    afterDate,
    setAfterDate,
  ] = useState<
    string | undefined
  >(undefined);

  /* ------------------------------------------------------------------------ */
  /* Selected event                                                           */
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
  /* Event automatic dates                                                    */
  /* ------------------------------------------------------------------------ */

  const eventDatePair =
    useMemo(
      () =>
        buildEventDatePair(
          selected,
        ),
      [selected],
    );

  /*
   * Quando non abbiamo ancora una data
   * esplicitamente scelta dalla timeline,
   * usiamo la coppia automatica dell'evento.
   */
  const effectiveBeforeDate =
    beforeDate ??
    pair?.before?.datetime ??
    eventDatePair.before ??
    undefined;

  const effectiveAfterDate =
    afterDate ??
    pair?.after?.datetime ??
    eventDatePair.after ??
    undefined;

  /* ------------------------------------------------------------------------ */
  /* Labels                                                                   */
  /* ------------------------------------------------------------------------ */

  const mapBeforeLabel =
    pair?.before &&
    !beforeDate
      ? new Date(
          pair.before.datetime,
        ).toLocaleString()
      : effectiveBeforeDate
        ? `${effectiveBeforeDate} · timeline`
        : "Acquisition pending";

  const mapAfterLabel =
    pair?.after &&
    !afterDate
      ? new Date(
          pair.after.datetime,
        ).toLocaleString()
      : effectiveAfterDate
        ? `${effectiveAfterDate} · timeline`
        : "Acquisition pending";

  /* ------------------------------------------------------------------------ */
  /* Event change                                                             */
  /* ------------------------------------------------------------------------ */

  const handleEventChange = (
    nextEventId: string,
  ) => {
    const nextEvent =
      atlasEvents.find(
        (event) =>
          event.id === nextEventId,
      );

    setEventId(
      nextEventId,
    );

    /*
     * La coppia precedente non appartiene
     * al nuovo evento.
     */
    setPair(null);

    setChanges([]);

    setDetecting(false);

    /*
     * Riposizioniamo le due mappe sulle date
     * automatiche del nuovo evento.
     */
    const nextPair =
      buildEventDatePair(
        nextEvent,
      );

    setBeforeDate(
      nextPair.before ??
        undefined,
    );

    setAfterDate(
      nextPair.after ??
        undefined,
    );
  };

  /* ------------------------------------------------------------------------ */
  /* Timeline changes                                                         */
  /* ------------------------------------------------------------------------ */

  const handleBeforeDateChange = (
    nextDate: string,
  ) => {
    if (!effectiveAfterDate) {
      setBeforeDate(
        nextDate,
      );

      return;
    }

    /*
     * Before non può superare After.
     */
    const safeDate =
      nextDate >
      effectiveAfterDate
        ? effectiveAfterDate
        : nextDate;

    setBeforeDate(
      safeDate,
    );

    /*
     * Una modifica manuale della timeline
     * rende la pair precedente non più
     * rappresentativa.
     */
    setPair(null);
  };

  const handleAfterDateChange = (
    nextDate: string,
  ) => {
    if (!effectiveBeforeDate) {
      setAfterDate(
        nextDate,
      );

      return;
    }

    /*
     * After non può precedere Before.
     */
    const safeDate =
      nextDate <
      effectiveBeforeDate
        ? effectiveBeforeDate
        : nextDate;

    setAfterDate(
      safeDate,
    );

    setPair(null);
  };

  /* ------------------------------------------------------------------------ */
  /* Detect changes                                                           */
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

        /*
         * Aggiorniamo anche la timeline
         * alle date della acquisition pair.
         */
        setBeforeDate(
          nextPair.before?.datetime
            ? normalizeDate(
                nextPair.before.datetime,
              )
            : effectiveBeforeDate,
        );

        setAfterDate(
          nextPair.after?.datetime
            ? normalizeDate(
                nextPair.after.datetime,
              )
            : effectiveAfterDate,
        );

        setChanges(
          demoChanges(),
        );

        setDetecting(false);
      },
      650,
    );
  };

  /* ------------------------------------------------------------------------ */
  /* Reset                                                                    */
  /* ------------------------------------------------------------------------ */

  const reset = () => {
    setChanges([]);

    setPair(null);

    const resetPair =
      buildEventDatePair(
        selected,
      );

    setBeforeDate(
      resetPair.before ??
        undefined,
    );

    setAfterDate(
      resetPair.after ??
        undefined,
    );

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

      timeline: {
        before:
          effectiveBeforeDate,

        after:
          effectiveAfterDate,
      },

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
  /* Event map view                                                           */
  /* ------------------------------------------------------------------------ */

  const initialCenter: [number, number] = [
    selected?.lon ?? 34.46,
    selected?.lat ?? 31.42,
  ];

  const initialZoom =
      selected?.zoom ?? 11;
  /*
   * Cambia SOLO quando cambia evento.
   *
   * DualMap utilizza questo valore per capire
   * che deve applicare la nuova posizione
   * dell'evento.
   *
   * Cambiando imagery o timeline il valore
   * rimane uguale e quindi la posizione
   * corrente viene mantenuta.
   */
  const viewKey =
    selected?.id ?? "default";

  /* ------------------------------------------------------------------------ */
  /* Render                                                                   */
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
              <dt>Coordinates</dt>

              <dd>
                {selected.lat.toFixed(5)}
                {" · "}
                {selected.lon.toFixed(5)}
              </dd>
            </div>

            <div>
              <dt>Zoom</dt>

              <dd>
                {selected.zoom}
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

          </dl>

        </section>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Timeline                                                           */}
      {/* ------------------------------------------------------------------ */}

      <Timeline
        dates={
          timelineDates
        }

        beforeDate={
          effectiveBeforeDate
        }

        afterDate={
          effectiveAfterDate
        }

        onBeforeChange={
          handleBeforeDateChange
        }

        onAfterChange={
          handleAfterDateChange
        }

        eventDate={
          selected?.date
        }
      />

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
          effectiveBeforeDate
        }

        afterDate={
          effectiveAfterDate
        }

        imagery={
          imagery
        }

        changes={
          changes
        }

        initialCenter={
          initialCenter
        }

        initialZoom={
          initialZoom
        }

        viewKey={
          viewKey
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
                  {effectiveBeforeDate ??
                    "—"}
                </p>

                <p>
                  <b>
                    After:
                  </b>{" "}
                  {effectiveAfterDate ??
                    "—"}
                </p>

                <small>
                  Use the timeline to
                  adjust the two
                  observation dates.
                </small>
              </>
            )}

          </article>

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
