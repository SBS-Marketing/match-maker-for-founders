import { GENERATED_GRANTS } from "./grants.generated";

export type Grant = {
  slug: string;
  name: string;
  body: string;
  amount: string;
  duration: string;
  deadline: string;
  fit: number;
  prefilled: number;
  summary: string;
  region?: string;
  category?: string;
  stage?: string[];
  sourceUrl?: string;
  applyUrl?: string;
  scrapeStatus?: "ok" | "error";
  eligibility: { item: string; ok: boolean | "warn"; note?: string }[];
  timeline: { phase: string; weeks: string; desc: string }[];
  materials: { item: string; done: boolean }[];
};

const FALLBACK_GRANTS: Grant[] = [
  {
    slug: "exist",
    name: "EXIST-Gründerstipendium",
    body: "BMWK · DLR Projektträger",
    amount: "€125.000",
    duration: "12 Monate",
    deadline: "28. Mai 2026",
    fit: 89,
    prefilled: 78,
    summary:
      "Drei Personen, 12 Monate Stipendium plus Sach- und Coaching-Mittel. Passt zu Pre-Seed-Teams mit innovativem Tech-Kern und Universitäts-Anbindung.",
    eligibility: [
      { item: "Innovativer Tech-Kern", ok: true, note: "B2B-SaaS mit ML-Score: erfüllt." },
      { item: "Hochschul-Anbindung", ok: true, note: "TU Berlin als Trägerhochschule bestätigt." },
      { item: "Team max. 3 Personen", ok: true },
      { item: "Noch keine GmbH gegründet", ok: "warn", note: "Du planst Q3-Gründung — Antrag muss vorher raus." },
      { item: "Kein Hauptberuf > 5h/Wo", ok: true },
    ],
    timeline: [
      { phase: "Antrag finalisieren", weeks: "Wo 1–2", desc: "3 fehlende Felder, Letter of Intent der Hochschule." },
      { phase: "Einreichung", weeks: "Wo 3", desc: "DLR-Portal, Co-Pilot prüft Formalia." },
      { phase: "Begutachtung", weeks: "Wo 4–14", desc: "Fachgutachten, ggf. Rückfragen." },
      { phase: "Bewilligung & Start", weeks: "Wo 15", desc: "Auszahlung, Coaching-Termine." },
    ],
    materials: [
      { item: "Ideenpapier (5 Seiten)", done: true },
      { item: "CV aller Founder", done: true },
      { item: "Finanzplan 12 Mo", done: true },
      { item: "Letter of Intent Hochschule", done: false },
      { item: "Innovationsbeschreibung", done: false },
    ],
  },
  {
    slug: "profit",
    name: "ProFIT Berlin",
    body: "IBB · Investitionsbank Berlin",
    amount: "bis €1.5M",
    duration: "24 Monate",
    deadline: "Rollierend",
    fit: 76,
    prefilled: 45,
    summary:
      "Förderkredit + Zuschuss für Berlin-basierte FuE-Vorhaben. Passt nach EXIST als Anschluss-Finanzierung.",
    eligibility: [
      { item: "Sitz / Vorhaben in Berlin", ok: true },
      { item: "FuE-Anteil > 25%", ok: true },
      { item: "Eigenanteil 30%", ok: "warn", note: "Co-Investoren empfohlen — Co-Pilot hat 4 Angels vorgeschlagen." },
    ],
    timeline: [
      { phase: "Skizze", weeks: "Wo 1–3", desc: "IBB-Gespräch, Skizze einreichen." },
      { phase: "Vollantrag", weeks: "Wo 4–10", desc: "Detailplan, Gutachten." },
      { phase: "Bewilligung", weeks: "Wo 11–16", desc: "Vertrag & Auszahlung." },
    ],
    materials: [
      { item: "Projektskizze", done: true },
      { item: "Finanzplan 24 Mo", done: false },
      { item: "Co-Investoren-LoI", done: false },
    ],
  },
];

export const GRANTS: Grant[] = GENERATED_GRANTS.length > 0 ? GENERATED_GRANTS : FALLBACK_GRANTS;
