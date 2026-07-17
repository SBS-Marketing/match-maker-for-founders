// ─────────────────────────────────────────────────────────────
// Admin → Insights: KI-Verbrauch (Tokens + Kosten), Plattform-
// Zahlen und Status der Datenquellen (Deals/Förderungen/Partner).
// ─────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Bot, Coins, Database, ExternalLink, RefreshCw, Users } from "lucide-react";
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

const PREVIEW_COUNTS: Counts = { profiles: 128, matches: 47, events: 6, registrations: 31, guides: 9 };

function AdminDashboard() {
  const { isPreview, checking } = useIsAdmin();
  const [usage, setUsage] = useState<UsageRow[] | null>(null);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [sources, setSources] = useState<SourceStatus[]>([]);

  useEffect(() => {
    // Erst laden, wenn der Admin-Check durch ist — sonst überschreiben
    // verspätete (leere) Echt-Queries die Demo-Daten.
    if (checking) return;
    if (isPreview) {
      setUsage(PREVIEW_USAGE);
      setCounts(PREVIEW_COUNTS);
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

    const count = (table: "profiles" | "matches" | "community_events" | "community_event_registrations" | "guides") =>
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
    return () => {
      cancelled = true;
    };
  }, [isPreview, checking]);

  useEffect(() => {
    const files: { label: string; file: string; key: string; route: string }[] = [
      { label: "Deals & Vergünstigungen", file: "/deals.json", key: "deals", route: "/deals" },
      { label: "Förderungen", file: "/grants.json", key: "grants", route: "/foerderung" },
      { label: "Partner & Ansprechpartner", file: "/partners.json", key: "partners", route: "/mentoren" },
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
            Noch keine Einträge. Sobald die Copilot-Function mit Usage-Logging deployt ist,
            landet hier jede KI-Anfrage mit Tokens und Kosten.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2.5">
              <StatCard label="Heute" cost={stats.today.cost} requests={stats.today.requests} tokens={stats.today.tokens} />
              <StatCard label="7 Tage" cost={stats.week.cost} requests={stats.week.requests} tokens={stats.week.tokens} />
              <StatCard label="30 Tage" cost={stats.month.cost} requests={stats.month.requests} tokens={stats.month.tokens} />
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
        <SectionTitle icon={<Database className="h-4 w-4" />} title="Datenquellen (Deals · Förderungen · Partner)" />
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
              <a
                href={s.file}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-[12px] font-semibold text-[var(--indigo)]"
              >
                {s.file} <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-start gap-2 rounded-xl bg-[var(--canvas)] px-3 py-2.5 text-[12.5px] leading-relaxed text-[var(--smoke)]">
          <RefreshCw className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <p>
            Die Daten werden automatisch jeden <strong>Dienstag 07:00 UTC</strong> vom
            GitHub-Action-Job <code>weekly-deals.yml</code> neu gescannt (Scraper + KI-Normalisierung).
            Manuell starten:{" "}
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
          Jede Co-Pilot-Anfrage (Kimi K2.6 + Claude Sonnet über OpenRouter) schreibt ihren
          Verbrauch in die Tabelle <code>ai_usage</code> — pro Aufgabe, Modell und Nutzer.
          Rate-Limit: 80 Anfragen/Stunde pro Nutzer.
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

  const sorted = (m: Map<string, BreakdownRow>) =>
    [...m.values()].sort((a, b) => b.cost - a.cost);
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
      <p className="text-[11.5px] font-semibold uppercase tracking-wide text-[var(--faint)]">{label}</p>
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
      <p className="mb-2 text-[12px] font-bold uppercase tracking-wide text-[var(--faint)]">{title}</p>
      <div className="space-y-1.5">
        {rows.map((r) => (
          <div key={r.name} className="flex items-center gap-2.5">
            <span className="w-28 truncate text-[12.5px] font-semibold text-[var(--ink)]">{r.name}</span>
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
  return v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)} M` : v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v);
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}
