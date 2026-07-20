import { createClient } from "@supabase/supabase-js";
import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "list_partners",
  title: "Partner-Angebote auflisten",
  description: "Listet veröffentlichte Partner-Angebote (Deals, Tools, Services) aus dem matchfoundr Katalog.",
  inputSchema: {
    limit: z.number().int().min(1).max(100).optional().describe("Max Anzahl (Standard 20)"),
    category: z.string().optional().describe("Optionaler Kategoriefilter"),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, category }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Nicht authentifiziert" }], isError: true };
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
      global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    let q = supabase.from("partner_offers").select("*").limit(limit ?? 20);
    if (category) q = q.eq("category", category);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return { content: [{ type: "text", text: JSON.stringify(data) }], structuredContent: { partners: data } };
  },
});
