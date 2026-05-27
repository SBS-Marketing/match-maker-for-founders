// ─────────────────────────────────────────────────────────────
// matchfoundr · Issue #12 — Matching-Algorithmus Edge Function
// Berechnet Skill-Overlap, Standort-Distanz und Embedding-Similarity
// Speichert Ergebnisse in match_results
// ─────────────────────────────────────────────────────────────

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FounderProfile {
  id: string;
  display_name: string | null;
  bio: string | null;
  skills: string[] | null;
  looking_for: string | null;
  vision: string | null;
  lat: number | null;
  lng: number | null;
  city: string | null;
  max_distance_km: number | null;
  industry: string | null;
  role: string | null;
  stage: string | null;
}

interface MatchResult {
  target_id: string;
  target_name: string | null;
  total_score: number;
  skill_score: number;
  location_score: number;
  embedding_score: number;
  distance_km: number | null;
  explanation: Record<string, unknown>;
}

function getFunctionSubpath(url: URL, functionName: string): string {
  const parts = url.pathname.split("/").filter(Boolean);
  const idx = parts.lastIndexOf(functionName);
  return idx >= 0 ? parts.slice(idx + 1).join("/") : "";
}

// ─── Hilfsfunktion: Text für Embedding bauen ─────────────────
function buildProfileText(p: FounderProfile): string {
  const parts: string[] = [];
  if (p.display_name) parts.push(`Name: ${p.display_name}`);
  if (p.role) parts.push(`Rolle: ${p.role}`);
  if (p.industry) parts.push(`Branche: ${p.industry}`);
  if (p.stage) parts.push(`Stage: ${p.stage}`);
  if (p.bio) parts.push(`Bio: ${p.bio}`);
  if (p.vision) parts.push(`Vision: ${p.vision}`);
  if (p.looking_for) parts.push(`Sucht: ${p.looking_for}`);
  if (p.skills?.length) parts.push(`Skills: ${p.skills.join(", ")}`);
  return parts.join(". ");
}

// ─── Hilfsfunktion: Skill-Overlap Score ──────────────────────
function computeSkillOverlap(a: string[] | null, b: string[] | null): number {
  const sa = new Set(a ?? []);
  const sb = new Set(b ?? []);
  if (sa.size === 0 && sb.size === 0) return 50; // Neutral
  const intersection = new Set([...sa].filter((x) => sb.has(x)));
  const union = new Set([...sa, ...sb]);
  if (union.size === 0) return 50;
  // Je mehr Overlap, desto höher — aber wir wollen auch Komplementarität
  // Daher: 70% Overlap + 30% Komplementarität
  const overlap = intersection.size / union.size;
  const complement = 1 - overlap;
  return Math.round((overlap * 0.7 + complement * 0.3) * 100);
}

// ─── Hilfsfunktion: Haversine Distanz ────────────────────────
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ─── Hilfsfunktion: Location Score ───────────────────────────
function computeLocationScore(
  p1: FounderProfile,
  p2: FounderProfile,
): { score: number; distanceKm: number | null } {
  if (p1.lat == null || p1.lng == null || p2.lat == null || p2.lng == null) {
    return { score: 50, distanceKm: null }; // Neutral wenn keine Location
  }
  const dist = haversineKm(p1.lat, p1.lng, p2.lat, p2.lng);
  const maxDist = p1.max_distance_km ?? 50;
  const score = Math.max(0, 100 - (dist / maxDist) * 100);
  return { score: Math.round(score), distanceKm: Math.round(dist * 10) / 10 };
}

