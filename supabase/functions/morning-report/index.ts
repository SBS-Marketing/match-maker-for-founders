// ─────────────────────────────────────────────────────────────
// morning-report — der 8-Uhr-Report des Co-Piloten.
//
// Läuft per pg_cron (Service Role) für alle Nutzer mit Profil:
//  1. Gmail verbunden   → wichtige Mails der letzten 24h holen
//  2. KI (Kimi via OpenRouter) → Tagesablauf, Mail-Prioritäten,
//     Antwort-Entwürfe, erkannte Termine, Fokus des Tages
//  3. Gmail verbunden   → Entwürfe direkt als echte Gmail-Drafts anlegen
//  4. Kalender verbunden→ erkannte Termine als Kalender-Events anlegen
//  5. Ergebnis → daily_reports (App + Web zeigen ihn auf „Heute“)
//
// Auch OHNE Verknüpfungen entsteht ein Report aus App-Daten
// (Deadlines, Events, Matches). Aufruf: POST mit Service-Role-Key
// fuer Cron/Admin, oder mit Nutzer-JWT fuer den eigenen Report.
// Optional {"user_id": "...", "force": true} fuer Tests/Refresh.
//
// Secrets: OPENROUTER_API_KEY, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
// ─────────────────────────────────────────────────────────────

import { createClient, SupabaseClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "moonshotai/kimi-k3";

type Mail = { id: string; from: string; subject: string; snippet: string; date: string };

// ── Google Token-Handling ────────────────────────────────────

async function freshAccessToken(
  supabase: SupabaseClient,
  userId: string,
  provider: string,
): Promise<string | null> {
  const { data: row } = await supabase
    .from("account_tokens")
    .select("access_token, refresh_token, expires_at")
    .eq("user_id", userId)
    .eq("provider", provider)
    .single();
  if (!row) return null;

  const stillValid = row.expires_at && new Date(row.expires_at).getTime() > Date.now() + 60_000;
  if (stillValid) return row.access_token;
  if (!row.refresh_token) return row.access_token;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: Deno.env.get("GOOGLE_CLIENT_ID") || "",
      client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET") || "",
      refresh_token: row.refresh_token,
      grant_type: "refresh_token",
    }),
  });
  const tokens = await res.json();
  if (!res.ok || !tokens.access_token) return null;

  await supabase
    .from("account_tokens")
    .update({
      access_token: tokens.access_token,
      expires_at: new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("provider", provider);

  return tokens.access_token;
}

// ── Gmail ────────────────────────────────────────────────────

async function fetchRecentMails(token: string): Promise<Mail[]> {
  const list = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages?q=newer_than:1d+category:primary&maxResults=10",
    { headers: { Authorization: `Bearer ${token}` } },
  ).then((r) => r.json());

  const ids: string[] = (list.messages ?? []).map((m: { id: string }) => m.id);
  const mails: Mail[] = [];
  for (const id of ids.slice(0, 10)) {
    const msg = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
      { headers: { Authorization: `Bearer ${token}` } },
    ).then((r) => r.json());
    const header = (name: string) =>
      (msg.payload?.headers ?? []).find((h: { name: string }) => h.name === name)?.value ?? "";
    mails.push({
      id,
      from: header("From"),
      subject: header("Subject"),
      snippet: msg.snippet ?? "",
      date: header("Date"),
    });
  }
  return mails;
}

async function createGmailDraft(
  token: string,
  to: string,
  subject: string,
  body: string,
): Promise<string | null> {
  const raw = btoa(
    unescape(
      encodeURIComponent(
        `To: ${to}\r\nSubject: ${subject}\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${body}`,
      ),
    ),
  )
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/drafts", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ message: { raw } }),
  });
  const data = await res.json();
  return res.ok ? (data.id ?? null) : null;
}

// ── Google Kalender ──────────────────────────────────────────

async function createCalendarEvent(
  token: string,
  titel: string,
  datum: string,
  zeit: string | null,
): Promise<string | null> {
  const start = zeit ? `${datum}T${zeit}:00` : null;
  const event = start
    ? {
        summary: titel,
        start: { dateTime: start, timeZone: "Europe/Berlin" },
        end: { dateTime: `${datum}T${addHour(zeit!)}:00`, timeZone: "Europe/Berlin" },
      }
    : { summary: titel, start: { date: datum }, end: { date: datum } };
  const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(event),
  });
  const data = await res.json();
  return res.ok ? (data.id ?? null) : null;
}

