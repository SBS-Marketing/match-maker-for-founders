import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { ToolContext } from "@lovable.dev/mcp-js";

export function userClient(ctx: ToolContext): SupabaseClient {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Verifies admin role via has_role RPC under the caller's own RLS. */
export async function requireAdmin(ctx: ToolContext) {
  if (!ctx.isAuthenticated()) return { ok: false as const, error: "Nicht authentifiziert" };
  const sb = userClient(ctx);
  const { data, error } = await sb.rpc("has_role", { _user_id: ctx.getUserId(), _role: "admin" });
  if (error) return { ok: false as const, error: error.message };
  if (!data) return { ok: false as const, error: "Kein Admin-Zugriff" };
  return { ok: true as const, supabase: sb };
}

export function errorContent(text: string) {
  return { content: [{ type: "text" as const, text }], isError: true };
}
