// ─────────────────────────────────────────────────────────────
// matchfoundr · Co-Pilot Edge Function
// Pipeline: Kimi K3 (chat single-shot, schneller) → Sonnet nur für Plan
// Routing via OpenRouter — one API key for both models
// ─────────────────────────────────────────────────────────────

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  answerWithoutCardDuplicates,
  normalizeCards,
  type CopilotCard,
} from "../_shared/cards.ts";
import {
  KIMI_PROMPTS,
  ROUTE_CATALOG,
  SONNET_PROMPTS,
  buildChatPolishPrompt,
  buildChatPrompt,
  buildInteractionPrompt,
  type ChatTurn,
  type FounderContext,
  type FounderDocument,
  type MCPConnector,
  type MCPLiveContext,
  type TaskType,
  type WebSource,
} from "./prompts.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
// Gemini Flash = schnelles Primärmodell für Chat (niedrige Latenz, gute Recherche).
// Kimi K3 = Schwerarbeit (Plan, Extraktion) + Chat-Fallback. Sonnet = letzter Fallback.
const GEMINI_MODEL = "google/gemini-2.5-flash";
const KIMI_MODEL = "moonshotai/kimi-k3";
const SONNET_MODEL = "anthropic/claude-sonnet-4-6";
const GEMINI_TIMEOUT_MS = 12_000;
// Kimi K3 timeoutet auf diesem OpenRouter-Konto derzeit ausnahmslos. Kurzer
// Timeout, damit Heavy-Tasks schnell auf den funktionierenden Sonnet fallen.
// Sobald k3-Zugang funktioniert, hier wieder erhöhen.
const KIMI_TIMEOUT_MS = 6_000;
const SONNET_TIMEOUT_MS = 22_000;

// ─── Token-Preise (USD pro 1M Tokens, Schätzwerte für Admin-Insights) ─
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  [GEMINI_MODEL]: { input: 0.1, output: 0.4 },
  [KIMI_MODEL]: { input: 0.6, output: 2.5 },
  [SONNET_MODEL]: { input: 3.0, output: 15.0 },
};

type UsageEntry = {
  model: string;
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
  status: "ok" | "timeout" | "error";
  fallback: boolean;
};
type UsageSink = (entry: UsageEntry) => void;
type DatabaseClient = {
  from: (relation: string) => any;
};
type TokenGrant = {
  user_id: string;
  token_limit: number;
  tokens_used: number;
  period: string;
  resets_at: string | null;
  note?: string;
  updated_at?: string;
};

function costUsd(entry: UsageEntry): number {
  const price = MODEL_PRICING[entry.model] ?? { input: 1, output: 4 };
  return (entry.promptTokens * price.input + entry.completionTokens * price.output) / 1_000_000;
}

function usageTokenCount(entries: UsageEntry[]): number {
  return entries.reduce((sum, entry) => sum + entry.promptTokens + entry.completionTokens, 0);
}

function tokenQuotaPayload(grant: TokenGrant) {
  const limit = Math.max(0, Number(grant.token_limit ?? 0));
  const used = Math.max(0, Number(grant.tokens_used ?? 0));
  return {
    token_limit: limit,
    tokens_used: used,
    tokens_remaining: Math.max(0, limit - used),
    period: grant.period || "monthly",
    resets_at: grant.resets_at,
  };
}

async function loadTokenGrant(
  supabase: DatabaseClient,
  userID: string,
): Promise<TokenGrant | null> {
  const { data, error } = await supabase
    .from("ai_token_grants")
    .select("user_id,token_limit,tokens_used,period,resets_at,note,updated_at")
    .eq("user_id", userID)
    .maybeSingle();

  if (error) {
    console.error("ai_token_grants load failed:", error.message);
    return null;
  }
  return data ? (data as TokenGrant) : null;
}

// ─── Generic OpenRouter call ─────────────────────────────────
async function callOpenRouter(
  model: string,
  prompt: string,
  maxTokens = 2048,
  timeoutMs = 30_000,
  sink?: UsageSink,
  jsonMode = false,
): Promise<string> {
  const controller = new AbortController();
  const timeoutID = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();

  try {
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("OPENROUTER_API_KEY")}`,
        "HTTP-Referer": "https://matchfoundr.com",
        "X-Title": "matchfoundr Co-Pilot",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: model === SONNET_MODEL ? 0.7 : 0.35,
        max_tokens: maxTokens,
        ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(`OpenRouter error (${model}): ${JSON.stringify(data)}`);
    const choice = data?.choices?.[0];
    if (choice?.finish_reason === "length") {
      throw new Error(`OpenRouter output truncated (${model}, max_tokens=${maxTokens})`);
    }
    if (sink) {
      sink({
        model,
        promptTokens: Number(data?.usage?.prompt_tokens ?? 0),
        completionTokens: Number(data?.usage?.completion_tokens ?? 0),
        latencyMs: Date.now() - startedAt,
        status: "ok",
        fallback: false,
      });
    }
    const content = choice?.message?.content;
    return typeof content === "string" ? content : content == null ? "" : JSON.stringify(content);
  } catch (err) {
    const isTimeout = err instanceof DOMException && err.name === "AbortError";
    if (sink) {
      sink({
        model,
        promptTokens: 0,
        completionTokens: 0,
        latencyMs: Date.now() - startedAt,
        status: isTimeout ? "timeout" : "error",
        fallback: false,
      });
    }
    if (isTimeout) throw new Error(`OpenRouter timeout (${model}) after ${timeoutMs}ms`);
    throw err;
  } finally {
    clearTimeout(timeoutID);
  }
}

type ResearchModelResult = {
  content: string;
  sources: WebSource[];
};

async function callResearchModel(prompt: string, maxTokens = 1400): Promise<ResearchModelResult> {
  const controller = new AbortController();
  const timeoutID = setTimeout(() => controller.abort(), 45_000);

  try {
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("OPENROUTER_API_KEY")}`,
        "HTTP-Referer": "https://matchfoundr.com",
        "X-Title": "matchfoundr Execution Agent",
      },
      body: JSON.stringify({
        model: GEMINI_MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        max_tokens: maxTokens,
        response_format: { type: "json_object" },
        plugins: [{ id: "web", engine: "exa", max_results: 5 }],
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(`OpenRouter research error: ${JSON.stringify(data)}`);
    }

    const message = data?.choices?.[0]?.message;
    const content =
      typeof message?.content === "string"
        ? message.content
        : message?.content == null
          ? ""
          : JSON.stringify(message.content);
    const sources = (Array.isArray(message?.annotations) ? message.annotations : [])
      .map((annotation: unknown) => {
        if (!isRecord(annotation) || annotation.type !== "url_citation") return null;
        const citation = isRecord(annotation.url_citation) ? annotation.url_citation : null;
        if (!citation) return null;
        return normalizeSource({
          type: "Web",
          title: citation.title,
          url: citation.url,
          snippet: citation.content,
        });
      })
      .filter((source: WebSource | null): source is WebSource => Boolean(source));

    return { content, sources: mergeSources(sources) };
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("OpenRouter research timeout after 45000ms");
    }
    throw err;
  } finally {
    clearTimeout(timeoutID);
  }
}

// ─── Convenience wrappers ────────────────────────────────────
const callGemini = (prompt: string, sink?: UsageSink, maxTokens = 1200, jsonMode = false) =>
  callOpenRouter(GEMINI_MODEL, prompt, maxTokens, GEMINI_TIMEOUT_MS, sink, jsonMode);
const callKimi = (prompt: string, sink?: UsageSink, maxTokens = 1024, jsonMode = false) =>
  callOpenRouter(KIMI_MODEL, prompt, maxTokens, KIMI_TIMEOUT_MS, sink, jsonMode);
const callSonnet = (prompt: string, sink?: UsageSink, maxTokens = 420, jsonMode = false) =>
  callOpenRouter(SONNET_MODEL, prompt, maxTokens, SONNET_TIMEOUT_MS, sink, jsonMode);

// Chat-Pfad: schnelles Gemini zuerst, dann direkt Sonnet.
// Kimi K3 ist bewusst NICHT im Chat-Pfad — es timeoutet auf diesem OpenRouter-
// Konto ausnahmslos (12s Verlust). Fallback wird als fallback:true geloggt.
async function callChatModel(prompt: string, sink?: UsageSink, maxTokens = 1200): Promise<string> {
  try {
    return await callGemini(prompt, sink, maxTokens, true);
  } catch (err) {
    console.warn(
      `[GEMINI chat fallback→sonnet] ${err instanceof Error ? err.message : String(err)}`,
    );
    const fb: UsageSink | undefined = sink
      ? (entry) => sink({ ...entry, fallback: true })
      : undefined;
    return await callSonnet(prompt, fb, Math.max(1800, maxTokens), true);
  }
}

