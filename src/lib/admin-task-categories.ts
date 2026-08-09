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

/** Altbestände ohne bekannte Kategorie werden neutral dargestellt. */
export function categoryHue(tag: string | null | undefined): TaskAccent {
  return TASK_CATEGORIES.find((c) => c.label === tag)?.hue ?? "soft";
}
