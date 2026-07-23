// ─────────────────────────────────────────────────────────────
// Geo-Helfer für die Events-Karte. Self-contained: eine Nachschlage-
// tabelle der DACH-Städte + eine einfache equirektangulare Projektion
// in den Kartenausschnitt. Kein externer Tile-Provider, kein Key,
// keine Laufzeit-Netzwerkabhängigkeit — passt zum minimalen Look.
// ─────────────────────────────────────────────────────────────

import type { Tables } from "@/integrations/supabase/types";

export type CommunityEvent = Tables<"community_events">;

/** Kartenausschnitt: Deutschland, Österreich, Schweiz (+ Rand). */
export const DACH_BOUNDS = { minLng: 5.6, maxLng: 17.3, minLat: 45.6, maxLat: 55.2 };

/** Bekannte Städte → Koordinaten. Ergänzt bei Bedarf. */
export const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  köln: { lat: 50.938, lng: 6.96 },
  koeln: { lat: 50.938, lng: 6.96 },
  cologne: { lat: 50.938, lng: 6.96 },
  berlin: { lat: 52.52, lng: 13.405 },
  münchen: { lat: 48.137, lng: 11.575 },
  muenchen: { lat: 48.137, lng: 11.575 },
  munich: { lat: 48.137, lng: 11.575 },
  hamburg: { lat: 53.551, lng: 9.993 },
  frankfurt: { lat: 50.11, lng: 8.682 },
  stuttgart: { lat: 48.776, lng: 9.182 },
  düsseldorf: { lat: 51.228, lng: 6.773 },
  duesseldorf: { lat: 51.228, lng: 6.773 },
  leipzig: { lat: 51.34, lng: 12.375 },
  dresden: { lat: 51.05, lng: 13.737 },
  hannover: { lat: 52.376, lng: 9.732 },
  nürnberg: { lat: 49.452, lng: 11.077 },
  nuernberg: { lat: 49.452, lng: 11.077 },
  bremen: { lat: 53.079, lng: 8.802 },
  dortmund: { lat: 51.514, lng: 7.466 },
  essen: { lat: 51.456, lng: 7.012 },
  bonn: { lat: 50.737, lng: 7.098 },
  mannheim: { lat: 49.487, lng: 8.466 },
  karlsruhe: { lat: 49.007, lng: 8.404 },
  freiburg: { lat: 47.999, lng: 7.842 },
  münster: { lat: 51.96, lng: 7.626 },
  muenster: { lat: 51.96, lng: 7.626 },
  aachen: { lat: 50.776, lng: 6.084 },
  kiel: { lat: 54.323, lng: 10.135 },
  wien: { lat: 48.208, lng: 16.373 },
  vienna: { lat: 48.208, lng: 16.373 },
  graz: { lat: 47.071, lng: 15.439 },
  linz: { lat: 48.306, lng: 14.286 },
  salzburg: { lat: 47.809, lng: 13.055 },
  innsbruck: { lat: 47.269, lng: 11.404 },
  zürich: { lat: 47.377, lng: 8.542 },
  zuerich: { lat: 47.377, lng: 8.542 },
  zurich: { lat: 47.377, lng: 8.542 },
  bern: { lat: 46.948, lng: 7.447 },
  basel: { lat: 47.559, lng: 7.588 },
  genf: { lat: 46.204, lng: 6.143 },
  geneva: { lat: 46.204, lng: 6.143 },
};

/** Normalisiert einen Stadt-String für die Suche (erstes Wort, klein, ohne Land). */
function cityKey(raw: string): string {
  return raw.toLowerCase().split(/[,/(]/)[0].trim();
}

export function coordsForCity(
  city: string | null | undefined,
): { lat: number; lng: number } | null {
  if (!city) return null;
  const key = cityKey(city);
  if (CITY_COORDS[key]) return CITY_COORDS[key];
  // Teiltreffer: „Köln-Ehrenfeld" → „köln"
  for (const known of Object.keys(CITY_COORDS)) {
    if (key.startsWith(known) || known.startsWith(key)) return CITY_COORDS[known];
  }
  return null;
}

/** Projiziert lat/lng in Prozent-Koordinaten (0–100) des Kartenausschnitts. */
export function project(lat: number, lng: number): { x: number; y: number } {
  const x = ((lng - DACH_BOUNDS.minLng) / (DACH_BOUNDS.maxLng - DACH_BOUNDS.minLng)) * 100;
  const y = ((DACH_BOUNDS.maxLat - lat) / (DACH_BOUNDS.maxLat - DACH_BOUNDS.minLat)) * 100;
  return { x: Math.max(2, Math.min(98, x)), y: Math.max(3, Math.min(97, y)) };
}

export type EventKind = string;

/** Gruppiert Events nach Stadt (für die Pins auf der Karte). */
export type CityCluster = {
  city: string;
  x: number;
  y: number;
  events: CommunityEvent[];
};

export function clusterByCity(events: CommunityEvent[]): {
  clusters: CityCluster[];
  offMap: CommunityEvent[];
} {
  const byCity = new Map<
    string,
    { coords: { lat: number; lng: number }; events: CommunityEvent[] }
  >();
  const offMap: CommunityEvent[] = [];

  for (const ev of events) {
    const coords = coordsForCity(ev.city);
    if (!coords) {
      offMap.push(ev);
      continue;
    }
    const key = cityKey(ev.city ?? "");
    const entry = byCity.get(key);
    if (entry) entry.events.push(ev);
    else byCity.set(key, { coords, events: [ev] });
  }

  const clusters: CityCluster[] = [...byCity.entries()].map(([key, { coords, events: evs }]) => {
    const { x, y } = project(coords.lat, coords.lng);
    return {
      city: evs[0].city ?? key,
      x,
      y,
      events: evs.sort((a, b) => (a.starts_at ?? "").localeCompare(b.starts_at ?? "")),
    };
  });

  return { clusters, offMap };
}

/** Kurzes Datum aus starts_at oder date_label. */
export function eventDateLabel(ev: CommunityEvent): string {
  if (ev.date_label) return ev.date_label;
  if (ev.starts_at) {
    return new Date(ev.starts_at).toLocaleDateString("de-DE", {
      weekday: "short",
      day: "numeric",
      month: "long",
    });
  }
  return "Termin folgt";
}
