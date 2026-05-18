import { createFileRoute, Link } from "@tanstack/react-router";
import type { CSSProperties, ReactNode } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "matchfoundr — Alles, was ein Founder braucht. KI-vermittelt." },
      {
        name: "description",
        content:
          "Co-Founder, Anwälte, Steuerberater, Förderprogramme, Mentoren, frühe Hires — ein KI-Co-Pilot, der versteht, wo du gerade stehst.",
      },
      { property: "og:title", content: "matchfoundr — Founder-Plattform mit KI-Co-Pilot" },
      {
        property: "og:description",
        content: "Acht Disziplinen. Ein Co-Pilot. Berlin · München · Wien · Zürich.",
      },
    ],
  }),
  component: Landing,
});

/* ─────────────────────────────────────────────────────────────────────────
 * Brand tokens
 * ──────────────────────────────────────────────────────────────────────── */
const M = {
  ink: "#15140f",
  inkSoft: "#2A251F",
  smoke: "#6B635A",
  ember: "#E2511C",
  emberDeep: "#B23B0E",
  emberLight: "#F0843A",
  emberTint: "#FCE4D5",
  cream: "#FBFAF7",
  paper: "#F3EFE6",
  fontSans: '"Geist", -apple-system, system-ui, sans-serif',
  fontMono: '"Geist Mono", ui-monospace, monospace',
  fontSerif: '"Instrument Serif", Georgia, serif',
};

const GLASS = {
  pane: {
    background: "rgba(251,250,247,0.62)",
    backdropFilter: "blur(28px) saturate(140%)",
    WebkitBackdropFilter: "blur(28px) saturate(140%)",
    border: "1px solid rgba(255,255,255,0.7)",
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.85), inset 0 0 0 1px rgba(255,255,255,0.18), 0 30px 60px -24px rgba(21,20,15,0.18), 0 2px 6px rgba(21,20,15,0.04)",
    borderRadius: 24,
  } as CSSProperties,
  paneSoft: {
    background: "rgba(251,250,247,0.45)",
    backdropFilter: "blur(18px) saturate(130%)",
    WebkitBackdropFilter: "blur(18px) saturate(130%)",
    border: "1px solid rgba(255,255,255,0.55)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.7), 0 8px 24px -10px rgba(21,20,15,0.10)",
    borderRadius: 18,
  } as CSSProperties,
  pill: {
    background: "rgba(251,250,247,0.55)",
    backdropFilter: "blur(16px) saturate(140%)",
    WebkitBackdropFilter: "blur(16px) saturate(140%)",
    border: "1px solid rgba(255,255,255,0.65)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8), 0 6px 18px -8px rgba(21,20,15,0.12)",
    borderRadius: 999,
  } as CSSProperties,
  paneInk: {
    background: "rgba(21,20,15,0.55)",
    backdropFilter: "blur(24px) saturate(140%)",
    WebkitBackdropFilter: "blur(24px) saturate(140%)",
    border: "1px solid rgba(255,255,255,0.08)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08), 0 20px 50px -20px rgba(0,0,0,0.4)",
    borderRadius: 20,
    color: M.cream,
  } as CSSProperties,
};

/* ─────────────────────────────────────────────────────────────────────────
 * Brand mark
 * ──────────────────────────────────────────────────────────────────────── */
function IconMF({
  size = 22,
  color = M.ink,
  spark = M.ember,
}: { size?: number; color?: string; spark?: string }) {
  const h = size;
  const w = size * 1.4;
  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 140 100"
      fill="none"
      style={{ display: "block", aspectRatio: "1.4 / 1" }}
    >
      <path d="M8 14 L62 50 L8 86" stroke={color} strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M132 14 L78 50 L132 86" stroke={spark} strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="70" cy="50" r="6" fill={color} />
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
 * Icons
 * ──────────────────────────────────────────────────────────────────────── */
type IconName =
  | "people" | "gavel" | "ledger" | "seal" | "arrow-up" | "compass" | "spark2" | "pulse"
  | "shield" | "layers" | "arrowR" | "check2" | "plus2" | "clock" | "mic" | "play" | "send" | "sparkles";

function SvcIcon({
  name,
  size = 18,
  color = "currentColor",
  stroke = 1.7,
}: { name: IconName; size?: number; color?: string; stroke?: number }) {
  const paths: Record<IconName, ReactNode> = {
    people: (
      <>
        <circle cx="8" cy="9" r="3.2" />
        <circle cx="16" cy="9" r="3.2" />
        <path d="M2.5 19c.7-3 3-4.5 5.5-4.5s4.8 1.5 5.5 4.5M11.5 19c.7-3 3-4.5 5.5-4.5s4.5 1.5 5 4.5" />
      </>
    ),
    gavel: <path d="m4 18 7-7M9.5 15.5 17 8M6 6l8 8M13 2l8 8M3 22h10" />,
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
    "arrow-up": <path d="M5 21v-7a7 7 0 0 1 14 0v7M9 9l3-4 3 4" />,
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
    pulse: <path d="M3 12h4l2-6 4 12 2-6h6" />,
    shield: <path d="m12 3 8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6Z" />,
    layers: (
      <>
        <path d="m12 3 9 5-9 5-9-5 9-5Z" />
        <path d="m3 13 9 5 9-5M3 18l9 5 9-5" />
      </>
    ),
    arrowR: <path d="M5 12h14M13 6l6 6-6 6" />,
    check2: <path d="m5 12 5 5L20 7" />,
    plus2: <path d="M12 5v14M5 12h14" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    mic: (
      <>
        <rect x="9" y="3" width="6" height="12" rx="3" />
        <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
      </>
    ),
    play: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m10 8 6 4-6 4Z" fill="currentColor" />
      </>
    ),
    send: <path d="m4 12 16-8-4 18-4-7-8-3Z" />,
    sparkles: (
      <path d="M5 3v4M3 5h4M19 14v6M16 17h6M11 4l1.5 4.5L17 10l-4.5 1.5L11 16l-1.5-4.5L5 10l4.5-1.5Z" />
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
      {paths[name]}
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
 * Services taxonomy
 * ──────────────────────────────────────────────────────────────────────── */
type Service = {
  id: string;
  label: string;
  short: string;
  blurb: string;
  count: number;
  hue: string;
  icon: IconName;
};
const SERVICES: Service[] = [
  { id: "cofounder", label: "Co-Founder", short: "Co-Founder", blurb: "Der Mensch, mit dem du baust.", count: 412, hue: "#E2511C", icon: "people" },
  { id: "legal", label: "Recht & Verträge", short: "Recht", blurb: "Anwälte für Gründung, IP, ESOP, Cap Table.", count: 86, hue: "#3D5A4A", icon: "gavel" },
  { id: "tax", label: "Steuer & Buchhaltung", short: "Steuer", blurb: "Steuerberater, die Startups verstehen.", count: 64, hue: "#8B5A3C", icon: "ledger" },
  { id: "funding", label: "Förderprogramme", short: "Förderung", blurb: "EXIST, ProFIT, INVEST. Live-Matching.", count: 31, hue: "#B23B0E", icon: "seal" },
  { id: "capital", label: "Kapital & Investoren", short: "Kapital", blurb: "Pre-Seed, Angels, Family Offices.", count: 214, hue: "#2A251F", icon: "arrow-up" },
  { id: "mentor", label: "Mentoren & Advisor", short: "Mentor", blurb: "Operator, die das schon gebaut haben.", count: 178, hue: "#F0843A", icon: "compass" },
  { id: "talent", label: "Talent & Hires", short: "Talent", blurb: "Erste fünf Hires. Vorgefiltert.", count: 540, hue: "#5A4A2A", icon: "spark2" },
  { id: "growth", label: "Growth & GTM", short: "Growth", blurb: "GTM-Operator, PR, Performance, SEO.", count: 122, hue: "#6B635A", icon: "pulse" },
];
const SVC_BY_ID = Object.fromEntries(SERVICES.map((s) => [s.id, s])) as Record<string, Service>;

/* ─────────────────────────────────────────────────────────────────────────
 * Atoms
 * ──────────────────────────────────────────────────────────────────────── */
function AITag({ children = "AI" }: { children?: ReactNode }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 8px 2px 6px",
        borderRadius: 999,
        background: "rgba(226,81,28,0.12)",
        color: M.emberDeep,
        border: "1px solid rgba(226,81,28,0.22)",
        fontFamily: M.fontMono,
        fontSize: 10,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        fontWeight: 600,
      }}
    >
      <SvcIcon name="sparkles" size={10} color={M.emberDeep} stroke={2.2} />
      {children}
    </span>
  );
}

function Avatar({ name, size = 44, ring = false }: { name: string; size?: number; ring?: boolean }) {
  const palette = ["#E2511C", "#B23B0E", "#2A251F", "#6B635A", "#F0843A", "#8B5A3C", "#3D5A4A", "#5A4A2A"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const bg = palette[h % palette.length];
  const initials = name.split(/\s+/).map((s) => s[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: bg,
        color: M.cream,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: M.fontSans,
        fontWeight: 600,
        fontSize: size * 0.4,
        letterSpacing: "-0.02em",
        flexShrink: 0,
        boxShadow: ring
          ? `inset 0 0 0 2px rgba(255,255,255,0.5), 0 0 0 3px ${M.cream}, 0 0 0 4px ${bg}`
          : "inset 0 0 0 2px rgba(255,255,255,0.25)",
      }}
    >
      {initials}
    </div>
  );
}

function ServiceChip({ s }: { s: Service }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px 4px 6px",
        borderRadius: 999,
        background: "rgba(255,255,255,0.55)",
        border: "1px solid rgba(21,20,15,0.08)",
        fontFamily: M.fontSans,
        fontSize: 11.5,
        fontWeight: 500,
        color: M.ink,
        letterSpacing: "-0.005em",
        backdropFilter: "blur(8px)",
      }}
    >
      <span
        style={{
          width: 18,
          height: 18,
          borderRadius: "50%",
          background: s.hue,
          color: M.cream,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.25)",
        }}
      >
        <SvcIcon name={s.icon} size={11} color={M.cream} stroke={2} />
      </span>
      {s.short}
    </span>
  );
}

function ServiceTile({ s, accented = false }: { s: Service; accented?: boolean }) {
  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        padding: 22,
        borderRadius: 20,
        background: accented
          ? `linear-gradient(155deg, ${s.hue}f2, ${s.hue}cc)`
          : "rgba(251,250,247,0.62)",
        backdropFilter: "blur(22px) saturate(140%)",
        WebkitBackdropFilter: "blur(22px) saturate(140%)",
        border: accented ? "1px solid rgba(255,230,210,0.4)" : "1px solid rgba(255,255,255,0.7)",
        boxShadow: accented
          ? `0 18px 36px -14px ${s.hue}66, inset 0 1px 0 rgba(255,255,255,0.3)`
          : "inset 0 1px 0 rgba(255,255,255,0.85), 0 14px 32px -16px rgba(21,20,15,0.18)",
        color: accented ? M.cream : M.ink,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        minHeight: 150,
      }}
    >
      <div
        style={{
          position: "absolute",
          right: -10,
          bottom: -14,
          opacity: accented ? 0.18 : 0.07,
          pointerEvents: "none",
          color: accented ? M.cream : s.hue,
        }}
      >
        <SvcIcon name={s.icon} size={130} stroke={1.4} />
      </div>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 36,
          height: 36,
          borderRadius: 10,
          background: accented ? "rgba(255,255,255,0.18)" : s.hue,
          border: accented ? "1px solid rgba(255,255,255,0.25)" : "none",
          color: M.cream,
          boxShadow: accented ? "none" : `0 6px 14px -6px ${s.hue}aa`,
        }}
      >
        <SvcIcon name={s.icon} size={19} color={M.cream} stroke={2} />
      </div>
      <div style={{ fontFamily: M.fontSans, fontWeight: 600, fontSize: 19, letterSpacing: "-0.02em", lineHeight: 1.1 }}>
        {s.label}
      </div>
      <div style={{ fontSize: 13, lineHeight: 1.45, color: accented ? "rgba(255,255,255,0.82)" : M.smoke }}>
        {s.blurb}
      </div>
      <div style={{ marginTop: "auto", display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <span
          style={{
            fontFamily: M.fontMono,
            fontSize: 10.5,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: accented ? "rgba(255,255,255,0.7)" : M.smoke,
          }}
        >
          {s.count} aktiv
        </span>
        <SvcIcon name="arrowR" size={14} color={accented ? M.cream : M.ink} stroke={2} />
      </div>
    </div>
  );
}

