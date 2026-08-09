// ─────────────────────────────────────────────────────────────
// Admin → KI-Verbrauch: Kosten, Latenzen, Fallback-Quote und
// Token-Kontingente. Datenquelle: ai_usage + ai_token_grants.
// ─────────────────────────────────────────────────────────────

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Activity, Coins, Cpu, Gauge, Users } from "lucide-react";
import {
  AdminBadge,
  AdminBar,
  AdminCard,
  AdminCardHead,
  AdminDotArea,
  AdminEmpty,
  AdminKpi,
  AdminLoading,
  AdminPills,
  AdminRow,
  AdminTable,
} from "@/components/admin/ui";
import {
  AI_MONTHLY_CAP_USD,
  useAiUsage,
  useTokenGrants,
  type UsageRow,
} from "@/hooks/admin/useAdminData";
import { useSectionActions } from "@/components/admin/context";
import { downloadCsv, formatUsd2, formatTokens, shortDateDE } from "@/lib/admin-format";

export const Route = createFileRoute("/admin/ki")({
  head: () => ({ meta: [{ title: "KI-Verbrauch — Admin · matchfoundr" }] }),
  component: AdminKi,
});

const RANGES = [
  { value: "7", label: "7 Tage" },
  { value: "30", label: "30 Tage" },
  { value: "90", label: "90 Tage" },
] as const;

type RangeValue = (typeof RANGES)[number]["value"];

function AdminKi() {
  const [range, setRange] = useState<RangeValue>("30");
  const days = Number(range);
  const usage = useAiUsage(days);
  const grants = useTokenGrants();

  const rows = usage.data ?? [];

  useSectionActions(
    {
      onExport: () =>
        downloadCsv(
          `ki-verbrauch-${days}d.csv`,
          ["Zeitpunkt", "Task", "Modell", "Prompt", "Completion", "Kosten USD", "Latenz ms", "Status", "Fallback"],
          rows.map((r) => [
            r.created_at,
            r.task,
            r.model,
            r.prompt_tokens,
            r.completion_tokens,
            r.cost_usd,
            r.latency_ms,
            r.status,
            r.fallback ? "ja" : "nein",
          ]),
        ),
    },
    [rows],
  );

  const stats = useMemo(() => computeStats(rows), [rows]);
  const daily = useMemo(() => aggregateDaily(rows, days), [rows, days]);
  const models = useMemo(() => aggregateModels(rows), [rows]);
  const tasks = useMemo(() => aggregateTasks(rows), [rows]);

  const monthCost = useMemo(() => {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    return rows
      .filter((r) => new Date(r.created_at) >= monthStart)
      .reduce((s, r) => s + r.cost_usd, 0);
  }, [rows]);

  return (
    <div className="space-y-5">
      <AdminPills options={RANGES.map((r) => ({ ...r }))} value={range} onChange={setRange} />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminKpi
          icon={Coins}
          accent="ember"
          label="Kosten im Zeitraum"
          value={usage.isLoading ? "–" : formatUsd2(stats.cost)}
          compare={`Monat bisher ${formatUsd2(monthCost)} von ${formatUsd2(AI_MONTHLY_CAP_USD)}`}
        />
        <AdminKpi
          icon={Activity}
          accent="indigo"
          label="Anfragen"
          value={usage.isLoading ? "–" : String(stats.requests)}
          compare={`${formatTokens(stats.tokens)} Tokens`}
        />
        <AdminKpi
          icon={Gauge}
          accent="green"
          label="Latenz p95"
          value={usage.isLoading ? "–" : stats.requests ? `${stats.p95} ms` : "–"}
          compare={stats.requests ? `Median ${stats.p50} ms` : undefined}
        />
        <AdminKpi
          icon={Cpu}
          accent={stats.errorRate > 5 ? "red" : "amber"}
          label="Fallback-Quote"
          value={usage.isLoading ? "–" : stats.requests ? `${stats.fallbackRate} %` : "–"}
          compare={stats.requests ? `${stats.errorRate} % Fehler` : undefined}
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <AdminCard>
          <AdminCardHead
            icon={Coins}
            accent="indigo"
            title="Kosten über Zeit"
            sub={`Ø ${formatUsd2(stats.cost / Math.max(1, days))} pro Tag`}
          />
          {usage.isLoading ? (
            <AdminLoading />
          ) : rows.length === 0 ? (
            <AdminEmpty label="Noch keine Einträge" />
          ) : (
            <AdminDotArea data={daily.values} labels={daily.labels} color="var(--a-indigo)" />
          )}
        </AdminCard>

        <AdminCard>
          <AdminCardHead icon={Cpu} accent="ember" title="Modelle" sub="Kosten, Latenz, Fehler" />
          {usage.isLoading ? (
            <AdminLoading />
          ) : models.length === 0 ? (
            <AdminEmpty label="Noch keine Einträge" />
          ) : (
            <div className="space-y-2.5">
              {models.map((m) => (
                <div key={m.name}>
                  <div className="mb-1 flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate font-mono" style={{ fontSize: 12 }}>
                      {m.name}
                    </span>
                    {m.fallbacks > 0 && <AdminBadge variant="amber">{m.fallbacks} Fallback</AdminBadge>}
                    <span className="admin-num" style={{ fontSize: 12, color: "var(--a-smoke)" }}>
                      {formatUsd2(m.cost)}
                    </span>
                  </div>
                  <AdminBar
                    value={(m.cost / Math.max(models[0].cost, 1e-9)) * 100}
                    color="var(--a-ember)"
                  />
                  <p className="mt-1" style={{ fontSize: 11.5, color: "var(--a-faint)" }}>
                    {m.requests} Anfragen · Ø {Math.round(m.latency / Math.max(1, m.requests))} ms
                  </p>
                </div>
              ))}
            </div>
          )}
        </AdminCard>
      </div>

      <AdminCard>
        <AdminCardHead icon={Activity} accent="green" title="Aufgaben" sub="Nach Copilot-Task" />
        {usage.isLoading ? (
          <AdminLoading />
        ) : tasks.length === 0 ? (
          <AdminEmpty label="Noch keine Einträge" />
        ) : (
          <AdminTable
            cols="1.4fr 0.7fr 0.8fr 0.8fr 0.7fr"
            head={["Task", "Anfragen", "Tokens", "Kosten", "Ø Latenz"]}
          >
            {tasks.map((t) => (
              <AdminRow
                key={t.name}
                cols="1.4fr 0.7fr 0.8fr 0.8fr 0.7fr"
                cells={[
                  <span className="font-mono" style={{ fontSize: 12.5 }} key="n">
                    {t.name}
                  </span>,
                  <span className="admin-num" key="r">
                    {t.requests}
                  </span>,
                  <span className="admin-num" key="t">
                    {formatTokens(t.tokens)}
                  </span>,
                  <span className="admin-num" key="c">
                    {formatUsd2(t.cost)}
                  </span>,
                  <span className="admin-num" key="l">
                    {Math.round(t.latency / Math.max(1, t.requests))} ms
                  </span>,
                ]}
              />
            ))}
          </AdminTable>
        )}
      </AdminCard>

      <AdminCard>
        <AdminCardHead
          icon={Users}
          accent="amber"
          title="Token-Kontingente"
          sub="ai_token_grants"
        />
        {grants.isLoading ? (
          <AdminLoading />
        ) : (grants.data ?? []).length === 0 ? (
          <AdminEmpty label="Noch keine Einträge" />
        ) : (
          <AdminTable
            cols="1.6fr 1fr 1.2fr 0.8fr"
            head={["Nutzer", "Verbrauch", "Auslastung", "Periode"]}
          >
            {(grants.data ?? []).map((g) => {
              const pct = Math.round((g.tokens_used / Math.max(1, g.token_limit)) * 100);
              return (
                <AdminRow
                  key={g.id}
                  cols="1.6fr 1fr 1.2fr 0.8fr"
                  cells={[
                    <div className="min-w-0" key="u">
                      <p className="truncate" style={{ fontWeight: 600 }}>
                        {g.display_name ?? g.user_id.slice(0, 8)}
                      </p>
                      {g.note && (
                        <p className="truncate" style={{ fontSize: 11.5, color: "var(--a-faint)" }}>
                          {g.note}
                        </p>
                      )}
                    </div>,
                    <span className="admin-num" key="v">
                      {formatTokens(g.tokens_used)} / {formatTokens(g.token_limit)}
                    </span>,
                    <AdminBar
                      key="b"
                      value={pct}
                      color={pct > 85 ? "var(--a-red)" : "var(--a-green)"}
                    />,
                    <AdminBadge key="p">{g.period}</AdminBadge>,
                  ]}
                />
              );
            })}
          </AdminTable>
        )}
      </AdminCard>
    </div>
  );
}

