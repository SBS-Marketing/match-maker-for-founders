// ─────────────────────────────────────────────────────────────
// Datenzugriffe für den Admin-Bereich. Alle Zahlen kommen aus
// Supabase; nur der Demo-Modus (isPreview) liefert Beispieldaten.
// ─────────────────────────────────────────────────────────────

import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";

/** Monats-Cap für KI-Kosten (USD) — an genau einer Stelle änderbar. */
export const AI_MONTHLY_CAP_USD = 30;

export type UsageRow = {
  task: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  cost_usd: number;
  created_at: string;
  latency_ms: number;
  status: string;
  fallback: boolean;
};

export type TokenGrant = {
  id: string;
  user_id: string;
  display_name: string | null;
  token_limit: number;
  tokens_used: number;
  period: string;
  note: string | null;
};

export type AdminUser = {
  user_id: string;
  email: string | null;
  display_name: string | null;
  founder_type: string | null;
  industry: string | null;
  location: string | null;
  is_onboarded: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  last_sign_in: string | null;
  role: string | null;
  token_limit: number | null;
  tokens_used: number | null;
  grant_note: string | null;
};

export type PendingCounts = {
  partnerReview: number;
  eventDrafts: number;
  guideDrafts: number;
};

export type AdminTaskItem = {
  key: string;
  title: string;
  origin: string;
  source: string;
  since: string | null;
  status: string;
  tone: "amber" | "soft" | "indigo" | "red";
  to: string;
};

// ── Demo-Daten (nur isPreview) ───────────────────────────────

const PREVIEW_USAGE: UsageRow[] = (() => {
  const rows: UsageRow[] = [];
  const tasks = ["chat", "daily_brief", "context_parse", "match_explain", "document_exist"];
  const now = Date.now();
  for (let day = 0; day < 30; day++) {
    for (let i = 0; i < 3 + (day % 4); i++) {
      const kimi = i % 3 !== 0;
      const prompt = 900 + ((day * 137 + i * 311) % 1600);
      const completion = 220 + ((day * 89 + i * 193) % 500);
      rows.push({
        task: tasks[(day + i) % tasks.length],
        model: kimi ? "moonshotai/kimi-k2.6" : "anthropic/claude-sonnet-4-6",
        prompt_tokens: prompt,
        completion_tokens: completion,
        cost_usd: kimi
          ? (prompt * 0.6 + completion * 2.5) / 1e6
          : (prompt * 3 + completion * 15) / 1e6,
        created_at: new Date(now - day * 86_400_000 - i * 3_600_000).toISOString(),
        latency_ms: kimi
          ? 1400 + ((day * 53 + i * 97) % 2600)
          : 3200 + ((day * 71 + i * 41) % 4200),
        status: (day + i) % 17 === 0 ? "error" : "ok",
        fallback: !kimi,
      });
    }
  }
  return rows;
})();

const PREVIEW_USERS: AdminUser[] = [
  {
    user_id: "preview-founder-1",
    email: "marvin@example.com",
    display_name: "Marvin Demo",
    founder_type: "skill_partner",
    industry: "Handwerk",
    location: "Köln",
    is_onboarded: true,
    created_at: new Date(Date.now() - 12 * 86_400_000).toISOString(),
    updated_at: new Date().toISOString(),
    last_sign_in: new Date().toISOString(),
    role: "user",
    token_limit: 50_000,
    tokens_used: 14_800,
    grant_note: "Pro-Testphase",
  },
  {
    user_id: "preview-founder-2",
    email: "aylin@example.com",
    display_name: "Aylin Studio",
    founder_type: "owner",
    industry: "Beauty",
    location: "Essen",
    is_onboarded: true,
    created_at: new Date(Date.now() - 30 * 86_400_000).toISOString(),
    updated_at: new Date(Date.now() - 86_400_000).toISOString(),
    last_sign_in: new Date(Date.now() - 86_400_000).toISOString(),
    role: "user",
    token_limit: null,
    tokens_used: null,
    grant_note: null,
  },
];

