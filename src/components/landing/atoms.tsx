import type { CSSProperties, ReactNode } from "react";
import { L2 as T, MF_SERVICE_BY_ID } from "./tokens";

/* ── Service-icon system ──────────────────────────────────────────────── */
export function MFServiceIcon({
  name,
  size = 18,
  color = "currentColor",
  stroke = 1.7,
}: {
  name: string;
  size?: number;
  color?: string;
  stroke?: number;
}) {
  const p: Record<string, ReactNode> = {
    people: (
      <>
        <circle cx="8" cy="9" r="3.2" />
        <circle cx="16" cy="9" r="3.2" />
        <path d="M2.5 19c.7-3 3-4.5 5.5-4.5s4.8 1.5 5.5 4.5M11.5 19c.7-3 3-4.5 5.5-4.5s4.5 1.5 5 4.5" />
      </>
    ),
    gavel: (
      <>
        <path d="m4 18 7-7M9.5 15.5 17 8M6 6l8 8M13 2l8 8M3 22h10" />
      </>
    ),
    ledger: (
      <>
        <path d="M5 3h11l3 3v15H5Z" />
        <path d="M9 8h7M9 12h7M9 16h4" />
      </>
    ),
    seal: (
      <>
        <path d="m12 2 2.4 1.7 2.9-.5.9 2.8 2.5 1.6-.5 2.9 1.7 2.4-1.7 2.4.5 2.9-2.5 1.6-.9 2.8-2.9-.5L12 22l-2.4-1.7-2.9.5-.9-2.8L3.3 16.4 3.8 13.5 2.1 11.1 3.8 8.7 3.3 5.8l2.5-1.6.9-2.8 2.9.5Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
    "arrow-up": (
      <>
        <path d="M5 21v-7a7 7 0 0 1 14 0v7M9 9l3-4 3 4" />
      </>
    ),
    compass: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m15 9-2 5-5 2 2-5 5-2Z" />
      </>
    ),
    spark2: (
      <>
        <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6 7.7 7.7M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    pulse: (
      <>
        <path d="M3 12h4l2-6 4 12 2-6h6" />
      </>
    ),
    spark: (
      <>
        <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" />
      </>
    ),
    wand: (
      <>
        <path d="M15 4 4 15l3 3L18 7Z" />
        <path d="M14 5h3v3M19 11v2M21 12h-2M18 15v2M20 17h-2" />
      </>
    ),
    sparkles: (
      <>
        <path d="M5 3v4M3 5h4M19 14v6M16 17h6M11 4l1.5 4.5L17 10l-4.5 1.5L11 16l-1.5-4.5L5 10l4.5-1.5Z" />
      </>
    ),
    layers: (
      <>
        <path d="m12 3 9 5-9 5-9-5 9-5Z" />
        <path d="m3 13 9 5 9-5M3 18l9 5 9-5" />
      </>
    ),
    target: (
      <>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="5" />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      </>
    ),
    flag: (
      <>
        <path d="M5 21V3M5 4h12l-2 4 2 4H5" />
      </>
    ),
    rocket: (
      <>
        <path d="M14 4c4 0 6 2 6 6 0 5-7 11-7 11s-7-6-7-11c0-4 2-6 6-6" />
        <circle cx="12" cy="10" r="2" />
        <path d="m9 19-2 3M15 19l2 3" />
      </>
    ),
    coins: (
      <>
        <ellipse cx="9" cy="7" rx="6" ry="3" />
        <path d="M3 7v5c0 1.7 2.7 3 6 3M3 12v5c0 1.7 2.7 3 6 3" />
        <ellipse cx="15" cy="14" rx="6" ry="3" />
        <path d="M9 14v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5" />
      </>
    ),
    play: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m10 8 6 4-6 4Z" fill="currentColor" />
      </>
    ),
    sparkle: (
      <>
        <path d="M12 3v18M3 12h18M6 6l12 12M18 6 6 18" />
      </>
    ),
    cal: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M3 10h18M8 3v4M16 3v4" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    shield: (
      <>
        <path d="m12 3 8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6Z" />
      </>
    ),
    note: (
      <>
        <path d="M5 4h11l3 3v13H5Z" />
        <path d="M16 4v3h3" />
      </>
    ),
    check2: (
      <>
        <path d="m5 12 5 5L20 7" />
      </>
    ),
    plus2: (
      <>
        <path d="M12 5v14M5 12h14" />
      </>
    ),
    arrowR: (
      <>
        <path d="M5 12h14M13 6l6 6-6 6" />
      </>
    ),
    arrowDR: (
      <>
        <path d="M7 7h10v10M7 17 17 7" />
      </>
    ),
    money: (
      <>
        <rect x="3" y="6" width="18" height="12" rx="2" />
        <circle cx="12" cy="12" r="3" />
        <path d="M6 9h.01M18 15h.01" />
      </>
    ),
    mic: (
      <>
        <rect x="9" y="3" width="6" height="12" rx="3" />
        <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: "inline-block", flexShrink: 0 }}
    >
      {p[name] || null}
    </svg>
  );
}

