import type { AssessmentScores } from "../../onboarding/assessment";
import type { IndustryId } from "../../onboarding/industries";
import type { LookingFor } from "../../onboarding/skills";

export const PLAN_CACHE_KEY = "mf_plan_slides";
export const ONBOARDING_PLAN_CONTEXT_KEY = "mf_onboarding_plan_context_v1";

export type PlanSlide =
  | { type: "headline"; title: string; subtitle?: string; tag?: string }
  | { type: "situation"; label?: string; text: string }
  | {
      type: "track";
      nummer: number;
      label?: string;
      title: string;
      why?: string;
      steps?: string[];
      timeframe?: string;
      priority?: "hoch" | "mittel" | "niedrig";
    }
  | { type: "first_step"; label?: string; action: string; why?: string }
  | { type: "dealbreaker"; label?: string; risk: string | null; mitigation?: string };

export type PlanContext = {
  userName?: string;
  path: "founder" | "talent" | "hybrid" | null;
  industry: IndustryId | null;
  industryLabel?: string;
  ventureTerm?: string;
  partnerTerm?: string;
  copilotContext?: string;
  context: {
    idea?: string;
    role?: string;
    stage?: string;
    goal?: string;
    risk?: string;
  };
  skills?: {
    selected?: string[];
    categories?: string[];
    availability?: number;
    looking_for?: LookingFor[];
  };
  scores?: AssessmentScores;
  createdAt: string;
};

export function readPlanContext(): PlanContext | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ONBOARDING_PLAN_CONTEXT_KEY);
    return raw ? (JSON.parse(raw) as PlanContext) : null;
  } catch {
    return null;
  }
}

export function writePlanContext(context: PlanContext): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ONBOARDING_PLAN_CONTEXT_KEY, JSON.stringify(context));
    localStorage.removeItem(PLAN_CACHE_KEY);
  } catch {
    // localStorage can be unavailable in private or restricted browser modes.
  }
}

export function buildLocalPlanSlides(context: PlanContext | null): PlanSlide[] {
  const ctx = context?.context ?? {};
  const name = context?.userName || "Founder";
  const venture = context?.ventureTerm || "Vorhaben";
  const partner = context?.partnerTerm || "Partner";
  const idea = clean(ctx.idea) || `dein ${venture}`;
  const stage = clean(ctx.stage) || "frühe Phase";
  const goal = clean(ctx.goal) || "mehr Klarheit und den nächsten belastbaren Schritt";
  const risk = clean(ctx.risk);
  const isTalent = context?.path === "talent";
  const skills = context?.skills?.selected?.slice(0, 3).join(", ");

  const tracks: PlanSlide[] = isTalent
    ? [
        {
          type: "track",
          nummer: 1,
          label: "Spur 01",
          title: "Profil scharf stellen",
          why: skills
            ? `Deine stärksten Signale sind ${skills}; daraus braucht es ein klares Match-Profil.`
            : "Die besten Matches kommen, wenn deine Stärken und Verfügbarkeit klar sind.",
          steps: [
            "Top-3 Skills sichtbar machen",
            "Suchprofil mit Rollenwunsch ergänzen",
            "2 passende Founder aktiv anschreiben",
          ],
          timeframe: "7 Tage",
          priority: "hoch",
        },
        {
          type: "track",
          nummer: 2,
          label: "Spur 02",
          title: "Match-Gespräche qualifizieren",
          why: "Du brauchst schnell herausfinden, ob Rolle, Tempo und Risiko zueinander passen.",
          steps: [
            "15-Minuten Erstgespräch führen",
            "Erwartungen zu Equity/Zeit klären",
            "Nächstes Experiment vereinbaren",
          ],
          timeframe: "2 Wochen",
          priority: "mittel",
        },
        {
          type: "track",
          nummer: 3,
          label: "Spur 03",
          title: "Beitrag beweisen",
          why: "Ein kleines gemeinsames Ergebnis ist stärker als lange Kennenlern-Chats.",
          steps: [
            "Mini-Aufgabe definieren",
            "Arbeitsstil testen",
            "Entscheidung nach 7 Tagen treffen",
          ],
          timeframe: "2-3 Wochen",
          priority: "mittel",
        },
      ]
    : [
        {
          type: "track",
          nummer: 1,
          label: "Spur 01",
          title: `${venture} validieren`,
          why: `${idea} braucht jetzt klare Belege, dass Problem, Zielgruppe und Zahlungsbereitschaft zusammenpassen.`,
          steps: [
            "10 Zielkunden auswählen",
            "3 Problem-Interviews führen",
            "Eine scharfe Nutzenhypothese formulieren",
          ],
          timeframe: "7-10 Tage",
          priority: "hoch",
        },
        {
          type: "track",
          nummer: 2,
          label: "Spur 02",
          title: `${partner} oder Kernteam klären`,
          why: `Wenn du nicht alles allein abdecken willst, muss die fehlende Rolle früh sichtbar werden.`,
          steps: [
            "Fehlende Kernkompetenz benennen",
            "Match-Profil aktualisieren",
            "5 passende Gespräche starten",
          ],
          timeframe: "2 Wochen",
          priority: "mittel",
        },
        {
          type: "track",
          nummer: 3,
          label: "Spur 03",
          title: "Förderung und Ressourcen sichern",
          why: "Frühe Finanzierung nimmt Druck aus dem Aufbau und zwingt zu einem besseren Plan.",
          steps: [
            "Gründungszuschuss und regionale Programme prüfen",
            "Startkosten realistisch durchrechnen",
            "Kostenlose IHK/HWK-Gründungsberatung buchen",
          ],
          timeframe: "3 Wochen",
          priority: "mittel",
        },
      ];

  return [
    {
      type: "headline",
      title: `Dein Plan, ${name}.`,
      subtitle: `${idea} ist in der Phase "${stage}". Jetzt zählt: ${goal}.`,
      tag: "KI-Planentwurf",
    },
    {
      type: "situation",
      label: "Wo du stehst",
      text: `${stage}: Du hast genug Kontext für die nächsten Schritte, aber der Plan muss jetzt in konkrete Prüfungen, Gespräche und Unterlagen übersetzt werden.`,
    },
    ...tracks,
    {
      type: "first_step",
      label: "Diese Woche",
      action: isTalent
        ? "Schicke zwei sehr konkrete Match-Anfragen mit Rolle, Zeitbudget und deinem stärksten Beitrag."
        : "Schreibe eine Ein-Seiten-Skizze: Zielkunde, Problem, Lösung, nächster Beweis und benötigte Ressource.",
      why: "Das macht aus dem Onboarding-Kontext ein Arbeitsdokument, mit dem Co-Pilot, Matches und Förderlogik weiterarbeiten können.",
    },
    {
      type: "dealbreaker",
      label: "Im Blick behalten",
      risk:
        risk ||
        "Unklare Priorität: zu viele parallele Baustellen können die ersten echten Beweise verzögern.",
      mitigation: risk
        ? "Übersetze das Risiko in eine Deadline, einen Owner und den kleinsten nächsten Nachweis."
        : "Lege für die nächsten 7 Tage genau eine Hauptspur fest und parke alles andere sichtbar.",
    },
  ];
}

function clean(value?: string): string {
  return (value || "").trim();
}
