// matchfoundr · Founder Radar Edge Function
// Creates a board-style readiness brief from the native workspace context.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = Deno.env.get("FOUNDER_RADAR_MODEL") || "anthropic/claude-sonnet-4-6";

type PlannerKind = "focus" | "meeting" | "document" | "funding" | "legal" | "profile" | "match";
type PlannerTarget =
  | "chats"
  | "swipe"
  | "guides"
  | "events"
  | "company"
  | "documents"
  | "calendar"
  | "startup"
  | "pilot"
  | "profile";

type RadarSource = "live" | "local";

type RadarSignal = {
  id: string;
  label: string;
  score: number;
  note: string;
  trend: string;
};

type RadarMove = {
  id: string;
  title: string;
  reason: string;
  due_label: string;
  kind: PlannerKind;
  target: PlannerTarget;
  success_metric: string;
};

type FounderRadarBrief = {
  id: string;
  title: string;
  verdict: string;
  overall_score: number;
  urgency: string;
  generated_at: string;
  source: RadarSource;
  primary_risk: string;
  hidden_opportunity: string;
  investor_question: string;
  signals: RadarSignal[];
  moves: RadarMove[];
};

type RadarMemory = {
  founder_name: string;
  role: string;
  venture_name: string;
  industry: string;
  stage: string;
  location: string;
  idea: string;
  next_step: string;
  open_documents: string[];
  document_progress: string;
};

type RadarMatch = {
  name: string;
  role: string;
  city: string;
  match_percent: number;
  messages: number;
};

type RadarTeam = {
  name: string;
  role: string;
  focus: string;
};

type RadarPartner = {
  name: string;
  service: string;
  fit: number;
  blurb: string;
};

type RadarRequest = {
  mobile_client: boolean;
  memory: RadarMemory;
  signals: RadarSignal[];
  open_items: string[];
  matches: RadarMatch[];
  team: RadarTeam[];
  partners: RadarPartner[];
};

const allowedKinds = new Set<PlannerKind>(["focus", "meeting", "document", "funding", "legal", "profile", "match"]);
const allowedTargets = new Set<PlannerTarget>([
  "chats",
  "swipe",
  "guides",
  "events",
  "company",
  "documents",
  "calendar",
  "startup",
  "pilot",
  "profile",
]);