/* ── Logo-Mark — zwei Wege, ein Treffpunkt ────────────────────────────── */
export function IconMF({
  size = 100,
  color,
  spark,
  showSpark = true,
  block = true,
}: {
  size?: number;
  color?: string;
  spark?: string;
  showSpark?: boolean;
  block?: boolean;
}) {
  const c = color || "#15140f";
  const sp = spark || T.ember;
  const h = size;
  const w = size * 1.4;
  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 140 100"
      fill="none"
      style={block ? { display: "block", aspectRatio: "1.4 / 1" } : { aspectRatio: "1.4 / 1" }}
    >
      <path
        d="M8 14 L62 50 L8 86"
        stroke={c}
        strokeWidth="14"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M132 14 L78 50 L132 86"
        stroke={sp}
        strokeWidth="14"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {showSpark && <circle cx="70" cy="50" r="6" fill={c} />}
    </svg>
  );
}

/* ── Avatar ───────────────────────────────────────────────────────────── */
export function MFAvatar({ name = "AB", size = 44, ring = false }: { name?: string; size?: number; ring?: boolean }) {
  const palette = ["#E2511C", "#B23B0E", "#2A251F", "#6B635A", "#F0843A", "#8B5A3C", "#3D5A4A", "#5A4A2A"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const bg = palette[h % palette.length];
  const initials = name
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const cream = "#FBFAF7";
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: bg,
        color: cream,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: T.font,
        fontWeight: 600,
        fontSize: size * 0.4,
        letterSpacing: "-0.02em",
        flexShrink: 0,
        boxShadow: ring
          ? `inset 0 0 0 2px rgba(255,255,255,0.5), 0 0 0 3px ${cream}, 0 0 0 4px ${bg}`
          : "inset 0 0 0 2px rgba(255,255,255,0.25)",
      }}
    >
      {initials}
    </div>
  );
}

/* ── KI-Tag ───────────────────────────────────────────────────────────── */
export function MFAITag({ children = "AI", muted = false }: { children?: ReactNode; muted?: boolean }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 8px 2px 6px",
        borderRadius: 999,
        background: muted ? "rgba(21,20,15,0.06)" : "rgba(226,81,28,0.12)",
        color: muted ? "#6B635A" : T.emberDeep,
        border: "1px solid " + (muted ? "rgba(21,20,15,0.08)" : "rgba(226,81,28,0.22)"),
        fontFamily: T.mono,
        fontSize: 10,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        fontWeight: 600,
      }}
    >
      <MFServiceIcon name="sparkles" size={10} color={muted ? "#6B635A" : T.emberDeep} stroke={2.2} />
      {children}
    </span>
  );
}

/* ── Shell ────────────────────────────────────────────────────────────── */
export function L2Shell({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: T.canvas,
        color: T.ink,
        fontFamily: T.font,
        WebkitFontSmoothing: "antialiased",
      }}
    >
      {children}
    </div>
  );
}

/* ── Section wrapper ──────────────────────────────────────────────────── */
export function L2Section({
  tone = "canvas",
  pad = "104px 0",
  id,
  children,
  style,
}: {
  tone?: "canvas" | "surface" | "warm" | "panel" | "ink" | "indigo" | "ember";
  pad?: string;
  id?: string;
  children: ReactNode;
  style?: CSSProperties;
}) {
  const tones = {
    canvas: { bg: T.canvas, fg: T.ink },
    surface: { bg: T.surface, fg: T.ink },
    warm: { bg: T.warm, fg: T.ink },
    panel: { bg: T.panel, fg: T.ink },
    ink: { bg: T.ink, fg: "#F5F2EC" },
    indigo: { bg: T.indigo, fg: "#fff" },
    ember: { bg: T.ember, fg: "#fff" },
  };
  const c = tones[tone];
  return (
    <section id={id} style={{ background: c.bg, color: c.fg, padding: pad, position: "relative", ...style }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 40px", position: "relative", zIndex: 1 }}>
        {children}
      </div>
    </section>
  );
}

/* ── Eyebrow ──────────────────────────────────────────────────────────── */
export function L2Eyebrow({ children, color }: { children: ReactNode; color?: string }) {
  const c = color || T.ember;
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        fontFamily: T.mono,
        fontSize: 12,
        fontWeight: 500,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: c,
      }}
    >
      <span style={{ width: 18, height: 2, borderRadius: 2, background: c, opacity: 0.55 }} />
      {children}
    </div>
  );
}