// ── Hooks ────────────────────────────────────────────────────

function fail(scope: string, message: string): never {
  toast.error(`${scope}: ${message}`);
  throw new Error(message);
}

/** Badge-Zähler für die Sidebar. */
export function usePendingCounts() {
  const { isPreview, checking } = useIsAdmin();
  return useQuery<PendingCounts>({
    queryKey: ["admin", "pending-counts", isPreview],
    enabled: !checking,
    staleTime: 60_000,
    queryFn: async () => {
      if (isPreview) return { partnerReview: 3, eventDrafts: 2, guideDrafts: 1 };
      const [offers, events, guides] = await Promise.all([
        supabase
          .from("partner_offers")
          .select("*", { count: "exact", head: true })
          .eq("review_status", "review"),
        supabase
          .from("community_events")
          .select("*", { count: "exact", head: true })
          .eq("is_published", false),
        supabase.from("guides").select("*", { count: "exact", head: true }).eq("published", false),
      ]);
      const err = offers.error ?? events.error ?? guides.error;
      if (err) fail("Zähler laden fehlgeschlagen", err.message);
      return {
        partnerReview: offers.count ?? 0,
        eventDrafts: events.count ?? 0,
        guideDrafts: guides.count ?? 0,
      };
    },
  });
}

/** ai_usage im gewählten Zeitfenster (Tage). */
export function useAiUsage(days: number) {
  const { isPreview, checking } = useIsAdmin();
  return useQuery<UsageRow[]>({
    queryKey: ["admin", "ai-usage", days, isPreview],
    enabled: !checking,
    staleTime: 60_000,
    queryFn: async () => {
      const since = new Date(Date.now() - days * 86_400_000).toISOString();
      if (isPreview) return PREVIEW_USAGE.filter((r) => r.created_at >= since);
      const { data, error } = await supabase
        .from("ai_usage")
        .select(
          "task,model,prompt_tokens,completion_tokens,cost_usd,created_at,latency_ms,status,fallback",
        )
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(5000);
      if (error) fail("KI-Verbrauch laden fehlgeschlagen", error.message);
      return (data ?? []) as UsageRow[];
    },
  });
}

/** Nutzerliste inkl. Rolle und Token-Kontingent (RPC admin_list_users). */
export function useAdminUsers() {
  const { isPreview, checking } = useIsAdmin();
  return useQuery<AdminUser[]>({
    queryKey: ["admin", "users", isPreview],
    enabled: !checking,
    staleTime: 60_000,
    queryFn: async () => {
      if (isPreview) return PREVIEW_USERS;
      const { data, error } = await supabase.rpc("admin_list_users");
      if (error) fail("Nutzer laden fehlgeschlagen", error.message);
      return (data ?? []) as AdminUser[];
    },
  });
}

type WindowCount = { current: number; previous: number; total: number };
type CountResult = { count: number | null; error: { message: string } | null };
type CountRange = { from: string; to?: string };

async function windowCount(
  make: (range?: CountRange) => PromiseLike<CountResult>,
  days: number,
): Promise<WindowCount> {
  const now = Date.now();
  const from = new Date(now - days * 86_400_000).toISOString();
  const prevFrom = new Date(now - 2 * days * 86_400_000).toISOString();
  const [total, current, previous] = await Promise.all([
    make(),
    make({ from }),
    make({ from: prevFrom, to: from }),
  ]);
  const err = total.error ?? current.error ?? previous.error;
  if (err) fail("Plattform-Zahlen laden fehlgeschlagen", err.message);
  return { total: total.count ?? 0, current: current.count ?? 0, previous: previous.count ?? 0 };
}

export type PlatformStats = {
  profiles: WindowCount;
  matches: WindowCount;
  liveEvents: WindowCount;
  publishedGuides: WindowCount;
};

