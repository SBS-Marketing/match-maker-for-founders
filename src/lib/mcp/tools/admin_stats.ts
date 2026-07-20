import { defineTool } from "@lovable.dev/mcp-js";
import { requireAdmin, errorContent } from "./_admin";

export default defineTool({
  name: "admin_stats",
  title: "Admin: Plattform-Statistiken",
  description: "Liefert Zählwerte für Profile, Matches, Events, Registrierungen und Guides. Nur für Admins.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    const gate = await requireAdmin(ctx);
    if (!gate.ok) return errorContent(gate.error);
    const sb = gate.supabase;
    const tables = ["profiles", "matches", "community_events", "event_registrations", "guides"] as const;
    const counts: Record<string, number | null> = {};
    for (const t of tables) {
      const { count, error } = await sb.from(t).select("*", { count: "exact", head: true });
      counts[t] = error ? null : (count ?? 0);
    }
    return { content: [{ type: "text", text: JSON.stringify(counts) }], structuredContent: { counts } };
  },
});
