// ─────────────────────────────────────────────────────────────
// whatsapp-webhook — Empfang vom selbst gehosteten open-wa Gateway.
//
// open-wa (github.com/open-wa/wa-automate-nodejs) läuft auf einem
// eigenen Server/Container und postet eingehende Nachrichten hierher:
//   POST { event: "message", from, name, body, to_user }
// Header: x-webhook-secret muss WHATSAPP_WEBHOOK_SECRET entsprechen.
//
// Die Nachricht landet in whatsapp_messages und fließt in den
// Morgenreport ein. Setup-Anleitung: INTEGRATIONS.md.
// ─────────────────────────────────────────────────────────────

import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const secret = Deno.env.get("WHATSAPP_WEBHOOK_SECRET");
  if (!secret) {
    return new Response(
      JSON.stringify({ error: "setup_missing", message: "WHATSAPP_WEBHOOK_SECRET nicht gesetzt — siehe INTEGRATIONS.md." }),
      { status: 501, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
  if (req.headers.get("x-webhook-secret") !== secret) {
    return new Response("Unauthorized", { status: 401, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const payload = (await req.json()) as {
      event?: string;
      from?: string;
      name?: string;
      body?: string;
      to_user?: string; // matchfoundr User-ID, der das Gateway gehört
    };

    if (payload.event !== "message" || !payload.from || !payload.body) {
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Gateway-Besitzer ermitteln: explizit mitgeschickt oder der (einzige)
    // Nutzer mit verbundenem WhatsApp-Konto.
    let userId = payload.to_user ?? null;
    if (!userId) {
      const { data: owner } = await supabase
        .from("connected_accounts")
        .select("user_id")
        .eq("provider", "whatsapp")
        .eq("status", "connected")
        .limit(1)
        .maybeSingle();
      userId = owner?.user_id ?? null;
    }

    await supabase.from("whatsapp_messages").insert({
      user_id: userId,
      wa_from: payload.from,
      wa_name: payload.name ?? null,
      body: payload.body.slice(0, 4000),
      direction: "in",
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("whatsapp-webhook:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