function addHour(zeit: string): string {
  const [h, m] = zeit.split(":").map(Number);
  return `${String(Math.min(23, h + 1)).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// ── KI ───────────────────────────────────────────────────────

async function generateReport(input: {
  name: string;
  industry: string | null;
  mails: Mail[];
  deadlines: { title: string; due_date: string }[];
  events: { title: string; starts_at: string | null }[];
  whatsappCount: number;
}): Promise<Record<string, unknown>> {
  const prompt = `
Du bist der Co-Pilot von matchfoundr. Erstelle den Morgenreport für ${input.name}
(${input.industry || "Gründer"}), Datum: ${new Date().toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" })}.

E-MAILS DER LETZTEN 24H (${input.mails.length}):
${input.mails.map((m, i) => `${i + 1}. Von: ${m.from} | Betreff: ${m.subject} | Auszug: ${m.snippet.slice(0, 200)}`).join("\n") || "(keine — Gmail nicht verbunden oder leer)"}

OFFENE DEADLINES:
${input.deadlines.map((d) => `- ${d.title} (fällig ${d.due_date})`).join("\n") || "(keine)"}

ANSTEHENDE COMMUNITY-EVENTS:
${input.events.map((e) => `- ${e.title}${e.starts_at ? ` am ${e.starts_at.slice(0, 10)}` : ""}`).join("\n") || "(keine)"}

NEUE WHATSAPP-NACHRICHTEN: ${input.whatsappCount}

Antworte NUR mit validem JSON:
{
  "fokus": "Der EINE wichtigste Satz für heute",
  "tagesablauf": [{"zeit": "09:00", "titel": "…"}],
  "wichtige_mails": [{"von": "…", "betreff": "…", "warum": "1 Satz, warum wichtig"}],
  "draft_vorschlaege": [{"an": "email@…", "betreff": "Re: …", "entwurf": "Kompletter kurzer Antwortentwurf auf Deutsch, Du-Form, professionell"}],
  "erkannte_termine": [{"titel": "…", "datum": "YYYY-MM-DD", "zeit": "HH:MM oder null", "quelle": "aus welcher Mail"}],
  "hinweis": "optional: 1 kurzer Tipp"
}
Regeln: max 4 wichtige Mails (nur echt relevante — Newsletter/Werbung ignorieren),
max 2 draft_vorschlaege (nur wenn eine Antwort wirklich ansteht, an die Absender-Adresse),
erkannte_termine NUR wenn in einer Mail ein konkretes Datum/Terminvorschlag steht.
Tagesablauf: 3-5 realistische Blöcke aus Deadlines + Events + Mail-Followups.`;

  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Deno.env.get("OPENROUTER_API_KEY")}`,
      "HTTP-Referer": "https://matchfoundr.com",
      "X-Title": "matchfoundr Morning Report",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
      max_tokens: 1400,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`OpenRouter: ${JSON.stringify(data).slice(0, 200)}`);
  const content: string = data?.choices?.[0]?.message?.content ?? "{}";
  const cleaned = content
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  try {
    return JSON.parse(match ? match[0] : cleaned);
  } catch {
    return {
      fokus: cleaned.slice(0, 200),
      tagesablauf: [],
      wichtige_mails: [],
      draft_vorschlaege: [],
      erkannte_termine: [],
    };
  }
}

// ── Ein Nutzer ───────────────────────────────────────────────

