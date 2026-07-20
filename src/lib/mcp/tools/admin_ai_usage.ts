import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { requireAdmin, errorContent } from "./_admin";

export default defineTool({
  name: "admin_ai_usage",
  title: "Admin: KI-Verbrauch & Latenzen",
  description: "Liefert die letzten Copilot-Aufrufe (Task, Modell, Tokens, Kosten, Latenz, Status). Nur für Admins.",
  inputSchema: {
    limit: z.number().int().min(1).max(500).optional(),
    task: z.string().optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, task }, ctx) => {
    const gate = await requireAdmin(ctx);
    if (!gate.ok) return errorContent(gate.error);
    let q = gate.supabase.from("ai_usage").select("*").order("created_at", { ascending: false }).limit(limit ?? 100);
    if (task) q = q.eq("task", task);
    const { data, error } = await q;
    if (error) return errorContent(error.message);
    return { content: [{ type: "text", text: JSON.stringify(data) }], structuredContent: { usage: data } };
  },
});
