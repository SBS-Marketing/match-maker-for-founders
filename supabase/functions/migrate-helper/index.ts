// matchfoundr · migrate-helper
// Leerer Platzhalter für zukünftige Migrations- / Wartungs-Logik.

Deno.serve(async (_req) => {
  return new Response(JSON.stringify({ ok: true, function: "migrate-helper" }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
