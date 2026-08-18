// matchfoundr · Landing v2 — Designsystem "Warm Signal, Web".
// NUR unsere App-Fonts: Geist + Geist Mono.

export const L2 = {
  canvas: "#FAF8F3",
  surface: "#FFFFFF",
  warm: "#FEFBF6",
  panel: "#F4EFE7",
  ink: "#1A1A1A",
  inkSoft: "#2A251F",
  smoke: "#6E6862",
  faint: "#A39C93",
  line: "rgba(26,26,26,0.09)",
  lineSoft: "rgba(26,26,26,0.06)",
  ember: "#E2511C",
  emberDeep: "#B23B0E",
  emberLight: "#F0843A",
  emberTint: "#FBE7DB",
  indigo: "#3756C4",
  indigoDeep: "#26409A",
  indigoTint: "#E7EAF8",
  font: '"Geist", "Manrope", -apple-system, system-ui, sans-serif',
  mono: '"Geist Mono", "JetBrains Mono", ui-monospace, monospace',
  shadow: "0 24px 60px -30px rgba(26,26,26,0.35)",
  shadowSoft: "0 12px 30px -18px rgba(26,26,26,0.22)",
} as const;

export type MFService = {
  id: string;
  label: string;
  short: string;
  blurb: string;
  count: number;
  hue: string;
  icon: string;
};

// ── Service taxonomy ─────────────────────────────────────────────────────
export const MF_SERVICES: MFService[] = [
  {
    id: "cofounder",
    label: "Co-Founder",
    short: "Co-Founder",
    blurb: "Der Mensch, mit dem du baust.",
    count: 412,
    hue: "#E2511C",
    icon: "people",
  },
  {
    id: "legal",
    label: "Recht & Verträge",
    short: "Recht",
    blurb: "Anwälte für Gründung, IP, ESOP, Cap Table.",
    count: 86,
    hue: "#3D5A4A",
    icon: "gavel",
  },
  {
    id: "tax",
    label: "Steuer & Buchhaltung",
    short: "Steuer",
    blurb: "Steuerberater, die Startups verstehen.",
    count: 64,
    hue: "#8B5A3C",
    icon: "ledger",
  },
  {
    id: "funding",
    label: "Förderprogramme",
    short: "Förderung",
    blurb: "EXIST, ProFIT, INVEST. Live-Matching.",
    count: 31,
    hue: "#B23B0E",
    icon: "seal",
  },
  {
    id: "capital",
    label: "Kapital & Investoren",
    short: "Kapital",
    blurb: "Pre-Seed, Angels, Family Offices.",
    count: 214,
    hue: "#2A251F",
    icon: "arrow-up",
  },
  {
    id: "mentor",
    label: "Mentoren & Advisor",
    short: "Mentor",
    blurb: "Operator, die das schon gebaut haben.",
    count: 178,
    hue: "#F0843A",
    icon: "compass",
  },
  {
    id: "talent",
    label: "Talent & Hires",
    short: "Talent",
    blurb: "Erste fünf Hires. Vorgefiltert.",
    count: 540,
    hue: "#5A4A2A",
    icon: "spark2",
  },
  {
    id: "growth",
    label: "Growth & GTM",
    short: "Growth",
    blurb: "GTM-Operator, PR, Performance, SEO.",
    count: 122,
    hue: "#6B635A",
    icon: "pulse",
  },
];

export const MF_SERVICE_BY_ID: Record<string, MFService> = Object.fromEntries(
  MF_SERVICES.map((s) => [s.id, s]),
);
