import { useEffect, useState } from "react";

/** Rotierende Wartehinweise, solange der Co-Pilot recherchiert. */
const HINTS = [
  "Denke nach …",
  "Sichte passende Quellen …",
  "Gleiche mit deinem Kontext ab …",
  "Sortiere die Ergebnisse …",
  "Formuliere die Antwort …",
];

export function useResearchWaitHint(active: boolean, intervalMs = 4000): string {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!active) {
      setIndex(0);
      return;
    }
    const id = setInterval(() => {
      setIndex((i) => (i + 1 < HINTS.length ? i + 1 : i));
    }, intervalMs);
    return () => clearInterval(id);
  }, [active, intervalMs]);

  return HINTS[index] ?? HINTS[0]!;
}
