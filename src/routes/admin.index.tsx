// ─────────────────────────────────────────────────────────────
// Admin → Insights: KI-Verbrauch (Tokens + Kosten), Plattform-
// Zahlen und Status der Datenquellen (Deals/Förderungen/Partner).
// ─────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  Bot,
  Coins,
  Database,
  ExternalLink,
  RefreshCw,
  RotateCcw,
  Save,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

type UsageRow = {
  task: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  cost_usd: number;
  created_at: string;
};

type Counts = {
  profiles: number;
  matches: number;
  events: number;
  registrations: number;
  guides: number;
};

type SourceStatus = {
  label: string;
  file: string;
  route: string;
  count: number | null;
  generatedAt: string | null;
};

type ProfileOption = {
  id: string;
  display_name: string | null;
  founder_type: string | null;
  industry: string | null;
  updated_at: string;
};

type TokenGrantRow = {
  user_id: string;
  token_limit: number;
  tokens_used: number;
  period: string;
  resets_at: string | null;
  note: string;
  updated_at: string;
};

// Beispieldaten für die Demo-Vorschau (RLS blockt echte Daten ohne Admin-Login).
const PREVIEW_USAGE: UsageRow[] = (() => {
  const rows: UsageRow[] = [];
  const tasks = ["chat", "daily_brief", "context_parse", "match_explain", "document_exist"];
  const now = Date.now();
  for (let day = 0; day < 14; day++) {
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
      });
    }
  }
  return rows;
})();

const PREVIEW_COUNTS: Counts = {
  profiles: 128,
  matches: 47,
  events: 6,
  registrations: 31,
  guides: 9,
};

const PREVIEW_PROFILES: ProfileOption[] = [
  {
    id: "preview-founder-1",
    display_name: "Marvin Demo",
    founder_type: "skill_partner",
    industry: "Handwerk",
    updated_at: new Date().toISOString(),
  },
  {
    id: "preview-founder-2",
    display_name: "Aylin Studio",
    founder_type: "owner",
    industry: "Beauty",
    updated_at: new Date(Date.now() - 86_400_000).toISOString(),
  },
];

const PREVIEW_TOKEN_GRANTS: TokenGrantRow[] = [
  {
    user_id: "preview-founder-1",
    token_limit: 50_000,
    tokens_used: 14_800,
    period: "monthly",
    resets_at: null,
    note: "Pro-Testphase",
    updated_at: new Date().toISOString(),
  },
];

