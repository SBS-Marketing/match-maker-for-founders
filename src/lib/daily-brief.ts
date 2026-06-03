// ─────────────────────────────────────────────────────────────
// Tageszusammenfassung (Daily Brief)
// Backend liefert via copilot/daily_brief einen KI-Text; offline/Fallback
// bauen wir den Brief lokal aus Plan-Kontext, Förderung und offenen Tasks.
// Pro Tag in localStorage gecacht, damit nicht jeder Seitenaufruf das LLM ruft.
// ─────────────────────────────────────────────────────────────

export type DailyBriefData = {
  highlight: string;
  body?: string;
  actions: string[];
  source: "copilot" | "local";
  generatedAt: string;
};

const BRIEF_CACHE_PREFIX = "mf_daily_brief_v1:";

export type LocalBriefInput = {
  firstName: string;
  openCount: number;
  completedCount: number;
  totalTasks: number;
  grantName?: string;
  grantDeadline?: string;
  idea?: string;
  goal?: string;
  risk?: string;
  nextFocus?: string;
};

export function buildLocalDailyBrief(input: LocalBriefInput): DailyBriefData {
  const idea = (input.idea || "").trim();
  const goal = (input.goal || "").trim();
  const risk = (input.risk || "").trim();

  const highlight =
    input.openCount > 0
      ? `${input.openCount} offene Aufgabe${input.openCount === 1 ? "" : "n"} heute${
          input.nextFocus ? ` — Fokus: ${input.nextFocus}` : ""
        }`
      : input.totalTasks > 0
        ? "Alle Daily-Actions erledigt. Zieh die nächste Priorität aus deinem Plan nach."
        : "Noch keine Tasks für heute — öffne deinen Plan, um zu starten.";

  const actions: string[] = [];
  if (input.nextFocus) actions.push(input.nextFocus);
  if (input.grantName) {
    actions.push(
      `${input.grantName} prüfen${input.grantDeadline ? ` (Deadline ${input.grantDeadline})` : ""}`,
    );
  }
  if (goal) actions.push(`Auf dein Ziel einzahlen: ${goal}`);
  if (risk) actions.push(`Risiko im Blick behalten: ${risk}`);

  const body = idea
    ? `Stand: ${idea}. ${
        input.completedCount > 0
          ? `${input.completedCount} von ${input.totalTasks} schon erledigt.`
          : "Such dir die wichtigste Sache aus und zieh sie heute durch."
      }`
    : undefined;

  return {
    highlight,
    body,
    actions: actions.slice(0, 4),
    source: "local",
    generatedAt: new Date().toISOString(),
  };
}

export function readCachedBrief(dateKey: string): DailyBriefData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`${BRIEF_CACHE_PREFIX}${dateKey}`);
    return raw ? (JSON.parse(raw) as DailyBriefData) : null;
  } catch {
    return null;
  }
}

export function writeCachedBrief(dateKey: string, data: DailyBriefData): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${BRIEF_CACHE_PREFIX}${dateKey}`, JSON.stringify(data));
  } catch {
    // localStorage kann in restriktiven Browser-Modi fehlen.
  }
}

// Normalisiert die copilot/daily_brief-Antwort in DailyBriefData.
export function parseCopilotBrief(data: unknown): DailyBriefData | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  const brief = typeof d.brief === "string" ? d.brief.trim() : "";
  const raw = (d.raw && typeof d.raw === "object" ? d.raw : {}) as Record<string, unknown>;
  const highlight =
    typeof raw.highlight === "string" && raw.highlight.trim()
      ? raw.highlight.trim()
      : brief.split("\n")[0]?.trim() || "Dein Tagesüberblick steht.";
  const actions = Array.isArray(raw.empfohlene_aktionen)
    ? raw.empfohlene_aktionen.filter((a): a is string => typeof a === "string").slice(0, 4)
    : [];
  if (!brief && !highlight) return null;
  return {
    highlight,
    body: brief && brief !== highlight ? brief : undefined,
    actions,
    source: "copilot",
    generatedAt: new Date().toISOString(),
  };
}