export function usePlatformStats(days: number) {
  const { isPreview, checking } = useIsAdmin();
  return useQuery<PlatformStats>({
    queryKey: ["admin", "platform", days, isPreview],
    enabled: !checking,
    staleTime: 60_000,
    queryFn: async () => {
      if (isPreview) {
        const demo = (total: number, current: number, previous: number): WindowCount => ({
          total,
          current,
          previous,
        });
        return {
          profiles: demo(128, 14, 9),
          matches: demo(47, 6, 6),
          liveEvents: demo(6, 2, 1),
          publishedGuides: demo(9, 1, 3),
        };
      }
      const [profiles, matches, liveEvents, publishedGuides] = await Promise.all([
        windowCount((r) => {
          let q = supabase.from("profiles").select("*", { count: "exact", head: true });
          if (r) q = q.gte("created_at", r.from);
          if (r?.to) q = q.lt("created_at", r.to);
          return q;
        }, days),
        windowCount((r) => {
          let q = supabase.from("matches").select("*", { count: "exact", head: true });
          if (r) q = q.gte("created_at", r.from);
          if (r?.to) q = q.lt("created_at", r.to);
          return q;
        }, days),
        windowCount((r) => {
          let q = supabase
            .from("community_events")
            .select("*", { count: "exact", head: true })
            .eq("is_published", true);
          if (r) q = q.gte("created_at", r.from);
          if (r?.to) q = q.lt("created_at", r.to);
          return q;
        }, days),
        windowCount((r) => {
          let q = supabase
            .from("guides")
            .select("*", { count: "exact", head: true })
            .eq("published", true);
          if (r) q = q.gte("created_at", r.from);
          if (r?.to) q = q.lt("created_at", r.to);
          return q;
        }, days),
      ]);
      return { profiles, matches, liveEvents, publishedGuides };
    },
  });
}

export type ActionKpis = {
  offersInReview: number;
  offersNew7d: number;
  futureRegistrations: number;
  eventsNearlyFull: number;
  aiCostMonth: number;
};

export function useActionKpis() {
  const { isPreview, checking } = useIsAdmin();
  return useQuery<ActionKpis>({
    queryKey: ["admin", "action-kpis", isPreview],
    enabled: !checking,
    staleTime: 60_000,
    queryFn: async () => {
      if (isPreview) {
        return {
          offersInReview: 3,
          offersNew7d: 2,
          futureRegistrations: 24,
          eventsNearlyFull: 1,
          aiCostMonth: 7.42,
        };
      }
      const nowIso = new Date().toISOString();
      const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

      const [review, review7d, futureEvents, usage] = await Promise.all([
        supabase
          .from("partner_offers")
          .select("*", { count: "exact", head: true })
          .eq("review_status", "review"),
        supabase
          .from("partner_offers")
          .select("*", { count: "exact", head: true })
          .eq("review_status", "review")
          .gte("submitted_at", weekAgo),
        supabase.from("community_events").select("id,spots,taken").gt("starts_at", nowIso),
        supabase.from("ai_usage").select("cost_usd").gte("created_at", monthStart).limit(5000),
      ]);
      const err = review.error ?? review7d.error ?? futureEvents.error ?? usage.error;
      if (err) fail("Kennzahlen laden fehlgeschlagen", err.message);

      const events = futureEvents.data ?? [];
      const eventIds = events.map((e) => e.id);
      let futureRegistrations = 0;
      if (eventIds.length > 0) {
        const { count, error } = await supabase
          .from("community_event_registrations")
          .select("*", { count: "exact", head: true })
          .in("event_id", eventIds);
        if (error) fail("Anmeldungen laden fehlgeschlagen", error.message);
        futureRegistrations = count ?? 0;
      }

      return {
        offersInReview: review.count ?? 0,
        offersNew7d: review7d.count ?? 0,
        futureRegistrations,
        eventsNearlyFull: events.filter((e) => e.spots > 0 && e.taken / e.spots > 0.85).length,
        aiCostMonth: (usage.data ?? []).reduce((sum, r) => sum + (r.cost_usd ?? 0), 0),
      };
    },
  });
}