function Eyebrow({ children, tone = "dark" }: { children: ReactNode; tone?: "dark" | "light" }) {
  return (
    <div
      style={{
        fontFamily: M.fontMono,
        fontSize: 12,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color: tone === "light" ? "rgba(251,250,247,0.55)" : M.smoke,
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      <span
        style={{
          width: 22,
          height: 1,
          background: tone === "light" ? "rgba(251,250,247,0.4)" : M.smoke,
        }}
      />
      {children}
    </div>
  );
}

function Section({
  tone = "cream",
  pad = "120px 0",
  children,
  id,
}: {
  tone?: "cream" | "paper";
  pad?: string;
  children: ReactNode;
  id?: string;
}) {
  const bg = tone === "paper" ? M.paper : M.cream;
  return (
    <section id={id} style={{ background: bg, color: M.ink, padding: pad, position: "relative", overflow: "hidden" }}>
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "0 64px", position: "relative", zIndex: 1 }}>
        {children}
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
 * Sections
 * ──────────────────────────────────────────────────────────────────────── */
function LNav() {
  const items = [
    { t: "Marketplace", href: "#marketplace" },
    { t: "Co-Pilot", href: "#copilot", live: true },
    { t: "Förderung", href: "#foerderung" },
    { t: "Pricing", href: "#pricing" },
    { t: "Stories", href: "#stories" },
  ];
  return (
    <div className="landing-nav-shell" style={{ position: "sticky", top: 16, zIndex: 50, padding: "0 64px", marginTop: 16 }}>
      <div
        className="landing-nav-inner"
        style={{
          maxWidth: 1240,
          margin: "0 auto",
          ...GLASS.pill,
          padding: "8px 8px 8px 18px",
          display: "flex",
          alignItems: "center",
          gap: 28,
        }}
      >
        <div className="landing-brand" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <IconMF size={22} />
          <span style={{ fontWeight: 700, fontSize: 17, letterSpacing: "-0.02em", color: M.ink }}>
            matchfoundr<span style={{ color: M.ember }}>.</span>
          </span>
          <span
            style={{
              marginLeft: 6,
              padding: "2px 7px",
              borderRadius: 6,
              background: "rgba(21,20,15,0.06)",
              border: "1px solid rgba(21,20,15,0.08)",
              fontFamily: M.fontMono,
              fontSize: 9.5,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: M.smoke,
            }}
          >
            platform · beta
          </span>
        </div>
        <nav className="landing-nav-links" style={{ display: "flex", gap: 24 }}>
          {items.map((i) => (
            <a
              key={i.t}
              href={i.href}
              style={{
                fontSize: 13.5,
                fontWeight: 500,
                color: M.ink,
                textDecoration: "none",
                letterSpacing: "-0.005em",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {i.live && (
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#3D9970" }} />
              )}
              {i.t}
            </a>
          ))}
        </nav>
        <div className="landing-nav-spacer" style={{ flex: 1 }} />
        <Link
          className="landing-nav-signin"
          to="/auth"
          style={{ fontSize: 13.5, fontWeight: 500, color: M.smoke, textDecoration: "none" }}
        >
          Sign in
        </Link>
        <Link
          className="landing-nav-cta"
          to="/co-pilot"
          style={{
            background: M.ink,
            color: M.cream,
            padding: "10px 18px",
            borderRadius: 999,
            fontWeight: 600,
            fontSize: 13.5,
            textDecoration: "none",
            boxShadow: "0 6px 16px -4px rgba(21,20,15,0.25)",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span className="landing-nav-cta-label">Plattform starten</span>
          <span className="landing-nav-cta-short">Start</span>
          <SvcIcon name="arrowR" size={13} color={M.cream} stroke={2.2} />
        </Link>
      </div>
    </div>
  );
}

function HeroBackdrop() {
  const blobs = [
    { w: "60%", h: "80%", top: "-30%", right: "-10%", c: "rgba(226,81,28,0.42)", b: 90 },
    { w: "50%", h: "60%", bottom: "-20%", left: "-10%", c: "rgba(240,132,58,0.32)", b: 110 },
    { w: "45%", h: "55%", top: "15%", left: "20%", c: "rgba(252,228,213,0.6)", b: 110 },
    { w: "24%", h: "28%", top: "5%", left: "-5%", c: "rgba(178,59,14,0.22)", b: 80 },
  ];
  return (
    <>
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        {blobs.map((b, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              width: b.w,
              height: b.h,
              top: b.top,
              right: b.right,
              bottom: b.bottom,
              left: b.left,
              background: `radial-gradient(circle at center, ${b.c}, transparent 65%)`,
              filter: `blur(${b.b}px)`,
            }}
          />
        ))}
      </div>
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.05,
          backgroundImage:
            "linear-gradient(rgba(21,20,15,1) 1px, transparent 1px), linear-gradient(90deg, rgba(21,20,15,1) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          pointerEvents: "none",
        }}
      />
    </>
  );
}

function HeroCopilot() {
  return (
    <div className="hero-copilot" style={{ ...GLASS.pane, padding: 24, display: "flex", flexDirection: "column", gap: 14, position: "relative" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              width: 32,
              height: 32,
              borderRadius: 9,
              background: M.ink,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <IconMF size={18} color={M.cream} spark={M.ember} />
          </span>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14.5, letterSpacing: "-0.01em", color: M.ink }}>Co-Pilot</div>
            <div
              style={{
                fontFamily: M.fontMono,
                fontSize: 10,
                letterSpacing: "0.1em",
                color: M.smoke,
                textTransform: "uppercase",
              }}
            >
              Live · denkt mit
            </div>
          </div>
        </div>
        <AITag>AI</AITag>
      </div>

      <div
        style={{
          padding: "14px 16px",
          borderRadius: 14,
          background: "rgba(21,20,15,0.04)",
          border: "1px solid rgba(21,20,15,0.06)",
          fontSize: 14,
          lineHeight: 1.5,
          color: M.ink,
        }}
      >
        <div
          className="landing-compare-head"
          style={{
            fontFamily: M.fontMono,
            fontSize: 10,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: M.smoke,
            marginBottom: 6,
          }}
        >
          Du · 10:14
        </div>
        „B2B-SaaS, zwei Monate Prototyp, ich bin Designer, suche technischen Co-Founder. Wir wollen Q3 ausgründen — GmbH in
        Berlin. Was brauche ich jetzt?"
      </div>

      <div style={{ ...GLASS.paneSoft, padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <IconMF size={14} color={M.ink} spark={M.ember} />
          <span
            style={{
              fontFamily: M.fontMono,
              fontSize: 10,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: M.smoke,
            }}
          >
            Co-Pilot · in 1.8s
          </span>
        </div>
        <p
          style={{
            margin: 0,
            fontFamily: M.fontSerif,
            fontStyle: "italic",
            fontSize: 17,
            lineHeight: 1.45,
            color: M.ink,
          }}
        >
          „Drei Dinge parallel: einen technischen Co-Founder, einen Anwalt für den Gründervertrag, und du solltest EXIST in
          den nächsten 6 Wochen anschauen — Q3 ist machbar, wenn ihr jetzt startet."
        </p>
        <div className="hero-copilot-recs" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          {[
            { sId: "cofounder", n: "Anna W.", l: "Backend · Berlin", fit: 94 },
            { sId: "legal", n: "Dr. Lena H.", l: "GmbH · ESOP", fit: 91 },
            { sId: "funding", n: "EXIST", l: "€125k · 12 Mo", fit: 89 },
          ].map((r) => {
            const s = SVC_BY_ID[r.sId];
            return (
              <div
                className="hero-copilot-rec"
                key={r.n}
                style={{
                  padding: 12,
                  borderRadius: 12,
                  background: "rgba(251,250,247,0.75)",
                  border: "1px solid rgba(21,20,15,0.07)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <span
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 5,
                      background: s.hue,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <SvcIcon name={s.icon} size={10} color={M.cream} stroke={2.2} />
                  </span>
                  <span
                    style={{
                      fontFamily: M.fontMono,
                      fontSize: 9,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: M.smoke,
                    }}
                  >
                    {s.short}
                  </span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: "-0.01em", color: M.ink, lineHeight: 1.2 }}>
                  {r.n}
                </div>
                <div style={{ fontSize: 11, color: M.smoke, marginTop: 2 }}>{r.l}</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginTop: 6 }}>
                  <span
                    style={{
                      fontSize: 18,
                      fontWeight: 600,
                      letterSpacing: "-0.025em",
                      color: M.ember,
                      lineHeight: 1,
                    }}
                  >
                    {r.fit}
                  </span>
                  <span style={{ fontFamily: M.fontMono, fontSize: 9, color: M.smoke }}>fit</span>
                </div>
              </div>
            );
          })}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: 2,
          }}
        >
          <span
            style={{
              fontFamily: M.fontMono,
              fontSize: 10.5,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: M.smoke,
            }}
          >
            +5 weitere Empfehlungen
          </span>
          <Link
            to="/co-pilot"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontWeight: 600,
              fontSize: 12.5,
              color: M.ink,
              textDecoration: "none",
            }}
          >
            Plan generieren <SvcIcon name="arrowR" size={12} stroke={2} />
          </Link>
        </div>
      </div>

      <div className="hero-copilot-chips" style={{ display: "flex", flexWrap: "wrap", gap: 6, paddingTop: 4 }}>
        {SERVICES.map((s) => (
          <ServiceChip key={s.id} s={s} />
        ))}
      </div>
    </div>
  );
}

