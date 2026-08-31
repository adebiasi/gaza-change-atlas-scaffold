export type EventCategory =
    | "conflict"
    | "infrastructure"
    | "urban"
    | "environment"
    | "other"
    | "reference"
    | "destruction"
    | "north-gaza"
    | "gaza-city"
    | "khan-younis"
    | "central-gaza"
    | "rafah";

export type AtlasEvent = {
  id: string;
  title: string;
  date: string;

  categories: EventCategory[];

  sources: string[];

  notes?: string;

  bbox: [
    number,
    number,
    number,
    number,
  ];

  /**
   * Punto principale dell'evento.
   *
   * Viene utilizzato dalla UI per:
   * - centrare la mappa
   * - impostare lo zoom iniziale
   * - posizionare la timeline/event marker
   */
  lat: number;
  lon: number;
  zoom: number;
};