async function callKimiWithFallback(
  prompt: string,
  label: string,
  sink?: UsageSink,
  maxTokens = 1024,
): Promise<string> {
  try {
    return await callKimi(prompt, sink, maxTokens);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[KIMI ${label} fallback] ${message}`);
    const fallbackSink: UsageSink | undefined = sink
      ? (entry) => sink({ ...entry, fallback: true })
      : undefined;
    return callSonnet(prompt, fallbackSink, Math.max(700, maxTokens));
  }
}

// ─── Strip markdown code fences ──────────────────────────────
function stripFences(s: string): string {
  return s
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
}

// ─── Parse JSON loosely — handles arrays, objects, fences ────
function parseJSONLoose(text: string): unknown {
  if (!text || !text.trim()) return null;
  const cleaned = stripFences(text);
  try {
    return JSON.parse(cleaned);
  } catch {
    /* fall through */
  }
  const arr = cleaned.match(/\[[\s\S]*\]/);
  if (arr) {
    try {
      return JSON.parse(arr[0]);
    } catch {
      /* */
    }
  }
  const obj = cleaned.match(/\{[\s\S]*\}/);
  if (obj) {
    try {
      return JSON.parse(obj[0]);
    } catch {
      /* */
    }
  }
  return null;
}

// ─── Parse JSON safely (always returns object) ───────────────
function parseJSON(text: string): Record<string, unknown> {
  const parsed = parseJSONLoose(text);
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    return parsed as Record<string, unknown>;
  }
  return { raw: text ?? "", antwort: text ?? "" };
}

// ─── Extract best text from Kimi response ────────────────────
function extractDraft(kimiData: Record<string, unknown>, kimiRaw: string): string {
  const draft = kimiData.antwort ?? kimiData.raw ?? kimiRaw;
  const text = String(draft ?? "").trim();
  if (!text || text === "undefined" || text === "null") return kimiRaw;
  return text;
}

/// Der iOS-Client encodiert mit `convertToSnakeCase`, ältere Clients und der
/// Web-Client schicken camelCase. Beide Schreibweisen akzeptieren, statt sich
/// auf eine zu verlassen — sonst fallen Felder stillschweigend hinten runter.
function onboardingField(
  source: Record<string, unknown> | null | undefined,
  camelKey: string,
): string | undefined {
  if (!source) return undefined;
  const snakeKey = camelKey.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  return stringOrUndefined(source[camelKey]) ?? stringOrUndefined(source[snakeKey]);
}

function stringOrUndefined(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function cleanHTML(value: string): string {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeSearchURL(raw: string): string | null {
  try {
    const url = raw.startsWith("http") ? new URL(raw) : new URL(raw, "https://duckduckgo.com");
    const encoded = url.searchParams.get("uddg");
    if (encoded) return decodeURIComponent(encoded);
    return url.toString();
  } catch {
    return null;
  }
}

function sourceKey(source: WebSource): string {
  return source.url
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "")
    .toLowerCase();
}

function normalizeSource(value: unknown): WebSource | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const title = stringOrUndefined(row.title) ?? stringOrUndefined(row.titel);
  const url = stringOrUndefined(row.url);
  if (!title || !url || !/^https?:\/\//i.test(url)) return null;
  return {
    type: stringOrUndefined(row.type) ?? stringOrUndefined(row.typ) ?? "Web",
    title: title.slice(0, 92),
    url,
    snippet: stringOrUndefined(row.snippet)?.slice(0, 240),
  };
}

function mergeSources(...groups: WebSource[][]): WebSource[] {
  const seen = new Set<string>();
  const merged: WebSource[] = [];
  for (const source of groups.flat()) {
    const normalized = normalizeSource(source);
    if (!normalized) continue;
    const key = sourceKey(normalized);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(normalized);
  }
  return merged.slice(0, 5);
}

function isFoundingDutiesQuestion(message: string): boolean {
  const text = message.toLowerCase();
  return [
    "selbstständig",
    "selbststaendig",
    "selbständig",
    "gründen",
    "gruenden",
    "gründung",
    "gruendung",
    "was brauche ich",
    "voraussetzung",
    "meister",
    "meistertitel",
    "meisterpflicht",
    "eintragen lassen",
    "netzbetreiber",
    "installateurverzeichnis",
    "versicherung",
    "berufsgenossenschaft",
    "eröffnen",
    "eroeffnen",
    "anmelden",
    "starten als",
    "loslegen",
  ].some((needle) => text.includes(needle));
}

function needsWebResearch(_ctx: FounderContext, message: string): boolean {
  if (isFoundingDutiesQuestion(message)) return true;
  // Nur die AKTUELLE Nachricht entscheidet — sonst feuert die Recherche bei
  // Foundern mit passendem Profil (z.B. Handwerk) auf jede Nachricht und
  // kostet Sekunden. Kurze Begriffe mit Wortgrenze, damit "gesamt" ≠ "amt".
  const text = ` ${message.toLowerCase()} `;
  if (/versicher|haftpflicht/.test(text)) return true;
  const phrases = [
    "handwerkskammer",
    "gewerbeamt",
    "gewerbe anmelden",
    "gewerbeanmeldung",
    "finanzamt",
    "steuernummer",
    "gesundheitsamt",
    "konzession",
    "genehmigung",
    "innung",
    "berufsgenossenschaft",
    "ansprechpartner",
    "zulassung",
  ];
  if (phrases.some((needle) => text.includes(needle))) return true;
  return /(^|[\s.,!?])(hwk|ihk|kammer|amt|ämter|aemter|behörde|behoerde|erlaubnis|hygiene)([\s.,!?]|$)/.test(
    text,
  );
}

function isPureAppMutationRequest(message: string): boolean {
  const text = message
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const asksForResearch =
    /\b(finde|such|suche|recherchier|pruf|pruef|wer ist|welche|kontakt|ansprechpartner|offnungszeiten|adresse|telefonnummer)\b/.test(
      text,
    );
  if (asksForResearch) return false;

  const calendarRequest =
    /\b(termin|erinnerung|kalender)\b/.test(text) &&
    /\b(eintrag|trag|trage|anleg|plane|planen|erstell)\b/.test(text);
  const boardRequest =
    /\b(board|kanban|karte|aufgabe|task)\b/.test(text) &&
    /\b(anleg|erstell|pack|setz|hinzufug)\b/.test(text);
  const slackRequest =
    /\b(slack|channel)\b/.test(text) && /\b(post|schreib|send|schick)\b/.test(text);
  const emailRequest =
    /\b(e-?mail|mail)\b/.test(text) &&
    /\b(schreib|formulier|vorbereit|entwurf|verfass)\b/.test(text);
  return calendarRequest || boardRequest || slackRequest || emailRequest;
}

/// Grobfilter für Vorhaben, die in Deutschland ohne Erlaubnis gar nicht
/// starten dürfen. Bewusst großzügig: ein Fehlalarm kostet eine Recherche,
/// ein übersehener Fall kostet den Nutzer sein Geschäft.
function isRegulatedVenture(text: string): boolean {
  return [
    // Finanzaufsicht — KWG §32, ZAG, WpIG
    /bafin|banklizenz|banking|zahlungsdienst|e-?geld|kryptoverwahr|einlagen|kreditvergabe|wertpapier|anlageberatung|fintech|neobank/,
    // Vermittlung — GewO §34c/d/f/i
    /versicherungsvermittl|finanzanlagenvermittl|immobilienmakl|darlehensvermittl|inkasso/,
    // Heil- und Pflegeberufe
    /heilprakt|physiotherap|ergotherap|logopäd|logopaed|pflegedienst|arztprax|ärztin|zahnarzt|zahnärzt|apotheke|psychotherap|hebamme|podolog|osteopath/,
    // Lebensmittel und Gastronomie
    /gastronom|restaurant|imbiss|bistro|café|cafe|kneipe|brauerei|lebensmittel|catering|foodtruck|food truck|eisdiele|metzger|fleischer|bäcker|baecker|konditor/,
    // Zulassungspflichtiges Handwerk (Anlage A HwO) — auf Wortstämme, damit
    // auch "Elektrikermeister" oder "Kfz-Werkstatt" sicher greifen.
    /elektr|sanitär|sanitaer|heizung|installateur|klempner|dachdeck|maurer|betonbau|zimmerer|zimmermann|friseur|augenoptik|optiker|hörakustik|hoerakustik|orthopädie|orthopaedie|schornsteinfeg|kälteanlagen|kaelteanlagen|straßenbau|strassenbau|stuckateur|tischler|schreiner|metallbau|kfz|kraftfahrzeug|autowerkstatt|gerüstbau|geruestbau|glaser|maler und lackier|feinwerkmech|boots.?bau|vulkanis/,
    // Waren-Onlinehandel — VerpackG/LUCID, Produktsicherheit
    /onlineshop|online-shop|e-?commerce|webshop|dropshipping|versandhandel|amazon|etsy|shopify/,
    // Sonstige erlaubnispflichtige Gewerbe
    /bewachung|sicherheitsdienst|personenbeförderung|personenbefoerderung|taxi|fahrschule|spielhalle|waffen|tabak|arbeitnehmerüberlassung|zeitarbeit|kindertagespflege|pfandleih/,
  ].some((pattern) => pattern.test(text));
}

function executionAgentDescriptor(
  ctx: FounderContext,
  message: string,
  assignment: string,
): { key: string; name: string; purpose: string } {
  const text = `${message} ${assignment} ${ctx.industry || ""} ${ctx.idea || ""}`.toLowerCase();
  // Erlaubnispflichtige Vorhaben zuerst — hier ist eine falsche Auskunft
  // teurer als gar keine, deshalb ein eigener Agent mit eigenem Auftrag.
  if (isRegulatedVenture(text)) {
    return {
      key: "regulatory-research",
      name: "Erlaubnis-Prüfer",
      purpose:
        "Erlaubnis- und Zulassungspflichten vor dem Start klären: zuständige Aufsicht, Rechtsgrundlage, Reihenfolge",
    };
  }
  if (/versicher|haftpflicht|berufsgenossenschaft/.test(text)) {
    return {
      key: "insurance-research",
      name: "Versicherungs-Scout",
      purpose: "Versicherungen, Pflichtschutz und konkrete Anbieter belastbar recherchieren",
    };
  }
  if (/förder|foerder|zuschuss|kredit|finanzierung/.test(text)) {
    return {
      key: "funding-research",
      name: "Fördermittel-Scout",
      purpose: "Passende Förderungen, Kredite und Voraussetzungen mit aktuellen Quellen prüfen",
    };
  }
  if (/kammer|behörde|behoerde|gewerbeamt|finanzamt|zulassung|genehmigung/.test(text)) {
    return {
      key: "authorities-research",
      name: "Behörden-Lotse",
      purpose: "Zuständigkeiten, Pflichten und konkrete Ansprechpartner verlässlich ermitteln",
    };
  }
  return {
    key: "business-research",
    name: "Business-Research",
    purpose: "Konkrete Markt-, Anbieter- und Gründungsfragen mehrstufig recherchieren",
  };
}

function dispatchExecutionWorker(jobID: string): void {
  const projectURL = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!projectURL || !serviceRoleKey) {
    console.error("execution worker dispatch skipped: backend configuration missing");
    return;
  }

  const dispatch = fetch(`${projectURL}/functions/v1/copilot-worker`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({ job_id: jobID }),
  }).then(async (response) => {
    if (!response.ok) {
      console.error("execution worker dispatch failed:", response.status, await response.text());
    }
  });

  const runtime = globalThis as typeof globalThis & {
    EdgeRuntime?: { waitUntil?: (promise: Promise<unknown>) => void };
  };
  if (typeof runtime.EdgeRuntime?.waitUntil === "function") {
    runtime.EdgeRuntime.waitUntil(dispatch);
  }
}

function requestedLocation(ctx: FounderContext, message: string): string {
  const stopwords = new Set([
    "der",
    "die",
    "das",
    "dem",
    "den",
    "einer",
    "einem",
    "einen",
    "meiner",
    "meinem",
    "meinen",
  ]);
  const patterns = [
    /\b(?:handwerkskammer|hwk|ihk)\s+(?:zu\s+)?([A-Za-zÄÖÜäöüß-]{3,})/i,
    /\b(?:in|für|fuer)\s+([A-Za-zÄÖÜäöüß-]{3,})/i,
  ];
  for (const pattern of patterns) {
    const candidate = message.match(pattern)?.[1]?.trim();
    if (candidate && !stopwords.has(candidate.toLowerCase())) return candidate;
  }
  return ctx.city && ctx.city !== "unbekannt" ? ctx.city : "";
}

function buildResearchQueries(ctx: FounderContext, message: string): string[] {
  const city = requestedLocation(ctx, message);
  const industry = (ctx.industry || "").toLowerCase();
  const idea = (ctx.idea || "").toLowerCase();
  const venture = (ctx.venture_term || "").toLowerCase();
  const text = message.toLowerCase();
  const haystack = [text, industry, idea, venture, ctx.copilot_context || ""].join(" ");
  const place = city ? `${city} ` : "";
  const queries: string[] = [];
  const wantsAuthorities = /kammer|amt|ämter|aemter|behörde|behoerde|gewerbe|anmeld|zulassung/.test(
    text,
  );
  const isHandwerk =
    /handwerk|hwk|handwerkskammer|friseur|kosmetik|elektriker|elektroniker|installateur|maler|bäcker|baecker|metzger|tischler|schreiner|dachdecker|kfz|meister/.test(
      haystack,
    );

  if (/versicher|haftpflicht|versicherer/.test(text)) {
    const business = (ctx.idea || ctx.venture_term || "Betrieb").trim();
    queries.push(`${place}${business} Betriebshaftpflicht Versicherer Angebot`);
    queries.push(`${business} Betriebshaftpflicht Handwerk Anbieter Vergleich`);
  }

  if (
    isHandwerk ||
    text.includes("handwerkskammer") ||
    text.includes("hwk") ||
    (wantsAuthorities && text.includes("kammer"))
  ) {
    queries.push(`${place}Handwerkskammer Existenzgründung Ansprechpartner`);
    queries.push(`${place}HWK Betriebsberatung Gründer Kontakt`);
    queries.push(`${place}Innung ${ctx.idea || ""} Ansprechpartner`);
  }
  if (
    haystack.includes("gastro") ||
    haystack.includes("restaurant") ||
    text.includes("hygiene") ||
    text.includes("konzession")
  ) {
    queries.push(`${place}Gewerbeamt Gaststätte Konzession Ansprechpartner`);
    queries.push(`${place}Gesundheitsamt Hygiene Belehrung Lebensmittel Ansprechpartner`);
    queries.push(`${place}IHK Gastronomie Gründung Beratung`);
  }
  if (
    haystack.includes("beauty") ||
    haystack.includes("friseur") ||
    haystack.includes("kosmetik")
  ) {
    queries.push(`${place}Handwerkskammer Friseur Gründung Ansprechpartner`);
    queries.push(`${place}Gewerbeamt Friseursalon anmelden`);
  }
  if (
    text.includes("ihk") ||
    haystack.includes("handel") ||
    haystack.includes("agentur") ||
    haystack.includes("beratung") ||
    (wantsAuthorities && !isHandwerk)
  ) {
    queries.push(`${place}IHK Existenzgründung Ansprechpartner`);
    queries.push(`${place}IHK Gründungsberatung Kontakt`);
  }
  if (
    wantsAuthorities ||
    text.includes("gewerbe") ||
    text.includes("anmeld") ||
    text.includes("amt") ||
    text.includes("ämter") ||
    text.includes("aemter") ||
    text.includes("behörde") ||
    text.includes("behoerde")
  ) {
    queries.push(`${place}Gewerbeamt Gewerbeanmeldung Ansprechpartner`);
    queries.push(`${place}Stadt Gewerbe anmelden Kontakt`);
  }
  if (
    wantsAuthorities ||
    text.includes("finanzamt") ||
    text.includes("steuernummer") ||
    text.includes("steuer")
  ) {
    queries.push(`${place}Finanzamt Existenzgründung steuerliche Erfassung Ansprechpartner`);
  }
  if (
    isHandwerk ||
    text.includes("berufsgenossenschaft") ||
    text.includes("versicherung") ||
    text.includes("bg ")
  ) {
    queries.push(`${ctx.idea || ctx.venture_term || ""} Berufsgenossenschaft Gründer anmelden`);
  }

  // Pflichten-Recherche bei "selbstständig machen"-Fragen: Meisterpflicht,
  // Netzbetreiber-Eintragung (Elektro/SHK), Versicherungen, BG — echte Quellen
  // statt Modellwissen.
  if (isFoundingDutiesQuestion(message)) {
    const trade = (ctx.idea || ctx.copilot_context || ctx.industry || "")
      .split(/[,.—-]/)[0]
      .trim()
      .slice(0, 40);
    if (isHandwerk) {
      queries.push(`${trade || "Handwerk"} Meisterpflicht Anlage A Handwerksordnung`);
      queries.push(`${place}Handwerksrolle eintragen Voraussetzungen HWK`);
    }
    if (
      /elektro|elektrik|elektroniker|shk|installateur|sanitär|sanitaer|heizung|klima|gas|wasser/.test(
        haystack,
      )
    ) {
      queries.push(
        `${place}Installateurverzeichnis Netzbetreiber eintragen Elektro Voraussetzungen`,
      );
    }
    queries.push(
      `${trade || ctx.venture_term || "Gründung"} selbstständig Pflichtversicherungen Betriebshaftpflicht`,
    );
    queries.push(`${trade || "Gründer"} Berufsgenossenschaft anmelden Pflicht`);
  }

  if (queries.length === 0) {
    queries.push(`${place}${ctx.venture_term || "Gründung"} anmelden Ansprechpartner`);
  }

  return [...new Set(queries.map((q) => q.replace(/\s+/g, " ").trim()).filter(Boolean))].slice(
    0,
    5,
  );
}

function sourceScore(source: WebSource): number {
  const url = source.url.toLowerCase();
  const title = source.title.toLowerCase();
  let score = 0;
  if (url.includes(".de")) score += 1;
  if (url.includes("ihk.de") || title.includes("ihk")) score += 5;
  if (
    url.includes("handwerkskammer") ||
    url.includes("hwk") ||
    title.includes("handwerkskammer") ||
    title.includes("hwk")
  )
    score += 5;
  if (url.includes("stadt") || url.includes("serviceportal") || title.includes("gewerbeamt"))
    score += 4;
  if (title.includes("ansprechpartner") || title.includes("kontakt") || title.includes("beratung"))
    score += 2;
  if (url.includes("facebook") || url.includes("instagram") || url.includes("youtube")) score -= 5;
  return score;
}

async function searchWeb(query: string): Promise<WebSource[]> {
  const braveKey = Deno.env.get("BRAVE_SEARCH_API_KEY");
  if (braveKey) {
    const url = new URL("https://api.search.brave.com/res/v1/web/search");
    url.searchParams.set("q", query);
    url.searchParams.set("count", "5");
    const res = await fetch(url, {
      signal: AbortSignal.timeout(4_000),
      headers: {
        Accept: "application/json",
        "X-Subscription-Token": braveKey,
      },
    });
    if (res.ok) {
      const data = await res.json();
      return ((data?.web?.results ?? []) as Array<Record<string, unknown>>)
        .map((item) =>
          normalizeSource({
            type: "Web",
            title: item.title,
            url: item.url,
            snippet: item.description,
          }),
        )
        .filter((item): item is WebSource => Boolean(item));
    }
  }

  const api = new URL("https://api.duckduckgo.com/");
  api.searchParams.set("q", query);
  api.searchParams.set("format", "json");
  api.searchParams.set("no_html", "1");
  api.searchParams.set("skip_disambig", "1");
  try {
    const res = await fetch(api);
    if (res.ok) {
      const data = await res.json();
      const results: WebSource[] = [];
      if (data?.AbstractURL && data?.Heading) {
        const source = normalizeSource({
          type: "Web",
          title: data.Heading,
          url: data.AbstractURL,
          snippet: data.AbstractText,
        });
        if (source) results.push(source);
      }
      const flatten = (items: unknown[]) => {
        for (const item of items) {
          if (!item || typeof item !== "object") continue;
          const row = item as Record<string, unknown>;
          if (Array.isArray(row.Topics)) flatten(row.Topics);
          const source = normalizeSource({
            type: "Web",
            title: row.Text,
            url: row.FirstURL,
          });
          if (source) results.push(source);
        }
      };
      if (Array.isArray(data?.RelatedTopics)) flatten(data.RelatedTopics);
      if (results.length) return results.slice(0, 5);
    }
  } catch (err) {
    console.error("duckduckgo api failed", err);
  }

  const htmlURL = new URL("https://duckduckgo.com/html/");
  htmlURL.searchParams.set("q", query);
  const htmlRes = await fetch(htmlURL, {
    signal: AbortSignal.timeout(4_000),
    headers: { "User-Agent": "matchfoundr-research/1.0" },
  });
  if (!htmlRes.ok) return [];
  const html = await htmlRes.text();
  const results: WebSource[] = [];
  const re =
    /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?(?:<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>|<div[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/div>)?/gi;
  for (const match of html.matchAll(re)) {
    const url = normalizeSearchURL(match[1]);
    const title = cleanHTML(match[2] || "");
    const snippet = cleanHTML(match[3] || match[4] || "");
    if (!url || !title) continue;
    const source = normalizeSource({ type: "Web", title, url, snippet });
    if (source) results.push(source);
    if (results.length >= 5) break;
  }
  return results;
}

/**
 * Sucht der Founder eine Person oder Stelle zum Anrufen/Anschreiben?
 * Bewusst breit und branchenunabhängig — es geht um die Form der Frage,
 * nicht um eine bestimmte Organisation.
 */
function isContactLookup(message: string): boolean {
  const text = message.toLowerCase();
  return (
    /ansprechpartner|ansprechperson|zust[äa]ndig|kontaktdaten|kontaktperson|durchwahl|sprechzeit/.test(
      text,
    ) ||
    (/\b(kontakt|wer)\b/.test(text) &&
      /\b(name|namen|telefon|telefonnummer|nummer|mail|e-?mail|adresse|anschrift|erreiche|anrufen|anschreiben)\b/.test(
        text,
      ))
  );
}

function isSafePublicURL(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    const host = url.hostname.toLowerCase();
    return (
      host !== "localhost" &&
      host !== "::1" &&
      !host.endsWith(".local") &&
      !/^127\./.test(host) &&
      !/^10\./.test(host) &&
      !/^192\.168\./.test(host) &&
      !/^172\.(1[6-9]|2\d|3[01])\./.test(host)
    );
  } catch {
    return false;
  }
}

/**
 * Holt die Seite und schneidet den Abschnitt heraus, in dem die Kontaktdaten
 * stehen. Grund: Suchmaschinen-Snippets kürzen genau die Zeile weg, die den
 * Namen trägt — der Snippet zeigt dann Titel und Anschrift, aber keine Person.
 * Ohne diesen Schritt kann das Modell den Ansprechpartner gar nicht kennen.
 */
async function enrichContactSource(source: WebSource): Promise<WebSource> {
  if (!isSafePublicURL(source.url)) return source;
  try {
    const response = await fetch(source.url, {
      signal: AbortSignal.timeout(3_500),
      redirect: "follow",
      headers: {
        "User-Agent": "matchfoundr-research/1.0",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (!response.ok) return source;
    if (!(response.headers.get("content-type") || "").includes("text/html")) return source;

    const html = (await response.text()).slice(0, 240_000);
    const pageText = cleanHTML(
      html.match(/<main[\s\S]*?<\/main>/i)?.[0] ||
        html.match(/<article[\s\S]*?<\/article>/i)?.[0] ||
        html,
    );
    // Anker in Reihenfolge der Aussagekraft: eine Mailadresse oder Telefonnummer
    // steht immer AN der Kontaktliste. Das Wort "Ansprechpartner" steht dagegen
    // oft schon im Seitentitel und in der Navigation — danach zu ankern schneidet
    // das Menü aus statt der Namen. Deshalb ist es nur der letzte Rückfall.
    const anchor = [
      /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i,
      /(?:tel|telefon|fon)\.?\s*:?\s*\+?[\d\s()/-]{7,}/i,
      /ansprechpartner(?:in|innen)?\s+(?:für|fuer|der|des)/i,
    ]
      .map((pattern) => pageText.search(pattern))
      .find((index) => index >= 0);
    // Breites Fenster: Kontaktseiten listen mehrere Personen mit je eigenem
    // Zuständigkeitsbereich — das Modell soll die passende auswählen können.
    const excerpt =
      anchor === undefined
        ? pageText.slice(0, 1_200)
        : pageText.slice(Math.max(0, anchor - 400), anchor + 2_000);
    return excerpt.length >= 80 ? { ...source, snippet: excerpt.slice(0, 2_400) } : source;
  } catch {
    return source;
  }
}

const WEB_RESEARCH_BUDGET_MS = 2_800;
// Zeitfenster fürs Nachladen der Trefferseiten bei einer Kontaktsuche.
const CONTACT_ENRICH_BUDGET_MS = 4_000;
const DUTIES_RESEARCH_BUDGET_MS = 3_500;
// Absolute Obergrenze für den synchronen Recherche-Pfad (ohne Session, wo wir
// nichts nachreichen können). Vorher lief der ungedeckelt — bis zu 90s.
const SYNC_RESEARCH_CAP_MS = 9_000;

async function findWebSources(ctx: FounderContext, message: string): Promise<WebSource[]> {
  if (!needsWebResearch(ctx, message)) return [];
  const duties = isFoundingDutiesQuestion(message);
  const queries = buildResearchQueries(ctx, message).slice(0, duties ? 4 : 3);
  // Hartes Zeitbudget: langsame Suchen liefern eben nichts — die Antwort wartet nicht.
  const timeout = new Promise<WebSource[]>((resolve) =>
    setTimeout(() => resolve([]), duties ? DUTIES_RESEARCH_BUDGET_MS : WEB_RESEARCH_BUDGET_MS),
  );
  const groups = await Promise.allSettled(
    queries.map((query) => Promise.race([searchWeb(query), timeout])),
  );
  const sources = groups
    .flatMap((group) => (group.status === "fulfilled" ? group.value : []))
    .sort((a, b) => sourceScore(b) - sourceScore(a));
  const merged = mergeSources(sources);

  // Bei einer Kontaktsuche reichen Snippets nicht: die besten Treffer werden
  // nachgeladen, damit der Name wirklich im Kontext liegt.
  if (!isContactLookup(message) || merged.length === 0) return merged;
  const enrichTimeout = new Promise<WebSource[]>((resolve) =>
    setTimeout(() => resolve(merged), CONTACT_ENRICH_BUDGET_MS),
  );
  const enriched = Promise.all(
    merged.map((source, index) => (index < 3 ? enrichContactSource(source) : source)),
  );
  return await Promise.race([enriched, enrichTimeout]);
}

type MCPConnectionRow = {
  connector_id: string;
  status: string;
  account_label?: string | null;
  metadata?: Record<string, unknown> | null;
};

type MCPTokenRow = {
  connector_id: string;
  access_token: string;
  refresh_token?: string | null;
  token_type?: string | null;
  scope?: string | null;
  expires_at?: string | null;
  metadata?: Record<string, unknown> | null;
};

const MCP_LIVE_FETCH_MS = 2_200;
const MCP_LIVE_BUDGET_MS = 4_800;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function hasAny(text: string, needles: string[]): boolean {
  return needles.some((needle) => text.includes(needle));
}

const CONNECTOR_QUERY_STOPWORDS = new Set([
  "aber",
  "alle",
  "alles",
  "also",
  "auch",
  "auf",
  "aus",
  "bei",
  "bitte",
  "dann",
  "das",
  "dein",
  "deine",
  "dem",
  "den",
  "der",
  "die",
  "dies",
  "diese",
  "dir",
  "doch",
  "drive",
  "ein",
  "eine",
  "einen",
  "einer",
  "find",
  "finde",
  "fuer",
  "für",
  "google",
  "hab",
  "habe",
  "ich",
  "im",
  "in",
  "ist",
  "mal",
  "mir",
  "mit",
  "nach",
  "noch",
  "notion",
  "oder",
  "schau",
  "such",
  "suche",
  "und",
  "vom",
  "von",
  "was",
  "wenn",
  "wie",
  "wir",
  "zu",
  "zum",
]);

function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .replaceAll("ä", "ae")
    .replaceAll("ö", "oe")
    .replaceAll("ü", "ue")
    .replaceAll("ß", "ss")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function connectorQueryTokens(text: string): string[] {
  return normalizeSearchText(text)
    .split(/[^a-z0-9]+/g)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !CONNECTOR_QUERY_STOPWORDS.has(token));
}

function deriveConnectorQuery(
  message: string,
  history: ChatTurn[] = [],
  priorSummary = "",
): string | undefined {
  const directTokens = connectorQueryTokens(message);
  const normalizedMessage = ` ${normalizeSearchText(message)} `;
  const needsContext =
    directTokens.length < 2 ||
    hasAny(normalizedMessage, [
      " danach ",
      " dazu ",
      " darueber ",
      " diese datei ",
      " diese seite ",
      " das dokument ",
      " den businessplan ",
    ]);
  const contextualText = needsContext
    ? [
        ...history
          .slice(-4)
          .filter((turn) => turn.role === "user")
          .map((turn) => turn.content),
        priorSummary,
      ].join(" ")
    : "";
  const tokens = [...directTokens, ...connectorQueryTokens(contextualText)];
  const unique = Array.from(new Set(tokens));
  return unique.slice(0, 6).join(" ") || undefined;
}

function connectorLabel(connectorID: string): string {
  const labels: Record<string, string> = {
    authorities: "Kammern & Aemter",
    google_drive: "Google Drive",
    notion: "Notion",
    slack: "Slack",
    github: "GitHub",
    commerce: "Shop/Commerce",
    accounting: "Buchhaltung",
    google_business: "Google Business",
  };
  return labels[connectorID] ?? connectorID;
}

function isConnectorRelevant(connectorID: string, ctx: FounderContext, message: string): boolean {
  const text = ` ${(message || "").toLowerCase()} `;
  switch (connectorID) {
    case "authorities":
      return needsWebResearch(ctx, message);
    case "google_drive":
      return hasAny(text, [
        "drive",
        "datei",
        "dateien",
        "dokument",
        "dokumente",
        "unterlage",
        "unterlagen",
        "pdf",
        "businessplan",
        "finanzplan",
        "pitch",
        "vertrag",
        "angebot",
      ]);
    case "notion":
      return hasAny(text, ["notion", "wiki", "notiz", "notizen", "checkliste", "doku", "roadmap"]);
    case "slack":
      return hasAny(text, [
        "slack",
        "team",
        "channel",
        "broadcast",
        "nachricht",
        "nachrichten",
        "briefing",
        "standup",
      ]);
    case "github":
      return hasAny(text, [
        "github",
        "repo",
        "repository",
        "issue",
        "code",
        "website",
        "deploy",
        "bug",
        "fehler",
        "commit",
        "pull request",
      ]);
    case "commerce":
      return hasAny(text, [
        "shop",
        "shopify",
        "woocommerce",
        "produkt",
        "produkte",
        "bestellung",
        "umsatz",
        "kunde",
      ]);
    case "accounting":
      return hasAny(text, [
        "buchhaltung",
        "rechnung",
        "rechnungen",
        "beleg",
        "belege",
        "lexoffice",
        "sevdesk",
        "datev",
        "steuer",
        "ust",
        "cashflow",
      ]);
    case "google_business":
      return hasAny(text, [
        "google business",
        "business profile",
        "maps",
        "bewertung",
        "bewertungen",
        "rezension",
        "rezensionen",
        "oeffnungszeiten",
        "öffnungszeiten",
        "lokal",
        "standort",
      ]);
    default:
      return false;
  }
}

function shortDate(value: unknown): string {
  if (typeof value !== "string" || !value) return "unbekannt";
  return value.slice(0, 10);
}

function escapeDriveQuery(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function driveSearchQuery(query?: string): string {
  const tokens = query?.split(/\s+/).filter(Boolean).slice(0, 4) ?? [];
  if (!tokens.length) return "trashed=false";
  const clauses = tokens.flatMap((token) => {
    const escaped = escapeDriveQuery(token);
    return [`name contains '${escaped}'`, `fullText contains '${escaped}'`];
  });
  return `trashed=false and (${clauses.join(" or ")})`;
}

function cleanSlackChannelName(value: string): string {
  return value.trim().replace(/^#/, "").toLowerCase();
}

function stripCannedPreamble(answer: string): string {
  const cleaned = answer
    .replace(/^\s*(?:klar|gerne|natürlich|kein problem)(?:[,.!:\s]+|$)/i, "")
    .trim();
  return cleaned || answer.trim();
}

function confirmationSafeAnswer(answer: string, appActions: Record<string, unknown>[]): string {
  const cleaned = stripCannedPreamble(answer);
  const mutation = appActions.find((action) =>
    ["add_calendar_item", "add_kanban_card", "slack_post", "email_draft"].includes(
      String(action.action ?? ""),
    ),
  );
  if (!mutation) return cleaned;

  const alreadyFramesAsPending = /\b(vorbereitet|bestätig|freigabe)\b/i.test(cleaned);
  const falselyClaimsCompletion =
    /\b(eingetragen|erledigt|gepostet|gesendet|angelegt|erstellt)\b/i.test(cleaned) ||
    /\b(?:trag(?:e)?|packe|setze|poste|sende|leg(?:e)?)\s+ich\b/i.test(cleaned) ||
    /\bich\s+(?:trag(?:e)?|packe|setze|poste|sende|leg(?:e)?)\b/i.test(cleaned);
  if (alreadyFramesAsPending || !falselyClaimsCompletion) return cleaned;

  const action = String(mutation.action ?? "");
  const title = typeof mutation.title === "string" ? mutation.title.trim() : "";
  const due = typeof mutation.due === "string" ? mutation.due.trim() : "";
  if (action === "add_calendar_item") {
    return `Der Termin ist vorbereitet${title ? `: ${title}` : ""}${due ? `, ${due}` : ""}. Bestätige ihn unten.`;
  }
  if (action === "add_kanban_card") {
    return `Die Board-Karte ist vorbereitet${title ? `: ${title}` : ""}. Bestätige sie unten.`;
  }
  if (action === "email_draft") {
    return "Der E-Mail-Entwurf ist vorbereitet. Prüfe und versende ihn unten.";
  }
  return "Die Slack-Nachricht ist vorbereitet. Bestätige sie unten.";
}

function shouldExposeFollowUp(
  message: string,
  question: string | null,
  options: string[],
): boolean {
  if (!question || options.length < 2) return false;

  const clean = (value: string) =>
    value
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  const current = clean(message);
  const followUp = clean(question);

  // Ein Wizard löst eine fehlende Entscheidung. Er ist keine Themen-Navigation
  // und kein "Soll ich noch mehr erklären?" nach einer beantworteten Sachfrage.
  const topicBranching =
    /(genauer|naher) (anschauen|erklaren|durchgehen)|andere punkte|weitermachen|vertiefen/.test(
      followUp,
    );
  if (topicBranching) return false;

  const factualQuestion =
    /^(was (ist|sind|muss|brauche|kostet)|wie funktioniert|warum|wieso|welche pflichten)\b/.test(
      current,
    );
  const explicitDecision =
    /\b(entscheiden|entscheidung|auswahl|auswahlen|welche option|solo|co-?founder|mitgrunder|partner suchen)\b/.test(
      current,
    );

  return !factualQuestion || explicitDecision;
}

function executionResultAddsValue(
  immediateAnswer: string,
  executionAnswer: string,
  sources: WebSource[],
  hasConnectorEvidence: boolean,
  modelDecision: boolean,
  valueReason: string,
): boolean {
  if (!modelDecision || valueReason.trim().length < 8) return false;
  if (!sources.length && !hasConnectorEvidence) return false;

  const terms = (value: string) =>
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .match(/[a-z0-9§€%-]{3,}/g) ?? [];
  const immediateTerms = new Set(terms(immediateAnswer));
  const executionTerms = new Set(terms(executionAnswer));
  if (executionTerms.size < 5) return false;

  let shared = 0;
  let novel = 0;
  for (const term of executionTerms) {
    if (immediateTerms.has(term)) shared += 1;
    else novel += 1;
  }
  const smallerSet = Math.max(1, Math.min(immediateTerms.size, executionTerms.size));
  const overlap = shared / smallerSet;

  // Eine zweite Nachricht muss substanziell Neues liefern, nicht nur die
  // Sofortantwort mit etwas mehr Text und denselben Begriffen wiederholen.
  return novel >= 4 && !(overlap > 0.82 && novel < 7);
}

function supportedResearchSources(
  ctx: FounderContext,
  message: string,
  sources: WebSource[],
): WebSource[] {
  if (!sources.length) return [];
  const normalize = (value: string) =>
    value
      .toLowerCase()
      .replace(/ä/g, "ae")
      .replace(/ö/g, "oe")
      .replace(/ü/g, "ue")
      .replace(/ß/g, "ss")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  const request = normalize(message);
  const sourceTexts = sources.map((source) =>
    normalize(`${source.title} ${source.url} ${source.snippet || ""}`),
  );

  const requiredTopicGroups: string[][] = [];
  if (/versicher|haftpflicht/.test(request)) {
    requiredTopicGroups.push(["versicher", "haftpflicht"]);
  }
  if (/forderung|foerderung|zuschuss|kredit/.test(request)) {
    requiredTopicGroups.push(["forderung", "foerderung", "zuschuss", "kredit"]);
  }
  if (/handwerkskammer|(^|\W)hwk(\W|$)/.test(request)) {
    requiredTopicGroups.push(["handwerkskammer", "hwk"]);
  }
  if (/gewerbeamt|gewerbeanmeld/.test(request)) {
    requiredTopicGroups.push(["gewerbeamt", "gewerbeanmeld"]);
  }

  const locationSensitive =
    /\b(ansprechpartner|zustandig|zuständig|amt|kammer|lokal|vor ort)\b/i.test(message);
  const explicitLocation = locationSensitive ? requestedLocation(ctx, message) : "";
  const location = explicitLocation ? normalize(explicitLocation) : "";

  return sources.filter((_, index) => {
    const sourceText = sourceTexts[index];
    const topicsMatch = requiredTopicGroups.every((group) =>
      group.some((term) => sourceText.includes(term)),
    );
    const locationMatches = !location || sourceText.includes(location);
    return topicsMatch && locationMatches;
  });
}

function tokenExpired(token: MCPTokenRow): boolean {
  if (!token.expires_at) return false;
  return new Date(token.expires_at).getTime() <= Date.now() + 60_000;
}

async function fetchJSON(
  url: string | URL,
  init: RequestInit = {},
  timeoutMs = MCP_LIVE_FETCH_MS,
): Promise<unknown> {
  const controller = new AbortController();
  const timeoutID = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    const text = await res.text();
    const data = text ? parseJSONLoose(text) : null;
    if (!res.ok) throw new Error(`${res.status}: ${text.slice(0, 180)}`);
    return data;
  } finally {
    clearTimeout(timeoutID);
  }
}

async function refreshGoogleToken(
  supabase: DatabaseClient,
  userID: string,
  token: MCPTokenRow,
): Promise<MCPTokenRow | null> {
  if (!token.refresh_token) return null;
  const clientID = Deno.env.get("GOOGLE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
  if (!clientID || !clientSecret) return null;

  try {
    const data = await fetchJSON(
      "https://oauth2.googleapis.com/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientID,
          client_secret: clientSecret,
          refresh_token: token.refresh_token,
          grant_type: "refresh_token",
        }),
      },
      3_000,
    );
    if (!isRecord(data) || typeof data.access_token !== "string") return null;
    const expiresAt =
      typeof data.expires_in === "number"
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : (token.expires_at ?? null);
    const refreshed: MCPTokenRow = {
      ...token,
      access_token: data.access_token,
      token_type: typeof data.token_type === "string" ? data.token_type : token.token_type,
      scope: typeof data.scope === "string" ? data.scope : token.scope,
      expires_at: expiresAt,
    };
    await supabase
      .from("mcp_oauth_tokens")
      .update({
        access_token: refreshed.access_token,
        token_type: refreshed.token_type,
        scope: refreshed.scope,
        expires_at: refreshed.expires_at,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userID)
      .eq("connector_id", token.connector_id);
    return refreshed;
  } catch (err) {
    console.error("mcp google token refresh failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

async function usableToken(
  supabase: DatabaseClient,
  userID: string,
  token: MCPTokenRow | undefined,
): Promise<MCPTokenRow | null> {
  if (!token) return null;
  if (!tokenExpired(token)) return token;
  if (token.connector_id === "google_drive" || token.connector_id === "google_business") {
    return await refreshGoogleToken(supabase, userID, token);
  }
  return null;
}

async function loadGoogleDriveContext(
  accessToken: string,
  query?: string,
): Promise<MCPLiveContext> {
  const url = new URL("https://www.googleapis.com/drive/v3/files");
  url.searchParams.set("pageSize", "6");
  url.searchParams.set("fields", "files(id,name,mimeType,webViewLink,modifiedTime)");
  url.searchParams.set("q", driveSearchQuery(query));
  url.searchParams.set("orderBy", "modifiedTime desc");
  const data = await fetchJSON(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  const files = Array.isArray((data as Record<string, unknown> | null)?.files)
    ? ((data as Record<string, unknown>).files as Record<string, unknown>[])
    : [];
  const sources: WebSource[] = [];
  const facts = files.slice(0, 6).flatMap((file) => {
    const name = typeof file.name === "string" ? file.name : "";
    if (!name) return [];
    const link = typeof file.webViewLink === "string" ? file.webViewLink : "";
    const source = normalizeSource({ type: "Drive", title: name, url: link });
    if (source) sources.push(source);
    return `Datei "${name}" (${typeof file.mimeType === "string" ? file.mimeType : "Datei"}), zuletzt geaendert ${shortDate(file.modifiedTime)}${link ? `. Link: ${link}` : ""}`;
  });
  const prefix = query ? `Suche "${query}" in Google Drive. ` : "";
  const resolvedFacts =
    facts.length || !query ? facts : [`Suche "${query}" in Google Drive ergab keine Treffer.`];
  return {
    connector_id: "google_drive",
    label: "Google Drive",
    facts: resolvedFacts.map((fact) => (facts.length ? prefix + fact : fact)),
    sources,
  };
}

async function loadGitHubContext(accessToken: string): Promise<MCPLiveContext> {
  const data = await fetchJSON("https://api.github.com/user/repos?per_page=6&sort=updated", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "matchfoundr",
    },
  });
  const repos = Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
  const sources: WebSource[] = [];
  const facts = repos.slice(0, 6).flatMap((repo) => {
    const name = typeof repo.full_name === "string" ? repo.full_name : "";
    if (!name) return [];
    const url = typeof repo.html_url === "string" ? repo.html_url : "";
    const source = normalizeSource({ type: "GitHub", title: name, url });
    if (source) sources.push(source);
    const language = typeof repo.language === "string" ? `, Sprache ${repo.language}` : "";
    return `Repo "${name}"${repo.private === true ? " privat" : ""}, zuletzt ${shortDate(repo.updated_at)}${language}, offene Issues ${Number(repo.open_issues_count ?? 0)}${url ? `. Link: ${url}` : ""}`;
  });
  return { connector_id: "github", label: "GitHub", facts, sources };
}

function notionTitle(page: Record<string, unknown>): string {
  const properties = isRecord(page.properties) ? page.properties : {};
  for (const value of Object.values(properties)) {
    if (!isRecord(value) || !Array.isArray(value.title)) continue;
    const title = value.title
      .map((part) => (isRecord(part) && typeof part.plain_text === "string" ? part.plain_text : ""))
      .join("")
      .trim();
    if (title) return title;
  }
  return typeof page.object === "string" ? `Notion ${page.object}` : "Notion Treffer";
}

async function loadNotionContext(accessToken: string, query?: string): Promise<MCPLiveContext> {
  const data = await fetchJSON(
    "https://api.notion.com/v1/search",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
      },
      body: JSON.stringify(query ? { query, page_size: 6 } : { page_size: 6 }),
    },
    3_000,
  );
  const results = Array.isArray((data as Record<string, unknown> | null)?.results)
    ? ((data as Record<string, unknown>).results as Record<string, unknown>[])
    : [];
  const sources: WebSource[] = [];
  const facts = results.slice(0, 6).flatMap((page) => {
    const title = notionTitle(page);
    const url = typeof page.url === "string" ? page.url : "";
    const source = normalizeSource({ type: "Notion", title, url });
    if (source) sources.push(source);
    return `${title}, zuletzt geaendert ${shortDate(page.last_edited_time)}${url ? `. Link: ${url}` : ""}`;
  });
  const prefix = query ? `Suche "${query}" in Notion. ` : "";
  const resolvedFacts =
    facts.length || !query ? facts : [`Suche "${query}" in Notion ergab keine Treffer.`];
  return {
    connector_id: "notion",
    label: "Notion",
    facts: resolvedFacts.map((fact) => (facts.length ? prefix + fact : fact)),
    sources,
  };
}

async function loadSlackContext(accessToken: string): Promise<MCPLiveContext> {
  const auth = await fetchJSON("https://slack.com/api/auth.test", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const authData = isRecord(auth) ? auth : {};
  const facts: string[] = [];
  if (authData.ok === true) {
    const team = typeof authData.team === "string" ? authData.team : "Slack Workspace";
    const user = typeof authData.user === "string" ? authData.user : "verbundener User";
    facts.push(`Workspace "${team}" ist als ${user} verbunden.`);
  }

  try {
    const url = new URL("https://slack.com/api/conversations.list");
    url.searchParams.set("limit", "6");
    url.searchParams.set("types", "public_channel");
    const channels = await fetchJSON(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const visibleChannels = Array.isArray((channels as Record<string, unknown> | null)?.channels)
      ? ((channels as Record<string, unknown>).channels as Record<string, unknown>[])
          .map((channel) => ({
            id: typeof channel.id === "string" ? channel.id : "",
            name: typeof channel.name === "string" ? channel.name : "",
          }))
          .filter((channel) => channel.id && channel.name)
      : [];
    const names = visibleChannels.map((channel) => `#${channel.name}`);
    if (names.length) facts.push(`Sichtbare Channels: ${names.slice(0, 6).join(", ")}.`);
    return {
      connector_id: "slack",
      label: "Slack",
      facts,
      action_hints: visibleChannels.slice(0, 6).map((channel) => ({
        action: "slack_post",
        label: `In #${channel.name} posten`,
        channel_id: channel.id,
        channel: `#${channel.name}`,
      })),
    };
  } catch {
    // Channel listing is optional; auth.test is enough to prove the connector is live.
  }

  return { connector_id: "slack", label: "Slack", facts };
}

