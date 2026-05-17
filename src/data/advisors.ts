export type Advisor = {
  slug: string;
  name: string;
  firm: string;
  city: string;
  blurb: string;
  fit: number;
  specialties: { label: string; level: number }[];
  packages: { name: string; price: string; desc: string }[];
  vouches: { from: string; role: string; quote: string }[];
  why: string[];
};

export const ADVISORS: Advisor[] = [
  {
    slug: "lena-heller",
    name: "Dr. Lena Heller",
    firm: "Heller & Voß, Berlin",
    city: "Berlin",
    fit: 94,
    blurb: "Gründungsrecht, ESOP-Pools, Cap Table-Sanierung für Pre-Seed & Seed-Startups.",
    why: [
      "Hat 38 GmbH-Gründungen in Berlin in den letzten 24 Monaten begleitet.",
      "Spezialisiert auf B2B-SaaS Verträge — passt zu deiner Vertikale.",
      "Schnell ansprechbar: durchschn. Antwortzeit 4 h im Co-Pilot-Netzwerk.",
    ],
    specialties: [
      { label: "GmbH-Gründung", level: 0.95 },
      { label: "Gründervertrag / Vesting", level: 0.92 },
      { label: "ESOP-Pool", level: 0.9 },
      { label: "Cap Table", level: 0.82 },
      { label: "IP & Markenrecht", level: 0.6 },
    ],
    packages: [
      { name: "Gründung Komplett", price: "€2.400", desc: "GmbH-Setup, Gesellschaftsvertrag, Anmeldung, Notar-Koordination." },
      { name: "ESOP-Pool aufsetzen", price: "€1.800", desc: "Pool-Größe, VSOP-Template, steuerliche Abstimmung." },
      { name: "Erstgespräch", price: "Kostenlos", desc: "30 Min Strukturierung — Co-Pilot bereitet vor." },
    ],
    vouches: [
      { from: "Marcus K.", role: "CTO, Onsight", quote: "Hat unseren ESOP in 2 Wochen sauber aufgesetzt." },
      { from: "Anna W.", role: "CEO, Bricklane", quote: "Spricht Founder-Sprache, keine Phrasen." },
    ],
  },
  {
    slug: "marek-lewandowski",
    name: "Marek Lewandowski",
    firm: "LWD Tax, München",
    city: "München",
    fit: 88,
    blurb: "Steuerberatung für Startups: ELSTER, EÜR/GmbH, Forschungszulage, Cap-Table-Steuern.",
    why: [
      "Startup-Steuer-Spezialist mit 60+ aktiven Mandanten.",
      "Forschungszulage-Anträge — durchschn. €38k pro Mandant freigeschaltet.",
      "Cap-Table-Beratung bei VSOP/ESOP-Ausgabe.",
    ],
    specialties: [
      { label: "GmbH-Buchhaltung", level: 0.95 },
      { label: "Forschungszulage", level: 0.9 },
      { label: "VSOP / ESOP Steuern", level: 0.85 },
      { label: "Internationale Holding", level: 0.7 },
    ],
    packages: [
      { name: "Monats-Buchhaltung", price: "ab €390 / Mo", desc: "Laufende Buchführung, USt-Voranmeldung, Reporting." },
      { name: "Forschungszulage", price: "15% Erfolg", desc: "Antrag, Begründung, Begleitung bis Auszahlung." },
    ],
    vouches: [
      { from: "Felix K.", role: "Founder, Cohort.io", quote: "Hat uns €42k Forschungszulage gesichert — innerhalb von 6 Monaten." },
    ],
  },
];
