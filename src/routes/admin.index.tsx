// ─────────────────────────────────────────────────────────────
// Admin → Übersicht: Aktions-KPIs, Plattform-Zahlen, KI-Kosten
// und die zusammengeführte Aufgabenliste. Alle Werte aus Supabase.
// ─────────────────────────────────────────────────────────────

import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Coins,
  Layers,
  Store,
  Users,
} from "lucide-react";
import {
  AdminBadge,
  AdminBtn,
  AdminCard,
  AdminCardHead,
  AdminDotArea,
  AdminEmpty,
  AdminKpi,
  AdminLoading,
  AdminPills,
  AdminRow,
  AdminTable,
  AdminAvatar,
  AdminWaffle,
  type Accent,
  type Delta,
} from "@/components/admin/ui";
import {
  AI_MONTHLY_CAP_USD,
  useActionKpis,
  useAdminTodos,
  useAiUsage,
  usePlatformStats,
  type UsageRow,
} from "@/hooks/admin/useAdminData";
import { useSectionActions } from "@/components/admin/context";
import { downloadCsv, formatUsd2, shortDateDE, waitedSince } from "@/lib/admin-format";

export const Route = createFileRoute("/admin/")({
  component: AdminOverview,
});

const RANGE_OPTIONS = [
  { value: "7", label: "7 Tage" },
  { value: "30", label: "30 Tage" },
  { value: "90", label: "90 Tage" },
] as const;

const SCOPE_OPTIONS = [
  { value: "all", label: "Alles" },
  { value: "live", label: "Live" },
  { value: "action", label: "Braucht Aktion" },
] as const;

type RangeValue = (typeof RANGE_OPTIONS)[number]["value"];
type ScopeValue = (typeof SCOPE_OPTIONS)[number]["value"];

const TASK_COLORS = [
  "var(--a-ember)",
  "var(--a-indigo)",
  "var(--a-green)",
  "var(--a-amber)",
  "var(--a-red)",
];

function delta(current: number, previous: number): Delta {
  if (current === previous) return { dir: "flat", label: "unverändert" };
  if (previous === 0) return { dir: "up", label: `+${current}` };
  const pct = Math.round(((current - previous) / previous) * 100);
  return { dir: pct >= 0 ? "up" : "down", label: `${pct >= 0 ? "+" : ""}${pct} %` };
}