function LHero() {
  return (
    <div className="landing-hero" style={{ position: "relative", background: M.paper, overflow: "hidden" }}>
      <HeroBackdrop />
      <LNav />
      <div
        className="landing-hero-grid"
        style={{
          position: "relative",
          maxWidth: 1240,
          margin: "0 auto",
          padding: "90px 64px 120px",
          display: "grid",
          gridTemplateColumns: "1.1fr 0.9fr",
          gap: 56,
          alignItems: "center",
        }}
      >
        <div className="landing-hero-copy">
          <div
            className="landing-hero-pill"
            style={{
              ...GLASS.pill,
              padding: "6px 14px 6px 8px",
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 32,
              fontSize: 12,
            }}
          >
            <span
              style={{
                background: M.ink,
                color: M.cream,
                borderRadius: 999,
                padding: "3px 9px",
                fontFamily: M.fontMono,
                fontSize: 10,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              v2 · Platform
            </span>
            <span
              style={{
                fontFamily: M.fontMono,
                fontSize: 11,
                letterSpacing: "0.06em",
                color: M.smoke,
                textTransform: "uppercase",
              }}
            >
              1.847 Partner · 8 Disziplinen · 1 Co-Pilot
            </span>
          </div>

          <h1
            className="landing-hero-title"
            style={{
              margin: 0,
              fontWeight: 600,
              fontSize: "clamp(56px, 7vw, 96px)",
              lineHeight: 0.93,
              letterSpacing: "-0.045em",
              color: M.ink,
            }}
          >
            Alles, was ein
            <br />
            <span style={{ fontFamily: M.fontSerif, fontStyle: "italic", fontWeight: 400 }}>Founder</span> braucht
            <span style={{ color: M.ember }}>.</span>
            <br />
            <span style={{ color: M.smoke }}>KI-vermittelt.</span>
          </h1>

          <p style={{ fontSize: 19, lineHeight: 1.55, color: M.smoke, marginTop: 28, maxWidth: 520 }}>
            Co-Founder, Anwälte, Steuerberater, Förderprogramme, Mentoren, frühe Hires — ein Co-Pilot, der versteht, wo du
            gerade stehst und genau die richtigen Menschen und Programme an einen Tisch holt.
          </p>

          <div className="landing-hero-actions" style={{ display: "flex", gap: 12, marginTop: 36, flexWrap: "wrap" }}>
            <Link
              className="landing-hero-primary"
              to="/co-pilot"
              style={{
                background: M.ember,
                color: M.cream,
                padding: "16px 24px",
                borderRadius: 12,
                fontWeight: 600,
                fontSize: 15.5,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                boxShadow:
                  "0 14px 32px -10px rgba(178,59,14,0.5), inset 0 1px 0 rgba(255,255,255,0.25)",
              }}
            >
              Erzähl dem Co-Pilot von dir
              <SvcIcon name="arrowR" size={15} color={M.cream} stroke={2.2} />
            </Link>
            <Link
              className="landing-hero-secondary"
              to="/marketplace"
              style={{
                ...GLASS.pill,
                borderRadius: 12,
                padding: "16px 22px",
                textDecoration: "none",
                fontWeight: 500,
                fontSize: 15.5,
                color: M.ink,
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <SvcIcon name="layers" size={16} stroke={2} color={M.ink} />
              Marketplace ansehen
            </Link>
          </div>

          <div
            className="landing-hero-stats"
            style={{
              marginTop: 56,
              paddingTop: 24,
              borderTop: "1px solid rgba(21,20,15,0.10)",
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 0,
            }}
          >
            {[
              { k: "14 Tage", s: "erstes Match — Service-übergreifend" },
              { k: "€2.4M", s: "Förderung, die Co-Pilot 2025 freigeschaltet hat" },
              { k: "78%", s: "der Founder schließen 3+ Services ab" },
              { k: "4 Städte", s: "Berlin · München · Wien · Zürich" },
            ].map((s, i) => (
              <div
                key={s.k}
                style={{
                  paddingLeft: i === 0 ? 0 : 20,
                  borderLeft: i === 0 ? "none" : "1px solid rgba(21,20,15,0.10)",
                }}
              >
                <div
                  style={{
                    fontSize: 26,
                    fontWeight: 600,
                    letterSpacing: "-0.03em",
                    color: M.ink,
                    lineHeight: 1,
                  }}
                >
                  {s.k}
                </div>
                <div style={{ fontSize: 11.5, color: M.smoke, lineHeight: 1.4, marginTop: 8 }}>{s.s}</div>
              </div>
            ))}
          </div>
        </div>

        <HeroCopilot />
      </div>
      <LogoWall />
    </div>
  );
}

function LogoWall() {
  return (
    <div
      style={{
        position: "relative",
        borderTop: "1px solid rgba(21,20,15,0.08)",
        borderBottom: "1px solid rgba(21,20,15,0.08)",
        padding: "28px 64px",
        background: "rgba(251,250,247,0.55)",
        backdropFilter: "blur(12px)",
      }}
    >
      <div
        style={{
          maxWidth: 1240,
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          gap: 36,
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            fontFamily: M.fontMono,
            fontSize: 11,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: M.smoke,
          }}
        >
          Partner-Netzwerk
        </span>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 38, opacity: 0.85, flexWrap: "wrap" }}>
          <span style={{ fontFamily: M.fontSans, fontSize: 18, fontWeight: 700, letterSpacing: "-0.03em" }}>EXIST</span>
          <span style={{ fontFamily: M.fontSerif, fontStyle: "italic", fontSize: 19 }}>Bird &amp; Bird</span>
          <span style={{ fontFamily: M.fontSans, fontSize: 14, fontWeight: 700, letterSpacing: "0.32em" }}>PROFIT</span>
          <span style={{ fontFamily: M.fontMono, fontSize: 14 }}>bafa /</span>
          <span style={{ fontFamily: M.fontSans, fontSize: 17, fontWeight: 600, letterSpacing: "-0.02em" }}>KfW</span>
          <span style={{ fontFamily: M.fontSerif, fontStyle: "italic", fontSize: 18 }}>Osborne Clarke</span>
          <span style={{ fontFamily: M.fontSans, fontSize: 15, fontWeight: 600, letterSpacing: "-0.015em" }}>
            SignalIduna
          </span>
          <span style={{ fontFamily: M.fontMono, fontSize: 13, textTransform: "lowercase" }}>n26·labs</span>
        </div>
      </div>
    </div>
  );
}

function LProblem() {
  const fragments = [
    "Anwalt aus dem WG-Chat",
    "12 EXIST-PDFs offen",
    'Steuerberater verstand "Cap Table" nicht',
    "LinkedIn-Anschreiben Nr. 47",
    "Mentor-Empfehlung aus 2022",
    "Recruiter-DM ignoriert",
    "€800 / Stunde Erstberatung",
    "Notion-Doku, nirgends gespeichert",
    "Termin-Doodle, 9 Teilnehmer",
  ];
  const positions = [
    { top: 0, left: 30, rot: -3 },
    { top: 60, left: 205, rot: 4 },
    { top: 130, left: 0, rot: -6 },
    { top: 200, left: 185, rot: 2 },
    { top: 280, left: 42, rot: -2 },
    { top: 350, left: 220, rot: 5 },
    { top: 84, left: 312, rot: -4 },
    { top: 250, left: 305, rot: 3 },
    { top: 400, left: 285, rot: -2 },
  ];
  return (
    <Section tone="paper" pad="140px 0">
      <div className="landing-two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center" }}>
        <div>
          <Eyebrow>01 · Das Problem</Eyebrow>
          <h2
            style={{
              margin: "20px 0 0",
              fontWeight: 600,
              fontSize: "clamp(40px, 4.5vw, 64px)",
              lineHeight: 1,
              letterSpacing: "-0.035em",
              color: M.ink,
            }}
          >
            Der Founder-Stack
            <br />
            ist <span style={{ fontFamily: M.fontSerif, fontStyle: "italic", fontWeight: 400 }}>kaputt</span>
            <span style={{ color: M.ember }}>.</span>
          </h2>
          <p style={{ marginTop: 24, fontSize: 18, lineHeight: 1.6, color: M.smoke, maxWidth: 480 }}>
            Du brauchst sechs verschiedene Menschen, um eine GmbH durch ihr erstes Jahr zu bringen. Sie sitzen in sechs
            verschiedenen Tabs, in sechs verschiedenen Tonalitäten, mit sechs verschiedenen Preisen.
            <br />
            <br />
            Niemand sortiert das für dich. Niemand außer einem Co-Pilot, der weiß, wo du stehst.
          </p>
          <div
            style={{
              marginTop: 32,
              padding: "18px 22px",
              borderRadius: 16,
              background: "rgba(21,20,15,0.04)",
              border: "1px solid rgba(21,20,15,0.08)",
              display: "flex",
              gap: 16,
              alignItems: "center",
            }}
          >
            <SvcIcon name="clock" size={22} color={M.ember} stroke={2} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: M.ink }}>
                280 Stunden pro Jahr verlieren Founder mit Stack-Hopping.
              </div>
              <div style={{ fontSize: 12, color: M.smoke, marginTop: 2 }}>
                Quelle: matchfoundr-Onboarding, n=412 Founder, Q1 2025.
              </div>
            </div>
          </div>
        </div>

        <div className="landing-problem-cloud" style={{ position: "relative", minHeight: 480 }}>
          {fragments.map((t, i) => {
            const p = positions[i];
            return (
              <div
                key={t}
                className="landing-problem-chip"
                style={{
                  position: "absolute",
                  top: p.top,
                  left: p.left,
                  transform: `rotate(${p.rot}deg)`,
                  padding: "10px 16px",
                  borderRadius: 12,
                  background: M.cream,
                  border: "1px solid rgba(21,20,15,0.08)",
                  boxShadow: "0 12px 24px -16px rgba(21,20,15,0.25)",
                  fontSize: 13.5,
                  color: M.ink,
                  fontWeight: 500,
                  whiteSpace: "nowrap",
                }}
              >
                <span style={{ color: M.ember, marginRight: 6 }}>·</span>
                {t}
              </div>
            );
          })}
          <svg
            className="landing-problem-lines"
            viewBox="0 0 500 480"
            style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.18 }}
          >
            {[
              "M50 30 C 200 100, 100 250, 280 200",
              "M80 160 C 250 220, 100 380, 300 360",
              "M280 80 C 350 150, 200 280, 420 280",
              "M50 320 C 200 400, 350 350, 440 100",
              "M150 50 C 220 200, 380 250, 400 420",
            ].map((d, i) => (
              <path key={i} d={d} stroke={M.ink} strokeWidth="1.5" fill="none" strokeDasharray="2 4" />
            ))}
          </svg>
        </div>
      </div>
    </Section>
  );
}