/* ── Display heading ──────────────────────────────────────────────────── */
export function L2H({
  children,
  size = "clamp(38px, 4.6vw, 62px)",
  color,
  style,
}: {
  children: ReactNode;
  size?: string;
  color?: string;
  style?: CSSProperties;
}) {
  return (
    <h2
      style={{
        margin: 0,
        fontWeight: 680,
        fontSize: size,
        lineHeight: 1.02,
        letterSpacing: "-0.035em",
        color: color || T.ink,
        textWrap: "balance",
        ...style,
      }}
    >
      {children}
    </h2>
  );
}

/* ── Buttons ──────────────────────────────────────────────────────────── */
export function L2Btn({
  children,
  href = "#",
  kind = "primary",
  accent = "ember",
  size = "md",
}: {
  children: ReactNode;
  href?: string;
  kind?: "primary" | "dark" | "ghost" | "ghostLight";
  accent?: "ember" | "indigo";
  size?: "md" | "lg";
}) {
  const A = accent === "indigo" ? T.indigo : T.ember;
  const AD = accent === "indigo" ? T.indigoDeep : T.emberDeep;
  const pads = { md: "14px 22px", lg: "17px 28px" };
  const styles: Record<string, CSSProperties> = {
    primary: {
      background: A,
      color: "#fff",
      boxShadow: `0 14px 30px -12px ${AD}, inset 0 1px 0 rgba(255,255,255,0.25)`,
    },
    dark: { background: T.ink, color: "#F5F2EC" },
    ghost: { background: T.surface, color: T.ink, border: `1px solid ${T.line}` },
    ghostLight: {
      background: "rgba(255,255,255,0.12)",
      color: "#fff",
      border: "1px solid rgba(255,255,255,0.22)",
    },
  };
  return (
    <a
      href={href}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        padding: pads[size],
        borderRadius: 13,
        fontWeight: 620,
        fontSize: size === "lg" ? 16 : 14.5,
        textDecoration: "none",
        letterSpacing: "-0.01em",
        ...styles[kind],
      }}
    >
      {children}
      <MFServiceIcon
        name="arrowR"
        size={size === "lg" ? 16 : 14}
        color={kind === "primary" ? "#fff" : kind === "dark" || kind === "ghostLight" ? "#F5F2EC" : T.ink}
        stroke={2.2}
      />
    </a>
  );
}

/* ── Product frame ────────────────────────────────────────────────────── */
export function L2Frame({
  children,
  label,
  accent = "ember",
  pad = 0,
  style,
}: {
  children: ReactNode;
  label?: string;
  accent?: "ember" | "indigo";
  pad?: number;
  style?: CSSProperties;
}) {
  const A = accent === "indigo" ? T.indigo : T.ember;
  return (
    <div
      style={{
        borderRadius: 26,
        background: T.surface,
        border: `1px solid ${T.line}`,
        boxShadow: T.shadow,
        overflow: "hidden",
        ...style,
      }}
    >
      {label && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "13px 18px",
            borderBottom: `1px solid ${T.lineSoft}`,
            background: T.warm,
          }}
        >
          <span style={{ width: 9, height: 9, borderRadius: "50%", background: A }} />
          <span
            style={{
              fontFamily: T.mono,
              fontSize: 11,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: T.smoke,
            }}
          >
            {label}
          </span>
        </div>
      )}
      <div style={{ padding: pad }}>{children}</div>
    </div>
  );
}

/* ── Service pill ─────────────────────────────────────────────────────── */
export function L2ServicePill({ id }: { id: string }) {
  const s = MF_SERVICE_BY_ID[id];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 14px 8px 12px",
        borderRadius: 999,
        background: T.surface,
        border: `1px solid ${T.line}`,
        fontSize: 13.5,
        fontWeight: 560,
        color: T.ink,
      }}
    >
      <span
        style={{
          width: 22,
          height: 22,
          borderRadius: 7,
          background: s.hue,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <MFServiceIcon name={s.icon} size={12} color="#fff" stroke={2.2} />
      </span>
      {s.label}
    </span>
  );
}
