export type ServiceId =
  | "cofounder" | "legal" | "tax" | "funding" | "capital" | "mentor" | "talent" | "growth";

export type Service = {
  id: ServiceId;
  label: string;
  short: string;
  blurb: string;
  count: number;
  hue: string;
  icon: ServiceIconName;
  route: string;
};

export type ServiceIconName =
  | "people" | "gavel" | "ledger" | "seal" | "arrow-up" | "compass" | "spark2" | "pulse"
  | "spark" | "wand" | "sparkles" | "layers" | "target" | "flag" | "rocket"
  | "coins" | "play" | "sparkle" | "cal" | "clock" | "shield" | "note"
  | "check2" | "plus2" | "arrowR" | "arrowDR" | "money" | "mic";

export const SERVICES: Service[] = [
  { id: "cofounder", label: "Co-Founder", short: "Co-Founder", blurb: "Der Mensch, mit dem du baust.", count: 412, hue: "var(--svc-cofounder)", icon: "people", route: "/co-founder" },
  { id: "legal",     label: "Recht & Verträge", short: "Recht", blurb: "Anwälte für Gründung, IP, ESOP, Cap Table.", count: 86, hue: "var(--svc-legal)", icon: "gavel", route: "/recht" },
  { id: "tax",       label: "Steuer & Buchhaltung", short: "Steuer", blurb: "Steuerberater, die Startups verstehen.", count: 64, hue: "var(--svc-tax)", icon: "ledger", route: "/steuer" },
  { id: "funding",   label: "Förderprogramme", short: "Förderung", blurb: "EXIST, ProFIT, INVEST. Live-Matching.", count: 31, hue: "var(--svc-funding)", icon: "seal", route: "/foerderung" },
  { id: "capital",   label: "Kapital & Investoren", short: "Kapital", blurb: "Pre-Seed, Angels, Family Offices.", count: 214, hue: "var(--svc-capital)", icon: "arrow-up", route: "/kapital" },
  { id: "mentor",    label: "Mentoren & Advisor", short: "Mentor", blurb: "Operator, die das schon gebaut haben.", count: 178, hue: "var(--svc-mentor)", icon: "compass", route: "/mentoren" },
  { id: "talent",    label: "Talent & Hires", short: "Talent", blurb: "Erste fünf Hires. Vorgefiltert.", count: 540, hue: "var(--svc-talent)", icon: "spark2", route: "/talent" },
  { id: "growth",    label: "Growth & GTM", short: "Growth", blurb: "GTM-Operator, PR, Performance, SEO.", count: 122, hue: "var(--svc-growth)", icon: "pulse", route: "/growth" },
];

export const SERVICE_BY_ID: Record<ServiceId, Service> = Object.fromEntries(
  SERVICES.map((s) => [s.id, s])
) as Record<ServiceId, Service>;
