export type EventCategory =
  | "conflict"
  | "infrastructure"
  | "urban"
  | "environment"
  | "other";

export type AtlasEvent = {
  id: string;
  title: string;
  date: string;
  categories: EventCategory[];
  sources: string[];
  notes?: string;
  bbox: [number, number, number, number];

  /**
   * Vista iniziale della mappa per questo evento.
   *
   * lat/lon indicano il punto di maggiore interesse
   * cartografico per l'evento.
   *
   * zoom indica il livello di dettaglio desiderato.
   */
  lat?: number;
  lon?: number;
  zoom?: number;
};