/** Zusammengeführte Aufgabenliste („Braucht dich“). */
export function useAdminTodos() {
  const { isPreview, checking } = useIsAdmin();
  return useQuery<AdminTaskItem[]>({
    queryKey: ["admin", "todos", isPreview],
    enabled: !checking,
    staleTime: 60_000,
    queryFn: async () => {
      if (isPreview) {
        return [
          {
            key: "demo-1",
            title: "Kanzlei Nord — Gründungsberatung",
            origin: "Partner-Angebot",
            source: "partner_offers",
            since: new Date(Date.now() - 6 * 3_600_000).toISOString(),
            status: "Freigabe offen",
            tone: "amber" as const,
            to: "/admin/partner",
          },
          {
            key: "demo-2",
            title: "Gründerstammtisch Köln",
            origin: "Event-Entwurf",
            source: "community_events",
            since: new Date(Date.now() - 5 * 86_400_000).toISOString(),
            status: "Entwurf",
            tone: "soft" as const,
            to: "/admin/events",
          },
        ];
      }

      const [offers, events, guides, grants, applications] = await Promise.all([
        supabase
          .from("partner_offers")
          .select("slug,name,firm,submitted_at")
          .eq("review_status", "review")
          .limit(50),
        supabase
          .from("community_events")
          .select("id,title,created_at")
          .eq("is_published", false)
          .limit(50),
        supabase.from("guides").select("id,title,created_at").eq("published", false).limit(50),
        supabase
          .from("ai_token_grants")
          .select("user_id,token_limit,tokens_used,note,updated_at")
          .gt("token_limit", 0)
          .limit(50),
        supabase
          .from("partner_applications")
          .select("id,company,contact_name,created_at")
          .eq("status", "neu")
          .limit(50),
      ]);
      const err =
        offers.error ?? events.error ?? guides.error ?? grants.error ?? applications.error;
      if (err) fail("Aufgaben laden fehlgeschlagen", err.message);

      const items: AdminTaskItem[] = [
        ...(offers.data ?? []).map((o) => ({
          key: `offer-${o.slug}`,
          title: `${o.name} — ${o.firm}`,
          origin: "Partner-Angebot",
          source: "partner_offers",
          since: o.submitted_at,
          status: "Freigabe offen",
          tone: "amber" as const,
          to: "/admin/partner",
        })),
        ...(events.data ?? []).map((e) => ({
          key: `event-${e.id}`,
          title: e.title,
          origin: "Event-Entwurf",
          source: "community_events",
          since: e.created_at,
          status: "Entwurf",
          tone: "soft" as const,
          to: "/admin/events",
        })),
        ...(guides.data ?? []).map((g) => ({
          key: `guide-${g.id}`,
          title: g.title,
          origin: "Guide-Review",
          source: "guides",
          since: g.created_at,
          status: "Review",
          tone: "indigo" as const,
          to: "/admin/guides",
        })),
        ...(grants.data ?? [])
          .filter((g) => g.tokens_used >= g.token_limit)
          .map((g) => ({
            key: `grant-${g.user_id}`,
            title: g.note || "KI-Kontingent aufgebraucht",
            origin: "KI-Kontingent",
            source: "ai_token_grants",
            since: g.updated_at,
            status: "Blockiert",
            tone: "red" as const,
            to: "/admin/ki",
          })),
        ...(applications.data ?? []).map((a) => ({
          key: `app-${a.id}`,
          title: `${a.company}${a.contact_name ? ` · ${a.contact_name}` : ""}`,
          origin: "Partner-Bewerbung",
          source: "partner_applications",
          since: a.created_at,
          status: "Neue Bewerbung",
          tone: "indigo" as const,
          to: "/admin/partner",
        })),
      ];

      return items.sort(
        (a, b) => new Date(a.since ?? 0).getTime() - new Date(b.since ?? 0).getTime(),
      );
    },
  });
}