async function buildReportForUser(
  supabase: SupabaseClient,
  userId: string,
  options: { force?: boolean } = {},
): Promise<{ ok: boolean; detail: string }> {
  const today = new Date().toISOString().slice(0, 10);
  const { data: existing } = await supabase
    .from("daily_reports")
    .select("id")
    .eq("user_id", userId)
    .eq("report_date", today)
    .maybeSingle();
  if (existing && !options.force) return { ok: true, detail: "schon vorhanden" };

  const [{ data: profile }, { data: connections }, { data: deadlines }, { data: events }] =
    await Promise.all([
      supabase.from("profiles").select("display_name, industry").eq("id", userId).single(),
      supabase.from("connected_accounts").select("provider, status").eq("user_id", userId),
      supabase
        .from("deadlines")
        .select("title, due_date")
        .eq("user_id", userId)
        .gte("due_date", today)
        .order("due_date")
        .limit(6),
      supabase
        .from("community_events")
        .select("title, starts_at")
        .eq("is_published", true)
        .gte("starts_at", new Date().toISOString())
        .order("starts_at")
        .limit(3),
    ]);

  const connected = new Set(
    (connections ?? []).filter((c) => c.status === "connected").map((c) => c.provider),
  );

  // WhatsApp-Zähler (24h)
  const { count: waCount } = await supabase
    .from("whatsapp_messages")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("direction", "in")
    .gte("received_at", new Date(Date.now() - 86_400_000).toISOString());

  // Gmail
  let mails: Mail[] = [];
  let gmailToken: string | null = null;
  if (connected.has("gmail")) {
    gmailToken = await freshAccessToken(supabase, userId, "gmail");
    if (gmailToken) {
      try {
        mails = await fetchRecentMails(gmailToken);
      } catch (err) {
        console.error(`gmail fetch (${userId}):`, err);
      }
    }
  }

  const report = await generateReport({
    name: profile?.display_name || "Founder",
    industry: profile?.industry ?? null,
    mails,
    deadlines: deadlines ?? [],
    events: events ?? [],
    whatsappCount: waCount ?? 0,
  });

  // Entwürfe als echte Gmail-Drafts anlegen
  if (gmailToken && Array.isArray(report.draft_vorschlaege)) {
    for (const draft of report.draft_vorschlaege as Record<string, string>[]) {
      if (draft?.an && draft?.entwurf) {
        const draftId = await createGmailDraft(
          gmailToken,
          draft.an,
          draft.betreff || "Antwort",
          draft.entwurf,
        ).catch(() => null);
        if (draftId) draft.gmail_draft_id = draftId;
      }
    }
  }

  // Erkannte Termine in den Google Kalender legen
  if (connected.has("google_calendar") && Array.isArray(report.erkannte_termine)) {
    const calToken = await freshAccessToken(supabase, userId, "google_calendar");
    if (calToken) {
      for (const termin of report.erkannte_termine as Record<string, string | null>[]) {
        if (termin?.titel && termin?.datum) {
          const eventId = await createCalendarEvent(
            calToken,
            termin.titel as string,
            termin.datum as string,
            (termin.zeit as string) || null,
          ).catch(() => null);
          if (eventId) termin.calendar_event_id = eventId;
        }
      }
    }
  }

  report.whatsapp = {
    neue: waCount ?? 0,
    verbunden: connected.has("whatsapp"),
  };
  report.verbundene_konten = [...connected];

  await supabase
    .from("daily_reports")
    .upsert(
      { user_id: userId, report_date: today, content: report },
      { onConflict: "user_id,report_date" },
    );
  return {
    ok: true,
    detail: `${mails.length} Mails, ${(report.erkannte_termine as unknown[])?.length ?? 0} Termine`,
  };
}

// ── Handler ──────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const body = (await req.json().catch(() => ({}))) as { user_id?: string; force?: boolean };
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization")?.replace("Bearer ", "") ?? "";
    const isServiceRole = authHeader === serviceRoleKey;

    let userIds: string[];
    if (isServiceRole) {
      if (body.user_id) {
        userIds = [body.user_id];
      } else {
        const { data: users } = await supabase
          .from("profiles")
          .select("id")
          .eq("is_onboarded", true)
          .limit(500);
        userIds = (users ?? []).map((u) => u.id);
      }
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser(authHeader);
      if (!user) {
        return new Response("Unauthorized", { status: 401, headers: corsHeaders });
      }
      if (body.user_id && body.user_id !== user.id) {
        return new Response("Forbidden", { status: 403, headers: corsHeaders });
      }
      userIds = [user.id];
    }

    const results: Record<string, string> = {};
    for (const id of userIds) {
      try {
        const { detail } = await buildReportForUser(supabase, id, { force: body.force === true });
        results[id] = detail;
      } catch (err) {
        results[id] = `Fehler: ${err instanceof Error ? err.message : "unbekannt"}`;
        console.error(`morning-report (${id}):`, err);
      }
    }

    return new Response(JSON.stringify({ ok: true, users: userIds.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("morning-report:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
