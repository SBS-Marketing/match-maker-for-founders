import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { requireAdmin, errorContent } from "./_admin";

export default defineTool({
  name: "admin_create_event",
  title: "Admin: Event anlegen",
  description:
    "Legt ein neues Community-Event an (Workshop, Meetup, Webinar, …). Nur für Admins. Setze is_published=true, um sofort zu veröffentlichen.",
  inputSchema: {
    title: z.string().min(1).max(200),
    kind: z.enum(["Event", "Meetup", "Workshop", "Stammtisch", "Webinar"]).optional(),
    service_id: z.string().min(1).optional().describe("Service-Slug (z. B. 'growth', 'talent'). Default: 'growth'."),
    starts_at: z.string().datetime().optional().describe("ISO-Zeitstempel, z. B. 2026-08-01T18:00:00Z"),
    date_label: z.string().max(80).optional(),
    time_label: z.string().max(80).optional(),
    city: z.string().max(120).optional(),
    venue: z.string().max(200).optional(),
    spots: z.number().int().min(0).max(10000).optional(),
    host: z.string().max(200).optional(),
    blurb: z.string().max(2000).optional(),
    agenda: z.array(z.string().max(300)).max(50).optional(),
    banner_image_url: z.string().url().optional(),
    is_published: z.boolean().optional().describe("Standard: true"),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    const gate = await requireAdmin(ctx);
    if (!gate.ok) return errorContent(gate.error);
    const slugBase = input.title
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/ä/g, "ae")
      .replace(/ö/g, "oe")
      .replace(/ü/g, "ue")
      .replace(/ß/g, "ss")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "event";
    const suffix = Math.random().toString(36).slice(2, 7);
    const id = `${slugBase}-${suffix}`;
    const row = {
      id,
      title: input.title,
      kind: input.kind ?? "Event",
      service_id: input.service_id ?? "growth",
      starts_at: input.starts_at ?? null,
      date_label: input.date_label ?? null,
      time_label: input.time_label ?? null,
      city: input.city ?? null,
      venue: input.venue ?? null,
      spots: input.spots ?? 20,
      taken: 0,
      host: input.host ?? null,
      blurb: input.blurb ?? null,
      agenda: input.agenda ?? [],
      banner_image_url: input.banner_image_url ?? null,
      is_published: input.is_published ?? true,
    };

    const { data, error } = await gate.supabase
      .from("community_events")
      .insert(row)
      .select()
      .maybeSingle();
    if (error) return errorContent(error.message);
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { event: data },
    };
  },
});
