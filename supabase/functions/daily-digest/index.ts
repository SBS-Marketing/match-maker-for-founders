// ═══════════════════════════════════════════════════════════════════════════
// matchfoundr · Täglicher E-Mail-Digest
// Läuft per pg_cron (siehe Migration daily_digest_cron.sql) jeden Morgen.
// Baut pro Nutzer einen Tages-Brief aus offenen Deadlines + Daily-Tasks und
// verschickt ihn über Resend. Deterministisch (kein LLM-Call pro Nutzer).
//
// Auth: Authorization: Bearer <SERVICE_ROLE_KEY>  (so ruft pg_cron die Function)
// Env:  RESEND_API_KEY, RESEND_FROM_EMAIL?, APP_URL?
// ═══════════════════════════════════════════════════════════════════════════

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4?target=deno";

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") || "hello@matchfoundr.de";
const APP_URL = Deno.env.get("APP_URL") || "https://matchfoundr.de";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Deadline = { title: string; due_date: string; priority: string };
type Task = { title: string; description: string | null; href: string | null };

function daysUntil(dateStr: string): number {
  const due = new Date(`${dateStr}T00:00:00`).getTime();
  const now = new Date(new Date().toISOString().split("T")[0] + "T00:00:00").getTime();
  return Math.round((due - now) / 86400000);
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildHighlight(name: string, tasks: Task[], deadlines: Deadline[]): string {
  const urgent = deadlines.find((d) => daysUntil(d.due_date) <= 3);
  if (urgent) {
    const dleft = daysUntil(urgent.due_date);
    return `${esc(urgent.title)} ist in ${dleft <= 0 ? "spätestens heute" : `${dleft} Tag${dleft === 1 ? "" : "en"}`} fällig.`;
  }
  if (tasks.length > 0) {
    return `${tasks.length} offene Aufgabe${tasks.length === 1 ? "" : "n"} heute — fang mit „${esc(tasks[0].title)}" an.`;
  }
  return "Keine harten Deadlines heute — gönn dir einen Fokus-Block für die wichtigste Spur.";
}

function buildEmailHtml(name: string, tasks: Task[], deadlines: Deadline[]): string {
  const highlight = buildHighlight(name, tasks, deadlines);
  const taskItems = tasks
    .slice(0, 5)
    .map(
      (t) =>
        `<li style="margin:0 0 8px;font-size:14px;color:#15140f;"><b>${esc(t.title)}</b>${
          t.description ? `<br><span style="color:#777;font-size:13px;">${esc(t.description)}</span>` : ""
        }</li>`,
    )
    .join("");
  const deadlineItems = deadlines
    .slice(0, 5)
    .map((d) => {
      const dleft = daysUntil(d.due_date);
      const tag = dleft <= 0 ? "heute" : dleft <= 3 ? `${dleft}d — dringend` : `in ${dleft}d`;
      return `<li style="margin:0 0 6px;font-size:14px;color:#15140f;">${esc(d.title)} <span style="color:#e2511c;font-weight:600;">· ${tag}</span></li>`;
    })
    .join("");

  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#fbfaf7;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px;">
    <table width="100%" style="max-width:520px;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #eee;">
      <tr><td style="padding:30px 28px 0;">
        <div style="font-size:20px;font-weight:700;letter-spacing:-0.4px;color:#15140f;">match<span style="color:#e2511c;">foundr</span></div>
        <div style="margin-top:18px;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#aaa;">Deine Tageszusammenfassung</div>
        <h1 style="margin:8px 0 6px;font-size:19px;font-weight:700;color:#15140f;">Guten Morgen, ${esc(name)} 👋</h1>
        <p style="margin:0 0 18px;font-size:15px;line-height:1.55;color:#444;">${highlight}</p>
      </td></tr>
      ${
        tasks.length
          ? `<tr><td style="padding:0 28px;"><div style="font-size:11px;letter-spacing:1.2px;text-transform:uppercase;color:#aaa;margin-bottom:8px;">Heute offen</div><ul style="margin:0 0 18px;padding-left:18px;">${taskItems}</ul></td></tr>`
          : ""
      }
      ${
        deadlines.length
          ? `<tr><td style="padding:0 28px;"><div style="font-size:11px;letter-spacing:1.2px;text-transform:uppercase;color:#aaa;margin-bottom:8px;">Deadlines</div><ul style="margin:0 0 18px;padding-left:18px;">${deadlineItems}</ul></td></tr>`
          : ""
      }
      <tr><td style="padding:4px 28px 30px;">
        <a href="${APP_URL}/heute" style="display:inline-block;padding:12px 26px;background:#15140f;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;font-size:14px;">Im Command-Center öffnen</a>
      </td></tr>
    </table>
    <p style="margin-top:18px;font-size:12px;color:#999;">matchfoundr · <a href="${APP_URL}/profile" style="color:#999;">Digest-Einstellungen</a></p>
  </td></tr></table>
</body></html>`;
}

async function sendResend(to: string, subject: string, html: string, apiKey: string): Promise<void> {
  const res = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "unknown");
    throw new Error(`Resend ${res.status}: ${text}`);
  }
}

async function buildAndSendForUser(
  supabase: SupabaseClient,
  apiKey: string,
  userId: string,
  email: string,
  fallbackName: string,
): Promise<"sent" | "skipped"> {
  // Opt-out respektieren (fehlende Zeile = opted-in).
  const { data: prefs } = await supabase
    .from("notification_prefs")
    .select("daily_digest")
    .eq("user_id", userId)
    .maybeSingle();
  if (prefs && prefs.daily_digest === false) return "skipped";

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", userId)
    .maybeSingle();
  const name = (profile?.display_name || fallbackName || "Founder").split(" ")[0];

  const today = new Date().toISOString().split("T")[0];
  const in7 = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];

  const [{ data: tasks }, { data: deadlines }] = await Promise.all([
    supabase
      .from("daily_tasks")
      .select("title, description, href")
      .eq("user_id", userId)
      .eq("task_date", today)
      .eq("status", "open"),
    supabase
      .from("deadlines")
      .select("title, due_date, priority")
      .eq("user_id", userId)
      .eq("status", "open")
      .lte("due_date", in7)
      .order("due_date", { ascending: true }),
  ]);

  const taskList = (tasks ?? []) as Task[];
  const deadlineList = (deadlines ?? []) as Deadline[];

  // Nicht spammen: nur senden, wenn es etwas zu tun gibt.
  if (taskList.length === 0 && deadlineList.length === 0) return "skipped";

  const html = buildEmailHtml(name, taskList, deadlineList);
  await sendResend(email, `Dein Tag bei matchfoundr — ${taskList.length} offen`, html, apiKey);
  return "sent";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authHeader = req.headers.get("Authorization") || "";
  if (authHeader.replace("Bearer ", "").trim() !== serviceKey) {
    return new Response("Unauthorized", { status: 401, headers: corsHeaders });
  }

  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey);

  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  try {
    // Erste Seite Nutzer (für größere Userbasen: paginieren).
    const { data: list, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error) throw error;

    for (const u of list.users) {
      if (!u.email) continue;
      try {
        const result = await buildAndSendForUser(
          supabase,
          apiKey,
          u.id,
          u.email,
          (u.user_metadata?.name as string) || "",
        );
        if (result === "sent") sent++;
        else skipped++;
      } catch (err) {
        errors.push(`${u.email}: ${err instanceof Error ? err.message : "error"}`);
      }
    }

    return new Response(JSON.stringify({ ok: true, sent, skipped, errors }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("daily-digest error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error", sent, skipped }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