async function loadGoogleBusinessContext(accessToken: string): Promise<MCPLiveContext> {
  try {
    const data = await fetchJSON("https://mybusinessaccountmanagement.googleapis.com/v1/accounts", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const accounts = Array.isArray((data as Record<string, unknown> | null)?.accounts)
      ? ((data as Record<string, unknown>).accounts as Record<string, unknown>[])
      : [];
    const facts = accounts.slice(0, 5).flatMap((account) => {
      const name = typeof account.accountName === "string" ? account.accountName : "";
      const type = typeof account.type === "string" ? account.type : "Google Business Konto";
      return name ? [`${name} (${type}) ist als Business-Konto verbunden.`] : [];
    });
    return {
      connector_id: "google_business",
      label: "Google Business",
      facts: facts.length
        ? facts
        : ["Google Business ist verbunden; keine Business-Konten gefunden."],
    };
  } catch {
    return {
      connector_id: "google_business",
      label: "Google Business",
      facts: [
        "Google Business ist verbunden, aber die Kontodaten konnten gerade nicht gelesen werden.",
      ],
    };
  }
}

async function loadConnectorContext(
  supabase: DatabaseClient,
  userID: string,
  connection: MCPConnectionRow,
  token: MCPTokenRow | undefined,
  query?: string,
): Promise<MCPLiveContext | null> {
  const connectorID = connection.connector_id;
  if (connectorID === "authorities") {
    return {
      connector_id: "authorities",
      label: "Kammern & Aemter",
      facts: [
        "Oeffentliche Kammer-/Aemter-Recherche ist aktiv. Nutze die Web-Treffer als Quellen.",
      ],
    };
  }

  if (connection.status !== "connected") {
    return {
      connector_id: connectorID,
      label: connectorLabel(connectorID),
      facts: [
        `${connectorLabel(connectorID)} ist noch nicht live verbunden (${connection.status}).`,
      ],
    };
  }

  const liveToken = await usableToken(supabase, userID, token);
  if (!liveToken) {
    return {
      connector_id: connectorID,
      label: connectorLabel(connectorID),
      facts: [
        `${connectorLabel(connectorID)} ist verbunden, aber der Zugriff muss neu bestaetigt werden.`,
      ],
    };
  }

  switch (connectorID) {
    case "google_drive":
      return await loadGoogleDriveContext(liveToken.access_token, query);
    case "github":
      return await loadGitHubContext(liveToken.access_token);
    case "notion":
      return await loadNotionContext(liveToken.access_token, query);
    case "slack":
      return await loadSlackContext(liveToken.access_token);
    case "google_business":
      return await loadGoogleBusinessContext(liveToken.access_token);
    default:
      return null;
  }
}

async function loadMCPLiveContext(
  supabase: DatabaseClient,
  userID: string | undefined,
  ctx: FounderContext,
  message: string,
  options: { history?: ChatTurn[]; priorSummary?: string } = {},
): Promise<MCPLiveContext[]> {
  if (!userID) return [];
  const query = deriveConnectorQuery(message, options.history ?? [], options.priorSummary ?? "");

  const work = async () => {
    const { data, error } = await supabase
      .from("mcp_connections")
      .select("connector_id,status,account_label,metadata")
      .eq("user_id", userID)
      .order("updated_at", { ascending: false });
    if (error) {
      console.error("mcp connections load failed:", error.message);
      return [];
    }

    const relevant = ((data ?? []) as MCPConnectionRow[])
      .filter((row) => row && isConnectorRelevant(row.connector_id, ctx, message))
      .slice(0, 3);
    if (!relevant.length) return [];

    const idsNeedingTokens = relevant
      .map((row) => row.connector_id)
      .filter((id) => id !== "authorities" && id !== "commerce" && id !== "accounting");
    const tokenMap = new Map<string, MCPTokenRow>();
    if (idsNeedingTokens.length) {
      const { data: tokens, error: tokenError } = await supabase
        .from("mcp_oauth_tokens")
        .select("connector_id,access_token,refresh_token,token_type,scope,expires_at,metadata")
        .eq("user_id", userID)
        .in("connector_id", idsNeedingTokens);
      if (tokenError) {
        console.error("mcp token load failed:", tokenError.message);
      }
      for (const token of (tokens ?? []) as MCPTokenRow[]) tokenMap.set(token.connector_id, token);
    }

    const settled = await Promise.allSettled(
      relevant.map((connection) =>
        loadConnectorContext(
          supabase,
          userID,
          connection,
          tokenMap.get(connection.connector_id),
          query,
        ),
      ),
    );
    return settled
      .flatMap((item) => (item.status === "fulfilled" && item.value ? [item.value] : []))
      .filter((item) => Array.isArray(item.facts) && item.facts.length > 0)
      .slice(0, 3);
  };

  return await Promise.race([
    work(),
    new Promise<MCPLiveContext[]>((resolve) => setTimeout(() => resolve([]), MCP_LIVE_BUDGET_MS)),
  ]);
}

// ─── Main handler ────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = (await req.json()) as {
      task: TaskType;
      session_id?: string;
      message?: string;
      extra?: Record<string, unknown>;
    };

    const { task, session_id, message = "", extra = {} } = body;

    // Auth: Chat darf ohne DB-Persistenz laufen; persistierende Tasks brauchen User.
    const authHeader = req.headers.get("Authorization");
    const {
      data: { user },
      error: authError,
    } = authHeader
      ? await supabase.auth.getUser(authHeader.replace("Bearer ", ""))
      : { data: { user: null }, error: new Error("missing auth") };
    if ((authError || !user) && task !== "chat") {
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }
    const requireUser = () => {
      if (!user) throw new Error("Authenticated user required");
      return user;
    };

    const onboarding =
      extra?.onboarding && typeof extra.onboarding === "object"
        ? (extra.onboarding as Record<string, unknown>)
        : null;
    const onboardingContext =
      onboarding?.context && typeof onboarding.context === "object"
        ? (onboarding.context as Record<string, unknown>)
        : null;
    const onboardingSkills =
      onboarding?.skills && typeof onboarding.skills === "object"
        ? (onboarding.skills as Record<string, unknown>)
        : null;

    // Load founder context, profile, session summary and the actual execution
    // status in parallel. Chat history alone is never treated as a job status.
    const activeExecutionThreshold = new Date(Date.now() - 3 * 60_000).toISOString();
    const [
      { data: contextData },
      { data: profile },
      { data: sessionRow },
      { data: activeExecutionRow },
    ] = user
      ? await Promise.all([
          supabase
            .from("copilot_context")
            .select("*")
            .eq("user_id", user.id)
            .order("updated_at", { ascending: false })
            .limit(1)
            .single(),
          supabase.from("profiles").select("display_name, founder_type").eq("id", user.id).single(),
          session_id
            ? supabase.from("copilot_sessions").select("summary").eq("id", session_id).maybeSingle()
            : Promise.resolve({ data: null }),
          session_id
            ? supabase
                .from("copilot_execution_jobs")
                .select(
                  "id,status,assignment,progress_text,current_step,max_steps,started_at,created_at",
                )
                .eq("session_id", session_id)
                .in("status", ["queued", "running"])
                .gte("updated_at", activeExecutionThreshold)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle()
            : Promise.resolve({ data: null }),
        ])
      : [{ data: null }, { data: null }, { data: null }, { data: null }];

    const ctx: FounderContext = {
      userName: profile?.display_name || onboardingField(onboarding, "userName") || "Founder",
      founder_type: profile?.founder_type || undefined,
      role: contextData?.role,
      idea: contextData?.idea,
      stage: contextData?.stage,
      city: contextData?.city,
      goal: contextData?.goal,
      risk: contextData?.risk,
    };

    if (onboarding) {
      ctx.founder_type = ctx.founder_type || stringOrUndefined(onboarding.path);
      ctx.industry = ctx.industry || stringOrUndefined(onboarding.industry);
      ctx.venture_term = ctx.venture_term || onboardingField(onboarding, "ventureTerm");
      ctx.partner_term = ctx.partner_term || onboardingField(onboarding, "partnerTerm");
      ctx.copilot_context = ctx.copilot_context || onboardingField(onboarding, "copilotContext");
    }
    if (onboardingContext) {
      ctx.idea = ctx.idea || stringOrUndefined(onboardingContext.idea);
      // Während des Onboardings gibt es noch kein Profil in der DB — der Ort
      // kann also nur aus dem mitgeschickten Kontext kommen.
      ctx.city = ctx.city || stringOrUndefined(onboardingContext.city);
      ctx.role = ctx.role || stringOrUndefined(onboardingContext.role);
      ctx.stage = ctx.stage || stringOrUndefined(onboardingContext.stage);
      ctx.goal = ctx.goal || stringOrUndefined(onboardingContext.goal);
      ctx.risk = ctx.risk || stringOrUndefined(onboardingContext.risk);
    }

    // Token-Verbrauch dieses Requests einsammeln → ai_usage (Admin-Insights)
    const usages: UsageEntry[] = [];
    const sink: UsageSink = (entry) => usages.push(entry);
    let activeTokenGrant = user ? await loadTokenGrant(supabase, user.id) : null;
    if (
      activeTokenGrant &&
      Math.max(0, activeTokenGrant.tokens_used) >= Math.max(0, activeTokenGrant.token_limit)
    ) {
      return new Response(
        JSON.stringify({
          error:
            "KI-Kontingent aufgebraucht. Bitte im Profil spaeter erneut versuchen oder den Admin um mehr Tokens bitten.",
          code: "ai_quota_exceeded",
          quota: tokenQuotaPayload(activeTokenGrant),
        }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let result: Record<string, unknown> = {};

    // ── TASK ROUTER ──────────────────────────────────────────

    if (task === "context_parse") {
      // Kimi only — pure extraction
      const kimiPrompt = KIMI_PROMPTS.context_parse(ctx, message);
      const kimiRaw = await callKimiWithFallback(kimiPrompt, "context_parse", sink);
      console.log("[KIMI context_parse]", kimiRaw.slice(0, 300));
      const parsed = parseJSON(kimiRaw);

      // Save/update context
      if (user) {
        await supabase.from("copilot_context").upsert({
          user_id: user.id,
          session_id: session_id || null,
          ...parsed,
          raw_context: parsed,
          updated_at: new Date().toISOString(),
        });
      }

      result = { context: parsed };
    } else if (task === "chat") {
      if (!message || message.trim() === "") {
        return new Response(JSON.stringify({ error: "message darf nicht leer sein" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Rate-Limit-Check, Verlauf und Web-Recherche laufen PARALLEL —
      // vorher waren das bis zu drei sequenzielle Wartezeiten vor dem Modell-Call.
      const hourAgo = new Date(Date.now() - 3600_000).toISOString();
      const rateLimitPromise = user
        ? supabase
            .from("copilot_messages")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("role", "user")
            .gte("created_at", hourAgo)
            .then(({ count }) => count ?? 0)
        : Promise.resolve(0);

      const clientHistory: ChatTurn[] = Array.isArray(extra.history)
        ? (extra.history as ChatTurn[]).filter(
            (t) => (t?.role === "user" || t?.role === "assistant") && typeof t.content === "string",
          )
        : [];
      const historyPromise =
        clientHistory.length > 0 || !session_id || !user
          ? Promise.resolve(clientHistory)
          : supabase
              .from("copilot_messages")
              .select("role, content")
              .eq("session_id", session_id)
              .order("created_at", { ascending: false })
              .limit(16)
              .then(({ data }) => ((data ?? []) as ChatTurn[]).reverse());

      // Rolling Summary: server-persistiert (Web) oder vom Client mitgeschickt (iOS).
      const priorSummary =
        (typeof sessionRow?.summary === "string" && sessionRow.summary) ||
        (typeof extra.conversation_summary === "string" ? extra.conversation_summary : "") ||
        "";

      // Gemerkte Fakten: serverseitig (raw_context.facts) + clientseitig (extra.memory)
      const serverFacts = Array.isArray(
        (contextData?.raw_context as Record<string, unknown> | null)?.facts,
      )
        ? ((contextData!.raw_context as Record<string, unknown>).facts as string[])
        : [];
      const clientFacts = Array.isArray(extra.memory) ? (extra.memory as string[]) : [];
      const memory = [...new Set([...serverFacts, ...clientFacts])].slice(0, 20);
      const mcpConnectors: MCPConnector[] = Array.isArray(extra.mcp_connectors)
        ? (extra.mcp_connectors as MCPConnector[]).filter(
            (connector) => connector && typeof connector === "object",
          )
        : [];

      const surface = typeof extra.surface === "string" ? extra.surface : undefined;

      // Hochgeladene Unterlagen: Titel plus extrahierter Text. Ohne die sieht
      // der Co-Pilot nur Dateinamen und muss über den Inhalt raten.
      const documents: FounderDocument[] = user
        ? await supabase
            .from("document_assets")
            .select("title,kind,text_content,text_preview")
            .eq("user_id", user.id)
            .order("imported_at", { ascending: false })
            .limit(6)
            .then(({ data }) =>
              (data ?? []).map((row: Record<string, unknown>) => ({
                title: typeof row.title === "string" ? row.title : "Unterlage",
                kind: typeof row.kind === "string" ? row.kind : undefined,
                text:
                  (typeof row.text_content === "string" && row.text_content) ||
                  (typeof row.text_preview === "string" ? row.text_preview : ""),
              })),
            )
            .catch(() => [])
        : [];

      // Nur das Nötigste abwarten — Web-Recherche und MCP blockieren die
      // erste Antwort nicht mehr, die laufen ggf. im Hintergrund.
      const [recentCount, history] = await Promise.all([rateLimitPromise, historyPromise]);
      if (recentCount >= 80) {
        return new Response(
          JSON.stringify({ error: "Rate limit erreicht — bitte in einer Stunde erneut." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // ── Interaction-Agent: antwortet SOFORT, recherchiert selbst nicht ──
      // Braucht es echte Quellen, gibt er nur eine kurze Ansage zurück und der
      // Execution-Teil arbeitet im Hintergrund weiter (siehe unten).
      const interactionPrompt = buildInteractionPrompt(ctx, {
        message,
        activeExecution: activeExecutionRow
          ? {
              status: activeExecutionRow.status,
              assignment: activeExecutionRow.assignment,
              startedAt: activeExecutionRow.started_at || activeExecutionRow.created_at,
              progress: activeExecutionRow.progress_text || undefined,
              currentStep: activeExecutionRow.current_step,
              maxSteps: activeExecutionRow.max_steps,
            }
          : null,
        history,
        memory,
        priorSummary,
        surface,
        documents,
      });
      let kimiRaw: string;
      try {
        kimiRaw = await callChatModel(interactionPrompt, sink, 1600);
      } catch (err) {
        // Sanfte Degradation: lieber eine freundliche Mentor-Antwort als ein harter 500.
        console.error(
          "chat model failed, graceful fallback:",
          err instanceof Error ? err.message : err,
        );
        return new Response(
          JSON.stringify({
            answer:
              "Ich brauch gerade einen kurzen Moment — die Leitung war überlastet. Schreib mir einfach nochmal, ich bin sofort wieder für dich da.",
            too_early: false,
            sources: [],
            follow_up_question: null,
            quick_actions: [],
            navigation: [],
            app_actions: [],
            new_facts: [],
            celebrated_win: null,
            conversation_summary: priorSummary,
            degraded: true,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      console.log("[interaction raw]", kimiRaw.slice(0, 300));
      let parsedInteraction = parseJSONLoose(kimiRaw);
      if (!isRecord(parsedInteraction)) {
        console.warn("[interaction invalid JSON] attempting repair");
        try {
          const repairPrompt = `
            Repariere die folgende unvollständige oder ungültige Modellantwort.
            Antworte ausschließlich als valides JSON-Objekt. Die sichtbare "antwort"
            muss auf Deutsch, vollständig, ohne Codezaun und ohne abgebrochenen Satz sein.
            Kürze sie bei Bedarf, statt sie unvollständig zu lassen.

            Erforderliche Felder:
            {
              "antwort": "vollständige Antwort",
              "klaerung_noetig": false,
              "recherche_noetig": false,
              "auftrag": "",
              "follow_up_frage": null,
              "follow_up_aktionen": [],
              "app_aktionen": [],
              "neue_fakten": [],
              "gefeierter_erfolg": null,
              "gespraechs_zusammenfassung": ""
            }

            Aktuelle Nutzerfrage:
            ${message}

            Ungültige Antwort:
            ${stripFences(kimiRaw).slice(0, 10_000)}
          `;
          const repairedRaw = await callSonnet(repairPrompt, sink, 1400, true);
          parsedInteraction = parseJSONLoose(repairedRaw);
        } catch (repairError) {
          console.error(
            "interaction repair failed:",
            repairError instanceof Error ? repairError.message : repairError,
          );
        }
      }
      const kimiData = isRecord(parsedInteraction)
        ? parsedInteraction
        : {
            antwort:
              "Die Antwort wurde nicht vollständig übertragen. Versuch es bitte noch einmal.",
            klaerung_noetig: false,
            recherche_noetig: false,
            auftrag: "",
            follow_up_frage: null,
            follow_up_aktionen: [],
            app_aktionen: [],
            neue_fakten: [],
            gefeierter_erfolg: null,
            gespraechs_zusammenfassung: priorSummary,
          };
      const draft = extractDraft(kimiData, kimiRaw).trim();

      // Der Interaction-Agent nutzt keine Live-Connectoren — die zieht bei
      // Bedarf der Execution-Teil im Hintergrund.
      const mcpLiveContext: MCPLiveContext[] = [];

      // ── Execution-Teil: läuft im Hintergrund weiter und liefert die
      // recherchierte Antwort als EIGENE Nachricht nach (Realtime).
      const assignment = typeof kimiData.auftrag === "string" ? kimiData.auftrag.trim() : "";
      const clarificationNeeded = kimiData.klaerung_noetig === true;
      const wantsResearch =
        !clarificationNeeded &&
        !isPureAppMutationRequest(message) &&
        (kimiData.recherche_noetig === true || needsWebResearch(ctx, message));
      // Nachliefern geht nur mit User + Session (sonst gibt es keinen Kanal).
      const canDeliverLater = Boolean(user) && Boolean(session_id);
      const delegateRequested = wantsResearch && canDeliverLater && !activeExecutionRow;

      // Die eigentliche Recherche-Arbeit — einmal definiert, zweifach genutzt:
      // im Hintergrund (mit Session) oder synchron (ohne Session).
      const runResearch = async (): Promise<{
        answer: string;
        sources: WebSource[];
        cards: CopilotCard[];
        deliverAsFollowUp: boolean;
      } | null> => {
        const [unfilteredWebSources, liveContext] = await Promise.all([
          findWebSources(ctx, message),
          loadMCPLiveContext(supabase, user?.id, ctx, message, { history, priorSummary }),
        ]);
        const webSources = supportedResearchSources(ctx, message, unfilteredWebSources);
        const researchResult = await callResearchModel(
          buildChatPrompt(ctx, {
            message: assignment ? `${message}\n\n(Auftrag: ${assignment})` : message,
            immediateAnswer: draft,
            history,
            memory,
            priorSummary,
            surface,
            app: extra.app,
            documents,
            webSources,
            mcpConnectors,
            mcpLiveContext: liveContext,
          }),
          1400,
        );
        const deepRaw = researchResult.content;
        const deepData = parseJSON(deepRaw);
        const deepAnswer = extractDraft(deepData, deepRaw).trim();
        if (!deepAnswer) return null;
        const deepSources = mergeSources(
          webSources,
          researchResult.sources,
          Array.isArray(deepData.quellen)
            ? (deepData.quellen.map(normalizeSource).filter(Boolean) as WebSource[])
            : [],
          liveContext.flatMap((item) => (Array.isArray(item.sources) ? item.sources : [])),
        );
        const hasConnectorEvidence = liveContext.some(
          (item) => Array.isArray(item.facts) && item.facts.length > 0,
        );
        const groundedSources = supportedResearchSources(ctx, message, deepSources);
        const hasGroundedWebEvidence = groundedSources.length > 0;
        const deliverAsFollowUp = executionResultAddsValue(
          draft,
          deepAnswer,
          groundedSources,
          hasConnectorEvidence,
          deepData.nachricht_noetig === true,
          typeof deepData.mehrwert === "string" ? deepData.mehrwert : "",
        );
        return {
          answer: deepAnswer,
          sources: hasGroundedWebEvidence
            ? groundedSources
            : hasConnectorEvidence
              ? deepSources
              : [],
          // Karten dürfen nur mitkommen, wenn die Recherche überhaupt Belege hat.
          cards:
            hasGroundedWebEvidence || hasConnectorEvidence ? normalizeCards(deepData.karten) : [],
          deliverAsFollowUp,
        };
      };

      // Der Client (iOS) nutzt seine lokale Session-UUID. Damit die Fremd-
      // schlüssel von copilot_messages greifen, legen wir die Session-Zeile
      // an, falls sie noch nicht existiert.
      const ensureSession = async () => {
        if (!user || !session_id) return;
        await supabase
          .from("copilot_sessions")
          .upsert(
            { id: session_id, user_id: user.id },
            { onConflict: "id", ignoreDuplicates: true },
          );
      };

      let executionJobID: string | null = null;
      if (delegateRequested) {
        await ensureSession();
        const agentDescriptor = executionAgentDescriptor(ctx, message, assignment);
        const { data: executionAgent, error: executionAgentError } = await supabase
          .from("copilot_execution_agents")
          .upsert(
            {
              user_id: user!.id,
              agent_key: agentDescriptor.key,
              name: agentDescriptor.name,
              purpose: agentDescriptor.purpose,
              status: "working",
              last_used_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id,agent_key" },
          )
          .select("id")
          .single();
        if (executionAgentError) {
          console.error("execution agent upsert failed:", executionAgentError.message);
        }

        const { data: executionJob, error: executionJobError } = await supabase
          .from("copilot_execution_jobs")
          .insert({
            session_id,
            user_id: user!.id,
            agent_id: executionAgent?.id ?? null,
            status: "queued",
            request_message: message,
            assignment: assignment || message,
            current_step: 0,
            max_steps: 4,
            next_run_at: new Date().toISOString(),
            progress_text: "Auftrag angenommen.",
            working_memory: {
              immediate_answer: draft,
              conversation_summary: priorSummary,
            },
          })
          .select("id")
          .single();
        if (executionJobError) {
          console.error("execution job create failed:", executionJobError.message);
        } else {
          executionJobID = executionJob.id;
          dispatchExecutionWorker(executionJob.id);
        }
      }

      // Ohne Session könnten wir nichts nachreichen — dann lieber gleich
      // ausrecherchieren, statt ein Versprechen zu geben, das nie eingelöst wird.
      const shouldResearchSynchronously =
        wantsResearch && (!canDeliverLater || (delegateRequested && !executionJobID));
      // Harte Obergrenze: der Founder wartet live. Dauert die Recherche länger,
      // antworten wir mit dem, was der Interaction-Agent schon hat — lieber eine
      // ehrliche Sofort-Antwort als eine perfekte nach 90 Sekunden.
      // Eine Kontaktsuche lädt zusätzlich die Trefferseiten nach und braucht
      // deshalb etwas mehr Luft — ohne den Namen ist die Antwort wertlos.
      const syncResearchCap = isContactLookup(message)
        ? SYNC_RESEARCH_CAP_MS + CONTACT_ENRICH_BUDGET_MS
        : SYNC_RESEARCH_CAP_MS;
      const syncResearch = shouldResearchSynchronously
        ? await Promise.race([
            runResearch(),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), syncResearchCap)),
          ])
        : null;

      // Karten nur zusammen mit der recherchierten Antwort — ohne Beleg keine Karte.
      const cards: CopilotCard[] =
        syncResearch && syncResearch.sources.length > 0 ? syncResearch.cards : [];

      // Extract draft — der Interaction-Agent antwortet direkt (kein Polish-Call)
      let polishedAnswer = syncResearch
        ? syncResearch.sources.length > 0
          ? syncResearch.answer
          : draft ||
            "Dazu finde ich gerade nichts Belastbares. Frag am besten direkt bei der Kammer nach — ich rate dir hier nichts zusammen."
        : draft;

      // Nav-Vorschläge gegen den Routen-Katalog validieren
      const validRoutes = new Set(ROUTE_CATALOG.map((r) => r.to as string));
      const navigation = (Array.isArray(kimiData.navigation) ? kimiData.navigation : [])
        .filter(
          (n: Record<string, unknown>) =>
            typeof n?.to === "string" &&
            typeof n?.label === "string" &&
            validRoutes.has((n.to as string).split("?")[0].split("#")[0]),
        )
        .slice(0, 2);

      const newFacts = (Array.isArray(kimiData.neue_fakten) ? kimiData.neue_fakten : [])
        .filter((f: unknown): f is string => typeof f === "string" && f.trim().length > 3)
        .slice(0, 3);

      // Rolling Summary des Modells übernehmen (Fallback: bisherige behalten).
      const rawSummary =
        typeof kimiData.gespraechs_zusammenfassung === "string"
          ? kimiData.gespraechs_zusammenfassung.trim()
          : "";
      const conversationSummary = rawSummary.length > 20 ? rawSummary.slice(0, 1500) : priorSummary;

      const modelSources = Array.isArray(kimiData.quellen)
        ? mergeSources(kimiData.quellen.map(normalizeSource).filter(Boolean) as WebSource[])
        : [];
      const mcpSources = mergeSources(
        mcpLiveContext.flatMap((item) => (Array.isArray(item.sources) ? item.sources : [])),
      );
      const sources = mergeSources(syncResearch?.sources ?? [], modelSources, mcpSources);

      // App-Aktionen gegen die Whitelist validieren — der Client baut daraus Chips.
      const ALLOWED_APP_ACTIONS = new Set([
        "add_calendar_item",
        "add_kanban_card",
        "remember_fact",
        "open_screen",
        "slack_post",
        "email_draft",
        "set_business_modules",
      ]);
      // Bausteine, die der Co-Pilot auf die Business-Übersicht legen darf.
      const ALLOWED_BUSINESS_MODULES = new Set([
        // Grundlagen
        "umsatz", "auslastung", "tagesplan", "abos", "offen",
        "kurzinfo", "bestand", "stimmen", "personal", "startklar",
        // Gastro
        "tageskasse", "wareneinsatz", "reservierungen",
        // Handel
        "bestellungen", "retouren", "topseller",
        // Handwerk & Bau
        "auftraege", "zeiterfassung", "material", "fahrzeuge",
        // Dienstleistung & Beratung
        "angebote", "projekte", "stundenkonto",
        // Kurse & Bildung
        "kursbelegung", "warteliste",
        // Online & Sichtbarkeit
        "reichweite", "shop", "newsletter",
        // Geld & Pflichten
        "liquiditaet", "steuertermine", "pflichten",
      ]);
      const ALLOWED_SCREENS = new Set([
        "kanban",
        "calendar",
        "swipe",
        "chats",
        "documents",
        "company",
        "startup",
        "radar",
        "events",
        "guides",
        "copilot",
        "profile",
      ]);
      const slackChannels = new Map<string, { channelID: string; channel: string }>();
      for (const item of mcpLiveContext) {
        for (const hint of Array.isArray(item.action_hints) ? item.action_hints : []) {
          if (!isRecord(hint) || hint.action !== "slack_post") continue;
          const channelID = typeof hint.channel_id === "string" ? hint.channel_id : "";
          const channel = typeof hint.channel === "string" ? hint.channel : "";
          if (!channelID || !channel) continue;
          slackChannels.set(channelID, { channelID, channel });
          slackChannels.set(cleanSlackChannelName(channel), { channelID, channel });
        }
      }
      const field = (a: Record<string, unknown>, keys: string[]) => {
        for (const key of keys) {
          if (typeof a[key] === "string" && a[key].trim()) return a[key].trim();
        }
        return "";
      };
      const appActions: Record<string, unknown>[] = [];
      const rawAppActions = clarificationNeeded
        ? []
        : Array.isArray(kimiData.app_aktionen)
          ? kimiData.app_aktionen
          : [];
      for (const raw of rawAppActions) {
        if (!isRecord(raw)) continue;
        const actionName = typeof raw.aktion === "string" ? raw.aktion : "";
        if (!ALLOWED_APP_ACTIONS.has(actionName)) continue;

        if (actionName === "open_screen") {
          const screen = field(raw, ["screen"]);
          if (ALLOWED_SCREENS.has(screen)) {
            appActions.push({ action: actionName, title: "", note: "", due: "", screen });
          }
          continue;
        }

        // Business-Module: der Co-Pilot legt fest, welche Bausteine auf die
        // Übersicht gehören — mit kurzer Begründung je Modul.
        if (actionName === "set_business_modules") {
          const ids = (Array.isArray(raw.module) ? raw.module : [])
            .filter((m): m is string => typeof m === "string")
            .map((m) => m.trim().toLowerCase())
            .filter((m) => ALLOWED_BUSINESS_MODULES.has(m))
            .slice(0, 6);
          const extras = (Array.isArray(raw.vorschlaege) ? raw.vorschlaege : [])
            .filter((m): m is string => typeof m === "string")
            .map((m) => m.trim().toLowerCase())
            .filter((m) => ALLOWED_BUSINESS_MODULES.has(m) && !ids.includes(m))
            .slice(0, 4);
          if (ids.length === 0) continue;
          const reasons = isRecord(raw.begruendung) ? raw.begruendung : {};
          const why: Record<string, string> = {};
          for (const key of [...ids, ...extras]) {
            const value = reasons[key];
            if (typeof value === "string" && value.trim()) why[key] = value.trim().slice(0, 120);
          }
          appActions.push({
            action: actionName,
            title: "Module aktualisieren",
            note: field(raw, ["intro", "notiz"]).slice(0, 240),
            due: "",
            screen: "",
            modules: ids,
            suggested: extras,
            why,
          });
          continue;
        }

        if (actionName === "slack_post") {
          const messageText = field(raw, ["nachricht", "message", "text", "notiz"]).slice(0, 1800);
          const rawChannelID = field(raw, ["channel_id", "channelId"]);
          const rawChannel = field(raw, ["channel", "channel_name", "channelName", "titel"]);
          const known =
            slackChannels.get(rawChannelID) ?? slackChannels.get(cleanSlackChannelName(rawChannel));
          if (known && messageText.length > 0) {
            appActions.push({
              action: "slack_post",
              title: `Slack ${known.channel}`,
              channel_id: known.channelID,
              channel: known.channel,
              message: messageText,
            });
          }
          continue;
        }

        if (actionName === "email_draft") {
          const subject = field(raw, ["betreff", "subject", "titel", "title"]).slice(0, 180);
          const body = field(raw, [
            "inhalt",
            "body",
            "entwurf",
            "nachricht",
            "message",
            "notiz",
          ]).slice(0, 12_000);
          if (!subject || !body) continue;
          appActions.push({
            action: "email_draft",
            recipient: field(raw, [
              "empfaenger",
              "empfanger",
              "empfaenger_name",
              "recipient_name",
              "recipient",
              "name",
            ]).slice(0, 180),
            to: field(raw, ["an", "to", "email", "empfaenger_email", "recipient_email"]).slice(
              0,
              320,
            ),
            subject,
            body,
          });
          continue;
        }

        const title = field(raw, ["titel", "title"]);
        if (!title) continue;
        const base: Record<string, unknown> = {
          action: actionName,
          title,
          note: field(raw, ["notiz", "note"]),
          due: field(raw, ["faellig", "due"]),
          screen: "",
        };

        if (actionName === "add_calendar_item") {
          // Datum und Uhrzeit nur übernehmen, wenn sie wirklich als solche
          // formatiert sind — die Karte baut daraus die Datums-Kachel, ein
          // freier Text wie "nächste Woche" gehört in "due".
          const date = field(raw, ["datum", "date"]);
          const start = field(raw, ["von", "start", "beginn", "uhrzeit"]);
          const end = field(raw, ["bis", "end", "ende"]);
          const time = (value: string) => {
            const match = value.match(/^(\d{1,2}):(\d{2})$/);
            if (!match) return "";
            const hours = Number(match[1]);
            return hours >= 0 && hours <= 23 && Number(match[2]) <= 59
              ? `${String(hours).padStart(2, "0")}:${match[2]}`
              : "";
          };
          if (/^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date))) {
            base.date = date;
          }
          base.start = time(start);
          base.end = time(end);
          base.location = field(raw, ["ort", "location", "treffpunkt", "link"]).slice(0, 160);
        }

        appActions.push(base);
      }
      polishedAnswer = confirmationSafeAnswer(polishedAnswer, appActions);
      // Was die Karte sauber getrennt trägt, muss der Fließtext nicht verkleben.
      polishedAnswer = answerWithoutCardDuplicates(polishedAnswer, cards);

      // Persistenz (Kontext, Nachricht, Deadline) läuft NACH der Antwort im
      // Hintergrund — spart 2-3 DB-Roundtrips Wartezeit pro Chat-Nachricht.
      const persistChat = async () => {
        // Memory-Merge: neue Fakten + Kontext-Updates non-destruktiv persistieren
        const ctxUpdates =
          kimiData.kontext_updates && typeof kimiData.kontext_updates === "object"
            ? (kimiData.kontext_updates as Record<string, unknown>)
            : {};
        const mergedFields: Record<string, string> = {};
        for (const key of ["role", "idea", "stage", "city", "goal", "risk"] as const) {
          const v = ctxUpdates[key];
          if (typeof v === "string" && v.trim()) mergedFields[key] = v.trim();
        }
        if (user && (newFacts.length > 0 || Object.keys(mergedFields).length > 0)) {
          const prevRaw =
            contextData?.raw_context && typeof contextData.raw_context === "object"
              ? (contextData.raw_context as Record<string, unknown>)
              : {};
          const mergedFacts = [...new Set([...serverFacts, ...newFacts])].slice(-30);
          await supabase.from("copilot_context").upsert({
            ...(contextData?.id ? { id: contextData.id } : {}),
            user_id: user.id,
            session_id: session_id || contextData?.session_id || null,
            role: mergedFields.role ?? contextData?.role ?? null,
            idea: mergedFields.idea ?? contextData?.idea ?? null,
            stage: mergedFields.stage ?? contextData?.stage ?? null,
            city: mergedFields.city ?? contextData?.city ?? null,
            goal: mergedFields.goal ?? contextData?.goal ?? null,
            risk: mergedFields.risk ?? contextData?.risk ?? null,
            raw_context: { ...prevRaw, ...mergedFields, facts: mergedFacts },
            updated_at: new Date().toISOString(),
          });
        }

        // Rolling Summary der Session aktualisieren (Web-Persistenz).
        if (user && session_id && rawSummary.length > 20 && rawSummary !== priorSummary) {
          await supabase
            .from("copilot_sessions")
            .update({ summary: conversationSummary, summary_updated_at: new Date().toISOString() })
            .eq("id", session_id);
        }

        // Save assistant message to DB (nur mit User + Session)
        if (user && session_id) {
          await ensureSession();
          await supabase.from("copilot_messages").insert({
            session_id,
            user_id: user.id,
            role: "assistant",
            content: polishedAnswer,
            model_used: "kimi-k3",
            sources,
            cards,
          });

          // Save deadline if Kimi detected one
          const deadline = kimiData.neue_deadline_erkannt as Record<string, unknown> | null;
          if (deadline?.titel && deadline?.datum) {
            await supabase.from("deadlines").insert({
              user_id: user.id,
              session_id,
              title: deadline.titel,
              due_date: deadline.datum,
              priority: deadline.priorität || "medium",
            });
          }
        }
      };
      const persistPromise = persistChat().catch((err) =>
        console.error("chat persist failed:", err instanceof Error ? err.message : err),
      );
      const runtime = globalThis as typeof globalThis & {
        EdgeRuntime?: { waitUntil?: (promise: Promise<unknown>) => void };
      };
      if (typeof runtime.EdgeRuntime?.waitUntil === "function") {
        runtime.EdgeRuntime.waitUntil(persistPromise);
      }

      const celebratedWin =
        typeof kimiData.gefeierter_erfolg === "string" &&
        kimiData.gefeierter_erfolg.trim().length > 3
          ? kimiData.gefeierter_erfolg.trim().slice(0, 160)
          : null;
      const rawFollowUpQuestion =
        typeof kimiData.follow_up_frage === "string" ? kimiData.follow_up_frage.trim() : "";
      const followUpQuestion =
        rawFollowUpQuestion.length >= 5 ? rawFollowUpQuestion.slice(0, 120) : null;
      const quickActions = followUpQuestion
        ? (Array.isArray(kimiData.follow_up_aktionen) ? kimiData.follow_up_aktionen : [])
            .filter(
              (option: unknown): option is string =>
                typeof option === "string" &&
                option.trim().length >= 2 &&
                option.trim().length <= 60 &&
                !option.trim().endsWith("?"),
            )
            .map((option: string) => option.trim())
            .slice(0, 4)
        : [];
      const exposeFollowUp = shouldExposeFollowUp(message, followUpQuestion, quickActions);

      result = {
        answer: polishedAnswer,
        too_early: kimiData.zu_frueh === true,
        sources,
        cards,
        follow_up_question: exposeFollowUp ? followUpQuestion : null,
        quick_actions: exposeFollowUp ? quickActions : [],
        navigation,
        app_actions: appActions.slice(0, 2),
        new_facts: newFacts,
        celebrated_win: celebratedWin,
        conversation_summary: conversationSummary,
        // true only while a persisted execution job is new or actually active.
        pending: Boolean(executionJobID || activeExecutionRow),
        execution_job_id: executionJobID || activeExecutionRow?.id || null,
      };
    } else if (task === "onboarding_research") {
      // Wird mitten im Onboarding gefeuert, sobald Vorhaben, Branche und Ort
      // stehen. Antwortet SOFORT mit der Job-ID; die eigentliche Recherche
      // läuft im Worker, während der Nutzer die restlichen Fragen beantwortet.
      const authedUser = requireUser();
      const venture = ctx.idea || message;
      if (!venture || venture.trim().length < 10) {
        return new Response(
          JSON.stringify({ error: "Zu wenig Kontext fuer eine Recherche." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const regionLabel = ctx.city || "Deutschland";
      const assignment = [
        `Vorhaben: ${venture}`,
        `Branche: ${ctx.industry || "unbekannt"}`,
        `Ort: ${regionLabel}`,
        "",
        "Kläre für genau dieses Vorhaben in Deutschland:",
        "1. Braucht es eine Erlaubnis, Zulassung oder Registrierung, bevor es losgehen darf?",
        "   Wenn ja: welche Rechtsgrundlage, welche Aufsicht, welche Reihenfolge.",
        `2. Welche Stelle ist in ${regionLabel} konkret zuständig (Kammer, Amt, Register) —`,
        "   mit Namen, nicht als allgemeine Kategorie.",
        "3. Welche zwei bis drei Schritte stehen danach wirklich als Erstes an.",
        "Nenne echte Quellen. Erfinde keine Adressen, Beträge oder Fristen.",
      ].join("\n");

      await supabase
        .from("copilot_sessions")
        .upsert({ id: session_id, user_id: authedUser.id }, { onConflict: "id", ignoreDuplicates: true });

      const descriptor = executionAgentDescriptor(ctx, venture, assignment);
      const { data: onboardingAgent } = await supabase
        .from("copilot_execution_agents")
        .upsert(
          {
            user_id: authedUser.id,
            agent_key: descriptor.key,
            name: descriptor.name,
            purpose: descriptor.purpose,
            status: "working",
            last_used_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,agent_key" },
        )
        .select("id")
        .single();

      const { data: onboardingJob, error: onboardingJobError } = await supabase
        .from("copilot_execution_jobs")
        .insert({
          session_id: session_id || null,
          user_id: authedUser.id,
          agent_id: onboardingAgent?.id ?? null,
          status: "queued",
          request_message: venture,
          assignment,
          current_step: 0,
          max_steps: 3,
          next_run_at: new Date().toISOString(),
          progress_text: "Ich sehe mir dein Vorhaben an.",
          working_memory: {
            source: "onboarding",
            industry: ctx.industry || null,
            region: regionLabel,
          },
        })
        .select("id")
        .single();

      if (onboardingJobError) {
        console.error("onboarding research job failed:", onboardingJobError.message);
        result = { job_id: null, agent: descriptor.name };
      } else {
        dispatchExecutionWorker(onboardingJob.id);
        result = { job_id: onboardingJob.id, agent: descriptor.name };
      }
    } else if (task === "onboarding_brief") {
      // Formt den Startplan. Läuft mit ODER ohne fertige Recherche — ohne
      // Job-Ergebnis ist es immer noch echtes Modellwissen statt Template.
      const authedUser = requireUser();
      const jobID = stringOrUndefined((extra as Record<string, unknown>)?.job_id);

      let researchFindings: string | null = null;
      let researchSources: unknown[] = [];
      if (jobID) {
        const { data: job } = await supabase
          .from("copilot_execution_jobs")
          .select("status, result, progress_text")
          .eq("id", jobID)
          .eq("user_id", authedUser.id)
          .single();
        const jobRecord = isRecord(job) ? job : null;
        const jobResult = jobRecord && isRecord(jobRecord.result) ? jobRecord.result : null;
        const answer =
          jobResult && typeof jobResult.answer === "string" ? jobResult.answer : null;
        if (jobRecord?.status === "completed" && answer && answer.trim() !== "") {
          researchFindings = answer;
          researchSources =
            jobResult && Array.isArray(jobResult.sources) ? jobResult.sources : [];
        }
      }

      const briefInput = JSON.stringify({
        name: ctx.userName,
        vorhaben: ctx.idea || message,
        branche: ctx.industry || null,
        branche_label: onboardingField(onboarding, "industryLabel") || null,
        ort: ctx.city || null,
        modus: ctx.founder_type || null,
        mitgebrachte_skills: onboardingSkills?.selected ?? null,
        verfuegbarkeit: onboardingSkills?.availability ?? null,
        gewaehlte_schwerpunkte: onboarding?.focus ?? null,
        recherche: researchFindings
          ? { findings: researchFindings, sources: researchSources }
          : null,
      });

      const briefRaw = await callKimiWithFallback(
        KIMI_PROMPTS.onboarding_brief(ctx, briefInput),
        "onboarding_brief",
        sink,
      );
      const parsedBrief = parseJSONLoose(briefRaw);
      const briefObject = isRecord(parsedBrief) ? parsedBrief : {};
      const steps = Array.isArray(briefObject.steps) ? briefObject.steps.slice(0, 3) : [];

      result = {
        summary: typeof briefObject.summary === "string" ? briefObject.summary : "",
        regulatory: isRecord(briefObject.regulatory) ? briefObject.regulatory : null,
        steps,
        sources: researchSources,
        researched: researchFindings !== null,
      };
    } else if (task === "plan_generate") {
      const authedUser = requireUser();
      // Load assessment + skills + industry for full context
      const [{ data: assessment }, { data: skills }, { data: profileFull }] = await Promise.all([
        supabase.from("founder_assessment").select("scores").eq("user_id", authedUser.id).single(),
        supabase
          .from("founder_skills")
          .select("skills, looking_for, availability")
          .eq("user_id", authedUser.id)
          .single(),
        supabase
          .from("profiles")
          .select("industry, venture_term, partner_term")
          .eq("id", authedUser.id)
          .single(),
      ]);

      if (profileFull?.industry) {
        ctx.industry = profileFull.industry;
        ctx.venture_term = profileFull.venture_term;
        ctx.partner_term = profileFull.partner_term;
      }
      // Sonnet gets full context directly — no Kimi middleman for plan
      const fullContext = JSON.stringify({
        founder: ctx,
        assessment_scores: assessment?.scores || onboarding?.scores || null,
        skills: skills?.skills || onboardingSkills?.selected || null,
        looking_for: skills?.looking_for || onboardingSkills?.looking_for || null,
        availability_hrs: skills?.availability || onboardingSkills?.availability || null,
        onboarding_context: onboarding || null,
      });

      const sonnetPrompt = SONNET_PROMPTS.plan_presentation(ctx, fullContext);
      const sonnetRaw = await callSonnet(sonnetPrompt, sink);
      console.log("[SONNET plan slides raw]", sonnetRaw.slice(0, 300));

      const parsedSlides = parseJSONLoose(sonnetRaw);
      const slides: unknown[] = Array.isArray(parsedSlides)
        ? parsedSlides
        : parsedSlides && Array.isArray((parsedSlides as Record<string, unknown>).slides)
          ? ((parsedSlides as Record<string, unknown>).slides as unknown[])
          : [];

      console.log("[SLIDES count]", slides.length);

      await supabase.from("copilot_documents").insert({
        user_id: authedUser.id,
        session_id: session_id || null,
        type: "pitch_outline",
        title: `Persönlicher Plan — ${ctx.userName}`,
        content: sonnetRaw,
        draft_content: fullContext,
        fill_pct: 100,
        status: "ready",
        metadata: { slides_count: slides.length },
      });

      result = { slides };
    } else if (task === "deadline_extract") {
      const authedUser = requireUser();
      // Kimi only — pure extraction
      const kimiPrompt = KIMI_PROMPTS.deadline_extract(ctx, message);
      const kimiRaw = await callKimiWithFallback(kimiPrompt, "deadline_extract", sink);
      console.log("[KIMI deadline_extract]", kimiRaw.slice(0, 300));
      const data = parseJSON(kimiRaw);

      const deadlines = (data.deadlines as Array<Record<string, unknown>>) || [];
      if (deadlines.length > 0 && session_id) {
        await supabase.from("deadlines").insert(
          deadlines.map((d) => ({
            user_id: authedUser.id,
            session_id,
            title: d.titel,
            due_date: d.datum,
            priority: d.priorität || "medium",
            notes: d.notiz,
          })),
        );
      }

      result = { deadlines };
    } else if (task === "document_exist") {
      const authedUser = requireUser();
      // Stage 1: Kimi fills content from profile
      const kimiPrompt = KIMI_PROMPTS.document_exist_draft(ctx, message);
      const kimiRaw = await callKimiWithFallback(kimiPrompt, "document_exist", sink);
      console.log("[KIMI document_exist]", kimiRaw.slice(0, 300));

      // Stage 2: Sonnet polishes every section
      const sonnetPrompt = SONNET_PROMPTS.document_exist(ctx, kimiRaw);
      const polished = await callSonnet(sonnetPrompt, sink);

      // Calculate fill percentage
      const missing = (parseJSON(kimiRaw).fehlende_infos as string[]) || [];
      const fillPct = Math.max(0, 100 - missing.length * 8);

      // Save document
      const { data: doc } = await supabase
        .from("copilot_documents")
        .insert({
          user_id: authedUser.id,
          session_id: session_id || null,
          type: "exist_antrag",
          title: "EXIST-Gründerstipendium Antrag",
          content: polished,
          draft_content: kimiRaw,
          fill_pct: fillPct,
          status: "draft",
          metadata: { missing_fields: missing },
        })
        .select()
        .single();

      result = { document: doc, fill_pct: fillPct, missing_fields: missing };
    } else if (task === "advisor_reasons") {
      const advisorInfo = JSON.stringify(extra.advisor || {});

      // Stage 1: Kimi analyzes fit
      const kimiPrompt = KIMI_PROMPTS.advisor_reasons(ctx, advisorInfo);
      const kimiRaw = await callKimiWithFallback(kimiPrompt, "advisor_reasons", sink);
      console.log("[KIMI advisor_reasons]", kimiRaw.slice(0, 300));
      const kimiData = parseJSON(kimiRaw);

      // Stage 2: Sonnet polishes the reason texts
      const sonnetPrompt = SONNET_PROMPTS.advisor_reasons(ctx, JSON.stringify(kimiData));
      const polished = await callSonnet(sonnetPrompt, sink);

      result = {
        reasons: kimiData.gründe || [],
        fit_score: kimiData.fit_score || 0,
        polished,
      };
    } else if (task === "daily_brief") {
      const authedUser = requireUser();
      // Load today's data
      const today = new Date().toISOString().split("T")[0];
      const { data: deadlines } = await supabase
        .from("deadlines")
        .select("title, due_date")
        .eq("user_id", authedUser.id)
        .eq("status", "open")
        .lte("due_date", new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0]);

      const dailyData = JSON.stringify({ deadlines, today });

      // Stage 1: Kimi structures the brief
      const kimiPrompt = KIMI_PROMPTS.daily_brief_draft(ctx, dailyData);
      const kimiRaw = await callKimiWithFallback(kimiPrompt, "daily_brief", sink);
      console.log("[KIMI daily_brief]", kimiRaw.slice(0, 300));

      // Stage 2: Sonnet writes it naturally
      const sonnetPrompt = SONNET_PROMPTS.daily_brief(ctx, kimiRaw);
      const brief = await callSonnet(sonnetPrompt, sink);

      result = { brief, raw: parseJSON(kimiRaw) };
    }

    // ── EMAIL TASKS ──────────────────────────────────────────
    else if (task.startsWith("email_")) {
      const authedUser = requireUser();
      // Stage 1: Kimi drafts structure
      const kimiPrompt = KIMI_PROMPTS.chat(ctx, `Erstelle einen Email-Entwurf für: ${message}`);
      const kimiRaw = await callKimiWithFallback(kimiPrompt, "email_draft", sink);
      console.log("[KIMI email draft]", kimiRaw.slice(0, 300));
      const kimiData = parseJSON(kimiRaw);

      // Stage 2: Sonnet writes the actual email
      const sonnetKey = task as keyof typeof SONNET_PROMPTS;
      const sonnetPromptFn = SONNET_PROMPTS[sonnetKey] || SONNET_PROMPTS.chat;
      const email = await callSonnet(
        sonnetPromptFn(ctx, String(kimiData.antwort || kimiRaw)),
        sink,
      );

      // Save as document
      await supabase.from("copilot_documents").insert({
        user_id: authedUser.id,
        session_id: session_id || null,
        type: task,
        title: `Email: ${message.slice(0, 60)}`,
        content: email,
        draft_content: String(kimiData.antwort || kimiRaw),
        fill_pct: 100,
        status: "ready",
        metadata: extra,
      });

      result = { email };
    } else if (task === "match_explain") {
      const matchInfo = JSON.stringify(extra.match || {});
      const kimiPrompt = KIMI_PROMPTS.match_explain(ctx, matchInfo);
      const kimiRaw = await callKimiWithFallback(kimiPrompt, "match_explain", sink);
      console.log("[KIMI match_explain]", kimiRaw.slice(0, 300));
      result = { explanation: parseJSON(kimiRaw) };
    }

    // Verbrauch loggen — fire-and-forget, blockiert die Antwort nicht.
    if (usages.length > 0) {
      const rows = usages.map((u) => ({
        user_id: user?.id ?? null,
        task,
        model: u.model,
        prompt_tokens: u.promptTokens,
        completion_tokens: u.completionTokens,
        cost_usd: costUsd(u),
        latency_ms: u.latencyMs,
        status: u.status,
        fallback: u.fallback,
      }));
      supabase
        .from("ai_usage")
        .insert(rows)
        .then(({ error }: { error: { message: string } | null }) => {
          if (error) console.error("ai_usage insert failed:", error.message);
        });
    }

    const consumedTokens = usageTokenCount(usages);
    if (user && activeTokenGrant && consumedTokens > 0) {
      const { data, error } = await supabase.rpc("consume_ai_tokens", {
        p_user_id: user.id,
        p_tokens: consumedTokens,
      });
      if (error) {
        console.error("consume_ai_tokens failed:", error.message);
      } else if (data) {
        activeTokenGrant = data as TokenGrant;
      }
    }

    if (activeTokenGrant) {
      result.quota = tokenQuotaPayload(activeTokenGrant);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Co-Pilot error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
