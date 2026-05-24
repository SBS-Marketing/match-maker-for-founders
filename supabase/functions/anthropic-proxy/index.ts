// ═══════════════════════════════════════════════════════════════════════════
// Issue #51: Anthropic API Proxy — API Key bleibt NIE im Browser
// ═══════════════════════════════════════════════════════════════════════════
//
// Usage:
//   POST /functions/v1/anthropic-proxy
//   Header: Authorization: Bearer <supabase-jwt>
//   Body:   { messages: [{ role:"user", content:"..." }], model?: "claude-opus-4-7", max_tokens?: 1024 }
//
// Der Anthropic API Key wird entweder aus:
//   (1) Supabase Vault (get_secret("anthropic_api_key"))
//   (2) Edge Function Secret ANTHROPIC_API_KEY
// geholt — niemals im Client.
//
// ═══════════════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4?target=deno";

interface AnthropicRequest {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  model?: string;
  max_tokens?: number;
  system?: string;
  temperature?: number;
  stream?: boolean;
}

const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-sonnet-4-20250514";
const MAX_TOKENS = 4096;

function getSupabase() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Supabase env missing");
  return createClient(url, key);
}

async function getApiKey(): Promise<string> {
  // 1. Versuche Vault
  const supabase = getSupabase();
  try {
    const { data, error } = await supabase.rpc("get_secret", { p_key_name: "anthropic_api_key" });
    if (!error && data) return data;
  } catch {
    // Vault nicht verfügbar → weiter zu Fallback
  }

  // 2. Fallback: Edge Function Secret
  const envKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (envKey) return envKey;

  throw new Error("No Anthropic API key configured. Set ANTHROPIC_API_KEY or vault secret.");
}

function parseAuthToken(req: Request): string | null {
  const h = req.headers.get("authorization");
  if (!h) return null;
  return h.replace(/^Bearer\s+/i, "").trim();
}

async function validateUser(token: string): Promise<{ id: string; role?: string } | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;

  // Prüfe Admin-Status
  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", data.user.id)
    .single();

  return { id: data.user.id, role: roles?.role };
}

serve(async (req: Request) => {
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
    // Authentifizierung
    const token = parseAuthToken(req);
    if (!token) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), { status: 401 });
    }
    const user = await validateUser(token);
    if (!user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401 });
    }

    // Rate-Limiting: Einfaches In-Memory (für Produktion: Redis / Supabase-KV)
    // TODO: Ersetzen durch Supabase KV oder Redis

    const body: AnthropicRequest = await req.json();
    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages array required" }), { status: 400 });
    }

    const apiKey = await getApiKey();
    const model = body.model || DEFAULT_MODEL;
    const maxTokens = Math.min(body.max_tokens || 1024, MAX_TOKENS);

    const anthropicPayload = {
      model,
      max_tokens: maxTokens,
      messages: body.messages,
      system: body.system || undefined,
      temperature: body.temperature ?? 0.7,
      stream: false,
    };

    const res = await fetch(ANTHROPIC_API, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(anthropicPayload),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Anthropic error:", res.status, text);
      return new Response(JSON.stringify({ error: `Anthropic API error ${res.status}` }), {
        status: 502,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    const data = await res.json();

    // Audit-Log
    await getSupabase().from("secret_access_log").insert({
      key_name: "anthropic_api_key",
      action: "read",
      actor_id: user.id,
      actor_role: user.role || "user",
      success: true,
    });

    return new Response(
      JSON.stringify({
        ok: true,
        model: data.model,
        content: data.content?.map((c: any) => c.text).join(""),
        usage: data.usage,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  } catch (err) {
    console.error("anthropic-proxy error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      },
    );
  }
});