function AdminDashboard() {
  const { isPreview, checking } = useIsAdmin();
  const [usage, setUsage] = useState<UsageRow[] | null>(null);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [sources, setSources] = useState<SourceStatus[]>([]);
  const [profiles, setProfiles] = useState<ProfileOption[]>([]);
  const [tokenGrants, setTokenGrants] = useState<TokenGrantRow[]>([]);
  const [selectedUserID, setSelectedUserID] = useState("");
  const [tokenLimit, setTokenLimit] = useState(8000);
  const [tokenNote, setTokenNote] = useState("");
  const [savingGrant, setSavingGrant] = useState(false);

  const selectedProfile = useMemo(
    () => profiles.find((profile) => profile.id === selectedUserID) ?? null,
    [profiles, selectedUserID],
  );
  const selectedGrant = useMemo(
    () => tokenGrants.find((grant) => grant.user_id === selectedUserID) ?? null,
    [tokenGrants, selectedUserID],
  );
  const selectedRemaining = selectedGrant
    ? Math.max(0, selectedGrant.token_limit - selectedGrant.tokens_used)
    : tokenLimit;

  function selectTokenUser(userID: string) {
    const grant = tokenGrants.find((row) => row.user_id === userID);
    setSelectedUserID(userID);
    setTokenLimit(grant?.token_limit ?? 8000);
    setTokenNote(grant?.note ?? "");
  }

  async function refreshTokenGrants() {
    if (checking) return;
    if (isPreview) {
      setTokenGrants(PREVIEW_TOKEN_GRANTS);
      return;
    }
    const { data, error } = await supabase
      .from("ai_token_grants")
      .select("user_id,token_limit,tokens_used,period,resets_at,note,updated_at")
      .order("updated_at", { ascending: false });

    if (error) {
      toast.error(`Token-Kontingente laden fehlgeschlagen: ${error.message}`);
      setTokenGrants([]);
      return;
    }
    setTokenGrants((data as TokenGrantRow[]) ?? []);
  }

  async function saveTokenGrant(resetUsed = false) {
    if (!selectedUserID) return;
    if (isPreview) {
      toast.info("Demo-Vorschau: live speichern geht nur mit Admin-Login.");
      return;
    }

    setSavingGrant(true);
    const limit = Math.max(0, Math.round(Number(tokenLimit) || 0));
    const payload = {
      user_id: selectedUserID,
      token_limit: limit,
      period: "monthly",
      note: tokenNote.trim(),
      resets_at: null,
      ...(resetUsed || !selectedGrant ? { tokens_used: 0 } : {}),
    };

    const { error } = await supabase
      .from("ai_token_grants")
      .upsert(payload, { onConflict: "user_id" });

    setSavingGrant(false);
    if (error) {
      toast.error(`Kontingent konnte nicht gespeichert werden: ${error.message}`);
      return;
    }

    toast.success(resetUsed ? "Verbrauch wurde auf 0 gesetzt." : "KI-Kontingent gespeichert.");
    await refreshTokenGrants();
  }

  useEffect(() => {
    // Erst laden, wenn der Admin-Check durch ist — sonst überschreiben
    // verspätete (leere) Echt-Queries die Demo-Daten.
    if (checking) return;
    if (isPreview) {
      setUsage(PREVIEW_USAGE);
      setCounts(PREVIEW_COUNTS);
      setProfiles(PREVIEW_PROFILES);
      setTokenGrants(PREVIEW_TOKEN_GRANTS);
      return;
    }
    let cancelled = false;
    const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
    supabase
      .from("ai_usage")
      .select("task,model,prompt_tokens,completion_tokens,cost_usd,created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(5000)
      .then(({ data }) => {
        if (!cancelled) setUsage((data as UsageRow[]) ?? []);
      });

    const count = (
      table:
        | "profiles"
        | "matches"
        | "community_events"
        | "community_event_registrations"
        | "guides",
    ) =>
      supabase
        .from(table)
        .select("*", { count: "exact", head: true })
        .then(({ count: c }) => c ?? 0);
    Promise.all([
      count("profiles"),
      count("matches"),
      count("community_events"),
      count("community_event_registrations"),
      count("guides"),
    ]).then(([profiles, matches, events, registrations, guides]) => {
      if (!cancelled) setCounts({ profiles, matches, events, registrations, guides });
    });

    supabase
      .from("profiles")
      .select("id,display_name,founder_type,industry,updated_at")
      .order("updated_at", { ascending: false })
      .limit(250)
      .then(({ data, error }) => {
        if (error) toast.error(`Profile laden fehlgeschlagen: ${error.message}`);
        if (!cancelled) setProfiles((data as ProfileOption[]) ?? []);
      });

    void refreshTokenGrants();

    return () => {
      cancelled = true;
    };
  }, [isPreview, checking]);

  useEffect(() => {
    if (selectedUserID || profiles.length === 0) return;
    selectTokenUser(profiles[0].id);
  }, [profiles, tokenGrants, selectedUserID]);

  useEffect(() => {
    const files: { label: string; file: string; key: string; route: string }[] = [
      { label: "Deals & Vergünstigungen", file: "/deals.json", key: "deals", route: "/deals" },
      { label: "Förderungen", file: "/grants.json", key: "grants", route: "/foerderung" },
      {
        label: "Partner & Ansprechpartner",
        file: "/partners.json",
        key: "partners",
        route: "/mentoren",
      },
    ];
    Promise.all(
      files.map(async ({ label, file, key, route }): Promise<SourceStatus> => {
        try {
          const res = await fetch(file);
          const json = await res.json();
          const items = json?.[key];
          return {
            label,
            file,
            route,
            count: Array.isArray(items) ? items.length : null,
            generatedAt: typeof json?.generated_at === "string" ? json.generated_at : null,
          };
        } catch {
          return { label, file, route, count: null, generatedAt: null };
        }
      }),
    ).then(setSources);
  }, []);

  const stats = useMemo(() => aggregate(usage ?? []), [usage]);

  return (
    <div className="space-y-5">
      {/* ── KI-Verbrauch ── */}
      <section className="rounded-[18px] border border-[var(--ruled)] bg-[var(--surface)] p-4">
        <SectionTitle icon={<Coins className="h-4 w-4" />} title="KI-Verbrauch & Kosten" />
        {usage === null ? (
          <p className="py-6 text-center text-[13px] text-[var(--smoke)]">Lade…</p>
        ) : usage.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-[var(--smoke)]">
            Noch keine Einträge. Sobald die Copilot-Function mit Usage-Logging deployt ist, landet
            hier jede KI-Anfrage mit Tokens und Kosten.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2.5">
              <StatCard
                label="Heute"
                cost={stats.today.cost}
                requests={stats.today.requests}
                tokens={stats.today.tokens}
              />
              <StatCard
                label="7 Tage"
                cost={stats.week.cost}
                requests={stats.week.requests}
                tokens={stats.week.tokens}
              />
              <StatCard
                label="30 Tage"
                cost={stats.month.cost}
                requests={stats.month.requests}
                tokens={stats.month.tokens}
              />
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <BreakdownTable title="Nach Aufgabe" rows={stats.byTask} />
              <BreakdownTable title="Nach Modell" rows={stats.byModel} />
            </div>
            <p className="mt-3 text-[11.5px] text-[var(--faint)]">
              Kosten sind Schätzwerte auf Basis der OpenRouter-Listenpreise pro Million Tokens.
            </p>
          </>
        )}
      </section>

      {/* ── Token-Vergabe ── */}
      <section className="rounded-[18px] border border-[var(--ruled)] bg-[var(--surface)] p-4">
        <SectionTitle icon={<Bot className="h-4 w-4" />} title="KI-Tokens vergeben" />
        <div className="grid gap-3 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
            {profiles.length === 0 ? (
              <p className="rounded-xl bg-[var(--canvas)] px-3 py-4 text-center text-[13px] text-[var(--smoke)]">
                Noch keine Profile gefunden.
              </p>
            ) : (
              profiles.map((profile) => {
                const grant = tokenGrants.find((row) => row.user_id === profile.id);
                const active = profile.id === selectedUserID;
                const remaining = grant ? Math.max(0, grant.token_limit - grant.tokens_used) : null;
                return (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() => selectTokenUser(profile.id)}
                    className={`w-full rounded-xl border px-3 py-2.5 text-left transition ${
                      active
                        ? "border-[var(--ember)] bg-[color:var(--ember-tint)]"
                        : "border-[var(--ruled)] bg-[var(--canvas)] hover:border-[var(--ember-soft)]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[13px] font-bold text-[var(--ink)]">
                          {profile.display_name || "Unbenanntes Profil"}
                        </p>
                        <p className="mt-0.5 text-[11.5px] text-[var(--smoke)]">
                          {[profile.industry, profile.founder_type].filter(Boolean).join(" · ") ||
                            "kein Profilkontext"}
                        </p>
                      </div>
                      <span className="rounded-full bg-white/70 px-2 py-1 text-[11px] font-semibold text-[var(--smoke)]">
                        {grant
                          ? `${formatTokens(remaining ?? 0)} frei`
                          : "kein Limit"}
                      </span>
                    </div>
                    {grant && (
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/70">
                        <span
                          className="block h-full rounded-full bg-[var(--ember)]"
                          style={{
                            width: `${Math.min(100, Math.max(2, (grant.tokens_used / Math.max(1, grant.token_limit)) * 100))}%`,
                          }}
                        />
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>

          <div className="rounded-xl border border-[var(--ruled)] bg-[var(--canvas)] p-3">
            <p className="text-[12px] font-bold uppercase tracking-wide text-[var(--faint)]">
              Ausgewählter User
            </p>
            <p className="mt-1 text-[17px] font-bold text-[var(--ink)]">
              {selectedProfile?.display_name || "Kein User gewählt"}
            </p>
            <p className="mt-0.5 text-[12.5px] text-[var(--smoke)]">
              {selectedGrant
                ? `${formatTokens(selectedGrant.tokens_used)} genutzt · ${formatTokens(selectedRemaining)} übrig`
                : "Noch kein verbindliches Kontingent gesetzt."}
            </p>

            <label className="mt-4 block text-[12px] font-bold uppercase tracking-wide text-[var(--faint)]">
              Monatliches Token-Limit
            </label>
            <input
              type="number"
              min={0}
              step={1000}
              value={tokenLimit}
              onChange={(event) => setTokenLimit(Number(event.target.value))}
              className="mt-1 w-full rounded-xl border border-[var(--ruled)] bg-[var(--surface)] px-3 py-2 text-[14px] font-semibold text-[var(--ink)] outline-none focus:border-[var(--ember)]"
              placeholder="8000"
            />

            <label className="mt-3 block text-[12px] font-bold uppercase tracking-wide text-[var(--faint)]">
              Admin-Notiz
            </label>
            <textarea
              value={tokenNote}
              onChange={(event) => setTokenNote(event.target.value)}
              rows={3}
              className="mt-1 w-full resize-none rounded-xl border border-[var(--ruled)] bg-[var(--surface)] px-3 py-2 text-[13px] text-[var(--ink)] outline-none focus:border-[var(--ember)]"
              placeholder="z. B. Pro-Test, manuelles Upgrade, Support-Fall..."
            />

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void saveTokenGrant(false)}
                disabled={!selectedUserID || savingGrant}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--ink)] px-3 py-2 text-[12.5px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-45"
              >
                <Save className="h-3.5 w-3.5" />
                Speichern
              </button>
              <button
                type="button"
                onClick={() => void saveTokenGrant(true)}
                disabled={!selectedUserID || savingGrant}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--ruled)] bg-[var(--surface)] px-3 py-2 text-[12.5px] font-bold text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-45"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Verbrauch resetten
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Plattform ── */}
      <section className="rounded-[18px] border border-[var(--ruled)] bg-[var(--surface)] p-4">
        <SectionTitle icon={<Users className="h-4 w-4" />} title="Plattform" />
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
          <MiniStat label="Profile" value={counts?.profiles} />
          <MiniStat label="Matches" value={counts?.matches} />
          <MiniStat label="Events" value={counts?.events} />
          <MiniStat label="Event-Anmeldungen" value={counts?.registrations} />
          <MiniStat label="DB-Guides" value={counts?.guides} />
        </div>
      </section>

      {/* ── Datenquellen ── */}
      <section className="rounded-[18px] border border-[var(--ruled)] bg-[var(--surface)] p-4">
        <SectionTitle
          icon={<Database className="h-4 w-4" />}
          title="Datenquellen (Deals · Förderungen · Partner)"
        />
        <div className="space-y-2">
          {sources.map((s) => (
            <div
              key={s.file}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--ruled)] px-3 py-2.5"
            >
              <div>
                <p className="text-[13px] font-semibold text-[var(--ink)]">{s.label}</p>
                <p className="text-[12px] text-[var(--smoke)]">
                  {s.count !== null ? `${s.count} Einträge` : "nicht erreichbar"}
                  {s.generatedAt ? ` · Stand ${formatDate(s.generatedAt)}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  to={s.route}
                  className="inline-flex items-center gap-1 rounded-lg bg-[var(--ink)] px-2.5 py-1.5 text-[12px] font-semibold text-white"
                >
                  In der App ansehen <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
                <a
                  href={s.file}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--smoke)] hover:text-[var(--ink)]"
                >
                  JSON <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-start gap-2 rounded-xl bg-[var(--canvas)] px-3 py-2.5 text-[12.5px] leading-relaxed text-[var(--smoke)]">
          <RefreshCw className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <p>
            Die Daten werden automatisch jeden <strong>Dienstag 07:00 UTC</strong> vom
            GitHub-Action-Job <code>weekly-deals.yml</code> neu gescannt (Scraper +
            KI-Normalisierung). Manuell starten:{" "}
            <a
              href="https://github.com/SBS-Marketing/match-maker-for-founders/actions/workflows/weekly-deals.yml"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-[var(--indigo)]"
            >
              Actions → Weekly Deals → Run workflow
            </a>
            .
          </p>
        </div>
      </section>

      {/* ── Copilot-Hinweis ── */}
      <section className="flex items-start gap-2.5 rounded-[18px] border border-[var(--ruled)] bg-[var(--surface)] p-4 text-[12.5px] leading-relaxed text-[var(--smoke)]">
        <Bot className="mt-0.5 h-4 w-4 shrink-0 text-[var(--indigo)]" />
        <p>
          Jede Co-Pilot-Anfrage (Kimi K2.6 + Claude Sonnet über OpenRouter) schreibt ihren Verbrauch
          in <code>ai_usage</code>. Sobald ein User ein Kontingent in{" "}
          <code>ai_token_grants</code> hat, wird es vor jedem KI-Call geprüft und danach
          fortgeschrieben. Ohne Kontingent bleibt die bisherige Nutzung aktiv.
        </p>
      </section>
    </div>
  );
}

// ── Aggregation ──────────────────────────────────────────────

type Bucket = { cost: number; tokens: number; requests: number };
type BreakdownRow = { name: string; cost: number; tokens: number; requests: number };

function aggregate(rows: UsageRow[]) {
  const now = Date.now();
  const dayMs = 86_400_000;
  const startOfToday = new Date().setHours(0, 0, 0, 0);
  const empty = (): Bucket => ({ cost: 0, tokens: 0, requests: 0 });
  const today = empty();
  const week = empty();
  const month = empty();
  const byTask = new Map<string, BreakdownRow>();
  const byModel = new Map<string, BreakdownRow>();

  for (const r of rows) {
    const t = new Date(r.created_at).getTime();
    const tokens = r.prompt_tokens + r.completion_tokens;
    const add = (b: Bucket) => {
      b.cost += r.cost_usd;
      b.tokens += tokens;
      b.requests += 1;
    };
    if (t >= startOfToday) add(today);
    if (t >= now - 7 * dayMs) add(week);
    add(month);

    for (const [map, key] of [
      [byTask, r.task],
      [byModel, r.model.split("/").pop() ?? r.model],
    ] as const) {
      const entry = map.get(key) ?? { name: key, cost: 0, tokens: 0, requests: 0 };
      entry.cost += r.cost_usd;
      entry.tokens += tokens;
      entry.requests += 1;
      map.set(key, entry);
    }
  }

  const sorted = (m: Map<string, BreakdownRow>) => [...m.values()].sort((a, b) => b.cost - a.cost);
  return { today, week, month, byTask: sorted(byTask), byModel: sorted(byModel) };
}

// ── UI-Bausteine ─────────────────────────────────────────────

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <h2 className="mb-3 flex items-center gap-2 text-[14px] font-bold text-[var(--ink)]">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--canvas)] text-[var(--ember-deep)]">
        {icon}
      </span>
      {title}
    </h2>
  );
}