function obj(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function arr(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function num(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function bool(value: unknown): boolean {
  return value === true || value === "true";
}

function pick(source: Record<string, unknown>, snake: string, camel: string): unknown {
  return source[snake] ?? source[camel];
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function uuid(value: unknown): string {
  const candidate = str(value);
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(candidate)
    ? candidate
    : crypto.randomUUID();
}

function normalizeSignal(value: unknown, fallbackId: string): RadarSignal {
  const input = obj(value);
  return {
    id: str(input.id, fallbackId),
    label: str(input.label, "Signal"),
    score: clampScore(num(input.score, 50)),
    note: str(input.note, "Noch nicht genug Kontext."),
    trend: str(input.trend, "offen"),
  };
}

function normalizeMove(value: unknown, fallback: RadarMove): RadarMove {
  const input = obj(value);
  const rawKind = str(input.kind, fallback.kind) as PlannerKind;
  const rawTarget = str(input.target, fallback.target) as PlannerTarget;
  return {
    id: uuid(input.id),
    title: str(input.title, fallback.title).slice(0, 96),
    reason: str(input.reason, fallback.reason).slice(0, 220),
    due_label: str(pick(input, "due_label", "dueLabel"), fallback.due_label).slice(0, 40),
    kind: allowedKinds.has(rawKind) ? rawKind : fallback.kind,
    target: allowedTargets.has(rawTarget) ? rawTarget : fallback.target,
    success_metric: str(pick(input, "success_metric", "successMetric"), fallback.success_metric).slice(0, 180),
  };
}

function normalizeRequest(rawBody: unknown): RadarRequest {
  const raw = obj(rawBody);
  const memoryRaw = obj(raw.memory);
  return {
    mobile_client: bool(pick(raw, "mobile_client", "mobileClient")),
    memory: {
      founder_name: str(pick(memoryRaw, "founder_name", "founderName"), "Founder"),
      role: str(memoryRaw.role, "Founder"),
      venture_name: str(pick(memoryRaw, "venture_name", "ventureName"), "Vorhaben"),
      industry: str(memoryRaw.industry, "Startup"),
      stage: str(memoryRaw.stage, "Validierung"),
      location: str(memoryRaw.location, "DACH"),
      idea: str(memoryRaw.idea, "Noch keine Idee hinterlegt"),
      next_step: str(pick(memoryRaw, "next_step", "nextStep"), "nächsten beweisbaren Schritt festlegen"),
      open_documents: arr(pick(memoryRaw, "open_documents", "openDocuments")).map((item) => str(item)).filter(Boolean),
      document_progress: str(pick(memoryRaw, "document_progress", "documentProgress"), "0/0"),
    },
    signals: arr(raw.signals).map((item, index) => normalizeSignal(item, `signal-${index}`)).slice(0, 6),
    open_items: arr(pick(raw, "open_items", "openItems")).map((item) => str(item)).filter(Boolean).slice(0, 10),
    matches: arr(raw.matches).map((item) => {
      const input = obj(item);
      return {
        name: str(input.name, "Match"),
        role: str(input.role, "Rolle offen"),
        city: str(input.city, "DACH"),
        match_percent: clampScore(num(pick(input, "match_percent", "matchPercent"), 0)),
        messages: Math.max(0, Math.round(num(input.messages, 0))),
      };
    }).slice(0, 8),
    team: arr(raw.team).map((item) => {
      const input = obj(item);
      return {
        name: str(input.name, "Team"),
        role: str(input.role, "Rolle offen"),
        focus: str(input.focus, "Noch zu klären"),
      };
    }).slice(0, 8),
    partners: arr(raw.partners).map((item) => {
      const input = obj(item);
      return {
        name: str(input.name, "Partner"),
        service: str(input.service, "Service"),
        fit: clampScore(num(input.fit, 0)),
        blurb: str(input.blurb, "Partnerprofil"),
      };
    }).slice(0, 10),
  };
}

function signalScore(request: RadarRequest, id: string, fallback: number): number {
  return request.signals.find((signal) => signal.id === id)?.score ?? fallback;
}

function fallbackMoves(request: RadarRequest): RadarMove[] {
  const memory = request.memory;
  const missingDoc = memory.open_documents[0] || "wichtigsten Nachweis";
  const topMatch = request.matches.sort((a, b) => b.match_percent - a.match_percent)[0];
  const partner = request.partners.sort((a, b) => b.fit - a.fit)[0];

  const moves: RadarMove[] = [
    {
      id: crypto.randomUUID(),
      title: `Board-Beweis für ${memory.venture_name} festlegen`,
      reason: "Der nächste Fortschritt muss für ein fremdes Match, einen Partner oder Investor prüfbar sein.",
      due_label: "Heute",
      kind: "focus",
      target: "startup",
      success_metric: "Eine konkrete Zahl, Zusage oder Arbeitsprobe ist definiert.",
    },
    {
      id: crypto.randomUUID(),
      title: `${missingDoc} mit Co-Pilot schließen`,
      reason: "Der offenste Nachweis ist der schnellste Hebel für Glaubwürdigkeit in Gesprächen.",
      due_label: "Morgen",
      kind: "document",
      target: "documents",
      success_metric: "Ein erster Entwurf ist geschrieben und als offenster Punkt entfernt.",
    },
  ];

  if (topMatch) {
    moves.push({
      id: crypto.randomUUID(),
      title: `Trial-Frage an ${topMatch.name}`,
      reason: `Der Fit liegt bei ${topMatch.match_percent} Prozent. Jetzt muss Arbeitsstil statt Sympathie geprüft werden.`,
      due_label: "Diese Woche",
      kind: "match",
      target: "chats",
      success_metric: "15-Minuten-Call oder 7-Tage-Test ist konkret vorgeschlagen.",
    });
  } else if (partner) {
    moves.push({
      id: crypto.randomUUID(),
      title: `${partner.service}-Briefing mit ${partner.name}`,
      reason: "Ein kurzes Partnerbriefing kann die Lücke schneller schliessen als weiteres Recherchieren.",
      due_label: "Diese Woche",
      kind: "meeting",
      target: "calendar",
      success_metric: "Gesprächsziel und kleinster sinnvoller Test sind festgelegt.",
    });
  } else {
    moves.push({
      id: crypto.randomUUID(),
      title: "Co-Founder Lücke als Scorecard formulieren",
      reason: "Ohne konkrete Lücke bleibt Matching zu spielerisch und zu wenig arbeitsnah.",
      due_label: "Diese Woche",
      kind: "match",
      target: "swipe",
      success_metric: "Eine Rolle, drei Muss-Kriterien und ein Trial Sprint stehen.",
    });
  }

  return moves;
}

function fallbackBrief(request: RadarRequest): FounderRadarBrief {
  const proof = signalScore(request, "proof", 42 + Math.max(0, 5 - request.memory.open_documents.length) * 10);
  const market = signalScore(request, "market", 44 + Math.min(request.matches.length, 4) * 8 + Math.min(request.partners.length, 2) * 6);
  const teamBase = request.team.length > 1 ? 68 : request.matches.some((match) => match.messages > 0) ? 62 : 48;
  const team = signalScore(request, "team", teamBase);
  const execution = signalScore(request, "execution", 60 + Math.max(0, 5 - request.open_items.length) * 5);
  const overall = clampScore((proof + market + team + execution) / 4);
  const memory = request.memory;
  const topMatch = request.matches.sort((a, b) => b.match_percent - a.match_percent)[0];
  const topPartner = request.partners.sort((a, b) => b.fit - a.fit)[0];
  const missingDoc = memory.open_documents[0];

  const verdict = overall >= 78
    ? `${memory.venture_name} ist bereit für einen engen 7-Tage-Test mit klarer Erfolgsmessung.`
    : overall >= 62
      ? `${memory.venture_name} hat Substanz, braucht aber einen sichtbaren Beweis statt weiterer Planung.`
      : `${memory.venture_name} braucht jetzt Klarheit bei Beweis, Teamlücke und nächster Entscheidung.`;

  const primaryRisk = missingDoc
    ? `${missingDoc} ist offen. Dadurch wirken Partner-, Förder- und Match-Gespräche noch zu weich.`
    : topMatch && topMatch.messages === 0
      ? `${topMatch.name} ist ein gutes Signal, aber noch kein Arbeitsbeweis. Der Trial muss konkret werden.`
      : "Die nächsten Schritte sind vorhanden, aber Erfolgskriterien sind noch nicht hart genug formuliert.";

  const hiddenOpportunity = topMatch
    ? `${topMatch.name} kann als kleiner Co-Founder Trial geprüft werden: Rolle, Tempo und Arbeitsprobe statt langer Chat.`
    : topPartner
      ? `${topPartner.name} kann als externer Hebel dienen, wenn du vorab Ziel, Unterlagen und Entscheidungsfrage klärst.`
      : "Dein Kalender kann Unterlagen, Matching und Team in einen 7-Tage-Sprint bündeln.";

  return {
    id: crypto.randomUUID(),
    title: `Founder Radar · ${memory.venture_name}`,
    verdict,
    overall_score: overall,
    urgency: overall >= 72 ? "Diese Woche entscheiden" : "Heute fokussieren",
    generated_at: new Date().toISOString(),
    source: "live",
    primary_risk: primaryRisk,
    hidden_opportunity: hiddenOpportunity,
    investor_question: `Welcher messbare Beweis entsteht in den nächsten 7 Tagen, der ${memory.venture_name} glaubwürdiger macht?`,
    signals: [
      { id: "proof", label: "Beweis", score: clampScore(proof), note: `${memory.document_progress} Unterlagen · ${memory.open_documents.length} offen`, trend: proof >= 70 ? "steigt" : "offen" },
      { id: "market", label: "Markt", score: clampScore(market), note: `${request.matches.length} Matches · ${request.partners.length} Partner`, trend: market >= 70 ? "aktiv" : "leise" },
      { id: "team", label: "Team", score: clampScore(team), note: topMatch ? `${topMatch.name} mit ${topMatch.match_percent}% Fit` : `${request.team.length} Teamrollen hinterlegt`, trend: team >= 70 ? "Signal" : "Lücke" },
      { id: "execution", label: "Tempo", score: clampScore(execution), note: `${request.open_items.length} offene Schritte im Plan`, trend: execution >= 70 ? "klar" : "zerstreut" },
    ],
    moves: fallbackMoves(request),
  };
}

function buildPrompt(request: RadarRequest, draft: FounderRadarBrief): string {
  return `
Du bist ein kritischer Startup-Operator in einer nativen Founder-Matching-App. Erstelle einen knappen, board-tauglichen Founder Radar Brief.

Ziel: Der Brief muss besser sein als ein normaler Chat-Prompt, weil er die App-Daten in konkrete Steuerung uebersetzt: Risiko, Chance, Investorfrage, Signale und exakt 3 ausfuehrbare Moves.

Gib ausschliesslich valides JSON mit genau diesen Keys zurueck:
id, title, verdict, overall_score, urgency, generated_at, source, primary_risk, hidden_opportunity, investor_question, signals, moves.

Regeln:
- source immer "live".
- overall_score 0 bis 100.
- signals: 4 Objekte mit id, label, score, note, trend.
- moves: 3 Objekte mit id, title, reason, due_label, kind, target, success_metric.
- kind nur: focus, meeting, document, funding, legal, profile, match.
- target nur: chats, swipe, guides, events, company, documents, calendar, startup, pilot, profile.
- Keine Markdown-Fences.
- Deutsch, konkret, ohne Floskeln.

App-Kontext:
${JSON.stringify(request, null, 2)}

Deterministischer Entwurf, den du verbessern und schaerfen darfst:
${JSON.stringify(draft, null, 2)}
`.trim();
}

async function callOpenRouter(prompt: string): Promise<unknown | null> {
  const key = Deno.env.get("OPENROUTER_API_KEY");
  if (!key) return null;

  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      "HTTP-Referer": "https://matchfoundr.com",
      "X-Title": "matchfoundr Founder Radar",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.35,
      max_tokens: 1800,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${JSON.stringify(data)}`);
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string") return null;
  const cleaned = content.replace(/^\s*```(?:json)?/i, "").replace(/```\s*$/i, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return JSON.parse(match[0]);
  }
}

function sanitizeBrief(value: unknown, fallback: FounderRadarBrief): FounderRadarBrief {
  const input = obj(value);
  const source = str(input.source, "live") as RadarSource;
  const signalsRaw = arr(input.signals);
  const movesRaw = arr(input.moves);
  const fallbackSignals = fallback.signals;
  const fallbackMovesList = fallback.moves;

  return {
    id: uuid(input.id),
    title: str(input.title, fallback.title).slice(0, 90),
    verdict: str(input.verdict, fallback.verdict).slice(0, 240),
    overall_score: clampScore(num(pick(input, "overall_score", "overallScore"), fallback.overall_score)),
    urgency: str(input.urgency, fallback.urgency).slice(0, 80),
    generated_at: str(pick(input, "generated_at", "generatedAt"), new Date().toISOString()),
    source: source === "local" ? "local" : "live",
    primary_risk: str(pick(input, "primary_risk", "primaryRisk"), fallback.primary_risk).slice(0, 260),
    hidden_opportunity: str(pick(input, "hidden_opportunity", "hiddenOpportunity"), fallback.hidden_opportunity).slice(0, 260),
    investor_question: str(pick(input, "investor_question", "investorQuestion"), fallback.investor_question).slice(0, 180),
    signals: fallbackSignals.map((signal, index) => normalizeSignal(signalsRaw[index] ?? signal, signal.id)),
    moves: fallbackMovesList.map((move, index) => normalizeMove(movesRaw[index] ?? move, move)),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const rawBody = await req.json();
    const request = normalizeRequest(rawBody);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("Authorization");
    const {
      data: { user },
      error: authError,
    } = authHeader
      ? await supabase.auth.getUser(authHeader.replace("Bearer ", ""))
      : { data: { user: null }, error: new Error("missing auth") };

    if ((authError || !user) && !request.mobile_client) {
      return new Response(JSON.stringify({ message: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const draft = fallbackBrief(request);
    let brief = draft;

    try {
      const ai = await callOpenRouter(buildPrompt(request, draft));
      if (ai) brief = sanitizeBrief(ai, draft);
    } catch (error) {
      console.warn("[founder-radar] AI fallback", error instanceof Error ? error.message : String(error));
    }

    if (user) {
      await supabase.from("founder_radar_briefs").insert({
        id: brief.id,
        user_id: user.id,
        title: brief.title,
        overall_score: brief.overall_score,
        verdict: brief.verdict,
        urgency: brief.urgency,
        primary_risk: brief.primary_risk,
        hidden_opportunity: brief.hidden_opportunity,
        investor_question: brief.investor_question,
        signals: brief.signals,
        moves: brief.moves,
        source: brief.source,
        created_at: brief.generated_at,
      });
    }

    return new Response(JSON.stringify(brief), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ message: error instanceof Error ? error.message : "Founder Radar failed" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
