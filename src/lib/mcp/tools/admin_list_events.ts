import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { requireAdmin, errorContent } from "./_admin";

export default defineTool({
  name: "admin_list_events",
  title: "Admin: Alle Events auflisten",
  description: "Listet alle Community-Events (auch unveröffentlichte / vergangene). Nur für Admins.",
  inputSchema: {
    limit: z.number().int().min(1).max(500).optional(),
    only_unpublished: z.boolean().optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, only_unpublished }, ctx) => {
    const gate = await requireAdmin(ctx);
    if (!gate.ok) return errorContent(gate.error);
    let q = gate.supabase.from("community_events").select("*").order("starts_at", { ascending: false }).limit(limit ?? 50);
    if (only_unpublished) q = q.eq("is_published", false);
    const { data, error } = await q;
    if (error) return errorContent(error.message);
    return { content: [{ type: "text", text: JSON.stringify(data) }], structuredContent: { events: data } };
  },
});