function StatCard({ label, cost, requests, tokens }: { label: string } & Bucket) {
  return (
    <div className="rounded-xl border border-[var(--ruled)] bg-[var(--canvas)] px-3 py-2.5">
      <p className="text-[11.5px] font-semibold uppercase tracking-wide text-[var(--faint)]">
        {label}
      </p>
      <p className="mt-0.5 text-[19px] font-bold text-[var(--ink)]">{formatUsd(cost)}</p>
      <p className="text-[11.5px] text-[var(--smoke)]">
        {requests} Anfragen · {formatTokens(tokens)} Tokens
      </p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number | undefined }) {
  return (
    <div className="rounded-xl border border-[var(--ruled)] bg-[var(--canvas)] px-3 py-2.5">
      <p className="text-[18px] font-bold text-[var(--ink)]">{value ?? "–"}</p>
      <p className="text-[11.5px] text-[var(--smoke)]">{label}</p>
    </div>
  );
}

function BreakdownTable({ title, rows }: { title: string; rows: BreakdownRow[] }) {
  const max = Math.max(...rows.map((r) => r.cost), 0.000001);
  return (
    <div>
      <p className="mb-2 text-[12px] font-bold uppercase tracking-wide text-[var(--faint)]">
        {title}
      </p>
      <div className="space-y-1.5">
        {rows.map((r) => (
          <div key={r.name} className="flex items-center gap-2.5">
            <span className="w-28 truncate text-[12.5px] font-semibold text-[var(--ink)]">
              {r.name}
            </span>
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--canvas)]">
              <span
                className="block h-full rounded-full bg-[var(--ember)]"
                style={{ width: `${Math.max(4, (r.cost / max) * 100)}%` }}
              />
            </span>
            <span className="w-16 text-right text-[12px] tabular-nums text-[var(--smoke)]">
              {formatUsd(r.cost)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Format ───────────────────────────────────────────────────

function formatUsd(v: number): string {
  return v >= 1 ? `$${v.toFixed(2)}` : `$${v.toFixed(4)}`;
}

function formatTokens(v: number): string {
  return v >= 1_000_000
    ? `${(v / 1_000_000).toFixed(1)} M`
    : v >= 1000
      ? `${(v / 1000).toFixed(1)}k`
      : String(v);
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}