// ─── Hilfsfunktion: Embedding via OpenRouter (simuliert) ─────
// In Produktion: echtes Embedding API (OpenAI, Cohere, etc.)
async function generateEmbedding(text: string): Promise<number[]> {
  // Fallback: einfacher Hash-basierter Vektor für Demo-Zwecke
  // In Produktion durch echtes API ersetzen:
  // const res = await fetch('https://api.openai.com/v1/embeddings', ...)
  const vec = new Array(384).fill(0);
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  for (let i = 0; i < 384; i++) {
    vec[i] = Math.sin(hash + i * 0.1) * 0.5;
  }
  // Normalisieren
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
  return vec.map((v) => v / (norm || 1));
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0,
    na = 0,
    nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

// ─── Hauptlogik: Matches berechnen ───────────────────────────
async function computeMatchesForUser(
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string,
): Promise<MatchResult[]> {
  // 1. Eigenes Profil laden
  const { data: myProfile, error: myErr } = await supabaseAdmin
    .from("profiles")
    .select(
      "id, display_name, bio, skills, looking_for, vision, lat, lng, city, max_distance_km, industry, role, stage",
    )
    .eq("id", userId)
    .single();

  if (myErr || !myProfile) throw new Error(`Profil nicht gefunden: ${myErr?.message}`);

  // 2. Kandidaten laden (onboarded, visible, nicht ich selbst)
  const { data: candidates, error: candErr } = await supabaseAdmin
    .from("profiles")
    .select(
      "id, display_name, bio, skills, looking_for, vision, lat, lng, city, max_distance_km, industry, role, stage",
    )
    .eq("is_onboarded", true)
    .eq("is_visible", true)
    .neq("id", userId)
    .limit(200);

  if (candErr) throw new Error(`Kandidaten-Fehler: ${candErr.message}`);
  if (!candidates?.length) return [];

  // 3. Embedding für mich generieren
  const myText = buildProfileText(myProfile as FounderProfile);
  const myEmbedding = await generateEmbedding(myText);

  // 4. Für jeden Kandidaten Score berechnen
  const results: MatchResult[] = [];

  for (const candidate of candidates as FounderProfile[]) {
    // Skill Overlap
    const skillScore = computeSkillOverlap(myProfile.skills, candidate.skills);

    // Location
    const { score: locScore, distanceKm } = computeLocationScore(
      myProfile as FounderProfile,
      candidate,
    );

    // Embedding
    const candText = buildProfileText(candidate);
    const candEmbedding = await generateEmbedding(candText);
    const embSim = cosineSimilarity(myEmbedding, candEmbedding);
    const embScore = Math.round(((embSim + 1) / 2) * 100); // -1..1 → 0..100

    // Gewichtung: Skills 40%, Location 30%, Embedding 30%
    const total = Math.round(skillScore * 0.4 + locScore * 0.3 + embScore * 0.3);

    const explanation: Record<string, unknown> = {
      skill_overlap: skillScore,
      location: locScore,
      embedding_similarity: embScore,
      distance_km: distanceKm,
      common_skills: (myProfile.skills ?? []).filter((s: string) =>
        (candidate.skills ?? []).includes(s),
      ),
      candidate_city: candidate.city,
    };

    results.push({
      target_id: candidate.id,
      target_name: candidate.display_name,
      total_score: total,
      skill_score: skillScore,
      location_score: locScore,
      embedding_score: embScore,
      distance_km: distanceKm,
      explanation,
    });
  }

  // 5. Nach Score sortieren und Top 50 speichern
  results.sort((a, b) => b.total_score - a.total_score);
  const top = results.slice(0, 50);

  // 6. In match_results upserten
  const upserts = top.map((r) => ({
    user_id: userId,
    target_id: r.target_id,
    target_type: "cofounder" as const,
    total_score: r.total_score,
    skill_overlap_score: r.skill_score,
    location_score: r.location_score,
    embedding_score: r.embedding_score,
    combined_score: r.total_score,
    explanation: r.explanation,
    computed_at: new Date().toISOString(),
  }));

  const { error: upsertErr } = await supabaseAdmin
    .from("match_results")
    .upsert(upserts, { onConflict: "user_id,target_id,target_type" });

  if (upsertErr) {
    console.error("Upsert-Fehler:", upsertErr);
  }

  // 7. Embedding speichern/aktualisieren
  const contentHash = await simpleHash(myText);
  const { data: existingEmb } = await supabaseAdmin
    .from("profile_embeddings")
    .select("id, content_hash")
    .eq("profile_id", userId)
    .single();

  if (!existingEmb || existingEmb.content_hash !== contentHash) {
    const embeddingStr = `[${myEmbedding.join(",")}]`;
    await supabaseAdmin.from("profile_embeddings").upsert(
      {
        profile_id: userId,
        embedding: embeddingStr,
        content_hash: contentHash,
        model: "all-MiniLM-L6-v2-simulated",
      },
      { onConflict: "profile_id" },
    );
  }

  return top;
}

async function simpleHash(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ─── HTTP Handler ────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = getFunctionSubpath(url, "matching");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });

    // Auth prüfen
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authErr,
    } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST" && path === "compute") {
      const matches = await computeMatchesForUser(supabaseAdmin, user.id);
      return new Response(JSON.stringify({ success: true, count: matches.length, matches }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "GET" && path === "recommendations") {
      const requestedLimit = Number.parseInt(url.searchParams.get("limit") ?? "20", 10);
      const limit = Number.isFinite(requestedLimit)
        ? Math.min(Math.max(requestedLimit, 1), 50)
        : 20;
      const queryLimit = Math.min(limit * 3, 100);
      const { data: recs, error } = await supabaseAdmin
        .from("match_results")
        .select(
          `
          *,
          target:profiles!match_results_target_id_fkey(
            id,
            display_name,
            photo_url,
            bio,
            skills,
            industry,
            role,
            stage,
            location,
            city,
            lat,
            lng,
            looking_for,
            vision,
            commitment,
            years_experience,
            path,
            onboarded_at
          )
        `,
        )
        .eq("user_id", user.id)
        .eq("target_type", "cofounder")
        .eq("is_hidden", false)
        .order("combined_score", { ascending: false })
        .limit(queryLimit);

      if (error) throw error;

      const { data: swipes, error: swipesError } = await supabaseAdmin
        .from("swipes")
        .select("target_id")
        .eq("swiper_id", user.id);

      if (swipesError) throw swipesError;

      const swipedIds = new Set(
        (swipes ?? []).map((swipe: { target_id: string }) => swipe.target_id),
      );
      const recommendations = (recs ?? [])
        .filter((rec: { target_id: string }) => !swipedIds.has(rec.target_id))
        .slice(0, limit);

      return new Response(JSON.stringify({ success: true, recommendations }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[matching]", err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
