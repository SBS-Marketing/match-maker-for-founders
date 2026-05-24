// ═══════════════════════════════════════════════════════════════════════════
// Issue #30: Resend.io Edge Function — Bestätigungsmail für Waitlist
// ═══════════════════════════════════════════════════════════════════════════
//
// Trigger: Webhook oder direkter POST nach waitlist-Eintrag
// Env-Vars: RESEND_API_KEY (im Supabase Dashboard → Edge Function Secrets)
//
// Usage:
//   POST /functions/v1/resend-confirm
//   Body: { email: "user@example.com", name?: "Max", confirmUrl?: "https://..." }
//
// ═══════════════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4?target=deno";

interface JoinPayload {
  email: string;
  name?: string;
  confirmUrl?: string;
  metadata?: Record<string, unknown>;
}

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") || "hello@matchfoundr.de";
const APP_URL = Deno.env.get("APP_URL") || "https://matchfoundr.de";

function getSupabase(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Supabase env vars missing");
  return createClient(url, key);
}

function getConfirmEmailHtml(token: string, name: string, confirmUrl: string): string {
  const link = `${confirmUrl}?token=${token}`;
  return `<!doctype html>
<html lang="de">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#fbfaf7;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px;">
    <table width="100%" max-width="480" cellpadding="0" cellspacing="0" style="max-width:480px;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #eee;">
      <tr><td style="padding:32px 28px 0;">
        <div style="font-size:22px;font-weight:700;letter-spacing:-0.4px;color:#15140f;">match<span style="color:#e2511c;">foundr</span></div>
        <h1 style="margin:20px 0 8px;font-size:18px;font-weight:700;color:#15140f;">Fast dabei, ${name || "Founder"} 🚀</h1>
        <p style="margin:0 0 20px;font-size:15px;line-height:1.55;color:#555;">
          Bestätige deine E-Mail, um auf die exklusive Waitlist zu kommen. Sobald ein Platz frei wird, informieren wir dich als Erstes.
        </p>
      </td></tr>
      <tr><td style="padding:0 28px 32px;">
        <a href="${link}" style="display:inline-block;padding:13px 28px;background:#e2511c;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;font-size:14px;">E-Mail bestätigen</a>
        <p style="margin:16px 0 0;font-size:12px;color:#999;">Dieser Link ist 7 Tage gültig. Falls der Button nicht funktioniert:<br><a href="${link}" style="color:#e2511c;">${link}</a></p>
      </td></tr>
    </table>
    <p style="margin-top:20px;font-size:12px;color:#999;">matchfoundr · support@matchfoundr.de</p>
  </td></tr></table>
</body></html>`;
}

async function sendResendEmail(args: { to: string; html: string; subject: string; resendApiKey: string }): Promise<{ id: string }> {
  const res = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: args.to,
      subject: args.subject,
      html: args.html,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "unknown");
    throw new Error(`Resend ${res.status}: ${text}`);
  }
  return res.json();
}

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  try {
    const body: JoinPayload = await req.json().catch(() => ({} as JoinPayload));
    const email = body.email?.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: "Valid email required" }), { status: 400 });
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      // Graceful: Eintrag speichern, aber ohne Mail
    }

    const supabase = getSupabase();

    // RPC: join_waitlist — Upsert + Token generieren
    const { data: waitlistId, error: rpcErr } = await supabase.rpc("join_waitlist", {
      p_email: email,
      p_name: body.name || null,
      p_metadata: body.metadata || {},
    });
    if (rpcErr) throw rpcErr;

    // Token holen für Bestätigungslink
    const { data: row, error: rowErr } = await supabase
      .from("waitlist")
      .select("token, status")
      .eq("id", waitlistId)
      .single();
    if (rowErr || !row) throw rowErr ?? new Error("Waitlist row not found");

    // Nur mailen, wenn noch nicht bestätigt
    if (row.status === "confirmed") {
      return new Response(JSON.stringify({ ok: true, alreadyConfirmed: true }), {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    let resendId: string | null = null;

    if (resendApiKey && row.token) {
      const confirmUrl = body.confirmUrl || `${APP_URL}/auth/waitlist-confirm`;
      const html = getConfirmEmailHtml(row.token, body.name || "Founder", confirmUrl);
      const sent = await sendResendEmail({
        to: email,
        html,
        subject: "Bestätige deine E-Mail — matchfoundr Waitlist",
        resendApiKey,
      });
      resendId = sent.id;

      // Status aktualisieren
      await supabase
        .from("waitlist")
        .update({ status: "email_sent", resend_id: resendId })
        .eq("id", waitlistId);
    }

    return new Response(
      JSON.stringify({ ok: true, waitlistId, resendId, emailSent: !!resendId }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      },
    );
  } catch (err) {
    console.error("resend-confirm error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      },
    );
  }
});
