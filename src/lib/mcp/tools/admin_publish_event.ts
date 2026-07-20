import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { requireAdmin, errorContent } from "./_admin";

export default defineTool({
  name: "admin_publish_event",
  title: "Admin: Event veröffentlichen/verstecken",
  description: "Setzt is_published für ein Community-Event. Nur für Admins.",
  inputSchema: {
    event_id: z.string().uuid(),
    is_published: z.boolean(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ event_id, is_published }, ctx) => {
    const gate = await requireAdmin(ctx);
    if (!gate.ok) return errorContent(gate.error);
    const { data, error } = await gate.supabase
      .from("community_events")
      .update({ is_published })
      .eq("id", event_id)
      .select()
      .maybeSingle();
    if (error) return errorContent(error.message);
    return { content: [{ type: "text", text: JSON.stringify(data) }], structuredContent: { event: data } };
  },
});