/** Suchquellen für die Command-Palette. */
export function useAdminSearchIndex(enabled: boolean) {
  const { isPreview } = useIsAdmin();
  return useQuery({
    queryKey: ["admin", "search-index", isPreview],
    enabled,
    staleTime: 60_000,
    queryFn: async () => {
      if (isPreview) return { users: [], events: [], guides: [], offers: [] };
      const [users, events, guides, offers] = await Promise.all([
        supabase.from("profiles").select("id,display_name").limit(100),
        supabase.from("community_events").select("id,title").limit(100),
        supabase.from("guides").select("id,slug,title").limit(100),
        supabase.from("partner_offers").select("slug,name").limit(100),
      ]);
      return {
        users: users.data ?? [],
        events: events.data ?? [],
        guides: guides.data ?? [],
        offers: offers.data ?? [],
      };
    },
  });
}

/** Token-Kontingente inkl. Anzeigename. */
export function useTokenGrants() {
  const { isPreview, checking } = useIsAdmin();
  return useQuery<TokenGrant[]>({
    queryKey: ["admin", "token-grants", isPreview],
    enabled: !checking,
    staleTime: 60_000,
    queryFn: async () => {
      if (isPreview) {
        return [
          {
            id: "demo-grant-1",
            user_id: "preview-founder-1",
            display_name: "Marvin Demo",
            token_limit: 50_000,
            tokens_used: 14_800,
            period: "monat",
            note: "Pro-Testphase",
          },
        ];
      }
      const { data, error } = await supabase
        .from("ai_token_grants")
        .select("id,user_id,token_limit,tokens_used,period,note")
        .order("tokens_used", { ascending: false })
        .limit(100);
      if (error) fail("Kontingente laden fehlgeschlagen", error.message);
      const rows = data ?? [];
      if (rows.length === 0) return [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id,display_name")
        .in(
          "id",
          rows.map((r) => r.user_id),
        );
      const names = new Map((profiles ?? []).map((p) => [p.id, p.display_name]));
      return rows.map((r) => ({
        id: r.id,
        user_id: r.user_id,
        display_name: names.get(r.user_id) ?? null,
        token_limit: r.token_limit,
        tokens_used: r.tokens_used,
        period: r.period,
        note: r.note,
      }));
    },
  });
}

// ── Schritt 2: Nutzer, Warteliste, Board, System ──────────────

/** Profilfelder für die Vollständigkeits-Berechnung. */
export type ProfileFields = {
  id: string;
  display_name: string | null;
  photo_url: string | null;
  location: string | null;
  industry: string | null;
  skills: string[] | null;
  vision: string | null;
  looking_for: string | null;
  founder_type: string | null;
};

// Demo-Profilfelder passend zu PREVIEW_USERS: einer nahezu vollständig,
// einer mit erkennbaren Lücken.
const PREVIEW_PROFILE_FIELDS: ProfileFields[] = [
  {
    id: "preview-founder-1",
    display_name: "Marvin Demo",
    photo_url: "https://i.pravatar.cc/160?img=12",
    location: "Köln",
    industry: "Handwerk",
    skills: ["Elektro", "Kalkulation", "Vertrieb"],
    vision: "Digitaler Handwerksbetrieb mit fester Servicequote im Rheinland.",
    looking_for: "Operativer Partner für Einsatzplanung",
    founder_type: "skill_partner",
  },
  {
    id: "preview-founder-2",
    display_name: "Aylin Studio",
    photo_url: null,
    location: "Essen",
    industry: "Beauty",
    skills: [],
    vision: null,
    looking_for: "Co-Founder für Marketing",
    founder_type: "owner",
  },
];

export function useProfileFields() {
  const { isPreview, checking } = useIsAdmin();
  return useQuery<ProfileFields[]>({
    queryKey: ["admin", "profile-fields", isPreview],
    enabled: !checking,
    staleTime: 60_000,
    queryFn: async () => {
      if (isPreview) return PREVIEW_PROFILE_FIELDS;
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id,display_name,photo_url,location,industry,skills,vision,looking_for,founder_type",
        )
        .limit(2000);
      if (error) fail("Profile laden fehlgeschlagen", error.message);
      return (data ?? []) as ProfileFields[];
    },
  });
}