function StepMini({ kind }: { kind: "chat" | "plan" | "pipeline" }) {
  if (kind === "chat") {
    return (
      <div
        style={{
          marginTop: "auto",
          padding: 14,
          borderRadius: 14,
          background: M.cream,
          border: "1px solid rgba(21,20,15,0.07)",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <div
          style={{
            alignSelf: "flex-end",
            maxWidth: "85%",
            background: M.ink,
            color: M.cream,
            padding: "8px 12px",
            borderRadius: "12px 12px 4px 12px",
            fontSize: 12,
            lineHeight: 1.4,
          }}
        >
          „B2B SaaS für Friseur-Buchhaltung. Q3 GmbH."
        </div>
        <div
          style={{
            alignSelf: "flex-start",
            maxWidth: "85%",
            background: "rgba(226,81,28,0.10)",
            color: M.emberDeep,
            border: "1px solid rgba(226,81,28,0.22)",
            padding: "8px 12px",
            borderRadius: "12px 12px 12px 4px",
            fontSize: 12,
            lineHeight: 1.4,
            fontFamily: M.fontSerif,
            fontStyle: "italic",
          }}
        >
          „Vor Q3 brauchst du drei Dinge parallel…"
        </div>
        <div style={{ alignSelf: "flex-start", display: "inline-flex", gap: 4 }}>
          {[0, 1, 2].map((j) => (
            <span key={j} style={{ width: 5, height: 5, borderRadius: "50%", background: M.smoke, opacity: 0.6 }} />
          ))}
        </div>
      </div>
    );
  }
  if (kind === "plan") {
    return (
      <div
        style={{
          marginTop: "auto",
          padding: 14,
          borderRadius: 14,
          background: M.cream,
          border: "1px solid rgba(21,20,15,0.07)",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {[
          { sId: "cofounder", t: "Anna W. · Backend", fit: 94 },
          { sId: "legal", t: "Dr. Heller · GmbH+ESOP", fit: 91 },
          { sId: "funding", t: "EXIST · €125k", fit: 89 },
        ].map((r) => {
          const s = SVC_BY_ID[r.sId];
          return (
            <div
              key={r.t}
              style={{
                display: "grid",
                gridTemplateColumns: "20px 1fr auto",
                gap: 8,
                alignItems: "center",
                padding: "6px 8px",
                borderRadius: 8,
                background: "rgba(21,20,15,0.03)",
              }}
            >
              <span
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 5,
                  background: s.hue,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <SvcIcon name={s.icon} size={10} color={M.cream} stroke={2.2} />
              </span>
              <span
                style={{
                  fontSize: 12,
                  color: M.ink,
                  fontWeight: 500,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {r.t}
              </span>
              <span style={{ fontSize: 12, fontWeight: 600, color: M.ember }}>{r.fit}</span>
            </div>
          );
        })}
      </div>
    );
  }
  return (
    <div
      style={{
        marginTop: "auto",
        padding: 14,
        borderRadius: 14,
        background: M.cream,
        border: "1px solid rgba(21,20,15,0.07)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span
          style={{
            fontFamily: M.fontMono,
            fontSize: 9.5,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: M.smoke,
          }}
        >
          EXIST · 78%
        </span>
        <span style={{ fontFamily: M.fontMono, fontSize: 9.5, color: M.ember, fontWeight: 600 }}>12 Tage</span>
      </div>
      <div style={{ height: 5, borderRadius: 999, background: "rgba(21,20,15,0.06)", overflow: "hidden" }}>
        <div style={{ width: "78%", height: "100%", background: M.ember }} />
      </div>
      <div style={{ marginTop: 4, display: "flex", flexDirection: "column", gap: 6 }}>
        {[
          { t: "Anna · Doku verschickt", d: "erledigt", done: true },
          { t: "Vertrag review · Dr. Heller", d: "heute 13:30" },
          { t: "ProFIT · Vor-Check", d: "übermorgen" },
        ].map((r) => (
          <div key={r.t} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
            <span
              style={{
                width: 14,
                height: 14,
                borderRadius: "50%",
                border: "1.5px solid " + (r.done ? M.ember : M.smoke),
                background: r.done ? M.ember : "transparent",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {r.done && <SvcIcon name="check2" size={9} color={M.cream} stroke={3} />}
            </span>
            <span style={{ flex: 1, color: r.done ? M.smoke : M.ink, textDecoration: r.done ? "line-through" : "none" }}>
              {r.t}
            </span>
            <span style={{ fontFamily: M.fontMono, fontSize: 10, color: M.smoke }}>{r.d}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LHowItWorks() {
  const steps: { n: string; t: string; d: string; mini: "chat" | "plan" | "pipeline" }[] = [
    {
      n: "02·1",
      t: "Erzähl dem Co-Pilot, wo du stehst",
      d: "Kein Formular, kein 47-Fragen-Quiz. Ein Gespräch — fünf Minuten, in deinen Worten. Der Co-Pilot fragt nach, wo es relevant ist.",
      mini: "chat",
    },
    {
      n: "02·2",
      t: "Er ruft die richtigen Menschen und Programme zusammen",
      d: "Co-Founder, Anwalt, Steuerberater, EXIST, Mentor, erste Hires — sortiert nach Phase, nicht alphabetisch. Mit Fit-Score und Begründung.",
      mini: "plan",
    },
    {
      n: "02·3",
      t: "Du baust. Der Co-Pilot hält den Plan zusammen.",
      d: "Wer wartet auf was. Welche Frist läuft. Wer hat geantwortet. Der Plan aktualisiert sich, während du arbeitest — und schlägt vor, was als Nächstes dran ist.",
      mini: "pipeline",
    },
  ];
  return (
    <Section tone="cream" pad="140px 0">
      <div style={{ textAlign: "center", maxWidth: 760, margin: "0 auto 72px" }}>
        <Eyebrow>02 · So funktioniert es</Eyebrow>
        <h2
          style={{
            margin: "20px 0 0",
            fontWeight: 600,
            fontSize: "clamp(40px, 4.5vw, 64px)",
            lineHeight: 1,
            letterSpacing: "-0.035em",
            color: M.ink,
          }}
        >
          Drei Schritte. <span style={{ fontFamily: M.fontSerif, fontStyle: "italic", fontWeight: 400, color: M.smoke }}>
            Kein Dashboard zu pflegen.
          </span>
        </h2>
      </div>
      <div className="landing-card-grid landing-card-grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
        {steps.map((s) => (
          <div
            key={s.n}
            style={{
              padding: 28,
              borderRadius: 24,
              background: M.paper,
              border: "1px solid rgba(21,20,15,0.08)",
              display: "flex",
              flexDirection: "column",
              gap: 18,
              boxShadow: "0 20px 40px -28px rgba(21,20,15,0.18)",
            }}
          >
            <div
              style={{
                fontFamily: M.fontMono,
                fontSize: 11,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: M.ember,
              }}
            >
              {s.n}
            </div>
            <h3
              style={{
                margin: 0,
                fontWeight: 600,
                fontSize: 24,
                letterSpacing: "-0.025em",
                lineHeight: 1.15,
                color: M.ink,
              }}
            >
              {s.t}
            </h3>
            <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.55, color: M.smoke }}>{s.d}</p>
            <StepMini kind={s.mini} />
          </div>
        ))}
      </div>
    </Section>
  );
}

function LMarketplace() {
  return (
    <Section tone="paper" pad="140px 0" id="marketplace">
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 40,
          flexWrap: "wrap",
          marginBottom: 56,
        }}
      >
        <div style={{ maxWidth: 640 }}>
          <Eyebrow>03 · Marketplace · 8 Disziplinen</Eyebrow>
          <h2
            style={{
              margin: "20px 0 0",
              fontWeight: 600,
              fontSize: "clamp(40px, 4.5vw, 64px)",
              lineHeight: 1,
              letterSpacing: "-0.035em",
              color: M.ink,
            }}
          >
            Acht Dinge, die du brauchst<span style={{ color: M.ember }}>.</span>
            <br />
            <span style={{ fontFamily: M.fontSerif, fontStyle: "italic", fontWeight: 400, color: M.smoke }}>
              Einmal sortiert.
            </span>
          </h2>
        </div>
        <p style={{ margin: 0, fontSize: 15.5, lineHeight: 1.6, color: M.smoke, maxWidth: 380 }}>
          1.847 vorgeprüfte Partner — keiner zahlt für Sichtbarkeit. Die Reihenfolge ergibt sich aus deiner Phase, nicht
          aus Anzeigenpreis. Co-Pilot zeigt nur, was jetzt sinnvoll ist.
        </p>
      </div>
      <div className="landing-card-grid landing-market-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gridAutoRows: "220px", gap: 16 }}>
        {SERVICES.map((s, i) => (
          <ServiceTile key={s.id} s={s} accented={i === 0} />
        ))}
      </div>
      <div
        style={{
          marginTop: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 24,
          flexWrap: "wrap",
          padding: "20px 24px",
          borderRadius: 16,
          background: "rgba(21,20,15,0.04)",
          border: "1px solid rgba(21,20,15,0.08)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <AITag>Co-Pilot</AITag>
          <span style={{ fontSize: 14, color: M.ink }}>
            Für deine Phase <span style={{ color: M.smoke }}>(Prototyp · vor Ausgründung)</span> empfehle ich:{" "}
            <span style={{ fontWeight: 600 }}>Co-Founder → Recht → Förderung → Mentor</span>{" "}
            <span style={{ color: M.smoke }}>— in dieser Reihenfolge.</span>
          </span>
        </div>
        <Link
          to="/co-pilot"
          style={{
            background: M.ink,
            color: M.cream,
            padding: "10px 16px",
            borderRadius: 10,
            fontWeight: 600,
            fontSize: 13.5,
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          Plan starten <SvcIcon name="arrowR" size={13} color={M.cream} stroke={2.2} />
        </Link>
      </div>
    </Section>
  );
}

function LCoPilotMoment() {
  return (
    <section
      id="copilot"
      style={{ background: M.ink, color: M.cream, padding: "140px 0", position: "relative", overflow: "hidden" }}
    >
      <div
        style={{
          position: "absolute",
          top: "-20%",
          right: "-10%",
          width: "60%",
          height: "90%",
          background: "radial-gradient(circle at center, rgba(226,81,28,0.45), transparent 60%)",
          filter: "blur(80px)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "-20%",
          left: "-10%",
          width: "50%",
          height: "70%",
          background: "radial-gradient(circle at center, rgba(178,59,14,0.30), transparent 60%)",
          filter: "blur(90px)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.05,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px),linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />
      <div
        className="landing-two-col landing-section-inner"
        style={{
          position: "relative",
          maxWidth: 1240,
          margin: "0 auto",
          padding: "0 64px",
          display: "grid",
          gridTemplateColumns: "0.9fr 1.1fr",
          gap: 64,
          alignItems: "center",
        }}
      >
        <div>
          <Eyebrow tone="light">04 · Der Co-Pilot</Eyebrow>
          <h2
            style={{
              margin: "20px 0 0",
              fontWeight: 600,
              fontSize: "clamp(40px, 4.5vw, 64px)",
              lineHeight: 1,
              letterSpacing: "-0.035em",
              color: M.cream,
            }}
          >
            Er versteht, wo du <span style={{ fontFamily: M.fontSerif, fontStyle: "italic", fontWeight: 400 }}>wirklich</span> stehst
            <span style={{ color: M.ember }}>.</span>
          </h2>
          <p style={{ marginTop: 24, fontSize: 17, lineHeight: 1.6, color: "rgba(251,250,247,0.7)", maxWidth: 460 }}>
            Kein Search-Feld. Kein Quiz. Du sprichst, er denkt mit — und holt im Hintergrund die Menschen und Programme
            zusammen, die zu deiner konkreten Phase passen. Mit Begründung, nicht Zufall.
          </p>
          <div style={{ marginTop: 32, display: "flex", flexDirection: "column", gap: 14 }}>
            {[
              {
                i: "people" as IconName,
                t: "Hört auf den Subtext",
                d: 'Erkennt "ich verliere die Lust" als Co-Founder-Risiko, nicht als Marketing-Frage.',
              },
              {
                i: "layers" as IconName,
                t: "Routet über 8 Disziplinen",
                d: "Eine Frage. Mehrere Services. In sinnvoller Reihenfolge — nicht alphabetisch.",
              },
              {
                i: "shield" as IconName,
                t: "Empfiehlt mit Quelle",
                d: "Jede Empfehlung mit Begründung, Verfügbarkeit und Konfidenz. Keine Black-Box.",
              },
            ].map((f, i) => (
              <div
                key={f.t}
                style={{
                  display: "grid",
                  gridTemplateColumns: "36px 1fr",
                  gap: 14,
                  padding: "14px 0",
                  borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,0.10)",
                }}
              >
                <span
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 9,
                    background: "rgba(226,81,28,0.18)",
                    border: "1px solid rgba(226,81,28,0.32)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <SvcIcon name={f.i} size={18} color={M.ember} stroke={2} />
                </span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15.5, color: M.cream }}>{f.t}</div>
                  <div
                    style={{ fontSize: 13.5, color: "rgba(251,250,247,0.65)", marginTop: 4, lineHeight: 1.5 }}
                  >
                    {f.d}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ ...GLASS.paneInk, padding: 0, overflow: "hidden" }}>
          <div
            style={{
              padding: "18px 22px",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 11,
                background: M.ember,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25), 0 8px 16px -6px rgba(178,59,14,0.5)",
              }}
            >
              <IconMF size={18} color={M.cream} spark={M.cream} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontWeight: 600, fontSize: 15, letterSpacing: "-0.015em" }}>Co-Pilot</span>
                <AITag>live</AITag>
              </div>
              <div
                style={{
                  fontFamily: M.fontMono,
                  fontSize: 10.5,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.55)",
                  marginTop: 2,
                }}
              >
                Plan für Q3-Ausgründung · Berlin
              </div>
            </div>
            <span style={{ fontFamily: M.fontMono, fontSize: 10.5, color: "rgba(255,255,255,0.4)" }}>09:48</span>
          </div>

          <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ alignSelf: "flex-end", maxWidth: "78%" }}>
              <div
                style={{
                  background: "rgba(255,255,255,0.10)",
                  border: "1px solid rgba(255,255,255,0.14)",
                  padding: "12px 16px",
                  borderRadius: "14px 14px 4px 14px",
                  fontSize: 14,
                  lineHeight: 1.5,
                  color: M.cream,
                }}
              >
                „Ich bin Designer, B2B-SaaS-Prototyp für Friseur-Buchhaltung. Zwei Monate alt. Will Q3 ausgründen, Berlin."
              </div>
            </div>

            <div
              style={{
                alignSelf: "flex-start",
                maxWidth: "85%",
                padding: "10px 14px",
                borderRadius: 12,
                background: "rgba(226,81,28,0.10)",
                border: "1px solid rgba(226,81,28,0.25)",
                fontFamily: M.fontMono,
                fontSize: 10.5,
                letterSpacing: "0.06em",
                color: "rgba(255,200,170,0.85)",
              }}
            >
              <span style={{ color: M.ember, textTransform: "uppercase", letterSpacing: "0.14em" }}>
                Co-Pilot denkt
              </span>
              <span style={{ opacity: 0.6 }}> · </span>
              B2B vertikal · SMB · niedriger ACV · Berlin → GmbH · Q3 → 8–10 Wochen Vorlauf
            </div>

            <div style={{ alignSelf: "flex-start", maxWidth: "92%" }}>
              <div
                style={{
                  background: "rgba(251,250,247,0.95)",
                  color: M.ink,
                  padding: "16px 18px",
                  borderRadius: "14px 14px 14px 4px",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontFamily: M.fontSerif,
                    fontStyle: "italic",
                    fontSize: 16.5,
                    lineHeight: 1.45,
                  }}
                >
                  „Drei Bewegungen parallel — sonst sitzt du im September fest. Ich habe Anna für die Tech-Seite, Dr.
                  Heller für den Gründervertrag, und EXIST als Brücke bis Mai gefiltert."
                </p>
                <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                  {[
                    { sId: "cofounder", t: "Anna Wojcik · 7 yrs Stripe", fit: 94, why: "Backend + B2B + Berlin" },
                    { sId: "legal", t: "Dr. Lena Heller · Bird & Bird", fit: 91, why: "GmbH + ESOP, 14d response" },
                    { sId: "funding", t: "EXIST · DLR", fit: 89, why: "€125k · Frist 28. Mai" },
                  ].map((r) => {
                    const s = SVC_BY_ID[r.sId];
                    return (
                      <div
                        key={r.t}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "24px 1fr auto",
                          gap: 10,
                          alignItems: "center",
                          padding: "8px 10px",
                          borderRadius: 10,
                          background: "rgba(21,20,15,0.04)",
                          border: "1px solid rgba(21,20,15,0.06)",
                        }}
                      >
                        <span
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: 6,
                            background: s.hue,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <SvcIcon name={s.icon} size={12} color={M.cream} stroke={2.2} />
                        </span>
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: M.ink,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {r.t}
                          </div>
                          <div style={{ fontSize: 11, color: M.smoke }}>{r.why}</div>
                        </div>
                        <span style={{ fontSize: 15, fontWeight: 600, color: M.ember }}>{r.fit}</span>
                      </div>
                    );
                  })}
                </div>
                <div
                  style={{
                    marginTop: 12,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingTop: 10,
                    borderTop: "1px solid rgba(21,20,15,0.07)",
                  }}
                >
                  <span
                    style={{
                      fontFamily: M.fontMono,
                      fontSize: 10.5,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: M.smoke,
                    }}
                  >
                    Generiere Plan · 8 Wochen
                  </span>
                  <Link
                    to="/co-pilot"
                    style={{
                      background: M.ember,
                      color: M.cream,
                      border: "none",
                      padding: "7px 12px",
                      borderRadius: 8,
                      fontWeight: 600,
                      fontSize: 12,
                      textDecoration: "none",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    Übernehmen <SvcIcon name="arrowR" size={11} color={M.cream} stroke={2.4} />
                  </Link>
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: 8,
                padding: "12px 14px",
                borderRadius: 12,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontSize: 13.5,
                color: "rgba(255,255,255,0.5)",
              }}
            >
              <span style={{ flex: 1 }}>„Was wenn ich erst Mentor will, dann Co-Founder?"</span>
              <SvcIcon name="mic" size={14} color="rgba(255,255,255,0.5)" stroke={2} />
              <span
                style={{
                  background: M.ember,
                  color: M.cream,
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <SvcIcon name="send" size={13} color={M.cream} />
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function LFunding() {
  return (
    <Section tone="paper" pad="140px 0" id="foerderung">
      <div className="landing-two-col landing-section-inner" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center" }}>
        <div>
          <Eyebrow>05 · Förderung · live gematcht</Eyebrow>
          <div
            className="landing-funding-bignum"
            style={{
              marginTop: 24,
              fontWeight: 600,
              fontSize: "clamp(96px, 14vw, 184px)",
              lineHeight: 0.85,
              letterSpacing: "-0.06em",
              color: M.ember,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            €2.4M
          </div>
          <p style={{ marginTop: 12, fontWeight: 500, fontSize: 22, lineHeight: 1.3, letterSpacing: "-0.02em", color: M.ink, maxWidth: 460 }}>
            Fördermittel, die Co-Pilot 2025 für unsere Founder identifiziert und{" "}
            <span style={{ fontFamily: M.fontSerif, fontStyle: "italic" }}>tatsächlich</span> bewilligt bekommen hat.
          </p>
          <p style={{ marginTop: 16, fontSize: 14.5, lineHeight: 1.6, color: M.smoke, maxWidth: 460 }}>
            EXIST, ProFIT, INVEST, ERP-Gründerkredit, KfW-Programme. Mit Vorprüfung, Antragsbegleitung und einem Anwalt,
            der die Förder-Sprache spricht. Keine Stunden bei Beratern, die nichts wissen.
          </p>
          <div style={{ marginTop: 28, display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
            {["EXIST", "ProFIT", "INVEST", "KfW", "BAFA", "ERP"].map((p) => (
              <span
                key={p}
                style={{
                  fontFamily: M.fontMono,
                  fontSize: 13,
                  letterSpacing: "0.06em",
                  color: M.smoke,
                  fontWeight: 500,
                }}
              >
                {p}
              </span>
            ))}
          </div>
        </div>

        <div
          className="landing-funding-card"
          style={{
            padding: 28,
            borderRadius: 24,
            background: `linear-gradient(160deg, ${M.ember}f0, ${M.emberDeep}cc)`,
            color: M.cream,
            boxShadow: `0 30px 60px -24px ${M.emberDeep}88, inset 0 1px 0 rgba(255,255,255,0.25)`,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              right: -30,
              bottom: -40,
              opacity: 0.18,
              pointerEvents: "none",
            }}
          >
            <SvcIcon name="seal" size={280} color={M.cream} stroke={1.4} />
          </div>
          <div className="landing-funding-card-head" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative" }}>
            <span
              className="landing-funding-card-title"
              style={{
                fontFamily: M.fontMono,
                fontSize: 11,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.85)",
              }}
            >
              EXIST · Gründerstipendium · DLR
            </span>
            <span
              className="landing-funding-slot"
              style={{
                padding: "4px 10px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.18)",
                border: "1px solid rgba(255,255,255,0.25)",
                fontFamily: M.fontMono,
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.1em",
              }}
            >
              3 SLOTS · MAI
            </span>
          </div>
          <div
            className="landing-grant-amount"
            style={{
              position: "relative",
              marginTop: 18,
              fontWeight: 600,
              fontSize: 72,
              lineHeight: 0.9,
              letterSpacing: "-0.045em",
            }}
          >
            €125.000
          </div>
          <div className="landing-grant-meta" style={{ position: "relative", fontSize: 15, color: "rgba(255,255,255,0.85)", marginTop: 6 }}>
            pro Team · 12 Monate · zzgl. Sachkosten & Coaching
          </div>
          <div style={{ position: "relative", marginTop: 24 }}>
            <div
              className="landing-grant-progress-labels"
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontFamily: M.fontMono,
                fontSize: 11,
                letterSpacing: "0.1em",
                color: "rgba(255,255,255,0.85)",
                marginBottom: 6,
              }}
            >
              <span>ANTRAG · 78%</span>
              <span>FRIST · 28. MAI</span>
            </div>
            <div style={{ height: 6, borderRadius: 999, background: "rgba(255,255,255,0.18)", overflow: "hidden" }}>
              <div style={{ width: "78%", height: "100%", background: M.cream }} />
            </div>
          </div>
          <div
            className="landing-grant-note"
            style={{
              position: "relative",
              marginTop: 22,
              padding: 14,
              borderRadius: 12,
              background: "rgba(0,0,0,0.18)",
              border: "1px solid rgba(255,255,255,0.15)",
              display: "flex",
              gap: 12,
              alignItems: "flex-start",
            }}
          >
            <IconMF size={18} color={M.cream} spark={M.cream} />
            <div style={{ fontSize: 13.5, lineHeight: 1.5, fontFamily: M.fontSerif, fontStyle: "italic" }}>
              „3 Felder fehlen noch: Projektbeschreibung &lt;2.500 Zeichen, FuE-Quote, Hochschulanbindung. Ich kann das
              aus deinem One-Pager vorausfüllen — willst du?"
            </div>
          </div>
          <div
            className="landing-grant-actions"
            style={{
              position: "relative",
              marginTop: 18,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.75)" }}>Co-Pilot vorausfüllen lassen</span>
            <Link
              to="/co-pilot"
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                background: M.cream,
                color: M.emberDeep,
                fontWeight: 600,
                fontSize: 13,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              Jetzt starten <SvcIcon name="arrowR" size={12} color={M.emberDeep} stroke={2.4} />
            </Link>
          </div>
        </div>
      </div>
    </Section>
  );
}

function LCompare() {
  const rows = [
    { d: "Anwalt finden", solo: "6 Wochen · 4 Erstgespräche · €3.200", mf: "48h · 1 Erstgespräch · inkludiert" },
    { d: "EXIST-Antrag schreiben", solo: "11 Wochen · 6 Iterationen", mf: "5 Wochen · Co-Pilot füllt 70% vor" },
    { d: "Technischen Co-Founder finden", solo: "8 Monate LinkedIn-DMs", mf: "14 Tage bis erster Termin · 9 Slots" },
    { d: "ESOP-Pool aufsetzen", solo: "Vorlage von Reddit · Anwalt prüft", mf: "Template + Bird & Bird-Review · 1 Woche" },
    { d: "Steuerberater wechseln", solo: "Empfehlung aus Slack-Community", mf: '3 Vorgeprüfte · "versteht Cap Tables"' },
    { d: "Mentor mit Branchen-Match", solo: "Glück", mf: "Office Hour · 14 aktive Operator" },
  ];
  return (
    <Section tone="cream" pad="140px 0">
      <div style={{ textAlign: "center", maxWidth: 760, margin: "0 auto 64px" }}>
        <Eyebrow>06 · Solo vs. mit Co-Pilot</Eyebrow>
        <h2
          style={{
            margin: "20px 0 0",
            fontWeight: 600,
            fontSize: "clamp(40px, 4.5vw, 64px)",
            lineHeight: 1,
            letterSpacing: "-0.035em",
            color: M.ink,
          }}
        >
          Wie viel Zeit du <span style={{ fontFamily: M.fontSerif, fontStyle: "italic", fontWeight: 400 }}>zurück</span> bekommst
          <span style={{ color: M.ember }}>.</span>
        </h2>
      </div>
      <div style={{ borderRadius: 24, overflow: "hidden", border: "1px solid rgba(21,20,15,0.10)", background: M.paper }}>
        <div
          className="landing-compare-head"
          style={{
            display: "grid",
            gridTemplateColumns: "1.1fr 1fr 1fr",
            padding: "16px 28px",
            background: "rgba(21,20,15,0.04)",
            borderBottom: "1px solid rgba(21,20,15,0.08)",
            fontFamily: M.fontMono,
            fontSize: 11,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: M.smoke,
          }}
        >
          <span>Aufgabe</span>
          <span>Solo</span>
          <span style={{ color: M.ember, display: "inline-flex", alignItems: "center", gap: 8 }}>
            <IconMF size={14} color={M.ember} spark={M.ember} />
            mit matchfoundr
          </span>
        </div>
        {rows.map((r, i) => (
          <div
            className="landing-compare-row"
            key={r.d}
            style={{
              display: "grid",
              gridTemplateColumns: "1.1fr 1fr 1fr",
              padding: "20px 28px",
              alignItems: "center",
              borderTop: i === 0 ? "none" : "1px solid rgba(21,20,15,0.07)",
              background: i % 2 === 1 ? "rgba(255,255,255,0.4)" : "transparent",
            }}
          >
            <div className="l-compare-task" style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.015em", color: M.ink }}>{r.d}</div>
            <div className="l-compare-solo" style={{ fontSize: 13.5, color: M.smoke, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: M.smoke }} />
              {r.solo}
            </div>
            <div className="l-compare-mf" style={{ fontSize: 13.5, color: M.ink, fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}>
              <SvcIcon name="check2" size={14} color={M.ember} stroke={2.5} />
              {r.mf}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

type Quote = {
  name: string;
  role: string;
  city: string;
  quote: string;
  stat: { k: string; v: string };
  hero?: boolean;
};

function QuoteCard({ q }: { q: Quote }) {
  const hero = !!q.hero;
  return (
    <div
      style={{
        padding: hero ? 32 : 26,
        borderRadius: 24,
        background: hero ? M.ink : M.paper,
        color: hero ? M.cream : M.ink,
        border: hero ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(21,20,15,0.08)",
        display: "flex",
        flexDirection: "column",
        gap: 18,
        position: "relative",
        overflow: "hidden",
        boxShadow: hero
          ? "0 30px 60px -24px rgba(21,20,15,0.5)"
          : "0 20px 40px -28px rgba(21,20,15,0.15)",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -20,
          right: 18,
          fontFamily: M.fontSerif,
          fontSize: 180,
          lineHeight: 1,
          color: hero ? "rgba(226,81,28,0.35)" : "rgba(21,20,15,0.07)",
          pointerEvents: "none",
          fontStyle: "italic",
        }}
      >
        "
      </div>
      <p
        style={{
          margin: 0,
          position: "relative",
          fontFamily: M.fontSerif,
          fontStyle: "italic",
          fontSize: hero ? 26 : 19,
          lineHeight: 1.35,
          letterSpacing: "-0.01em",
          color: hero ? M.cream : M.ink,
        }}
      >
        „{q.quote}"
      </p>
      <div
        style={{
          marginTop: "auto",
          display: "flex",
          alignItems: "center",
          gap: 14,
          paddingTop: 18,
          borderTop: hero ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(21,20,15,0.08)",
        }}
      >
        <Avatar name={q.name} size={44} ring={hero} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-0.01em" }}>{q.name}</div>
          <div style={{ fontSize: 11.5, color: hero ? "rgba(251,250,247,0.65)" : M.smoke, marginTop: 2 }}>
            {q.role} · {q.city}
          </div>
        </div>
      </div>
      <div
        style={{
          padding: "12px 14px",
          borderRadius: 12,
          background: hero ? "rgba(226,81,28,0.18)" : "rgba(226,81,28,0.08)",
          border: hero ? "1px solid rgba(226,81,28,0.35)" : "1px solid rgba(226,81,28,0.20)",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <span
            style={{
              fontSize: 22,
              fontWeight: 600,
              letterSpacing: "-0.025em",
              color: hero ? M.cream : M.emberDeep,
              lineHeight: 1,
            }}
          >
            {q.stat.k}
          </span>
          <span style={{ fontSize: 12, color: hero ? "rgba(251,250,247,0.75)" : M.emberDeep }}>{q.stat.v}</span>
        </div>
      </div>
    </div>
  );
}

function LTestimonials() {
  const quotes: Quote[] = [
    {
      name: "Marie Lambert",
      role: "Co-Founder · Cassia (B2B Vertical SaaS)",
      city: "Berlin",
      quote:
        "Wir haben in zwei Wochen einen technischen Co-Founder, eine Anwältin und einen EXIST-Slot gefunden. Vorher: drei Monate Slack-Communities und €4.800 an Erstberatungen.",
      stat: { k: "€4.800", v: "gespart in Erstberatungen" },
      hero: true,
    },
    {
      name: "Jonas Kessler",
      role: "Solo-Founder · ML-Agents",
      city: "München",
      quote:
        '„Ich brauche jemand für Distribution" — drei Tage später hatte ich drei Telefonate. Mit Menschen, die meinen Prototyp gelesen hatten, bevor wir uns angerufen haben.',
      stat: { k: "3 Tage", v: "bis erstes Match" },
    },
    {
      name: "Sofia Hellström",
      role: "COO → Solo-Founder",
      city: "Wien",
      quote:
        "Der Co-Pilot hat aus meinem 4-Minuten-Voice-Memo einen Plan gebaut, den ich sonst mit zwei Beratern für €6k erstellt hätte. Und er stimmte.",
      stat: { k: "4 Minuten", v: "Voice-Memo · ganzer Plan" },
    },
  ];
  return (
    <Section tone="cream" pad="140px 0" id="stories">
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 40,
          flexWrap: "wrap",
          marginBottom: 56,
        }}
      >
        <div style={{ maxWidth: 640 }}>
          <Eyebrow>07 · Stimmen aus dem Netzwerk</Eyebrow>
          <h2
            style={{
              margin: "20px 0 0",
              fontWeight: 600,
              fontSize: "clamp(40px, 4.5vw, 64px)",
              lineHeight: 1,
              letterSpacing: "-0.035em",
              color: M.ink,
            }}
          >
            Drei <span style={{ fontFamily: M.fontSerif, fontStyle: "italic", fontWeight: 400 }}>echte</span> Bewegungen.
            <br />
            <span style={{ color: M.smoke }}>Aus den letzten 90 Tagen.</span>
          </h2>
        </div>
      </div>
      <div className="landing-card-grid landing-quote-grid" style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gap: 18 }}>
        {quotes.map((q) => (
          <QuoteCard key={q.name} q={q} />
        ))}
      </div>
    </Section>
  );
}

type Tier = {
  name: string;
  price: string;
  sub: string;
  blurb: string;
  feats: string[];
  cta: string;
  tone: "paper" | "ember" | "ink";
  featured?: boolean;
};
function PriceCard({ t }: { t: Tier }) {
  const dark = t.tone === "ink";
  const ember = t.tone === "ember";
  const bg = ember ? M.ink : dark ? M.inkSoft : M.cream;
  const fg = ember || dark ? M.cream : M.ink;
  const smoke = ember || dark ? "rgba(251,250,247,0.62)" : M.smoke;
  return (
    <div
      style={{
        padding: 32,
        borderRadius: 24,
        background: bg,
        color: fg,
        border: ember
          ? "1px solid rgba(226,81,28,0.4)"
          : dark
            ? "1px solid rgba(255,255,255,0.06)"
            : "1px solid rgba(21,20,15,0.08)",
        display: "flex",
        flexDirection: "column",
        gap: 18,
        position: "relative",
        overflow: "hidden",
        boxShadow: ember
          ? "0 30px 60px -24px rgba(178,59,14,0.5), inset 0 1px 0 rgba(255,255,255,0.05)"
          : "0 20px 40px -28px rgba(21,20,15,0.2)",
        transform: t.featured ? "translateY(-8px)" : "none",
      }}
    >
      {ember && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.6,
            pointerEvents: "none",
            background: "radial-gradient(circle at 80% 0%, rgba(226,81,28,0.5), transparent 60%)",
          }}
        />
      )}
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span
          style={{
            fontFamily: M.fontMono,
            fontSize: 11,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: smoke,
          }}
        >
          {t.name}
        </span>
        {t.featured && (
          <span
            style={{
              padding: "3px 9px",
              borderRadius: 999,
              background: M.ember,
              color: M.cream,
              fontFamily: M.fontMono,
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.1em",
            }}
          >
            EMPFOHLEN
          </span>
        )}
      </div>
      <div style={{ position: "relative" }}>
        <span style={{ fontWeight: 600, fontSize: 56, letterSpacing: "-0.04em", lineHeight: 1, color: fg }}>
          {t.price}
        </span>
        <span style={{ fontSize: 14, color: smoke, marginLeft: 8 }}>{t.sub}</span>
      </div>
      <p style={{ position: "relative", margin: 0, fontSize: 14.5, lineHeight: 1.55, color: smoke }}>{t.blurb}</p>
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          paddingTop: 18,
          borderTop: ember || dark ? "1px solid rgba(255,255,255,0.10)" : "1px solid rgba(21,20,15,0.08)",
        }}
      >
        {t.feats.map((f) => (
          <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13.5, lineHeight: 1.4 }}>
            <SvcIcon name="check2" size={14} color={ember || dark ? M.ember : M.ink} stroke={2.5} />
            <span style={{ color: fg }}>{f}</span>
          </div>
        ))}
      </div>
      <Link
        to="/co-pilot"
        style={{
          position: "relative",
          marginTop: "auto",
          background: ember ? M.ember : dark ? M.cream : M.ink,
          color: ember ? M.cream : dark ? M.ink : M.cream,
          padding: "14px 18px",
          borderRadius: 12,
          fontWeight: 600,
          fontSize: 14,
          textDecoration: "none",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          boxShadow: ember
            ? "0 14px 28px -10px rgba(178,59,14,0.5), inset 0 1px 0 rgba(255,255,255,0.25)"
            : "none",
        }}
      >
        {t.cta}{" "}
        <SvcIcon name="arrowR" size={13} color={ember ? M.cream : dark ? M.ink : M.cream} stroke={2.2} />
      </Link>
    </div>
  );
}

function LPricing() {
  const tiers: Tier[] = [
    {
      name: "Explorer",
      price: "€0",
      sub: "für 90 Tage",
      blurb: "Co-Pilot kennenlernen, einen Service freischalten, einmalig matchen.",
      feats: [
        "1 aktiver Service · z. B. Co-Founder",
        "3 Empfehlungen pro Woche",
        "Co-Pilot Chat · 20 Nachrichten / Tag",
        "Marketplace lesen — nicht kontaktieren",
      ],
      cta: "Kostenlos starten",
      tone: "paper",
    },
    {
      name: "Founder",
      price: "€49",
      sub: "/ Monat · jährlich",
      blurb: "Der volle Stack. Alle 8 Disziplinen. Co-Pilot ohne Limit.",
      feats: [
        "Alle 8 Services · unbegrenzte Matches",
        "Co-Pilot · Plan-Generierung & Auto-Fill",
        "Förderung-Pipeline · EXIST · ProFIT · INVEST",
        "Anwalts-Erstgespräche · 3 inkludiert",
        "Pipeline & Heute-Ansicht",
      ],
      cta: "Founder starten",
      tone: "ember",
      featured: true,
    },
    {
      name: "Team",
      price: "€129",
      sub: "/ Monat · 3+ Sitze",
      blurb: "Wenn ihr schon zu zweit oder zu dritt seid und gemeinsam baut.",
      feats: [
        "Alles aus Founder",
        "3–10 Sitze · geteilte Pipeline",
        "Shared Co-Pilot-Sessions",
        "Dedizierter Onboarding-Coach",
        "Cap-Table & ESOP-Tooling",
      ],
      cta: "Team einrichten",
      tone: "ink",
    },
  ];
  return (
    <Section tone="paper" pad="140px 0" id="pricing">
      <div style={{ textAlign: "center", maxWidth: 760, margin: "0 auto 64px" }}>
        <Eyebrow>08 · Pricing</Eyebrow>
        <h2
          style={{
            margin: "20px 0 0",
            fontWeight: 600,
            fontSize: "clamp(40px, 4.5vw, 64px)",
            lineHeight: 1,
            letterSpacing: "-0.035em",
            color: M.ink,
          }}
        >
          Ein Co-Pilot kostet weniger als <span style={{ fontFamily: M.fontSerif, fontStyle: "italic", fontWeight: 400 }}>eine Erstberatung</span>
          <span style={{ color: M.ember }}>.</span>
        </h2>
        <p style={{ fontSize: 16.5, lineHeight: 1.55, color: M.smoke, maxWidth: 540, margin: "16px auto 0" }}>
          Transparent. Jährlich kündbar. Niemand zahlt für Sichtbarkeit — Empfehlungen ergeben sich aus Phase, nicht aus
          Provision.
        </p>
      </div>
      <div className="landing-card-grid landing-pricing-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18, alignItems: "stretch" }}>
        {tiers.map((t) => (
          <PriceCard key={t.name} t={t} />
        ))}
      </div>
      <div style={{ marginTop: 28, textAlign: "center", fontSize: 13, color: M.smoke }}>
        Alle Preise zzgl. USt. · 30 Tage Rückerstattung · keine Setup-Gebühr
      </div>
    </Section>
  );
}

function LFaq() {
  const items = [
    {
      q: "Ist das ein Dating-App-Klon für Founder?",
      a: "Nein. Es ist näher an einem Chief-of-Staff, der dich durch Gründung, Förderung und die ersten Hires begleitet — mit einem KI-Co-Pilot vorne und 1.847 vorgeprüften Menschen dahinter. Swipe gibt es nicht.",
      open: true,
    },
    {
      q: "Wer prüft die Anwälte, Steuerberater und Mentoren?",
      a: "Jeder Partner durchläuft eine 4-Stufen-Prüfung: Branchenfit, Founder-Referenzen aus den letzten 24 Monaten, Reaktionszeit-SLA, jährliche Re-Validierung. Wer länger als 14 Tage nicht antwortet, fällt automatisch aus dem Feed.",
    },
    {
      q: "Bekommt jemand für eine Empfehlung Geld?",
      a: "Niemand zahlt für Sichtbarkeit. Partner zahlen Mitgliedsgebühren, aber Reihenfolge und Konfidenz ergeben sich ausschließlich aus deinem Profil und Phase. Wir machen kein Provisions-Splitting.",
    },
    {
      q: "Was passiert mit meinen Daten und meinem Pitch?",
      a: "Dein Pitch wird nicht für KI-Training verwendet. Co-Pilot-Sessions sind verschlüsselt, nur du und gezielt von dir freigegebene Partner sehen sie. AV-Verträge nach DSGVO sind in jedem Plan inkludiert.",
    },
    {
      q: "Funktioniert das auch außerhalb von Deutschland?",
      a: 'Heute: Berlin, München, Wien, Zürich. Recht & Steuer sind nach Jurisdiktion sortiert (DE / AT / CH). Co-Founder-Matching ist DACH-weit, mit "remote ok"-Filter. Q3 2025: Amsterdam und Stockholm.',
    },
    {
      q: "Kann der Co-Pilot wirklich einen EXIST-Antrag vorausfüllen?",
      a: "Aus One-Pager + 20-min-Voice-Memo: 70–75% Vorbefüllung. Den Rest (FuE-Quote, Hochschulanbindung, Meilensteinplan) klärst du in einer Session mit der Co-Pilot-Antragsbegleitung. Bewilligungsquote 2024: 68%.",
    },
    {
      q: "Kann ich kündigen?",
      a: "Jederzeit zum nächsten Monat — im Founder-Plan; jährliche Pläne sind 12 Monate gebunden, mit 30 Tagen Rückerstattung. Deine Profile und Matches bleiben im Read-Only-Modus erhalten.",
    },
  ];
  return (
    <Section tone="cream" pad="140px 0">
      <div className="landing-two-col landing-faq-grid" style={{ display: "grid", gridTemplateColumns: "0.85fr 1.15fr", gap: 80, alignItems: "flex-start" }}>
        <div style={{ position: "sticky", top: 100 }}>
          <Eyebrow>09 · Was Founder uns fragen</Eyebrow>
          <h2
            style={{
              margin: "20px 0 0",
              fontWeight: 600,
              fontSize: "clamp(40px, 4.5vw, 56px)",
              lineHeight: 1,
              letterSpacing: "-0.035em",
              color: M.ink,
            }}
          >
            Sieben Fragen,
            <br />
            <span style={{ fontFamily: M.fontSerif, fontStyle: "italic", fontWeight: 400, color: M.smoke }}>
              die wirklich kommen.
            </span>
          </h2>
          <p style={{ marginTop: 20, fontSize: 15, lineHeight: 1.6, color: M.smoke, maxWidth: 360 }}>
            Wenn deine nicht dabei ist:{" "}
            <a
              href="mailto:founders@matchfoundr.com"
              style={{
                color: M.ink,
                textDecoration: "underline",
                textDecorationColor: M.ember,
                textUnderlineOffset: 4,
              }}
            >
              founders@matchfoundr.com
            </a>{" "}
            — wir antworten innerhalb von 24h.
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {items.map((it, i) => {
            const open = !!it.open;
            const last = i === items.length - 1;
            return (
              <div
                key={it.q}
                style={{
                  padding: "24px 0",
                  borderTop: "1px solid rgba(21,20,15,0.10)",
                  borderBottom: last ? "1px solid rgba(21,20,15,0.10)" : "none",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "40px 1fr 24px",
                    gap: 18,
                    alignItems: "flex-start",
                  }}
                >
                  <span
                    style={{
                      fontFamily: M.fontMono,
                      fontSize: 11,
                      letterSpacing: "0.16em",
                      color: M.smoke,
                      paddingTop: 4,
                    }}
                  >
                    0{i + 1}
                  </span>
                  <div>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: 19,
                        letterSpacing: "-0.02em",
                        color: M.ink,
                        lineHeight: 1.3,
                      }}
                    >
                      {it.q}
                    </div>
                    {open && (
                      <p style={{ margin: "12px 0 0", fontSize: 15, lineHeight: 1.6, color: M.smoke, maxWidth: 620 }}>
                        {it.a}
                      </p>
                    )}
                  </div>
                  <span
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      background: open ? M.ember : "transparent",
                      border: open ? "none" : "1px solid rgba(21,20,15,0.18)",
                      color: open ? M.cream : M.ink,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <SvcIcon name={open ? "check2" : "plus2"} size={12} color={open ? M.cream : M.ink} stroke={2.4} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Section>
  );
}

function LCta() {
  return (
    <section
      id="cta"
      style={{
        position: "relative",
        background: M.ink,
        color: M.cream,
        padding: "140px 0",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "-30%",
          right: "-15%",
          width: "70%",
          height: "120%",
          background: "radial-gradient(circle at center, rgba(226,81,28,0.55), transparent 60%)",
          filter: "blur(80px)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "-30%",
          left: "-15%",
          width: "60%",
          height: "90%",
          background: "radial-gradient(circle at center, rgba(240,132,58,0.35), transparent 60%)",
          filter: "blur(100px)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.05,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px),linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />
      <div
        className="landing-cta-grid landing-section-inner"
        style={{
          position: "relative",
          maxWidth: 1240,
          margin: "0 auto",
          padding: "0 64px",
          display: "grid",
          gridTemplateColumns: "1.1fr 0.9fr",
          gap: 64,
          alignItems: "center",
        }}
      >
        <div>
          <Eyebrow tone="light">10 · Anfangen</Eyebrow>
          <h2
            style={{
              margin: "20px 0 0",
              fontWeight: 600,
              fontSize: "clamp(56px, 7vw, 96px)",
              lineHeight: 0.92,
              letterSpacing: "-0.045em",
              color: M.cream,
            }}
          >
            Erzähl dem
            <br />
            <span style={{ fontFamily: M.fontSerif, fontStyle: "italic", fontWeight: 400 }}>Co-Pilot</span>
            <br />
            von dir<span style={{ color: M.ember }}>.</span>
          </h2>
          <p style={{ marginTop: 24, fontSize: 18, lineHeight: 1.55, color: "rgba(251,250,247,0.7)", maxWidth: 480 }}>
            Fünf Minuten reichen. Du sprichst, er sortiert. Am Ende hast du drei konkrete Schritte und Menschen, die sie
            mit dir gehen.
          </p>
          <div className="landing-cta-actions" style={{ display: "flex", gap: 12, marginTop: 36, flexWrap: "wrap" }}>
            <Link
              to="/co-pilot"
              style={{
                background: M.ember,
                color: M.cream,
                padding: "18px 28px",
                borderRadius: 14,
                fontWeight: 600,
                fontSize: 16,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 12,
                boxShadow:
                  "0 18px 40px -12px rgba(178,59,14,0.6), inset 0 1px 0 rgba(255,255,255,0.25)",
              }}
            >
              Plattform jetzt starten
              <SvcIcon name="arrowR" size={16} color={M.cream} stroke={2.2} />
            </Link>
            <a
              href="#copilot"
              style={{
                padding: "18px 26px",
                borderRadius: 14,
                background: "rgba(255,255,255,0.08)",
                color: M.cream,
                border: "1px solid rgba(255,255,255,0.18)",
                fontWeight: 500,
                fontSize: 16,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 12,
                backdropFilter: "blur(12px)",
              }}
            >
              <SvcIcon name="play" size={16} color={M.cream} stroke={2} />
              Demo ansehen · 2:14
            </a>
          </div>
          <div
            style={{
              marginTop: 36,
              display: "flex",
              alignItems: "center",
              gap: 18,
              flexWrap: "wrap",
              fontSize: 13,
              color: "rgba(251,250,247,0.6)",
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <SvcIcon name="check2" size={14} color={M.ember} stroke={2.4} /> Kostenlos für 90 Tage
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <SvcIcon name="check2" size={14} color={M.ember} stroke={2.4} /> Keine Kreditkarte
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <SvcIcon name="check2" size={14} color={M.ember} stroke={2.4} /> DSGVO · Hosting in DE
            </span>
          </div>
        </div>

        <div
          className="landing-cta-pane"
          style={{
            ...GLASS.paneInk,
            padding: 28,
            background: "rgba(21,20,15,0.45)",
            display: "flex",
            flexDirection: "column",
            gap: 18,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: M.ember,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25), 0 8px 16px -6px rgba(178,59,14,0.5)",
              }}
            >
              <SvcIcon name="mic" size={20} color={M.cream} stroke={2} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 16, letterSpacing: "-0.015em" }}>Sprachnachricht an Co-Pilot</div>
              <div
                style={{
                  fontFamily: M.fontMono,
                  fontSize: 11,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.55)",
                  marginTop: 2,
                }}
              >
                4 Min · genau so lang wie ein Espresso
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 3, height: 56 }}>
            {Array.from({ length: 56 }).map((_, i) => {
              const h = 16 + Math.abs(Math.sin(i * 0.6) * 20) + Math.abs(Math.cos(i * 0.3) * 15);
              const active = i < 32;
              return (
                <div
                  key={i}
                  style={{
                    width: 3,
                    height: h,
                    borderRadius: 2,
                    background: active ? M.ember : "rgba(255,255,255,0.18)",
                  }}
                />
              );
            })}
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontFamily: M.fontMono,
              fontSize: 11,
              color: "rgba(255,255,255,0.55)",
            }}
          >
            <span>02:14</span>
            <span>04:00</span>
          </div>
          <div
            style={{
              padding: 16,
              borderRadius: 14,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.10)",
            }}
          >
            <div
              style={{
                fontFamily: M.fontMono,
                fontSize: 10,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.5)",
                marginBottom: 8,
              }}
            >
              Live-Transkript
            </div>
            <p
              style={{
                margin: 0,
                fontFamily: M.fontSerif,
                fontStyle: "italic",
                fontSize: 15,
                lineHeight: 1.5,
                color: M.cream,
              }}
            >
              „Also, ich bin Designer, hab seit zwei Monaten einen Prototyp für… eigentlich Buchhaltung für kleine Salons,
              und ich glaub' ich brauch' jemand Technisches, aber auch — keine Ahnung — wahrscheinlich einen Anwalt,
              oder?{" "}
              <span
                style={{
                  background: "rgba(226,81,28,0.30)",
                  borderRadius: 3,
                  padding: "0 4px",
                  color: M.cream,
                  fontStyle: "normal",
                }}
              >
                [Co-Pilot hört zu]
              </span>
              "
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function LFooter() {
  const cols = [
    { h: "Plattform", items: ["Marketplace", "Co-Pilot", "Pipeline", "Förderung-Radar", "Beratungs-Buchung"] },
    {
      h: "Disziplinen",
      items: ["Co-Founder", "Recht & Verträge", "Steuer", "Förderung", "Mentoren", "Talent", "Growth"],
    },
    { h: "Unternehmen", items: ["Über uns", "Stories", "Karriere · 6 offen", "Presse", "Partner werden"] },
    { h: "Rechtliches", items: ["Impressum", "Datenschutz", "AGB", "Cookies", "AV-Vertrag", "Security"] },
  ];
  return (
    <footer style={{ background: M.ink, color: M.cream, padding: "80px 0 36px" }}>
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "0 64px" }}>
        <div className="landing-footer-grid" style={{ display: "grid", gridTemplateColumns: "1.4fr repeat(4, 1fr)", gap: 36, marginBottom: 56 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <IconMF size={28} color={M.cream} spark={M.ember} />
              <span style={{ fontWeight: 700, fontSize: 22, letterSpacing: "-0.025em" }}>
                matchfoundr<span style={{ color: M.ember }}>.</span>
              </span>
            </div>
            <p style={{ marginTop: 20, fontSize: 14, lineHeight: 1.6, color: "rgba(251,250,247,0.65)", maxWidth: 280 }}>
              Eine Plattform für alles, was ein Founder im ersten Jahr braucht — vermittelt von einem Co-Pilot, der
              zuhört.
            </p>
            <div
              style={{
                marginTop: 24,
                display: "flex",
                alignItems: "center",
                gap: 18,
                fontFamily: M.fontMono,
                fontSize: 11,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "rgba(251,250,247,0.5)",
              }}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <SvcIcon name="shield" size={12} color="rgba(251,250,247,0.5)" stroke={1.8} />
                Hosting · Frankfurt
              </span>
              <span>SOC 2 · in Audit</span>
            </div>
          </div>
          {cols.map((c) => (
            <div key={c.h}>
              <div
                style={{
                  fontFamily: M.fontMono,
                  fontSize: 11,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "rgba(251,250,247,0.5)",
                  marginBottom: 16,
                }}
              >
                {c.h}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {c.items.map((it) => (
                  <a
                    key={it}
                    href="#"
                    style={{
                      fontSize: 14,
                      color: "rgba(251,250,247,0.85)",
                      textDecoration: "none",
                      letterSpacing: "-0.005em",
                    }}
                  >
                    {it}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div
          style={{
            paddingTop: 28,
            borderTop: "1px solid rgba(255,255,255,0.10)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 24,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 18,
              fontFamily: M.fontMono,
              fontSize: 11,
              letterSpacing: "0.1em",
              color: "rgba(251,250,247,0.5)",
            }}
          >
            <span>© 2026 matchfoundr GmbH</span>
            <span>·</span>
            <span>Berlin · München · Wien · Zürich</span>
          </div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 14px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.10)",
              fontSize: 12.5,
              color: "rgba(251,250,247,0.75)",
            }}
          >
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#3D9970" }} />
            Co-Pilot online · 1.2s avg
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
 * Page
 * ──────────────────────────────────────────────────────────────────────── */
const RESPONSIVE_CSS = `
.landing-root, .landing-root * { box-sizing: border-box; }
.landing-root { width: 100%; max-width: 100vw; overflow-x: clip; }

/* Nav CTA short label hidden by default */
.landing-nav-cta-short { display: none; }

/* Problem chip cloud: keep all chips visible on compact desktop/tablet widths */
@media (max-width: 1100px) {
  .landing-problem-cloud {
    min-height: 0 !important;
    height: auto !important;
    display: flex !important;
    flex-wrap: wrap !important;
    align-content: flex-start !important;
    gap: 10px !important;
    transform: none !important;
    margin-bottom: 0 !important;
    opacity: 1 !important;
    pointer-events: auto !important;
  }
  .landing-problem-chip {
    position: static !important;
    transform: none !important;
    max-width: 100% !important;
    white-space: normal !important;
    overflow-wrap: anywhere !important;
  }
  .landing-problem-lines { display: none !important; }
}

/* ════════ TABLET / LARGE PHONE LANDSCAPE  ≤ 900px ════════ */
@media (max-width: 900px) {
  /* Section rhythm */
  .landing-root section { padding: 72px 0 !important; }
  .landing-root [style*="padding: 120px 0"] { padding: 64px 0 !important; }

  /* Container padding */
  .landing-root [style*="max-width: 1240"],
  .landing-root [style*="padding: 0px 64px"] {
    padding-left: 22px !important;
    padding-right: 22px !important;
  }

  /* Hero outer padding wrapper */
  .landing-hero-grid {
    grid-template-columns: 1fr !important;
    padding: 48px 22px 64px !important;
    gap: 40px !important;
    align-items: start !important;
  }

  /* Two-column grids → stack */
  .landing-two-col,
  .landing-cta-grid,
  .landing-faq-grid {
    grid-template-columns: 1fr !important;
    gap: 40px !important;
    align-items: start !important;
  }
  .landing-root [style*="grid-template-columns: 1.1fr 0.9fr"],
  .landing-root [style*="grid-template-columns: 0.9fr 1.1fr"],
  .landing-root [style*="grid-template-columns: 0.85fr 1.15fr"],
  .landing-root [style*="grid-template-columns: 1fr 1fr"] {
    grid-template-columns: 1fr !important;
    gap: 40px !important;
    align-items: start !important;
  }

  /* Three-column step cards → stack */
  .landing-card-grid-3,
  .landing-root [style*="grid-template-columns: repeat(3, 1fr)"] {
    grid-template-columns: 1fr !important;
    gap: 16px !important;
  }

  /* Marketplace 4×2 → 2×4 */
  .landing-market-grid,
  .landing-root [style*="grid-template-columns: repeat(4, 1fr)"][style*="grid-auto-rows: 220px"] {
    grid-template-columns: 1fr 1fr !important;
    grid-auto-rows: auto !important;
    gap: 12px !important;
  }

  /* Hero stats 4-col → 2-col */
  .landing-hero-stats {
    grid-template-columns: 1fr 1fr !important;
    gap: 22px 18px !important;
  }
  .landing-hero-stats > div {
    padding-left: 0 !important;
    border-left: none !important;
    border-top: 1px solid rgba(21,20,15,0.10);
    padding-top: 18px !important;
  }
  .landing-hero-stats > div:nth-child(-n+2) {
    border-top: none;
    padding-top: 0 !important;
  }

  /* Testimonials 1.4/1/1 → stack */
  .landing-quote-grid,
  .landing-root [style*="grid-template-columns: 1.4fr 1fr 1fr"] {
    grid-template-columns: 1fr !important;
    gap: 14px !important;
  }

  /* Pricing 3-col → stack */
  .landing-pricing-grid { grid-template-columns: 1fr !important; gap: 16px !important; }
  .landing-root [style*="translateY(-8px)"] { transform: none !important; }

  /* Footer 5-col → 2-col, brand spans full */
  .landing-footer-grid,
  .landing-root [style*="grid-template-columns: 1.4fr repeat(4, 1fr)"] {
    grid-template-columns: 1fr 1fr !important;
    gap: 28px 24px !important;
  }
  .landing-footer-grid > div:first-child,
  .landing-root [style*="grid-template-columns: 1.4fr repeat(4, 1fr)"] > div:first-child {
    grid-column: 1 / -1;
  }

  /* Comparison: hide desktop header + stack rows as cards with labels */
  .landing-compare-head { display: none !important; }
  .landing-compare-row {
    grid-template-columns: 1fr !important;
    gap: 6px !important;
    padding: 18px 20px !important;
    align-items: start !important;
    border-top: 1px solid rgba(21,20,15,0.10) !important;
  }
  .landing-compare-row:first-child { border-top: none !important; }
  .l-compare-task { font-size: 16px !important; }
  .l-compare-solo::before {
    content: "Solo";
    font-family: "Geist Mono", ui-monospace, monospace;
    font-size: 9.5px; letter-spacing: 0.16em; text-transform: uppercase;
    color: #6B635A; margin-right: 8px; font-weight: 500;
    flex-shrink: 0;
  }
  .l-compare-mf::before {
    content: "Mit Co-Pilot";
    font-family: "Geist Mono", ui-monospace, monospace;
    font-size: 9.5px; letter-spacing: 0.16em; text-transform: uppercase;
    color: #B23B0E; margin-right: 8px; font-weight: 600;
    flex-shrink: 0;
  }

  /* Typography caps */
  .landing-root h1 { font-size: clamp(40px, 11vw, 64px) !important; line-height: 1.0 !important; }
  .landing-root h2 { font-size: clamp(28px, 7vw, 44px) !important; line-height: 1.05 !important; }
  .landing-root h2 span { display: inline !important; }
  /* €2.4M giant number */
  .landing-root [style*="font-size: 180px"] { font-size: 92px !important; line-height: 0.9 !important; }
  .landing-root [style*="font-size: 72px"] { font-size: 48px !important; line-height: 1.05 !important; }
  .landing-root [style*="font-size: 56px"] { font-size: 38px !important; line-height: 1.05 !important; }

  /* FAQ sticky heading → static */
  .landing-root [style*="position: sticky"] { position: static !important; }
  .landing-faq-grid > div:first-child { position: static !important; }

  /* Nav: brand + CTA only */
  .landing-nav-shell { padding-left: 16px !important; padding-right: 16px !important; top: 12px !important; margin-top: 12px !important; }
  .landing-nav-inner { padding: 8px 6px 8px 14px !important; gap: 10px !important; width: 100% !important; max-width: none !important; }
  .landing-nav-links,
  .landing-nav-signin,
  .landing-nav-spacer { display: none !important; }
  .landing-brand > span:last-child { display: none !important; }
  .landing-nav-cta { padding: 9px 14px !important; font-size: 12.5px !important; }
  .landing-nav-cta-label { display: none !important; }
  .landing-nav-cta-short { display: inline !important; }

  /* Hero preview card compact */
  .hero-copilot { padding: 18px !important; border-radius: 18px !important; }
  .hero-copilot-recs { grid-template-columns: 1fr !important; gap: 8px !important; }
  .hero-copilot-rec { padding: 12px !important; min-width: 0 !important; }
  .hero-copilot-chips { gap: 6px !important; }
  .hero-copilot-chips > span { font-size: 10.5px !important; padding: 4px 8px 4px 5px !important; }

  /* Hero actions full-width on tablet */
  .landing-hero-actions { flex-wrap: wrap !important; }
  .landing-hero-primary, .landing-hero-secondary { justify-content: center !important; }

  /* Section inner padding/gap on tablet */
  .landing-section-inner {
    padding-left: 22px !important;
    padding-right: 22px !important;
    gap: 32px !important;
  }
  .landing-funding-bignum {
    font-size: clamp(72px, 14vw, 140px) !important;
    line-height: 0.95 !important;
  }
  .landing-funding-card {
    min-width: 0 !important;
    width: 100% !important;
    padding: 24px !important;
  }
  .landing-funding-card-head,
  .landing-grant-actions {
    align-items: flex-start !important;
    flex-wrap: wrap !important;
    gap: 10px !important;
  }
  .landing-funding-card-title,
  .landing-grant-meta,
  .landing-grant-note > div {
    overflow-wrap: anywhere !important;
  }
  .landing-grant-amount {
    font-size: clamp(50px, 13vw, 72px) !important;
    letter-spacing: 0 !important;
    line-height: 0.95 !important;
  }
}

/* ════════ PHONE PORTRAIT  ≤ 640px ════════ */
@media (max-width: 640px) {
  /* Marketplace → 1 col */
  .landing-market-grid,
  .landing-root [style*="grid-template-columns: repeat(4, 1fr)"][style*="grid-auto-rows: 220px"] {
    grid-template-columns: 1fr !important;
  }
  /* Footer → 1 col */
  .landing-footer-grid,
  .landing-root [style*="grid-template-columns: 1.4fr repeat(4, 1fr)"] {
    grid-template-columns: 1fr !important;
    gap: 24px !important;
  }
  /* Hero stats → 1 col */
  .landing-hero-stats { grid-template-columns: 1fr !important; }
  .landing-hero-stats > div:nth-child(-n+2) {
    border-top: 1px solid rgba(21,20,15,0.10);
    padding-top: 18px !important;
  }
  .landing-hero-stats > div:first-child {
    border-top: none;
    padding-top: 0 !important;
  }

  /* €2.4M smaller */
  .landing-root [style*="font-size: 180px"] { font-size: 72px !important; }
  /* Hero typography */
  .landing-root h1 { font-size: clamp(36px, 12vw, 56px) !important; }

  /* Section padding */
  .landing-root section { padding: 56px 0 !important; }

  /* Container tighter */
  .landing-root [style*="max-width: 1240"],
  .landing-root [style*="padding: 0px 64px"] {
    padding-left: 18px !important;
    padding-right: 18px !important;
  }
  .landing-hero-grid { padding: 36px 18px 56px !important; gap: 32px !important; }

  /* Problem chips → one column on phone */
  .landing-problem-cloud {
    display: grid !important;
    grid-template-columns: 1fr !important;
    gap: 9px !important;
  }
  .landing-problem-chip {
    width: 100% !important;
    padding: 11px 14px !important;
    font-size: 13px !important;
  }

  /* Compare row padding */
  .landing-compare-row { padding: 16px 18px !important; }

  /* CTA / hero buttons full-width */
  .landing-hero-actions > a,
  .landing-hero-actions > button,
  .landing-cta-grid a,
  .landing-cta-grid button {
    flex: 1 1 100% !important;
    width: 100% !important;
    justify-content: center !important;
  }

  /* Section inner / CTA pane on phone */
  .landing-section-inner {
    padding-left: 18px !important;
    padding-right: 18px !important;
    gap: 24px !important;
  }
  .landing-cta-pane { padding: 22px !important; }
  .landing-cta-actions {
    flex-wrap: wrap !important;
    justify-content: flex-start !important;
    gap: 12px !important;
  }
  .landing-funding-bignum {
    font-size: clamp(64px, 18vw, 96px) !important;
  }
  .landing-funding-card {
    padding: 20px !important;
    border-radius: 18px !important;
  }
  .landing-funding-card-head,
  .landing-grant-progress-labels,
  .landing-grant-actions {
    display: grid !important;
    grid-template-columns: 1fr !important;
    justify-items: start !important;
  }
  .landing-grant-amount {
    font-size: clamp(44px, 16vw, 64px) !important;
  }
  .landing-grant-meta { font-size: 13.5px !important; }
  .landing-grant-note {
    padding: 12px !important;
    gap: 10px !important;
  }
}
`;


function Landing() {
  return (
    <div
      className="landing-root"
      style={{
        minHeight: "100vh",
        background: M.cream,
        color: M.ink,
        fontFamily: M.fontSans,
        WebkitFontSmoothing: "antialiased",
        overflowX: "hidden",
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: RESPONSIVE_CSS }} />
      <LHero />
      <LProblem />
      <LHowItWorks />
      <LMarketplace />
      <LCoPilotMoment />
      <LFunding />
      <LCompare />
      <LTestimonials />
      <LPricing />
      <LFaq />
      <LCta />
      <LFooter />
    </div>
  );
}
