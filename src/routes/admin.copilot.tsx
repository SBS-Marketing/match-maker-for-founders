// ─────────────────────────────────────────────────────────────
// Admin → Co-Pilot Health: Provider-Timeouts, Fallback-Quoten
// und Latenzen. Liest aus public.ai_usage (RLS: nur Admins).
// ─────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Activity, AlertTriangle, GitBranch, RefreshCw, Timer, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";

export const Route = createFileRoute("/admin/copilot")({
  component: CopilotHealthDashboard,
});

type MetricRow = {
  task: string;
  model: string;
  status: string;
  fallback: boolean;
  latency_ms: number;
  prompt_tokens: number;
  completion_tokens: number;
  created_at: string;
};

const WINDOWS = [
  { key: "1h", label: "1 h", ms: 60 * 60 * 1000 },
  { key: "24h", label: "24 h", ms: 24 * 60 * 60 * 1000 },
  { key: "7d", label: "7 d", ms: 7 * 24 * 60 * 60 * 1000 },
] as const;

type WindowKey = (typeof WINDOWS)[number]["key"];

function CopilotHealthDashboard() {
  const { isPreview } = useIsAdmin();
  const [windowKey, setWindowKey] = useState<WindowKey>("24h");
  const [rows, setRows] = useState<MetricRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);

  const load = async (key: WindowKey) => {
    setLoading(true);
    if (isPreview) {
      setRows(demoRows(key));
      setRefreshedAt(new Date());
      setLoading(false);
      return;
    }
    const ms = WINDOWS.find((w) => w.key === key)!.ms;
    const since = new Date(Date.now() - ms).toISOString();
    const { data, error } = await supabase
      .from("ai_usage")
      .select("task,model,status,fallback,latency_ms,prompt_tokens,completion_tokens,created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(2000);
    if (!error && data) setRows(data as MetricRow[]);
    setRefreshedAt(new Date());
    setLoading(false);
  };

  useEffect(() => {
    void load(windowKey);
  }, [windowKey]);

  const stats = useMemo(() => computeStats(rows), [rows]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-bold text-[var(--ink)]">Co-Pilot Health</h2>
          <p className="text-[12px] text-[var(--smoke)]">
            Provider-Timeouts, Fallback-Quote und Antwortzeit — Rohdaten aus{" "}
            <code className="rounded bg-[var(--surface)] px-1 py-0.5 text-[11px]">ai_usage</code>.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex overflow-hidden rounded-xl border border-[var(--ruled)] bg-[var(--surface)]">
            {WINDOWS.map((w) => (
              <button
                key={w.key}
                onClick={() => setWindowKey(w.key)}
                className={
                  windowKey === w.key
                    ? "bg-[var(--ink)] px-3 py-1.5 text-[12px] font-semibold text-white"
                    : "px-3 py-1.5 text-[12px] font-semibold text-[var(--smoke)] hover:text-[var(--ink)]"
                }
              >
                {w.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => load(windowKey)}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--ruled)] bg-[var(--surface)] text-[var(--smoke)] hover:text-[var(--ink)]"
            aria-label="Neu laden"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard
          icon={<Activity className="h-4 w-4" />}
          label="Requests"
          value={stats.total.toLocaleString("de-DE")}
          hint={`${stats.ok} ok · ${stats.errors} Fehler`}
        />
        <MetricCard
          icon={<AlertTriangle className="h-4 w-4" />}
          label="Timeouts"
          value={stats.timeouts.toLocaleString("de-DE")}
          hint={`${pct(stats.timeouts, stats.total)} aller Calls`}
          tone={stats.timeouts > 0 ? "warn" : "default"}
        />
        <MetricCard
          icon={<GitBranch className="h-4 w-4" />}
          label="Fallback-Quote"
          value={pct(stats.fallbacks, stats.tasks || 1)}
          hint={`${stats.fallbacks} von ${stats.tasks} Tasks fielen auf Sonnet`}
          tone={stats.fallbacks / Math.max(1, stats.tasks) > 0.2 ? "warn" : "default"}
        />
        <MetricCard
          icon={<Timer className="h-4 w-4" />}
          label="Latenz p50 / p95"
          value={`${fmtMs(stats.p50)} · ${fmtMs(stats.p95)}`}
          hint={`Ø ${fmtMs(stats.avg)}`}
        />
      </div>

      <section className="rounded-2xl border border-[var(--ruled)] bg-[var(--surface)] p-4">
        <div className="mb-3 flex items-center gap-2">
          <Zap className="h-4 w-4 text-[var(--ember)]" />
          <h3 className="text-[13px] font-bold text-[var(--ink)]">Nach Modell</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-[12.5px]">
            <thead className="text-[11px] uppercase tracking-wider text-[var(--smoke)]">
              <tr>
                <th className="py-2 pr-3">Modell</th>
                <th className="py-2 pr-3">Calls</th>
                <th className="py-2 pr-3">OK</th>
                <th className="py-2 pr-3">Timeouts</th>
                <th className="py-2 pr-3">Errors</th>
                <th className="py-2 pr-3">Latenz p50</th>
                <th className="py-2 pr-3">Latenz p95</th>
              </tr>
            </thead>
            <tbody>
              {stats.perModel.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-[var(--smoke)]">
                    Keine Daten im gewählten Zeitraum.
                  </td>
                </tr>
              )}
              {stats.perModel.map((m) => (
                <tr key={m.model} className="border-t border-[var(--ruled)]">
                  <td className="py-2 pr-3 font-mono text-[11.5px]">{m.model}</td>
                  <td className="py-2 pr-3">{m.total}</td>
                  <td className="py-2 pr-3 text-emerald-600">{m.ok}</td>
                  <td className="py-2 pr-3 text-amber-600">{m.timeouts}</td>
                  <td className="py-2 pr-3 text-rose-600">{m.errors}</td>
                  <td className="py-2 pr-3">{fmtMs(m.p50)}</td>
                  <td className="py-2 pr-3">{fmtMs(m.p95)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--ruled)] bg-[var(--surface)] p-4">
        <h3 className="mb-3 text-[13px] font-bold text-[var(--ink)]">Nach Task</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-[12.5px]">
            <thead className="text-[11px] uppercase tracking-wider text-[var(--smoke)]">
              <tr>
                <th className="py-2 pr-3">Task</th>
                <th className="py-2 pr-3">Requests</th>
                <th className="py-2 pr-3">Fallback</th>
                <th className="py-2 pr-3">Timeouts</th>
                <th className="py-2 pr-3">Latenz p50</th>
              </tr>
            </thead>
            <tbody>
              {stats.perTask.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-[var(--smoke)]">
                    Keine Daten im gewählten Zeitraum.
                  </td>
                </tr>
              )}
              {stats.perTask.map((t) => (
                <tr key={t.task} className="border-t border-[var(--ruled)]">
                  <td className="py-2 pr-3 font-mono text-[11.5px]">{t.task}</td>
                  <td className="py-2 pr-3">{t.total}</td>
                  <td className="py-2 pr-3">
                    <span
                      className={
                        t.fallbackRate > 0.2
                          ? "font-semibold text-amber-600"
                          : "text-[var(--smoke)]"
                      }
                    >
                      {(t.fallbackRate * 100).toFixed(0)}%
                    </span>
                  </td>
                  <td className="py-2 pr-3">{t.timeouts}</td>
                  <td className="py-2 pr-3">{fmtMs(t.p50)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--ruled)] bg-[var(--surface)] p-4">
        <h3 className="mb-3 text-[13px] font-bold text-[var(--ink)]">Letzte Vorfälle</h3>
        <ul className="space-y-2">
          {stats.recentIncidents.length === 0 && (
            <li className="text-[12.5px] text-[var(--smoke)]">
              Keine Timeouts oder Fehler im Zeitraum — alles grün.
            </li>
          )}
          {stats.recentIncidents.map((r, i) => (
            <li
              key={i}
              className="flex items-center justify-between gap-3 rounded-xl border border-[var(--ruled)] bg-white px-3 py-2 text-[12.5px]"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className={
                    r.status === "timeout"
                      ? "inline-flex h-1.5 w-1.5 rounded-full bg-amber-500"
                      : "inline-flex h-1.5 w-1.5 rounded-full bg-rose-500"
                  }
                />
                <span className="font-mono text-[11.5px]">{r.model}</span>
                <span className="text-[var(--smoke)]">· {r.task}</span>
                {r.fallback && (
                  <span className="rounded-full bg-[var(--ember-tint)] px-1.5 py-0.5 text-[10px] font-semibold uppercase text-[var(--ember-deep)]">
                    Fallback
                  </span>
                )}
              </div>
              <div className="shrink-0 text-[11px] text-[var(--smoke)]">
                {fmtMs(r.latency_ms)} · {fmtTime(r.created_at)}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {refreshedAt && (
        <p className="text-[11px] text-[var(--smoke)]">
          Zuletzt aktualisiert: {refreshedAt.toLocaleTimeString("de-DE")}
        </p>
      )}
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  hint,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "warn";
}) {
  return (
    <div
      className={
        tone === "warn"
          ? "rounded-2xl border border-amber-300 bg-amber-50 p-3.5"
          : "rounded-2xl border border-[var(--ruled)] bg-[var(--surface)] p-3.5"
      }
    >
      <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--smoke)]">
        {icon}
        {label}
      </div>
      <div className="text-[18px] font-bold leading-tight text-[var(--ink)]">{value}</div>
      {hint && <div className="mt-0.5 text-[11.5px] text-[var(--smoke)]">{hint}</div>}
    </div>
  );
}

// ─── Aggregation ─────────────────────────────────────────────

function computeStats(rows: MetricRow[]) {
  const total = rows.length;
  const ok = rows.filter((r) => r.status === "ok").length;
  const timeouts = rows.filter((r) => r.status === "timeout").length;
  const errors = rows.filter((r) => r.status === "error").length;
  const fallbacks = rows.filter((r) => r.fallback).length;

  // "Tasks" = einzigartige (created_at second → task) grob als Requests am
  // Function-Entry; ai_usage kann pro Task mehrere Zeilen enthalten
  // (Kimi-Timeout + Sonnet-Fallback). Wir zählen als "Task" jede Fallback-
  // Zeile plus jede erfolgreiche Kimi-Zeile, so kommt die Fallback-Quote
  // als Anteil der Task-Läufe raus, nicht der Roh-Calls.
  const tasks = rows.filter((r) => !r.fallback).length;

  const latencies = rows
    .filter((r) => r.latency_ms > 0)
    .map((r) => r.latency_ms)
    .sort((a, b) => a - b);
  const p50 = percentile(latencies, 0.5);
  const p95 = percentile(latencies, 0.95);
  const avg = latencies.length
    ? Math.round(latencies.reduce((s, x) => s + x, 0) / latencies.length)
    : 0;

  // Per Modell
  const byModel = new Map<string, MetricRow[]>();
  for (const r of rows) {
    const arr = byModel.get(r.model) ?? [];
    arr.push(r);
    byModel.set(r.model, arr);
  }
  const perModel = Array.from(byModel.entries())
    .map(([model, rs]) => {
      const lat = rs.map((r) => r.latency_ms).sort((a, b) => a - b);
      return {
        model,
        total: rs.length,
        ok: rs.filter((r) => r.status === "ok").length,
        timeouts: rs.filter((r) => r.status === "timeout").length,
        errors: rs.filter((r) => r.status === "error").length,
        p50: percentile(lat, 0.5),
        p95: percentile(lat, 0.95),
      };
    })
    .sort((a, b) => b.total - a.total);

  // Per Task
  const byTask = new Map<string, MetricRow[]>();
  for (const r of rows) {
    const arr = byTask.get(r.task) ?? [];
    arr.push(r);
    byTask.set(r.task, arr);
  }
  const perTask = Array.from(byTask.entries())
    .map(([task, rs]) => {
      const lat = rs.map((r) => r.latency_ms).sort((a, b) => a - b);
      const primary = rs.filter((r) => !r.fallback).length || 1;
      return {
        task,
        total: rs.length,
        fallbackRate: rs.filter((r) => r.fallback).length / primary,
        timeouts: rs.filter((r) => r.status === "timeout").length,
        p50: percentile(lat, 0.5),
      };
    })
    .sort((a, b) => b.total - a.total);

  const recentIncidents = rows
    .filter((r) => r.status === "timeout" || r.status === "error")
    .slice(0, 12);

  return {
    total,
    ok,
    timeouts,
    errors,
    fallbacks,
    tasks,
    p50,
    p95,
    avg,
    perModel,
    perTask,
    recentIncidents,
  };
}

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * p));
  return sorted[idx];
}

function pct(part: number, total: number): string {
  if (!total) return "0%";
  return `${((part / total) * 100).toFixed(1)}%`;
}

function fmtMs(ms: number): string {
  if (!ms) return "—";
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

// ─── Demo-Daten für nicht-eingeloggte Vorschau ───────────────

function demoRows(key: WindowKey): MetricRow[] {
  const now = Date.now();
  const spread = WINDOWS.find((w) => w.key === key)!.ms;
  const base: Array<Partial<MetricRow> & { minutesAgo: number }> = [
    { model: "moonshotai/kimi-k3", task: "chat", status: "ok", latency_ms: 1800, minutesAgo: 2 },
    { model: "moonshotai/kimi-k3", task: "chat", status: "ok", latency_ms: 2200, minutesAgo: 8 },
    {
      model: "moonshotai/kimi-k3",
      task: "chat",
      status: "timeout",
      latency_ms: 8000,
      minutesAgo: 15,
    },
    {
      model: "anthropic/claude-sonnet-4-6",
      task: "chat",
      status: "ok",
      latency_ms: 3400,
      fallback: true,
      minutesAgo: 15,
    },
    {
      model: "moonshotai/kimi-k3",
      task: "context_parse",
      status: "ok",
      latency_ms: 1200,
      minutesAgo: 22,
    },
    {
      model: "moonshotai/kimi-k3",
      task: "daily_brief",
      status: "ok",
      latency_ms: 1600,
      minutesAgo: 40,
    },
    {
      model: "moonshotai/kimi-k3",
      task: "chat",
      status: "error",
      latency_ms: 900,
      minutesAgo: 55,
    },
    {
      model: "anthropic/claude-sonnet-4-6",
      task: "chat",
      status: "ok",
      latency_ms: 4100,
      fallback: true,
      minutesAgo: 55,
    },
  ];
  const factor = Math.max(1, spread / (60 * 60 * 1000));
  return base.map((b, i) => ({
    task: b.task ?? "chat",
    model: b.model ?? "moonshotai/kimi-k3",
    status: (b.status ?? "ok") as string,
    fallback: Boolean(b.fallback),
    latency_ms: b.latency_ms ?? 1500,
    prompt_tokens: 300,
    completion_tokens: 150,
    created_at: new Date(now - b.minutesAgo * 60_000 * factor - i * 1000).toISOString(),
  }));
}