export type WaitlistRow = {
  id: string;
  email: string;
  name: string | null;
  status: string;
  confirmed_at: string | null;
  created_at: string;
  metadata: unknown;
};

export function useWaitlist() {
  const { isPreview, checking } = useIsAdmin();
  return useQuery<WaitlistRow[]>({
    queryKey: ["admin", "waitlist", isPreview],
    enabled: !checking,
    staleTime: 60_000,
    queryFn: async () => {
      if (isPreview) return [];
      const { data, error } = await supabase
        .from("waitlist")
        .select("id,email,name,status,confirmed_at,created_at,metadata")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) fail("Warteliste laden fehlgeschlagen", error.message);
      return (data ?? []) as WaitlistRow[];
    },
  });
}

export type BoardTask = {
  id: string;
  title: string;
  board_column: string;
  source: string | null;
  tag: string | null;
  hue: string;
  assignee_id: string | null;
  assignee_name: string | null;
  due_at: string | null;
  due_label: string | null;
  position: number;
  github_repo: string | null;
  github_issue_number: number | null;
  github_url: string | null;
  github_state: string | null;
  github_labels: string[];
  github_synced_at: string | null;
};

export function useBoardTasks() {
  const { isPreview, checking } = useIsAdmin();
  return useQuery<BoardTask[]>({
    queryKey: ["admin", "board-tasks", isPreview],
    enabled: !checking,
    staleTime: 30_000,
    queryFn: async () => {
      if (isPreview) return [];
      const { data, error } = await supabase
        .from("admin_tasks")
        .select(
          "id,title,board_column,source,tag,hue,assignee_id,assignee_name,due_at,due_label,position,github_repo,github_issue_number,github_url,github_state,github_labels,github_synced_at",
        )
        .order("position", { ascending: true })
        .limit(500);
      if (error) fail("Aufgaben laden fehlgeschlagen", error.message);
      return (data ?? []) as BoardTask[];
    },
  });
}

export type AdminRoleRow = {
  user_id: string;
  email: string | null;
  display_name: string | null;
  role: string;
  since: string;
};

export function useAdminRoles() {
  const { isPreview, checking } = useIsAdmin();
  return useQuery<AdminRoleRow[]>({
    queryKey: ["admin", "roles", isPreview],
    enabled: !checking,
    staleTime: 60_000,
    queryFn: async () => {
      if (isPreview) return [];
      const { data, error } = await supabase.rpc("admin_list_roles");
      if (error) fail("Rollen laden fehlgeschlagen", error.message);
      return (data ?? []) as AdminRoleRow[];
    },
  });
}

export type ConnectorStat = {
  name: string;
  source_table: string;
  users: number;
  state: string;
};

export function useConnectorStats() {
  const { isPreview, checking } = useIsAdmin();
  return useQuery<ConnectorStat[]>({
    queryKey: ["admin", "connectors", isPreview],
    enabled: !checking,
    staleTime: 60_000,
    queryFn: async () => {
      if (isPreview) return [];
      const { data, error } = await supabase.rpc("admin_connector_stats");
      if (error) fail("Konnektoren laden fehlgeschlagen", error.message);
      return (data ?? []) as ConnectorStat[];
    },
  });
}
