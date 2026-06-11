// ─────────────────────────────────────────────────────────────
// Firmenprofil — Block-basierter Builder
// Jeder Block hat einen Typ und passende Daten. Reihenfolge per DnD,
// Add/Remove im Editor. Persistiert in localStorage (v1).
// ─────────────────────────────────────────────────────────────

import type { PlanContext } from "@/lib/plan-draft";

export type BlockType =
  | "hero"
  | "about"
  | "text"
  | "metrics"
  | "highlights"
  | "image"
  | "video"
  | "team"
  | "cta";

export type HeroBlock = {
  id: string;
  type: "hero";
  eyebrow: string;
  title: string;
  subtitle: string;
  body: string;
  imageUrl?: string;
  ctaLabel?: string;
  ctaHref?: string;
};
export type AboutBlock = { id: string; type: "about"; title: string; body: string };
export type TextBlock = { id: string; type: "text"; title?: string; body: string };
export type MetricsBlock = {
  id: string;
  type: "metrics";
  title?: string;
  items: { value: string; label: string }[];
};
export type HighlightsBlock = { id: string; type: "highlights"; title?: string; items: string[] };
export type ImageBlock = {
  id: string;
  type: "image";
  url: string;
  caption?: string;
  aspect: "16/9" | "4/3" | "1/1";
};
export type VideoBlock = {
  id: string;
  type: "video";
  url: string;
  caption?: string;
};
export type TeamMember = { name: string; role: string; avatarUrl?: string; linkedin?: string };
export type TeamBlock = { id: string; type: "team"; title?: string; members: TeamMember[] };
export type CtaBlock = {
  id: string;
  type: "cta";
  headline: string;
  body?: string;
  label: string;
  href: string;
};

export type CompanyBlock =
  | HeroBlock
  | AboutBlock
  | TextBlock
  | MetricsBlock
  | HighlightsBlock
  | ImageBlock
  | VideoBlock
  | TeamBlock
  | CtaBlock;

export type CompanyComposition = {
  name: string;
  category: string;
  stage: string;
  city: string;
  blocks: CompanyBlock[];
  updatedAt: string;
};

const STORAGE_KEY = "mf_company_composition_v1";
const LEGACY_KEY = "mf_company_profile_v1"; // alte flache Struktur

const BLOCK_LABELS: Record<BlockType, string> = {
  hero: "Hero",
  about: "Über das Vorhaben",
  text: "Textabschnitt",
  metrics: "Metriken",
  highlights: "Highlights",
  image: "Bild",
  video: "Video",
  team: "Team",
  cta: "Call to Action",
};

export function blockLabel(type: BlockType): string {
  return BLOCK_LABELS[type];
}

export function makeId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function emptyBlock(type: BlockType): CompanyBlock {
  switch (type) {
    case "hero":
      return {
        id: makeId(),
        type: "hero",
        eyebrow: "Startup",
        title: "Dein Vorhaben in einem Satz.",
        subtitle: "Pre-Seed · Berlin",
        body: "Erkläre in zwei Sätzen, was ihr baut und für wen.",
        ctaLabel: "Kontakt aufnehmen",
        ctaHref: "/matches",
      };
    case "about":
      return {
        id: makeId(),
        type: "about",
        title: "Über uns",
        body: "Wer wir sind, was uns antreibt und warum wir genau dieses Problem lösen.",
      };
    case "text":
      return { id: makeId(), type: "text", title: "Abschnitt", body: "" };
    case "metrics":
      return {
        id: makeId(),
        type: "metrics",
        title: "Status",
        items: [
          { value: "0", label: "aktive Pilotkunden" },
          { value: "0", label: "Monate Runway" },
          { value: "0", label: "Personen im Team" },
        ],
      };
    case "highlights":
      return {
        id: makeId(),
        type: "highlights",
        title: "Worauf wir stolz sind",
        items: ["", "", ""],
      };
    case "image":
      return { id: makeId(), type: "image", url: "", caption: "", aspect: "16/9" };
    case "video":
      return { id: makeId(), type: "video", url: "", caption: "" };
    case "team":
      return {
        id: makeId(),
        type: "team",
        title: "Das Team",
        members: [{ name: "", role: "" }],
      };
    case "cta":
      return {
        id: makeId(),
        type: "cta",
        headline: "Lass uns sprechen.",
        body: "Wir suchen Pilot-Founder, Förderpartner und Advisor.",
        label: "Kontakt aufnehmen",
        href: "/matches",
      };
  }
}

