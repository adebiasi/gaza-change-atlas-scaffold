"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type Props = {
  dates: string[];

  beforeDate?: string;

  afterDate?: string;

  eventDate?: string;

  onBeforeChange: (
    date: string,
  ) => void;

  onAfterChange: (
    date: string,
  ) => void;
};

type Handle =
  | "before"
  | "after"
  | null;

function normalizeDate(
  value: string,
): string {
  return value.slice(0, 10);
}

function formatDate(
  value?: string,
): string {
  if (!value) {
    return "—";
  }

  const date =
    new Date(
      `${normalizeDate(value)}T00:00:00Z`,
    );

  return date.toLocaleDateString(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    },
  );
}

function clampIndex(
  value: number,
  min: number,
  max: number,
): number {
  return Math.max(
    min,
    Math.min(
      max,
      value,
    ),
  );
}

export default function Timeline({
  dates,
  beforeDate,
  afterDate,
  eventDate,
  onBeforeChange,
  onAfterChange,
}: Props) {
  const trackRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  const [
    dragging,
    setDragging,
  ] = useState<Handle>(
    null,
  );

  const sortedDates =
    useMemo(
      () =>
        Array.from(
          new Set(
            dates
              .map(normalizeDate)
              .filter(Boolean),
          ),
        ).sort(),
      [dates],
    );

  const minDate =
    sortedDates[0];

  const maxDate =
    sortedDates[
      sortedDates.length - 1
    ];

  const beforeIndex =
    useMemo(() => {
      if (!sortedDates.length) {
        return 0;
      }

      if (!beforeDate) {
        return 0;
      }

      const target =
        normalizeDate(
          beforeDate,
        );

      let closest = 0;
      let distance =
        Number.POSITIVE_INFINITY;

      sortedDates.forEach(
        (date, index) => {
          const currentDistance =
            Math.abs(
              new Date(
                `${date}T00:00:00Z`,
              ).getTime() -
                new Date(
                  `${target}T00:00:00Z`,
                ).getTime(),
            );

          if (
            currentDistance <
            distance
          ) {
            distance =
              currentDistance;

            closest =
              index;
          }
        },
      );

      return closest;
    }, [
      sortedDates,
      beforeDate,
    ]);

  const afterIndex =
    useMemo(() => {
      if (!sortedDates.length) {
        return 0;
      }

      if (!afterDate) {
        return (
          sortedDates.length - 1
        );
      }

      const target =
        normalizeDate(
          afterDate,
        );

      let closest =
        sortedDates.length - 1;

      let distance =
        Number.POSITIVE_INFINITY;

      sortedDates.forEach(
        (date, index) => {
          const currentDistance =
            Math.abs(
              new Date(
                `${date}T00:00:00Z`,
              ).getTime() -
                new Date(
                  `${target}T00:00:00Z`,
                ).getTime(),
            );

          if (
            currentDistance <
            distance
          ) {
            distance =
              currentDistance;

            closest =
              index;
          }
        },
      );

      return closest;
    }, [
      sortedDates,
      afterDate,
    ]);

  /*
   * Event index.
   */
  const eventIndex =
    useMemo(() => {
      if (
        !eventDate ||
        !sortedDates.length
      ) {
        return null;
      }

      const target =
        normalizeDate(
          eventDate,
        );

      let closest = 0;
      let distance =
        Number.POSITIVE_INFINITY;

      sortedDates.forEach(
        (date, index) => {
          const currentDistance =
            Math.abs(
              new Date(
                `${date}T00:00:00Z`,
              ).getTime() -
                new Date(
                  `${target}T00:00:00Z`,
                ).getTime(),
            );

          if (
            currentDistance <
            distance
          ) {
            distance =
              currentDistance;

            closest =
              index;
          }
        },
      );

      return closest;
    }, [
      eventDate,
      sortedDates,
    ]);

  const safeBeforeIndex =
    clampIndex(
      beforeIndex,
      0,
      Math.max(
        0,
        sortedDates.length - 1,
      ),
    );

  const safeAfterIndex =
    clampIndex(
      afterIndex,
      0,
      Math.max(
        0,
        sortedDates.length - 1,
      ),
    );

  const indexToPercent =
    useCallback(
      (index: number) => {
        if (
          sortedDates.length <= 1
        ) {
          return 0;
        }

        return (
          (index /
            (sortedDates.length - 1)) *
          100
        );
      },
      [sortedDates.length],
    );

  const percentToIndex =
    useCallback(
      (
        clientX: number,
      ) => {
        const track =
          trackRef.current;

        if (!track) {
          return 0;
        }

        const rect =
          track.getBoundingClientRect();

        const ratio =
          Math.max(
            0,
            Math.min(
              1,
              (clientX -
                rect.left) /
                rect.width,
            ),
          );

        return Math.round(
          ratio *
            Math.max(
              0,
              sortedDates.length - 1,
            ),
        );
      },
      [sortedDates.length],
    );

  const updateFromPointer =
    useCallback(
      (
        clientX: number,
        handle: Handle,
      ) => {
        if (
          !handle ||
          !sortedDates.length
        ) {
          return;
        }

        let index =
          percentToIndex(
            clientX,
          );

        if (
          handle === "before"
        ) {
          index =
            Math.min(
              index,
              safeAfterIndex,
            );

          const nextDate =
            sortedDates[index];

          if (nextDate) {
            onBeforeChange(
              nextDate,
            );
          }
        }

        if (
          handle === "after"
        ) {
          index =
            Math.max(
              index,
              safeBeforeIndex,
            );

          const nextDate =
            sortedDates[index];

          if (nextDate) {
            onAfterChange(
              nextDate,
            );
          }
        }
      },
      [
        percentToIndex,
        safeAfterIndex,
        safeBeforeIndex,
        sortedDates,
        onBeforeChange,
        onAfterChange,
      ],
    );

  /* ------------------------------------------------------------------------ */
  /* Pointer handling                                                         */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    if (!dragging) {
      return;
    }

    const onPointerMove =
      (event: PointerEvent) => {
        event.preventDefault();

        updateFromPointer(
          event.clientX,
          dragging,
        );
      };

    const onPointerUp =
      () => {
        setDragging(null);
      };

    window.addEventListener(
      "pointermove",
      onPointerMove,
      {
        passive: false,
      },
    );

    window.addEventListener(
      "pointerup",
      onPointerUp,
    );

    return () => {
      window.removeEventListener(
        "pointermove",
        onPointerMove,
      );

      window.removeEventListener(
        "pointerup",
        onPointerUp,
      );
    };
  }, [
    dragging,
    updateFromPointer,
  ]);

  /* ------------------------------------------------------------------------ */
  /* Track click                                                              */
  /* ------------------------------------------------------------------------ */

  const handleTrackPointerDown =
    (
      event: React.PointerEvent<HTMLDivElement>,
    ) => {
      if (
        !sortedDates.length
      ) {
        return;
      }

      /*
       * Se si clicca sulla linea,
       * spostiamo il punto più vicino.
       */
      const index =
        percentToIndex(
          event.clientX,
        );

      const distanceBefore =
        Math.abs(
          index -
            safeBeforeIndex,
        );

      const distanceAfter =
        Math.abs(
          index -
            safeAfterIndex,
        );

      if (
        distanceBefore <=
        distanceAfter
      ) {
        const safeIndex =
          Math.min(
            index,
            safeAfterIndex,
          );

        onBeforeChange(
          sortedDates[
            safeIndex
          ],
        );
      } else {
        const safeIndex =
          Math.max(
            index,
            safeBeforeIndex,
          );

        onAfterChange(
          sortedDates[
            safeIndex
          ],
        );
      }
    };

  /* ------------------------------------------------------------------------ */
  /* Labels                                                                   */
  /* ------------------------------------------------------------------------ */

  const beforeLabel =
    beforeDate
      ? formatDate(
          beforeDate,
        )
      : "Before";

  const afterLabel =
    afterDate
      ? formatDate(
          afterDate,
        )
      : "After";

  const eventLabel =
    eventDate
      ? formatDate(
          eventDate,
        )
      : null;

  if (!sortedDates.length) {
    return null;
  }

  const beforePercent =
    indexToPercent(
      safeBeforeIndex,
    );

  const afterPercent =
    indexToPercent(
      safeAfterIndex,
    );

  const eventPercent =
    eventIndex !== null
      ? indexToPercent(
          eventIndex,
        )
      : null;

  return (
    <section
      aria-label="Satellite acquisition timeline"
      style={{
        margin:
          "24px 0 28px",
        padding:
          "20px 22px",
        border:
          "1px solid rgba(127,127,127,.22)",
        borderRadius:
          "16px",
        background:
          "rgba(127,127,127,.055)",
      }}
    >

      {/* Header */}

      <div
        style={{
          display:
            "flex",
          alignItems:
            "flex-start",
          justifyContent:
            "space-between",
          gap:
            "20px",
          marginBottom:
            "18px",
          flexWrap:
            "wrap",
        }}
      >

        <div>
          <span
            style={{
              display:
                "block",
              fontSize:
                "11px",
              fontWeight:
                700,
              letterSpacing:
                ".12em",
              textTransform:
                "uppercase",
              opacity:
                0.6,
              marginBottom:
                "5px",
            }}
          >
            Acquisition timeline
          </span>

          <h2
            style={{
              margin:
                0,
              fontSize:
                "18px",
              lineHeight:
                1.2,
            }}
          >
            Compare two moments in time
          </h2>

          <p
            style={{
              margin:
                "6px 0 0",
              fontSize:
                "13px",
              opacity:
                0.68,
            }}
          >
            Drag Before and After to change
            the date shown by each map.
          </p>
        </div>

        <div
          style={{
            display:
              "flex",
            gap:
              "8px",
            flexWrap:
              "wrap",
          }}
        >

          <div
            style={{
              padding:
                "7px 10px",
              borderRadius:
                "9px",
              background:
                "rgba(80,120,255,.12)",
              fontSize:
                "12px",
              fontWeight:
                700,
            }}
          >
            Before · {beforeLabel}
          </div>

          <div
            style={{
              padding:
                "7px 10px",
              borderRadius:
                "9px",
              background:
                "rgba(255,100,80,.12)",
              fontSize:
                "12px",
              fontWeight:
                700,
            }}
          >
            After · {afterLabel}
          </div>

        </div>

      </div>

      {/* Timeline */}

      <div
        style={{
          position:
            "relative",
          padding:
            "34px 8px 42px",
          userSelect:
            "none",
          touchAction:
            "none",
        }}
      >

        {/* Start / end labels */}

        <div
          style={{
            position:
              "absolute",
            left:
              "8px",
            top:
              "0",
            fontSize:
              "11px",
            opacity:
              0.55,
          }}
        >
          {formatDate(
            minDate,
          )}
        </div>

        <div
          style={{
            position:
              "absolute",
            right:
              "8px",
            top:
              "0",
            fontSize:
              "11px",
            opacity:
              0.55,
          }}
        >
          {formatDate(
            maxDate,
          )}
        </div>

        {/* Track */}

        <div
          ref={
            trackRef
          }
          onPointerDown={
            handleTrackPointerDown
          }
          style={{
            position:
              "relative",
            height:
              "6px",
            borderRadius:
              "999px",
            background:
              "rgba(127,127,127,.25)",
            cursor:
              "pointer",
          }}
        >

          {/* Selected interval */}

          <div
            style={{
              position:
                "absolute",
              left:
                `${Math.min(
    beforePercent,
    afterPercent,
)}%`,
              width:
                `${Math.abs(
    afterPercent -
    beforePercent,
)}%`,
              top:
                0,
              height:
                "100%",
              borderRadius:
                "999px",
              background:
                "rgba(80,120,255,.45)",
              pointerEvents:
                "none",
            }}
          />

          {/* Event marker */}

          {eventPercent !==
            null && (
            <div
              style={{
                position:
                  "absolute",
                left:
                  `${eventPercent}%`,
                top:
                  "-8px",
                width:
                  "2px",
                height:
                  "22px",
                background:
                  "currentColor",
                opacity:
                  0.35,
                transform:
                  "translateX(-1px)",
                pointerEvents:
                  "none",
              }}
            >
              <span
                style={{
                  position:
                    "absolute",
                  top:
                    "25px",
                  left:
                    "50%",
                  transform:
                    "translateX(-50%)",
                  whiteSpace:
                    "nowrap",
                  fontSize:
                    "10px",
                  fontWeight:
                    700,
                  opacity:
                    0.6,
                }}
              >
                Event
              </span>
            </div>
          )}

          {/* Before handle */}

          <button
            type="button"
            aria-label={`Move Before date, currently ${beforeLabel}`}
            onPointerDown={(
              event,
            ) => {
              event.stopPropagation();

              (
                event.currentTarget as
                  HTMLButtonElement
              ).setPointerCapture?.(
                event.pointerId,
              );

              setDragging(
                "before",
              );
            }}
            style={{
              position:
                "absolute",
              left:
                `${beforePercent}%`,
              top:
                "50%",
              width:
                "22px",
              height:
                "22px",
              transform:
                "translate(-50%, -50%)",
              border:
                "3px solid white",
              borderRadius:
                "50%",
              background:
                "#5078ff",
              boxShadow:
                "0 2px 10px rgba(0,0,0,.25)",
              cursor:
                "grab",
              padding:
                0,
              zIndex:
                4,
              touchAction:
                "none",
            }}
          />

          {/* After handle */}

          <button
            type="button"
            aria-label={`Move After date, currently ${afterLabel}`}
            onPointerDown={(
              event,
            ) => {
              event.stopPropagation();

              (
                event.currentTarget as
                  HTMLButtonElement
              ).setPointerCapture?.(
                event.pointerId,
              );

              setDragging(
                "after",
              );
            }}
            style={{
              position:
                "absolute",
              left:
                `${afterPercent}%`,
              top:
                "50%",
              width:
                "22px",
              height:
                "22px",
              transform:
                "translate(-50%, -50%)",
              border:
                "3px solid white",
              borderRadius:
                "50%",
              background:
                "#ff6854",
              boxShadow:
                "0 2px 10px rgba(0,0,0,.25)",
              cursor:
                "grab",
              padding:
                0,
              zIndex:
                5,
              touchAction:
                "none",
            }}
          />

        </div>

        {/* Current values */}

        <div
          style={{
            position:
              "relative",
            height:
              "32px",
            marginTop:
              "12px",
          }}
        >

          <div
            style={{
              position:
                "absolute",
              left:
                `${beforePercent}%`,
              transform:
                "translateX(-50%)",
              fontSize:
                "11px",
              fontWeight:
                700,
              whiteSpace:
                "nowrap",
              color:
                "#5078ff",
            }}
          >
            BEFORE
          </div>

          <div
            style={{
              position:
                "absolute",
              left:
                `${afterPercent}%`,
              transform:
                "translateX(-50%)",
              fontSize:
                "11px",
              fontWeight:
                700,
              whiteSpace:
                "nowrap",
              color:
                "#ff6854",
            }}
          >
            AFTER
          </div>

        </div>

      </div>

      {/* Footer */}

      <div
        style={{
          display:
            "flex",
          justifyContent:
            "space-between",
          gap:
            "12px",
          flexWrap:
            "wrap",
          fontSize:
            "11px",
          opacity:
            0.55,
        }}
      >

        <span>
          {sortedDates.length.toLocaleString()}
          {" "}
          timeline positions
        </span>

        <span>
          {dragging
            ? `Moving ${dragging === "before" ? "Before" : "After"}…`
            : "Click the line or drag a handle"}
        </span>

      </div>

    </section>
  );
}
