// Die eine Quelle für „der Plan".
//
// Vorher hat jeder Aufrufer seine eigene Kaskade gebaut: `/plan` inline mit
// localStorage-Cache, `/heute` direkt über `buildLocalPlanSlides()` (also
// immer Template, auch im Erfolgsfall). Ergebnis: derselbe Nutzer sah auf
// zwei Seiten zwei verschiedene „erste Schritte".
//
// Hier wird die Reihenfolge einmal festgelegt und die Quelle mitgeführt,
// damit Aufrufer unterscheiden können, ob sie echtes Modell-Ergebnis oder
// nur den Notfall-Entwurf in der Hand haben:
//
//   1. localStorage-Cache          → "cache"
//   2. neuester `pitch_outline`    → "document"   (überlebt Cache-Leerung
//      aus `copilot_documents`                     und Gerätewechsel)
//   3. `plan_generate` (Copilot)   → "model"
//   4. lokaler Template-Entwurf    → "fallback"
//
// Schritt 2 liest, was `copilot/index.ts` beim `plan_generate`-Lauf längst
// schreibt und bis jetzt niemand zurückgelesen hat.

import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import {
  PLAN_CACHE_KEY,
  buildLocalPlanSlides,
  readPlanContext,
  type PlanContext,
  type PlanSlide,
} from "@/lib/plan-draft";

export type PlanSource = "cache" | "document" | "model" | "fallback";

export type ResolvedPlan = {
  slides: PlanSlide[];
  source: PlanSource;
};

export type PlanAuth = {
  user: { id: string } | null;
  session: unknown | null;
  isDemo: boolean;
};

export type ResolvePlanOptions = {
  auth: PlanAuth;
  /** Onboarding-Kontext; wird sonst aus dem localStorage gelesen. */
  context?: PlanContext | null;
  /**
   * Darf `plan_generate` angestoßen werden? Nur `/plan` tut das — ein
   * Dashboard-Aufruf soll keinen ~20-Sekunden-Modell-Lauf auslösen.
   */
  allowGenerate?: boolean;
  /**
   * Darf der lokale Template-Entwurf als Ergebnis gelten? `/heute` sagt
   * hier `false`: ohne echten Plan wird die Plan-Aufgabe gar nicht erzeugt,
   * statt still Template-Text in `daily_tasks` zu schreiben.
   */
  allowFallback?: boolean;
  /** Abbruch-Prüfung für abgeräumte Effects. */
  cancelled?: () => boolean;
};

export async function resolvePlan(opts: ResolvePlanOptions): Promise<ResolvedPlan | null> {
  const { auth, allowGenerate = true, allowFallback = true } = opts;
  const isCancelled = opts.cancelled ?? (() => false);
  const context = opts.context !== undefined ? opts.context : readPlanContext();

  // 1. Cache
  const cached = readCachedPlan();
  if (cached) return cached;

  const authed = Boolean(auth.user && auth.session && !auth.isDemo);
  const userId = auth.user?.id ?? null;

  // 2. Server-Dokument
  if (authed && userId) {
    const fromDocument = await readLatestPlanDocument(userId);
    if (isCancelled()) return null;
    if (fromDocument) {
      writeCachedPlanSlides(fromDocument);
      return { slides: fromDocument, source: "document" };
    }
  }

  // 3. plan_generate
  if (authed && allowGenerate) {
    const fromModel = await generatePlan(context);
    if (isCancelled()) return null;
    if (fromModel) {
      writeCachedPlanSlides(fromModel);
      return { slides: fromModel, source: "model" };
    }
  }

  // 4. Lokaler Template-Entwurf
  if (!allowFallback) return null;
  const fallback = filterPlanSlides(buildLocalPlanSlides(context));
  return fallback.length > 0 ? { slides: fallback, source: "fallback" } : null;
}

// ─── Cache ────────────────────────────────────────────────────

export function readCachedPlan(): ResolvedPlan | null {
  const slides = readCachedPlanSlides();
  return slides ? { slides, source: "cache" } : null;
}

export function readCachedPlanSlides(): PlanSlide[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PLAN_CACHE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const slides = filterPlanSlides(parsed.filter(isPlanSlide));
    return slides.length > 0 ? slides : null;
  } catch {
    return null;
  }
}

export function writeCachedPlanSlides(slides: PlanSlide[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PLAN_CACHE_KEY, JSON.stringify(slides));
  } catch {
    // localStorage kann in privaten Browser-Modi fehlen — kein Grund zu scheitern.
  }
}

// ─── Server-Dokument ──────────────────────────────────────────

async function readLatestPlanDocument(userId: string): Promise<PlanSlide[] | null> {
  const { data, error } = await supabase
    .from("copilot_documents")
    .select("id, content, created_at")
    .eq("user_id", userId)
    .eq("type", "pitch_outline")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(
      `[plan] copilot_documents nicht lesbar (${error.code}: ${error.message}).`,
      error,
    );
    return null;
  }
  if (!data?.content) return null;

  const slides = filterPlanSlides(parsePlanSlides(data.content));
  if (slides.length === 0) {
    console.error(
      `[plan] Dokument ${data.id} (${data.created_at}) enthält keine verwertbaren Slides — Inhalt vermutlich abgeschnitten.`,
    );
    return null;
  }
  return slides;
}

