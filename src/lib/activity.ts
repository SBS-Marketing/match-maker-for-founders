// ─────────────────────────────────────────────────────────────
// Founder-Feed: Aktivitäten loggen und lesen.
// Eingeloggt → activity_events (Supabase), Demo/offline → localStorage.
// ─────────────────────────────────────────────────────────────

import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type ActivityType =
  | "profile_published"
  | "grant_saved"
  | "question_asked"
  | "milestone"
  | "joined";

export type ActivityEvent = {
  id: string;
  type: ActivityType;
  title: string;
  actor: string;
  created_at: string;
};

export type ActivityAuth = { session: Session | null; user: User | null; isDemo: boolean };

const LOCAL_KEY = "mf_activity_v1";

function canUseCloud(auth: ActivityAuth): boolean {
  return Boolean(auth.session && auth.user && !auth.isDemo);
}

function readLocal(): ActivityEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    const parsed = raw ? (JSON.parse(raw) as ActivityEvent[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocal(events: ActivityEvent[]): void {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(events.slice(-40)));
  } catch {
    /* */
  }
}

export async function logActivity(
  auth: ActivityAuth,
  type: ActivityType,
  title: string,
  meta: Record<string, unknown> = {},
): Promise<void> {
  if (canUseCloud(auth)) {
    await supabase
      .from("activity_events")
      .insert({ user_id: auth.user!.id, type, title, meta: JSON.parse(JSON.stringify(meta)) })
      .then(() => undefined);
    return;
  }
  const events = readLocal();
  events.push({
    id: Math.random().toString(36).slice(2, 10),
    type,
    title,
    actor: "Du",
    created_at: new Date().toISOString(),
  });
  writeLocal(events);
}

// Demo-Seeds, damit der Feed nie leer wirkt, solange die Community wächst.
const SEED_EVENTS: ActivityEvent[] = [
  {
    id: "seed-1",
    type: "profile_published",
    title: "Anna W. hat das Firmenprofil von relaypoint veröffentlicht",
    actor: "Anna W.",
    created_at: new Date(Date.now() - 2 * 3600_000).toISOString(),
  },
  {
    id: "seed-2",
    type: "grant_saved",
    title: "Jonas K. hat sein EXIST-Antragspaket auf 80% gebracht",
    actor: "Jonas K.",
    created_at: new Date(Date.now() - 6 * 3600_000).toISOString(),
  },
  {
    id: "seed-3",
    type: "question_asked",
    title: "Mara S. fragt: UG oder GmbH für den Start?",
    actor: "Mara S.",
    created_at: new Date(Date.now() - 26 * 3600_000).toISOString(),
  },
  {
    id: "seed-4",
    type: "milestone",
    title: "Team kantine.ai hat den ersten Pilotkunden unterschrieben",
    actor: "kantine.ai",
    created_at: new Date(Date.now() - 50 * 3600_000).toISOString(),
  },
];

export async function readActivity(auth: ActivityAuth): Promise<ActivityEvent[]> {
  if (canUseCloud(auth)) {
    const { data } = await supabase
      .from("activity_events")
      .select("id, type, title, created_at, user_id")
      .order("created_at", { ascending: false })
      .limit(30);
    const rows = (data ?? []).map((row) => ({
      id: row.id,
      type: row.type as ActivityType,
      title: row.title,
      actor: "",
      created_at: row.created_at,
    }));
    return rows.length > 0 ? rows : SEED_EVENTS;
  }
  const local = readLocal().reverse();
  return [...local, ...SEED_EVENTS].slice(0, 30);
}