function AdminOverview() {
  const [range, setRange] = useState<RangeValue>("30");
  const [scope, setScope] = useState<ScopeValue>("all");
  const days = Number(range);

  const usage = useAiUsage(days);
  const platform = usePlatformStats(days);
  const kpis = useActionKpis();
  const todos = useAdminTodos();

  useSectionActions(
    {
      onExport: () =>
        downloadCsv(
          `admin-aufgaben-${new Date().toISOString().slice(0, 10)}.csv`,
          ["Aufgabe", "Herkunft", "Quelle", "Wartet seit", "Status"],
          (todos.data ?? []).map((t) => [t.title, t.origin, t.source, waitedSince(t.since), t.status]),
        ),
    },
    [todos.data],
  );

  const byTask = useMemo(() => aggregateTasks(usage.data ?? []), [usage.data]);
  const daily = useMemo(() => aggregateDaily(usage.data ?? [], days), [usage.data, days]);
  const byModel = useMemo(() => aggregateModels(usage.data ?? []), [usage.data]);
  const totalCost = byTask.reduce((s, t) => s + t.cost, 0);
  const loggingActive = (usage.data ?? []).some(
    (r) => new Date(r.created_at).getTime() > Date.now() - 86_400_000,
  );

  const monthCapPct = Math.round(((kpis.data?.aiCostMonth ?? 0) / AI_MONTHLY_CAP_USD) * 100);
  const resetDate = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1);

  const showAll = scope !== "action";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <AdminPills
          options={RANGE_OPTIONS.map((o) => ({ ...o }))}
          value={range}
          onChange={setRange}
        />
        <AdminPills
          options={SCOPE_OPTIONS.map((o) => ({ ...o }))}
          value={scope}
          onChange={setScope}
          dotOn="action"
        />
      </div>

      {showAll && (
        <>
          <div className="grid gap-3 md:grid-cols-3">
            <AdminKpi
              icon={Store}
              accent="amber"
              label="Angebote zur Freigabe"
              value={kpis.isLoading ? "–" : String(kpis.data?.offersInReview ?? 0)}
              delta={
                kpis.data
                  ? kpis.data.offersNew7d > 0
                    ? { dir: "up", label: `+${kpis.data.offersNew7d} in 7 Tagen` }
                    : { dir: "flat", label: "keine neuen" }
                  : undefined
              }
              action={
                <Link to="/admin/partner">
                  <AdminBtn variant="quiet">Prüfen</AdminBtn>
                </Link>
              }
            />
            <AdminKpi
              icon={CalendarDays}
              accent="indigo"
              label="Event-Anmeldungen"
              value={kpis.isLoading ? "–" : String(kpis.data?.futureRegistrations ?? 0)}
              compare={
                kpis.data ? `${kpis.data.eventsNearlyFull} Events über 85 % Auslastung` : undefined
              }
              action={
                <Link to="/admin/events">
                  <AdminBtn variant="quiet">Öffnen</AdminBtn>
                </Link>
              }
            />
            <AdminKpi
              icon={Coins}
              accent="ember"
              label="KI-Budget im Monat"
              value={kpis.isLoading ? "–" : formatUsd2(kpis.data?.aiCostMonth ?? 0)}
              delta={
                kpis.data
                  ? { dir: monthCapPct > 80 ? "down" : "flat", label: `${monthCapPct} % vom Cap` }
                  : undefined
              }
              compare={`Reset ${resetDate.toLocaleDateString("de-DE")}`}
              action={
                <Link to="/admin/ki">
                  <AdminBtn variant="quiet">Details</AdminBtn>
                </Link>
              }
            />
          </div>

          <section>
            <p
              className="mb-2 px-0.5 uppercase"
              style={{ fontSize: 11, letterSpacing: "0.04em", color: "var(--a-faint)" }}
            >
              Plattform
            </p>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <AdminKpi
                icon={Users}
                accent="indigo"
                label="Profile"
                value={platform.isLoading ? "–" : String(platform.data?.profiles.total ?? 0)}
                delta={
                  platform.data
                    ? delta(platform.data.profiles.current, platform.data.profiles.previous)
                    : undefined
                }
                compare={`letzte ${days} Tage`}
              />
              <AdminKpi
                icon={Layers}
                accent="ember"
                label="Matches"
                value={platform.isLoading ? "–" : String(platform.data?.matches.total ?? 0)}
                delta={
                  platform.data
                    ? delta(platform.data.matches.current, platform.data.matches.previous)
                    : undefined
                }
                compare={`letzte ${days} Tage`}
              />
              <AdminKpi
                icon={CalendarDays}
                accent="green"
                label="Live-Events"
                value={platform.isLoading ? "–" : String(platform.data?.liveEvents.total ?? 0)}
                delta={
                  platform.data
                    ? delta(platform.data.liveEvents.current, platform.data.liveEvents.previous)
                    : undefined
                }
                compare={`letzte ${days} Tage`}
              />
              <AdminKpi
                icon={BookOpen}
                accent="amber"
                label="Guides veröffentlicht"
                value={
                  platform.isLoading ? "–" : String(platform.data?.publishedGuides.total ?? 0)
                }
                delta={
                  platform.data
                    ? delta(
                        platform.data.publishedGuides.current,
                        platform.data.publishedGuides.previous,
                      )
                    : undefined
                }
                compare={`letzte ${days} Tage`}
              />
            </div>
          </section>

          <div className="grid gap-3 lg:grid-cols-2">
            <AdminCard>
              <AdminCardHead
                icon={Coins}
                accent="ember"
                title="KI-Kosten nach Aufgabe"
                sub={`${days} Tage · ai_usage`}
                right={
                  <Link to="/admin/ki">
                    <AdminBtn variant="quiet">Report →</AdminBtn>
                  </Link>
                }
              />
              {usage.isLoading ? (
                <AdminLoading />
              ) : byTask.length === 0 ? (
                <AdminEmpty label="Noch keine Einträge" />
              ) : (
                <>
                  <p
                    className="admin-num mb-3"
                    style={{ fontSize: 29, fontWeight: 600, letterSpacing: "-0.035em" }}
                  >
                    {formatUsd2(totalCost)}
                  </p>
                  <AdminWaffle
                    shares={byTask.map((t, i) => ({
                      share: t.cost / Math.max(totalCost, 1e-9),
                      color: TASK_COLORS[i % TASK_COLORS.length],
                    }))}
                  />
                  <div className="mt-3 space-y-1.5">
                    {byTask.map((t, i) => (
                      <div key={t.name} className="flex items-center gap-2">
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 99,
                            background: TASK_COLORS[i % TASK_COLORS.length],
                          }}
                        />
                        <span className="min-w-0 flex-1 truncate font-mono" style={{ fontSize: 12 }}>
                          {t.name}
                        </span>
                        <AdminBadge>
                          {Math.round((t.cost / Math.max(totalCost, 1e-9)) * 100)} %
                        </AdminBadge>
                        <span
                          className="admin-num text-right"
                          style={{ fontSize: 12, width: 68, color: "var(--a-smoke)" }}
                        >
                          {formatUsd2(t.cost)}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </AdminCard>

            <AdminCard>
              <AdminCardHead
                icon={Coins}
                accent="indigo"
                title="Kosten über Zeit"
                sub={`Ø ${formatUsd2(totalCost / Math.max(1, days))} pro Tag`}
                right={
                  loggingActive ? (
                    <AdminBadge variant="green">Logging aktiv</AdminBadge>
                  ) : (
                    <AdminBadge variant="amber">kein Logging</AdminBadge>
                  )
                }
              />
              {usage.isLoading ? (
                <AdminLoading />
              ) : (usage.data ?? []).length === 0 ? (
                <AdminEmpty label="Noch keine Einträge" />
              ) : (
                <>
                  <AdminDotArea
                    data={daily.values}
                    labels={daily.labels}
                    color="var(--a-indigo)"
                  />
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {byModel.slice(0, 2).map((m) => (
                      <div
                        key={m.name}
                        style={{
                          borderRadius: 13,
                          background: "var(--a-soft)",
                          padding: "10px 12px",
                        }}
                      >
                        <p className="truncate font-mono" style={{ fontSize: 11.5, color: "var(--a-faint)" }}>
                          {m.name}
                        </p>
                        <p className="admin-num" style={{ fontSize: 20, fontWeight: 600 }}>
                          {formatUsd2(m.cost)}
                        </p>
                        <p style={{ fontSize: 11.5, color: "var(--a-smoke)" }}>
                          {m.requests} Anfragen · {m.tokens.toLocaleString("de-DE")} Tokens
                        </p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </AdminCard>
          </div>
        </>
      )}

      <AdminCard>
        <AdminCardHead
          icon={CheckCircle2}
          accent="amber"
          title="Braucht dich"
          sub="Offene Freigaben, Entwürfe und Bewerbungen"
        />
        {todos.isLoading ? (
          <AdminLoading />
        ) : (todos.data ?? []).length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8">
            <CheckCircle2 size={22} strokeWidth={1.75} color="var(--a-green)" />
            <p style={{ fontSize: 13, color: "var(--a-smoke)" }}>
              Alles erledigt — keine offenen Aufgaben.
            </p>
          </div>
        ) : (
          <AdminTable
            cols="2.2fr 1fr 0.9fr 1fr 0.7fr"
            head={["Aufgabe", "Quelle", "Wartet seit", "Status", ""]}
          >
            {(todos.data ?? []).map((t) => (
              <AdminRow
                key={t.key}
                cols="2.2fr 1fr 0.9fr 1fr 0.7fr"
                cells={[
                  <div className="flex items-center gap-2.5" key="t">
                    <AdminAvatar name={t.title} size={28} accent="soft" />
                    <div className="min-w-0">
                      <p className="truncate" style={{ fontWeight: 600 }}>
                        {t.title}
                      </p>
                      <p className="truncate" style={{ fontSize: 11.5, color: "var(--a-faint)" }}>
                        {t.origin}
                      </p>
                    </div>
                  </div>,
                  <span className="font-mono" style={{ fontSize: 12, color: "var(--a-smoke)" }} key="s">
                    {t.source}
                  </span>,
                  <span style={{ fontSize: 12.5, color: "var(--a-smoke)" }} key="w">
                    {waitedSince(t.since)}
                  </span>,
                  <AdminBadge key="b" variant={t.tone as Accent}>
                    {t.status}
                  </AdminBadge>,
                  <Link to={t.to} key="a">
                    <AdminBtn variant="ghost">Prüfen</AdminBtn>
                  </Link>,
                ]}
              />
            ))}
          </AdminTable>
        )}
      </AdminCard>
    </div>
  );
}

// ── Aggregation ──────────────────────────────────────────────

type Grouped = { name: string; cost: number; tokens: number; requests: number };

function group(rows: UsageRow[], key: (r: UsageRow) => string): Grouped[] {
  const map = new Map<string, Grouped>();
  for (const r of rows) {
    const k = key(r);
    const entry = map.get(k) ?? { name: k, cost: 0, tokens: 0, requests: 0 };
    entry.cost += r.cost_usd;
    entry.tokens += r.prompt_tokens + r.completion_tokens;
    entry.requests += 1;
    map.set(k, entry);
  }
  return [...map.values()].sort((a, b) => b.cost - a.cost);
}

function aggregateTasks(rows: UsageRow[]): Grouped[] {
  return group(rows, (r) => r.task);
}

function aggregateModels(rows: UsageRow[]): Grouped[] {
  return group(rows, (r) => r.model.split("/").pop() ?? r.model);
}

function aggregateDaily(rows: UsageRow[], days: number): { values: number[]; labels: string[] } {
  const values = new Array<number>(days).fill(0);
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  for (const r of rows) {
    const diff = Math.floor((start.getTime() - new Date(r.created_at).setHours(0, 0, 0, 0)) / 86_400_000);
    const idx = days - 1 - diff;
    if (idx >= 0 && idx < days) values[idx] += r.cost_usd;
  }
  const labels = [0, 1, 2, 3, 4].map((i) => {
    const d = new Date(start);
    d.setDate(d.getDate() - (days - 1) + Math.round((i * (days - 1)) / 4));
    return shortDateDE(d);
  });
  return { values, labels };
}