// ─── plan_generate ────────────────────────────────────────────

async function generatePlan(context: PlanContext | null): Promise<PlanSlide[] | null> {
  try {
    const { data, error } = await supabase.functions.invoke("copilot", {
      body: { task: "plan_generate", message: "", extra: { onboarding: context } },
    });
    if (error) throw error;
    const raw: unknown = (data as { slides?: unknown } | null)?.slides;
    const slides = filterPlanSlides(Array.isArray(raw) ? raw.filter(isPlanSlide) : []);
    if (slides.length === 0) {
      console.error("[plan] Copilot lieferte eine leere Antwort ohne Slides.", data);
      return null;
    }
    return slides;
  } catch (e) {
    console.error(`[plan] Copilot-Aufruf fehlgeschlagen (${await describeCopilotFailure(e)}).`, e);
    return null;
  }
}

// Baut aus dem geworfenen Fehler eine Zeile mit Statuscode/Ursache statt
// eines verschluckten catch — damit im Log wirklich steht, warum der
// Copilot-Aufruf für plan_generate nicht durchkam.
export async function describeCopilotFailure(e: unknown): Promise<string> {
  if (e instanceof FunctionsHttpError) {
    let body = "";
    try {
      body = await e.context.clone().text();
    } catch {
      /* Response evtl. bereits gelesen. */
    }
    return `HTTP ${e.context.status} ${e.context.statusText}${body ? ` — ${body.slice(0, 300)}` : ""}`;
  }
  if (e instanceof Error) return `${e.name}: ${e.message}`;
  return String(e);
}

// ─── Slides parsen, prüfen, filtern ───────────────────────────

/**
 * `copilot_documents.content` ist die **rohe** Modellausgabe: meist in einem
 * ```json-Block, gelegentlich mitten im Satz abgeschnitten (die vier
 * Live-Zeilen vom 03.06.2026 sind alle unvollständig). Deshalb erst ein
 * normaler Parse, dann Bergung der vollständigen Objekte aus dem Rest —
 * ein halber Plan ist mehr wert als gar keiner.
 */
export function parsePlanSlides(raw: string): PlanSlide[] {
  if (!raw || !raw.trim()) return [];
  const cleaned = stripFences(raw);

  const direct = toSlideArray(safeParse(cleaned));
  if (direct.length > 0) return direct;

  const bracketed = cleaned.match(/\[[\s\S]*\]/);
  if (bracketed) {
    const arr = toSlideArray(safeParse(bracketed[0]));
    if (arr.length > 0) return arr;
  }

  return salvageObjects(cleaned).filter(isPlanSlide);
}

function stripFences(text: string): string {
  return text
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function toSlideArray(parsed: unknown): PlanSlide[] {
  const raw = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === "object" && Array.isArray((parsed as { slides?: unknown }).slides)
      ? ((parsed as { slides: unknown[] }).slides as unknown[])
      : [];
  return raw.filter(isPlanSlide);
}

/**
 * Läuft einmal durch den Text und schneidet auf Tiefe 0 geschlossene
 * `{…}`-Blöcke heraus. Ein am Ende offener Block (Abschneide-Fall) wird
 * verworfen, alles davor bleibt nutzbar.
 */
function salvageObjects(text: string): unknown[] {
  const out: unknown[] = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "{") {
      if (depth === 0) start = i;
      depth++;
      continue;
    }
    if (ch === "}") {
      if (depth === 0) continue;
      depth--;
      if (depth === 0 && start >= 0) {
        const parsed = safeParse(text.slice(start, i + 1));
        if (parsed !== null) out.push(parsed);
        start = -1;
      }
    }
  }
  return out;
}

const SLIDE_TYPES = new Set(["headline", "situation", "track", "first_step", "dealbreaker"]);

export function isPlanSlide(value: unknown): value is PlanSlide {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const s = value as Record<string, unknown>;
  if (typeof s.type !== "string" || !SLIDE_TYPES.has(s.type)) return false;
  switch (s.type) {
    case "headline":
      return isText(s.title);
    case "situation":
      return isText(s.text);
    case "track":
      return typeof s.nummer === "number" && isText(s.title);
    case "first_step":
      return isText(s.action);
    case "dealbreaker":
      return "risk" in s;
    default:
      return false;
  }
}

function isText(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

/** Leere/"null"-Dealbreaker rauswerfen — sonst steht eine tote Slide im Deck. */
export function filterPlanSlides(slides: PlanSlide[]): PlanSlide[] {
  return slides.filter((s) => {
    if (s.type !== "dealbreaker") return true;
    const r = s.risk;
    if (r === null || r === undefined) return false;
    const txt = String(r).trim().toLowerCase();
    return txt !== "" && txt !== "null" && txt !== "keins" && txt !== "kein risiko";
  });
}

export type FirstStepSlide = Extract<PlanSlide, { type: "first_step" }>;

export function firstStepOf(slides: PlanSlide[] | null | undefined): FirstStepSlide | undefined {
  return slides?.find((s): s is FirstStepSlide => s.type === "first_step");
}