// ── Aggregation ──────────────────────────────────────────────

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return Math.round(sorted[idx]);
}

function computeStats(rows: UsageRow[]) {
  const cost = rows.reduce((s, r) => s + r.cost_usd, 0);
  const tokens = rows.reduce((s, r) => s + r.prompt_tokens + r.completion_tokens, 0);
  const latencies = rows.map((r) => r.latency_ms).filter((v) => v > 0);
  const fallbacks = rows.filter((r) => r.fallback).length;
  const errors = rows.filter((r) => r.status !== "ok" && r.status !== "success").length;
  return {
    cost,
    tokens,
    requests: rows.length,
    p50: percentile(latencies, 50),
    p95: percentile(latencies, 95),
    fallbackRate: rows.length ? Math.round((fallbacks / rows.length) * 100) : 0,
    errorRate: rows.length ? Math.round((errors / rows.length) * 100) : 0,
  };
}

type Grouped = {
  name: string;
  cost: number;
  tokens: number;
  requests: number;
  latency: number;
  fallbacks: number;
};

function group(rows: UsageRow[], key: (r: UsageRow) => string): Grouped[] {
  const map = new Map<string, Grouped>();
  for (const r of rows) {
    const k = key(r);
    const e = map.get(k) ?? { name: k, cost: 0, tokens: 0, requests: 0, latency: 0, fallbacks: 0 };
    e.cost += r.cost_usd;
    e.tokens += r.prompt_tokens + r.completion_tokens;
    e.requests += 1;
    e.latency += r.latency_ms;
    if (r.fallback) e.fallbacks += 1;
    map.set(k, e);
  }
  return [...map.values()].sort((a, b) => b.cost - a.cost);
}

function aggregateModels(rows: UsageRow[]) {
  return group(rows, (r) => r.model);
}

function aggregateTasks(rows: UsageRow[]) {
  return group(rows, (r) => r.task);
}

function aggregateDaily(rows: UsageRow[], days: number) {
  const values = new Array<number>(days).fill(0);
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  for (const r of rows) {
    const diff = Math.floor(
      (start.getTime() - new Date(r.created_at).setHours(0, 0, 0, 0)) / 86_400_000,
    );
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
