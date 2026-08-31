"use client";

import { useEffect, useRef } from "react";
import maplibregl, { Map } from "maplibre-gl";

const GAZA_CENTER: [number, number] = [34.46, 31.42];

export default function DualMap() {
  const left = useRef<HTMLDivElement>(null);
  const right = useRef<HTMLDivElement>(null);
  const leftMap = useRef<Map | null>(null);
  const rightMap = useRef<Map | null>(null);

  useEffect(() => {
    if (!left.current || !right.current) return;

    const style = {
      version: 8 as const,
      sources: {
        osm: {
          type: "raster" as const,
          tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
          tileSize: 256,
          attribution: "© OpenStreetMap contributors",
        },
      },
      layers: [{ id: "osm", type: "raster" as const, source: "osm" }],
    };

    const a = new maplibregl.Map({
      container: left.current,
      style,
      center: GAZA_CENTER,
      zoom: 11,
    });
    const b = new maplibregl.Map({
      container: right.current,
      style,
      center: GAZA_CENTER,
      zoom: 11,
    });

    leftMap.current = a;
    rightMap.current = b;

    let syncing = false;
    const sync = (source: Map, target: Map) => {
      if (syncing) return;
      syncing = true;
      target.jumpTo({
        center: source.getCenter(),
        zoom: source.getZoom(),
        bearing: source.getBearing(),
        pitch: source.getPitch(),
      });
      requestAnimationFrame(() => { syncing = false; });
    };

    a.on("move", () => sync(a, b));
    b.on("move", () => sync(b, a));

    return () => {
      a.remove();
      b.remove();
    };
  }, []);

  return (
    <section className="map-grid">
      <div className="map-panel">
        <div className="map-label">Before</div>
        <div ref={left} className="map" />
      </div>
      <div className="map-panel">
        <div className="map-label">After</div>
        <div ref={right} className="map" />
      </div>
    </section>
  );
}
