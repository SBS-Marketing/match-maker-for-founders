// ─────────────────────────────────────────────────────────────
// matchfoundr · Co-Pilot Edge Function
// Pipeline: Kimi K2.6 (heavy work) → Claude Sonnet (polish)
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
} from "./prompts.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const KIMI_MODEL = "moonshotai/kimi-k2.6";
const SONNET_MODEL = "anthropic/claude-sonnet-4-6";

// ─── Generic OpenRouter call ─────────────────────────────────
async function callOpenRouter(model: string, prompt: string, maxTokens = 2048): Promise<string> {
  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
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
  const content = data?.choices?.[0]?.message?.content;
  return typeof content === "string" ? content : content == null ? "" : JSON.stringify(content);
}

// ─── Convenience wrappers ────────────────────────────────────
const callKimi = (prompt: string) => callOpenRouter(KIMI_MODEL, prompt, 2048);
const callSonnet = (prompt: string) => callOpenRouter(SONNET_MODEL, prompt, 1024);

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

    // Auth — optional für Chat (Mobile/Guest), Pflicht für persistierende Tasks.
    const authHeader = req.headers.get("Authorization");
    let user: { id: string } | null = null;
    if (authHeader) {
      const { data: authData } = await supabase.auth.getUser(
        authHeader.replace("Bearer ", ""),
      );
      if (authData?.user) user = authData.user;
    }

    const body = (await req.json()) as {
      task: TaskType;
      session_id?: string;
      message?: string;
      extra?: Record<string, unknown>;
    };

    const { task, session_id, message = "", extra = {} } = body;

    // Persistierende Tasks brauchen einen echten User; Chat darf gastweise laufen.
    if (!user && task !== "chat") {
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }

    // Load founder context (nur wenn eingeloggt)
    const { data: contextData } = user
      ? await supabase
          .from("copilot_context")
          .select("*")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false })
          .limit(1)
          .single()
      : { data: null as Record<string, unknown> | null };

    const { data: profile } = user
      ? await supabase.from("profiles").select("display_name").eq("id", user.id).single()
      : { data: null as { display_name?: string } | null };

    const ctx: FounderContext = {
      userName: profile?.display_name || "Founder",
      role: contextData?.role,
      idea: contextData?.idea,
      stage: contextData?.stage,
      city: contextData?.city,
      goal: contextData?.goal,
      risk: contextData?.risk,
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

    let result: Record<string, unknown> = {};

    // ── TASK ROUTER ──────────────────────────────────────────

    if (task === "context_parse") {
      // Kimi only — pure extraction
      const kimiPrompt = KIMI_PROMPTS.context_parse(ctx, message);
      const kimiRaw = await callKimi(kimiPrompt);
      console.log("[KIMI context_parse]", kimiRaw.slice(0, 300));
      const parsed = parseJSON(kimiRaw);

      // Save/update context
      await supabase.from("copilot_context").upsert({
        user_id: user.id,
        session_id: session_id || null,
        ...parsed,
        raw_context: parsed,
        updated_at: new Date().toISOString(),
      });

      result = { context: parsed };
    } else if (task === "chat") {
      if (!message || message.trim() === "") {
        return new Response(JSON.stringify({ error: "message darf nicht leer sein" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Rate-Limit: max 80 Nachrichten pro Nutzer pro Stunde (nur eingeloggt).
      if (user) {
        const hourAgo = new Date(Date.now() - 3600_000).toISOString();
        const { count: recentCount } = await supabase
          .from("copilot_messages")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("role", "user")
          .gte("created_at", hourAgo);
        if ((recentCount ?? 0) >= 80) {
          return new Response(
            JSON.stringify({ error: "Rate limit erreicht — bitte in einer Stunde erneut." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      }

      // Gesprächsverlauf der Session laden (Client kann ihn auch mitschicken)
      let history: ChatTurn[] = Array.isArray(extra.history)
        ? (extra.history as ChatTurn[]).filter(
            (t) => (t?.role === "user" || t?.role === "assistant") && typeof t.content === "string",
          )
        : [];
      if (history.length === 0 && session_id) {
        const { data: prevMsgs } = await supabase
          .from("copilot_messages")
          .select("role, content")
          .eq("session_id", session_id)
          .order("created_at", { ascending: false })
          .limit(12);
        history = ((prevMsgs ?? []) as ChatTurn[]).reverse();
      }

      // Gemerkte Fakten: serverseitig (raw_context.facts) + clientseitig (extra.memory)
      const serverFacts = Array.isArray(
        (contextData?.raw_context as Record<string, unknown> | null)?.facts,
      )
        ? ((contextData!.raw_context as Record<string, unknown>).facts as string[])
        : [];
      const clientFacts = Array.isArray(extra.memory) ? (extra.memory as string[]) : [];
      const memory = [...new Set([...serverFacts, ...clientFacts])].slice(0, 20);

      const surface = typeof extra.surface === "string" ? extra.surface : undefined;

      // Stage 1: Kimi — Analyse, Antwortentwurf, Memory-Extraktion, Nav-Vorschläge
      const kimiPrompt = buildChatPrompt(ctx, { message, history, memory, surface });
      const kimiRaw = await callKimi(kimiPrompt);
      console.log("[KIMI chat raw]", kimiRaw.slice(0, 300));
      const kimiData = parseJSON(kimiRaw);

      // Extract draft — never pass empty string to Sonnet
      const draft = extractDraft(kimiData, kimiRaw);

      // Stage 2: Sonnet polishes the answer text (kennt den Verlauf)
      const sonnetPrompt = buildChatPolishPrompt(ctx, draft, history);
      const polishedAnswer = await callSonnet(sonnetPrompt);

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
      if (newFacts.length > 0 || Object.keys(mergedFields).length > 0) {
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

      // Save assistant message to DB
      if (session_id) {
        await supabase.from("copilot_messages").insert({
          session_id,
          user_id: user.id,
          role: "assistant",
          content: polishedAnswer,
          model_used: "kimi+sonnet",
          sources: Array.isArray(kimiData.quellen) ? kimiData.quellen : [],
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

      result = {
        answer: polishedAnswer,
        too_early: kimiData.zu_frueh === true,
        sources: Array.isArray(kimiData.quellen) ? kimiData.quellen : [],
        quick_actions: Array.isArray(kimiData.follow_up_aktionen)
          ? kimiData.follow_up_aktionen
          : [],
        navigation,
        new_facts: newFacts,
      };
    } else if (task === "plan_generate") {
      // Load assessment + skills + industry for full context
      const [{ data: assessment }, { data: skills }, { data: profileFull }] = await Promise.all([
        supabase.from("founder_assessment").select("scores").eq("user_id", user.id).single(),
        supabase
          .from("founder_skills")
          .select("skills, looking_for, availability")
          .eq("user_id", user.id)
          .single(),
        supabase
          .from("profiles")
          .select("industry, venture_term, partner_term")
          .eq("id", user.id)
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
      const sonnetRaw = await callSonnet(sonnetPrompt);
      console.log("[SONNET plan slides raw]", sonnetRaw.slice(0, 300));

      const parsedSlides = parseJSONLoose(sonnetRaw);
      const slides: unknown[] = Array.isArray(parsedSlides)
        ? parsedSlides
        : parsedSlides && Array.isArray((parsedSlides as Record<string, unknown>).slides)
          ? ((parsedSlides as Record<string, unknown>).slides as unknown[])
          : [];

      console.log("[SLIDES count]", slides.length);

      await supabase.from("copilot_documents").insert({
        user_id: user.id,
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
      // Kimi only — pure extraction
      const kimiPrompt = KIMI_PROMPTS.deadline_extract(ctx, message);
      const kimiRaw = await callKimi(kimiPrompt);
      console.log("[KIMI deadline_extract]", kimiRaw.slice(0, 300));
      const data = parseJSON(kimiRaw);

      const deadlines = (data.deadlines as Array<Record<string, unknown>>) || [];
      if (deadlines.length > 0 && session_id) {
        await supabase.from("deadlines").insert(
          deadlines.map((d) => ({
            user_id: user.id,
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
      // Stage 1: Kimi fills content from profile
      const kimiPrompt = KIMI_PROMPTS.document_exist_draft(ctx, message);
      const kimiRaw = await callKimi(kimiPrompt);
      console.log("[KIMI document_exist]", kimiRaw.slice(0, 300));

      // Stage 2: Sonnet polishes every section
      const sonnetPrompt = SONNET_PROMPTS.document_exist(ctx, kimiRaw);
      const polished = await callSonnet(sonnetPrompt);

      // Calculate fill percentage
      const missing = (parseJSON(kimiRaw).fehlende_infos as string[]) || [];
      const fillPct = Math.max(0, 100 - missing.length * 8);

      // Save document
      const { data: doc } = await supabase
        .from("copilot_documents")
        .insert({
          user_id: user.id,
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
      const kimiRaw = await callKimi(kimiPrompt);
      console.log("[KIMI advisor_reasons]", kimiRaw.slice(0, 300));
      const kimiData = parseJSON(kimiRaw);

      // Stage 2: Sonnet polishes the reason texts
      const sonnetPrompt = SONNET_PROMPTS.advisor_reasons(ctx, JSON.stringify(kimiData));
      const polished = await callSonnet(sonnetPrompt);

      result = {
        reasons: kimiData.gründe || [],
        fit_score: kimiData.fit_score || 0,
        polished,
      };
    } else if (task === "daily_brief") {
      // Load today's data
      const today = new Date().toISOString().split("T")[0];
      const { data: deadlines } = await supabase
        .from("deadlines")
        .select("title, due_date")
        .eq("user_id", user.id)
        .eq("status", "open")
        .lte("due_date", new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0]);

      const dailyData = JSON.stringify({ deadlines, today });

      // Stage 1: Kimi structures the brief
      const kimiPrompt = KIMI_PROMPTS.daily_brief_draft(ctx, dailyData);
      const kimiRaw = await callKimi(kimiPrompt);
      console.log("[KIMI daily_brief]", kimiRaw.slice(0, 300));

      // Stage 2: Sonnet writes it naturally
      const sonnetPrompt = SONNET_PROMPTS.daily_brief(ctx, kimiRaw);
      const brief = await callSonnet(sonnetPrompt);

      result = { brief, raw: parseJSON(kimiRaw) };
    }

    // ── EMAIL TASKS ──────────────────────────────────────────
    else if (task.startsWith("email_")) {
      // Stage 1: Kimi drafts structure
      const kimiPrompt = KIMI_PROMPTS.chat(ctx, `Erstelle einen Email-Entwurf für: ${message}`);
      const kimiRaw = await callKimi(kimiPrompt);
      console.log("[KIMI email draft]", kimiRaw.slice(0, 300));
      const kimiData = parseJSON(kimiRaw);

      // Stage 2: Sonnet writes the actual email
      const sonnetKey = task as keyof typeof SONNET_PROMPTS;
      const sonnetPromptFn = SONNET_PROMPTS[sonnetKey] || SONNET_PROMPTS.chat;
      const email = await callSonnet(sonnetPromptFn(ctx, String(kimiData.antwort || kimiRaw)));

      // Save as document
      await supabase.from("copilot_documents").insert({
        user_id: user.id,
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
      const kimiRaw = await callKimi(kimiPrompt);
      console.log("[KIMI match_explain]", kimiRaw.slice(0, 300));
      result = { explanation: parseJSON(kimiRaw) };
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
