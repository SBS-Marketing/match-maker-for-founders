// ─────────────────────────────────────────────────────────────
// matchfoundr · Co-Pilot Edge Function
// Pipeline: Kimi K3 (chat single-shot, schneller) → Sonnet nur für Plan
// Routing via OpenRouter — one API key for both models
// ─────────────────────────────────────────────────────────────

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  KIMI_PROMPTS,
  ROUTE_CATALOG,
  SONNET_PROMPTS,
  buildChatPolishPrompt,
  buildChatPrompt,
  type ChatTurn,
  type FounderContext,
  type TaskType,
  type WebSource,
} from "./prompts.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const KIMI_MODEL = "moonshotai/kimi-k3";
const SONNET_MODEL = "anthropic/claude-sonnet-4-6";
const KIMI_TIMEOUT_MS = 25_000;
const SONNET_TIMEOUT_MS = 14_000;

// ─── Token-Preise (USD pro 1M Tokens, Schätzwerte für Admin-Insights) ─
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  [KIMI_MODEL]: { input: 0.6, output: 2.5 },
  [SONNET_MODEL]: { input: 3.0, output: 15.0 },
};

type UsageEntry = { model: string; promptTokens: number; completionTokens: number };
type UsageSink = (entry: UsageEntry) => void;
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
  supabase: ReturnType<typeof createClient>,
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
): Promise<string> {
  const controller = new AbortController();
  const timeoutID = setTimeout(() => controller.abort(), timeoutMs);

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
        temperature: model === KIMI_MODEL ? 0.3 : 0.7,
        max_tokens: maxTokens,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(`OpenRouter error (${model}): ${JSON.stringify(data)}`);
    if (sink && data?.usage) {
      sink({
        model,
        promptTokens: Number(data.usage.prompt_tokens ?? 0),
        completionTokens: Number(data.usage.completion_tokens ?? 0),
      });
    }
    const content = data?.choices?.[0]?.message?.content;
    return typeof content === "string" ? content : content == null ? "" : JSON.stringify(content);
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error(`OpenRouter timeout (${model}) after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutID);
  }
}

// ─── Convenience wrappers ────────────────────────────────────
const callKimi = (prompt: string, sink?: UsageSink, maxTokens = 1024) =>
  callOpenRouter(KIMI_MODEL, prompt, maxTokens, KIMI_TIMEOUT_MS, sink);
const callSonnet = (prompt: string, sink?: UsageSink, maxTokens = 420) =>
  callOpenRouter(SONNET_MODEL, prompt, maxTokens, SONNET_TIMEOUT_MS, sink);

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
  return source.url.replace(/^https?:\/\//, "").replace(/\/$/, "").toLowerCase();
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

function needsWebResearch(_ctx: FounderContext, message: string): boolean {
  // Nur die AKTUELLE Nachricht entscheidet — sonst feuert die Recherche bei
  // Foundern mit passendem Profil (z.B. Handwerk) auf jede Nachricht und
  // kostet Sekunden. Kurze Begriffe mit Wortgrenze, damit "gesamt" ≠ "amt".
  const text = ` ${message.toLowerCase()} `;
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

function buildResearchQueries(ctx: FounderContext, message: string): string[] {
  const city = ctx.city && ctx.city !== "unbekannt" ? ctx.city : "";
  const industry = (ctx.industry || "").toLowerCase();
  const idea = (ctx.idea || "").toLowerCase();
  const venture = (ctx.venture_term || "").toLowerCase();
  const text = message.toLowerCase();
  const haystack = [text, industry, idea, venture, ctx.copilot_context || ""].join(" ");
  const place = city ? `${city} ` : "";
  const queries: string[] = [];
  const wantsAuthorities = /kammer|amt|ämter|aemter|behörde|behoerde|gewerbe|anmeld|zulassung/.test(text);
  const isHandwerk =
    /handwerk|hwk|handwerkskammer|friseur|kosmetik|elektriker|elektroniker|installateur|maler|bäcker|baecker|metzger|tischler|schreiner|dachdecker|kfz|meister/.test(haystack);

  if (isHandwerk || text.includes("handwerkskammer") || text.includes("hwk") || (wantsAuthorities && text.includes("kammer"))) {
    queries.push(`${place}Handwerkskammer Existenzgründung Ansprechpartner`);
    queries.push(`${place}HWK Betriebsberatung Gründer Kontakt`);
    queries.push(`${place}Innung ${ctx.idea || ""} Ansprechpartner`);
  }
  if (haystack.includes("gastro") || haystack.includes("restaurant") || text.includes("hygiene") || text.includes("konzession")) {
    queries.push(`${place}Gewerbeamt Gaststätte Konzession Ansprechpartner`);
    queries.push(`${place}Gesundheitsamt Hygiene Belehrung Lebensmittel Ansprechpartner`);
    queries.push(`${place}IHK Gastronomie Gründung Beratung`);
  }
  if (haystack.includes("beauty") || haystack.includes("friseur") || haystack.includes("kosmetik")) {
    queries.push(`${place}Handwerkskammer Friseur Gründung Ansprechpartner`);
    queries.push(`${place}Gewerbeamt Friseursalon anmelden`);
  }
  if (text.includes("ihk") || haystack.includes("handel") || haystack.includes("agentur") || haystack.includes("beratung") || (wantsAuthorities && !isHandwerk)) {
    queries.push(`${place}IHK Existenzgründung Ansprechpartner`);
    queries.push(`${place}IHK Gründungsberatung Kontakt`);
  }
  if (wantsAuthorities || text.includes("gewerbe") || text.includes("anmeld") || text.includes("amt") || text.includes("ämter") || text.includes("aemter") || text.includes("behörde") || text.includes("behoerde")) {
    queries.push(`${place}Gewerbeamt Gewerbeanmeldung Ansprechpartner`);
    queries.push(`${place}Stadt Gewerbe anmelden Kontakt`);
  }
  if (wantsAuthorities || text.includes("finanzamt") || text.includes("steuernummer") || text.includes("steuer")) {
    queries.push(`${place}Finanzamt Existenzgründung steuerliche Erfassung Ansprechpartner`);
  }
  if (isHandwerk || text.includes("berufsgenossenschaft") || text.includes("versicherung") || text.includes("bg ")) {
    queries.push(`${ctx.idea || ctx.venture_term || ""} Berufsgenossenschaft Gründer anmelden`);
  }

  if (queries.length === 0) {
    queries.push(`${place}${ctx.venture_term || "Gründung"} anmelden Ansprechpartner`);
  }

  return [...new Set(queries.map((q) => q.replace(/\s+/g, " ").trim()).filter(Boolean))].slice(0, 5);
}

function sourceScore(source: WebSource): number {
  const url = source.url.toLowerCase();
  const title = source.title.toLowerCase();
  let score = 0;
  if (url.includes(".de")) score += 1;
  if (url.includes("ihk.de") || title.includes("ihk")) score += 5;
  if (url.includes("handwerkskammer") || url.includes("hwk") || title.includes("handwerkskammer") || title.includes("hwk")) score += 5;
  if (url.includes("stadt") || url.includes("serviceportal") || title.includes("gewerbeamt")) score += 4;
  if (title.includes("ansprechpartner") || title.includes("kontakt") || title.includes("beratung")) score += 2;
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
      headers: {
        "Accept": "application/json",
        "X-Subscription-Token": braveKey,
      },
    });
    if (res.ok) {
      const data = await res.json();
      return ((data?.web?.results ?? []) as Array<Record<string, unknown>>)
        .map((item) => normalizeSource({
          type: "Web",
          title: item.title,
          url: item.url,
          snippet: item.description,
        }))
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
    headers: { "User-Agent": "matchfoundr-research/1.0" },
  });
  if (!htmlRes.ok) return [];
  const html = await htmlRes.text();
  const results: WebSource[] = [];
  const re = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?(?:<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>|<div[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/div>)?/gi;
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

const WEB_RESEARCH_BUDGET_MS = 2_800;

async function findWebSources(ctx: FounderContext, message: string): Promise<WebSource[]> {
  if (!needsWebResearch(ctx, message)) return [];
  const queries = buildResearchQueries(ctx, message).slice(0, 3);
  // Hartes Zeitbudget: langsame Suchen liefern eben nichts — die Antwort wartet nicht.
  const timeout = new Promise<WebSource[]>((resolve) =>
    setTimeout(() => resolve([]), WEB_RESEARCH_BUDGET_MS),
  );
  const groups = await Promise.allSettled(
    queries.map((query) => Promise.race([searchWeb(query), timeout])),
  );
  const sources = groups
    .flatMap((group) => group.status === "fulfilled" ? group.value : [])
    .sort((a, b) => sourceScore(b) - sourceScore(a));
  return mergeSources(sources);
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

    // Load founder context — beide Queries parallel (spart einen Roundtrip)
    const [{ data: contextData }, { data: profile }] = user
      ? await Promise.all([
          supabase
            .from("copilot_context")
            .select("*")
            .eq("user_id", user.id)
            .order("updated_at", { ascending: false })
            .limit(1)
            .single(),
          supabase.from("profiles").select("display_name").eq("id", user.id).single(),
        ])
      : [{ data: null }, { data: null }];

    const ctx: FounderContext = {
      userName: profile?.display_name || stringOrUndefined(onboarding?.userName) || "Founder",
      role: contextData?.role,
      idea: contextData?.idea,
      stage: contextData?.stage,
      city: contextData?.city,
      goal: contextData?.goal,
      risk: contextData?.risk,
    };

    if (onboarding) {
      ctx.industry = ctx.industry || stringOrUndefined(onboarding.industry);
      ctx.venture_term = ctx.venture_term || stringOrUndefined(onboarding.ventureTerm);
      ctx.partner_term = ctx.partner_term || stringOrUndefined(onboarding.partnerTerm);
      ctx.copilot_context = ctx.copilot_context || stringOrUndefined(onboarding.copilotContext);
    }
    if (onboardingContext) {
      ctx.idea = ctx.idea || stringOrUndefined(onboardingContext.idea);
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
      const kimiRaw = await callKimi(kimiPrompt, sink);
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
      const historyPromise: Promise<ChatTurn[]> =
        clientHistory.length > 0 || !session_id || !user
          ? Promise.resolve(clientHistory)
          : supabase
              .from("copilot_messages")
              .select("role, content")
              .eq("session_id", session_id)
              .order("created_at", { ascending: false })
              .limit(12)
              .then(({ data }) => ((data ?? []) as ChatTurn[]).reverse());

      // Gemerkte Fakten: serverseitig (raw_context.facts) + clientseitig (extra.memory)
      const serverFacts = Array.isArray(
        (contextData?.raw_context as Record<string, unknown> | null)?.facts,
      )
        ? ((contextData!.raw_context as Record<string, unknown>).facts as string[])
        : [];
      const clientFacts = Array.isArray(extra.memory) ? (extra.memory as string[]) : [];
      const memory = [...new Set([...serverFacts, ...clientFacts])].slice(0, 20);

      const surface = typeof extra.surface === "string" ? extra.surface : undefined;
      const [recentCount, history, webSources] = await Promise.all([
        rateLimitPromise,
        historyPromise,
        findWebSources(ctx, message),
      ]);
      if (recentCount >= 80) {
        return new Response(
          JSON.stringify({ error: "Rate limit erreicht — bitte in einer Stunde erneut." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Stage 1: Kimi — Analyse, Antwortentwurf, Memory-Extraktion, Nav-Vorschläge
      const kimiPrompt = buildChatPrompt(ctx, {
        message,
        history,
        memory,
        surface,
        app: extra.app,
        webSources,
      });
      const kimiRaw = await callKimi(kimiPrompt, sink);
      console.log("[KIMI chat raw]", kimiRaw.slice(0, 300));
      const kimiData = parseJSON(kimiRaw);

      // Extract draft — Kimi K3 antwortet direkt, kein Sonnet-Polish mehr (Latenz halbiert)
      const draft = extractDraft(kimiData, kimiRaw);
      const polishedAnswer = draft;

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
      const sources = mergeSources(
        Array.isArray(kimiData.quellen)
          ? (kimiData.quellen.map(normalizeSource).filter(Boolean) as WebSource[])
          : [],
        webSources,
      );

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

        // Save assistant message to DB (nur mit User + Session)
        if (user && session_id) {
          await supabase.from("copilot_messages").insert({
            session_id,
            user_id: user.id,
            role: "assistant",
            content: polishedAnswer,
            model_used: "kimi-k3",
            sources,
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
      // deno-lint-ignore no-explicit-any
      const runtime = globalThis as any;
      if (typeof runtime.EdgeRuntime?.waitUntil === "function") {
        runtime.EdgeRuntime.waitUntil(persistPromise);
      }

      // App-Aktionen gegen die Whitelist validieren — der Client baut daraus Chips.
      const ALLOWED_APP_ACTIONS = new Set([
        "add_calendar_item",
        "add_kanban_card",
        "remember_fact",
        "open_screen",
      ]);
      const ALLOWED_SCREENS = new Set([
        "kanban", "calendar", "swipe", "chats", "documents", "company",
        "startup", "radar", "events", "guides", "copilot",
      ]);
      const appActions = (Array.isArray(kimiData.app_aktionen) ? kimiData.app_aktionen : [])
        .filter((a: Record<string, unknown>) => {
          if (typeof a?.aktion !== "string" || !ALLOWED_APP_ACTIONS.has(a.aktion)) return false;
          if (a.aktion === "open_screen") {
            return typeof a.screen === "string" && ALLOWED_SCREENS.has(a.screen);
          }
          return typeof a.titel === "string" && a.titel.trim().length > 0;
        })
        .slice(0, 2)
        .map((a: Record<string, unknown>) => ({
          action: a.aktion,
          title: typeof a.titel === "string" ? a.titel : "",
          note: typeof a.notiz === "string" ? a.notiz : "",
          due: typeof a.faellig === "string" ? a.faellig : "",
          screen: typeof a.screen === "string" ? a.screen : "",
        }));

      result = {
        answer: polishedAnswer,
        too_early: kimiData.zu_frueh === true,
        sources,
        quick_actions: Array.isArray(kimiData.follow_up_aktionen)
          ? kimiData.follow_up_aktionen
          : [],
        navigation,
        app_actions: appActions,
        new_facts: newFacts,
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
      const kimiRaw = await callKimi(kimiPrompt, sink);
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
      const kimiRaw = await callKimi(kimiPrompt, sink);
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
      const kimiRaw = await callKimi(kimiPrompt, sink);
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
      const kimiRaw = await callKimi(kimiPrompt, sink);
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
      const kimiRaw = await callKimi(kimiPrompt, sink);
      console.log("[KIMI email draft]", kimiRaw.slice(0, 300));
      const kimiData = parseJSON(kimiRaw);

      // Stage 2: Sonnet writes the actual email
      const sonnetKey = task as keyof typeof SONNET_PROMPTS;
      const sonnetPromptFn = SONNET_PROMPTS[sonnetKey] || SONNET_PROMPTS.chat;
      const email = await callSonnet(sonnetPromptFn(ctx, String(kimiData.antwort || kimiRaw)), sink);

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
      const kimiRaw = await callKimi(kimiPrompt, sink);
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
