// Kategorie und Farbe für Team-Board-Karten liegen bewusst an einer Stelle zusammen.
export type TaskAccent = "soft" | "ember" | "indigo" | "green" | "amber" | "red";

export const TASK_CATEGORIES: { label: string; hue: TaskAccent }[] = [
  { label: "Freigabe", hue: "amber" },
  { label: "Event", hue: "green" },
  { label: "Inhalt", hue: "indigo" },
  { label: "Partner", hue: "ember" },
  { label: "Community", hue: "green" },
  { label: "Daten", hue: "indigo" },
  { label: "Co-Pilot", hue: "indigo" },
  { label: "System", hue: "soft" },
];

export const TASK_ACCENTS: TaskAccent[] = ["ember", "indigo", "green", "amber", "red", "soft"];

export const ACCENT_LABELS: Record<TaskAccent, string> = {
  ember: "Orange",
  indigo: "Blau",
  green: "Grün",
  amber: "Gelb",
  red: "Rot",
  soft: "Grau",
};

export const ACCENT_DOTS: Record<TaskAccent, string> = {
  ember: "var(--a-ember)",
  indigo: "var(--a-indigo)",
  green: "var(--a-green)",
  amber: "var(--a-amber)",
  red: "var(--a-red)",
  soft: "var(--a-smoke)",
};

export function isTaskAccent(value: string | null | undefined): value is TaskAccent {
  return typeof value === "string" && (TASK_ACCENTS as string[]).includes(value);
}

/** Altbestände ohne bekannte Kategorie werden neutral dargestellt. */
export function categoryHue(tag: string | null | undefined): TaskAccent {
  return TASK_CATEGORIES.find((c) => c.label === tag)?.hue ?? "soft";
}

/**
 * Farbe einer Karte: bekannte Kategorie schlägt gespeichertes `hue`,
 * gespeichertes `hue` schlägt den neutralen Fallback.
 */
export function taskHue(task: { tag?: string | null; hue?: string | null }): TaskAccent {
  const known = TASK_CATEGORIES.find((c) => c.label === task.tag);
  if (known) return known.hue;
  if (isTaskAccent(task.hue)) return task.hue;
  return "soft";
}