export function defaultComposition(planContext: PlanContext | null): CompanyComposition {
  const idea = planContext?.context.idea || "matchfoundr";
  const stage = planContext?.context.stage || "MVP";
  const goal = planContext?.context.goal || "die nächsten Schritte präzise zu setzen";
  const ventureTerm = planContext?.ventureTerm || "Startup";

  const hero: HeroBlock = {
    id: makeId(),
    type: "hero",
    eyebrow: ventureTerm,
    title: idea.length > 48 ? idea.slice(0, 48) + "…" : idea,
    subtitle: `${stage} · Berlin`,
    body: `Wir bauen ${idea} mit dem Ziel: ${goal}.`,
    ctaLabel: "Kontakt aufnehmen",
    ctaHref: "/matches",
  };
  const about: AboutBlock = {
    id: makeId(),
    type: "about",
    title: "Was wir bauen",
    body: "Beschreibe in drei bis fünf Sätzen Problem, Lösung und Zielgruppe.",
  };
  const metrics: MetricsBlock = {
    id: makeId(),
    type: "metrics",
    title: "Stand",
    items: [
      { value: "—", label: "Pilotkunden" },
      { value: "—", label: "Monate Runway" },
      { value: "—", label: "Personen im Team" },
    ],
  };
  const highlights: HighlightsBlock = {
    id: makeId(),
    type: "highlights",
    title: "Highlights",
    items: ["Erste belastbare Validierung", "Klarer ICP", "Förderfähiger Innovationskern"],
  };
  const team: TeamBlock = {
    id: makeId(),
    type: "team",
    title: "Team",
    members: [{ name: planContext?.userName || "Founder", role: "Founder" }],
  };
  const cta: CtaBlock = {
    id: makeId(),
    type: "cta",
    headline: "Werde Teil unseres nächsten Schritts.",
    body: "Pilot-Founder, Advisor, Förderpartner — sprich uns an.",
    label: "Jetzt kontaktieren",
    href: "/matches",
  };

  return {
    name: idea.length > 32 ? "matchfoundr" : idea,
    category: planContext?.industryLabel || "Founder-Plattform",
    stage,
    city: "Berlin",
    blocks: [hero, about, metrics, highlights, team, cta],
    updatedAt: new Date().toISOString(),
  };
}

export function readComposition(planContext: PlanContext | null): CompanyComposition {
  if (typeof window === "undefined") return defaultComposition(planContext);
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as CompanyComposition;
      if (parsed && Array.isArray(parsed.blocks) && parsed.blocks.length > 0) return parsed;
    }
    // Migration aus altem flachen Profil
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const composition = migrateLegacy(JSON.parse(legacy), planContext);
      writeComposition(composition);
      return composition;
    }
  } catch {
    // ignore
  }
  return defaultComposition(planContext);
}

export function writeComposition(composition: CompanyComposition): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(composition));
  } catch {
    // localStorage kann fehlen.
  }
}

function migrateLegacy(
  legacy: Record<string, unknown>,
  planContext: PlanContext | null,
): CompanyComposition {
  const base = defaultComposition(planContext);
  const str = (k: string, fallback = "") =>
    typeof legacy[k] === "string" ? (legacy[k] as string) : fallback;
  base.name = str("name", base.name);
  base.category = str("category", base.category);
  base.stage = str("stage", base.stage);
  base.city = str("city", base.city);

  // Map einzelner Felder in die Blöcke.
  for (const block of base.blocks) {
    if (block.type === "hero") {
      const tagline = str("tagline");
      const hero = str("hero");
      if (tagline) block.body = tagline;
      if (hero) block.subtitle = hero;
      block.ctaLabel = str("ctaLabel", block.ctaLabel || "Kontakt aufnehmen");
      block.ctaHref = str("ctaHref", block.ctaHref || "/matches");
    }
    if (block.type === "about") {
      const problem = str("problem");
      const solution = str("solution");
      block.body = [problem, solution].filter(Boolean).join("\n\n") || block.body;
    }
    if (block.type === "metrics") {
      const metrics = (legacy["metrics"] as string[]) || [];
      if (Array.isArray(metrics) && metrics.length > 0) {
        block.items = metrics.slice(0, 4).map((m) => {
          const [v, ...rest] = m.split(" ");
          return { value: v || "—", label: rest.join(" ") || m };
        });
      }
    }
    if (block.type === "highlights") {
      const items = (legacy["highlights"] as string[]) || [];
      if (Array.isArray(items) && items.length > 0) block.items = items.slice(0, 6);
    }
    if (block.type === "cta") {
      block.label = str("ctaLabel", block.label);
      block.href = str("ctaHref", block.href);
    }
  }
  return base;
}

// YouTube/Vimeo/Direkter Link → einheitlicher Embed-Source.
export function videoEmbedSrc(url: string): string | null {
  if (!url) return null;
  const u = url.trim();
  // YouTube
  const yt = u.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  // Vimeo
  const vm = u.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  // Direkte mp4/webm
  if (/\.(mp4|webm|ogg)(\?|$)/i.test(u)) return u;
  return u;
}
