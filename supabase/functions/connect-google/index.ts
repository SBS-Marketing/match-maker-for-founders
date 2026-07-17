// ─────────────────────────────────────────────────────────────
// connect-google — OAuth-Verknüpfung für Gmail & Google Kalender.
//
// POST {provider}  (mit Supabase-JWT)  → { url } zur Google-Anmeldung
// GET  ?code=&state=                    → Callback: Tokens tauschen,
//                                         speichern, zurück in die App.
//
// Secrets: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, APP_URL (Redirect-Ziel)
// Redirect-URI in der Google Console:
//   https://<projekt-ref>.supabase.co/functions/v1/connect-google
// ─────────────────────────────────────────────────────────────

import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SCOPES: Record<string, string> = {
  gmail: [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.compose",
  ].join(" "),
  google_calendar: "https://www.googleapis.com/auth/calendar.events",
};

function functionURL(): string {
  const base = Deno.env.get("SUPABASE_URL")!;
  return `${base}/functions/v1/connect-google`;
}

// state = base64(json) + HMAC, damit der Callback ohne DB verifizierbar ist.
async function signState(payload: Record<string, string>): Promise<string> {
  const data = btoa(JSON.stringify(payload));
  const key = await hmacKey();
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig))).slice(0, 24);
  return `${data}.${sigB64}`;
}

async function verifyState(state: string): Promise<Record<string, string> | null> {
  const [data, sig] = state.split(".");
  if (!data || !sig) return null;
  const key = await hmacKey();
  const expected = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  const expectedB64 = btoa(String.fromCharCode(...new Uint8Array(expected))).slice(0, 24);
  if (expectedB64 !== sig) return null;
  try {
    return JSON.parse(atob(data));
  } catch {
    return null;
  }
}

async function hmacKey(): Promise<CryptoKey> {
  const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!.slice(0, 32);
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
  const appURL = Deno.env.get("APP_URL") || "https://matchfoundr.de";

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // ── Callback von Google (GET mit code & state) ─────────────
  const url = new URL(req.url);
  if (req.method === "GET" && url.searchParams.has("code")) {
    const state = await verifyState(url.searchParams.get("state") || "");
    if (!state?.user_id || !state?.provider) {
      return Response.redirect(`${appURL}/profile?connect=invalid`, 302);
    }
    try {
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code: url.searchParams.get("code")!,
          client_id: clientId!,
          client_secret: clientSecret!,
          redirect_uri: functionURL(),
          grant_type: "authorization_code",
        }),
      });
      const tokens = await tokenRes.json();
      if (!tokenRes.ok || !tokens.access_token) {
        throw new Error(tokens.error_description || "Token-Tausch fehlgeschlagen");
      }

      // Verknüpfte E-Mail-Adresse als Label holen
      let label: string | null = null;
      try {
        const info = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
          headers: { Authorization: `Bearer ${tokens.access_token}` },
        }).then((r) => r.json());
        label = info?.email ?? null;
      } catch {
        /* Label ist optional */
      }

      const expiresAt = tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
        : null;

      await supabase.from("account_tokens").upsert({
        user_id: state.user_id,
        provider: state.provider,
        access_token: tokens.access_token,
        // refresh_token kommt nur beim ersten Consent — vorhandenen nicht überschreiben
        ...(tokens.refresh_token ? { refresh_token: tokens.refresh_token } : {}),
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      });
      await supabase.from("connected_accounts").upsert(
        {
          user_id: state.user_id,
          provider: state.provider,
          status: "connected",
          account_label: label,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,provider" },
      );

      return Response.redirect(`${appURL}/profile?connect=ok&provider=${state.provider}`, 302);
    } catch (err) {
      console.error("connect-google callback:", err);
      return Response.redirect(`${appURL}/profile?connect=error`, 302);
    }
  }

  // ── Start (POST mit JWT): OAuth-URL bauen ──────────────────
  if (req.method === "POST") {
    if (!clientId || !clientSecret) {
      return new Response(
        JSON.stringify({
          error: "setup_missing",
          message: "GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET sind noch nicht gesetzt — siehe INTEGRATIONS.md.",
        }),
        { status: 501, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const authHeader = req.headers.get("Authorization") || "";
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) {
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }

    const { provider, action } = (await req.json().catch(() => ({}))) as {
      provider?: string;
      action?: string;
    };

    // Trennen: Verbindung + Tokens löschen (Tokens sind nur per Service Role erreichbar).
    if (action === "disconnect" && provider) {
      await Promise.all([
        supabase.from("connected_accounts").delete().eq("user_id", user.id).eq("provider", provider),
        supabase.from("account_tokens").delete().eq("user_id", user.id).eq("provider", provider),
      ]);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!provider || !SCOPES[provider]) {
      return new Response(JSON.stringify({ error: "provider muss gmail oder google_calendar sein" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const state = await signState({ user_id: user.id, provider, ts: String(Date.now()) });
    const oauth = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    oauth.searchParams.set("client_id", clientId);
    oauth.searchParams.set("redirect_uri", functionURL());
    oauth.searchParams.set("response_type", "code");
    oauth.searchParams.set("scope", SCOPES[provider]);
    oauth.searchParams.set("access_type", "offline");
    oauth.searchParams.set("prompt", "consent");
    oauth.searchParams.set("state", state);

    return new Response(JSON.stringify({ url: oauth.toString() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response("Method not allowed", { status: 405, headers: corsHeaders });
});
