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
};
