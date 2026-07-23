// ─────────────────────────────────────────────────────────────
// EventsMapCanvas — self-contained SVG-Karte der DACH-Region mit
// Ember-Pins pro Stadt. Kein Tile-Provider, kein Key. Farben kommen
// als Props, damit die Karte in der App (CSS-Vars) und auf der
// Landing (Inline-Tokens) identisch aussieht.
// ─────────────────────────────────────────────────────────────

import { type CityCluster } from "@/lib/events-geo";

// Grob vereinfachte, erkennbare DACH-Silhouette (D + AT + CH), als
// Prozent-Pfad im 0–100-Ausschnitt von DACH_BOUNDS. Nur Andeutung,
// keine katastergenaue Grenze — reicht für den Karten-Eindruck.
const DACH_PATH =
  "M13,8 L20,6 L27,9 L33,7 L38,11 L44,10 L47,15 L44,20 L48,24 L46,30 " +
  "L52,33 L58,31 L63,35 L67,33 L72,37 L70,43 L76,46 L74,52 L80,56 " +
  "L76,62 L82,66 L78,72 L70,74 L64,71 L58,76 L52,73 L46,78 L40,74 " +
  "L34,79 L28,75 L30,68 L24,66 L27,60 L21,57 L24,50 L18,47 L21,40 " +
  "L15,37 L18,30 L12,27 L16,20 L11,16 L13,8 Z";

type Colors = {
  surface: string;
  surfaceSoft: string;
  ink: string;
  smoke: string;
  faint: string;
  ember: string;
  emberDeep: string;
  border: string;
};

type Props = {
  clusters: CityCluster[];
  colors: Colors;
  selectedCity?: string | null;
  onSelectCity?: (city: string | null) => void;
  height?: number | string;
  interactive?: boolean;
  className?: string;
};

export function EventsMapCanvas({
  clusters,
  colors: c,
  selectedCity,
  onSelectCity,
  height = 420,
  interactive = true,
  className,
}: Props) {
  const maxCount = Math.max(1, ...clusters.map((cl) => cl.events.length));

  return (
    <div
      className={className}
      style={{
        position: "relative",
        height,
        borderRadius: 20,
        overflow: "hidden",
        background: `radial-gradient(120% 120% at 50% 0%, ${c.surface} 0%, ${c.surfaceSoft} 100%)`,
        border: `1px solid ${c.border}`,
      }}
    >
      {/* Karten-Untergrund: Silhouette + Graticule */}
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        aria-hidden
      >
        {/* Breiten-/Längengrad-Raster */}
        {[15, 30, 45, 60, 75, 90].map((v) => (
          <line key={`h${v}`} x1={0} y1={v} x2={100} y2={v} stroke={c.border} strokeWidth={0.15} />
        ))}
        {[15, 30, 45, 60, 75, 90].map((v) => (
          <line key={`v${v}`} x1={v} y1={0} x2={v} y2={100} stroke={c.border} strokeWidth={0.15} />
        ))}
        {/* Länder-Andeutung */}
        <path
          d={DACH_PATH}
          fill={c.surfaceSoft}
          stroke={c.faint}
          strokeWidth={0.5}
          strokeOpacity={0.5}
        />
        <path d={DACH_PATH} fill="none" stroke={c.ember} strokeWidth={0.3} strokeOpacity={0.25} />
      </svg>

      {/* Pins */}
      {clusters.map((cl) => {
        const active = selectedCity === cl.city;
        const size = 20 + Math.round((cl.events.length / maxCount) * 16);
        return (
          <button
            key={cl.city}
            onClick={interactive ? () => onSelectCity?.(active ? null : cl.city) : undefined}
            style={{
              position: "absolute",
              left: `${cl.x}%`,
              top: `${cl.y}%`,
              transform: "translate(-50%, -100%)",
              cursor: interactive ? "pointer" : "default",
              border: "none",
              background: "none",
              padding: 0,
              zIndex: active ? 5 : 2,
            }}
            aria-label={`${cl.city}: ${cl.events.length} Events`}
          >
            <span
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: size,
                height: size,
                borderRadius: "50% 50% 50% 0",
                transform: "rotate(-45deg)",
                background: active ? c.emberDeep : c.ember,
                boxShadow: active ? `0 8px 18px -4px ${c.ember}99` : `0 4px 10px -2px ${c.ember}66`,
                border: "2px solid #fff",
                transition: "transform .15s, background .15s",
              }}
            >
              <span
                style={{
                  transform: "rotate(45deg)",
                  color: "#fff",
                  fontSize: size * 0.42,
                  fontWeight: 800,
                  fontFamily: "inherit",
                }}
              >
                {cl.events.length}
              </span>
            </span>
            {(active || !interactive) && (
              <span
                style={{
                  position: "absolute",
                  top: -6,
                  left: "50%",
                  transform: "translate(-50%, -100%)",
                  whiteSpace: "nowrap",
                  background: c.ink,
                  color: "#fff",
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "3px 8px",
                  borderRadius: 8,
                }}
              >
                {cl.city}
              </span>
            )}
          </button>
        );
      })}

      {clusters.length === 0 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: c.faint,
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          Noch keine Events auf der Karte
        </div>
      )}
    </div>
  );
}
