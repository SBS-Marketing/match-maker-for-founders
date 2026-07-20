import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { requireAdmin, errorContent } from "./_admin";

export default defineTool({
  name: "admin_list_profiles",
  title: "Admin: Profile auflisten",
  description: "Listet User-Profile (id, display_name, founder_type, industry, updated_at). Nur für Admins.",
  inputSchema: {
    limit: z.number().int().min(1).max(500).optional(),
    search: z.string().optional().describe("Filter auf display_name (ilike)"),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, search }, ctx) => {
    const gate = await requireAdmin(ctx);
    if (!gate.ok) return errorContent(gate.error);
    let q = gate.supabase
      .from("profiles")
      .select("id, display_name, founder_type, industry, updated_at")
      .order("updated_at", { ascending: false })
      .limit(limit ?? 50);
    if (search) q = q.ilike("display_name", `%${search}%`);
    const { data, error } = await q;
    if (error) return errorContent(error.message);
    return { content: [{ type: "text", text: JSON.stringify(data) }], structuredContent: { profiles: data } };
  },
});
