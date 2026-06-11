import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  Kanban,
  ListChecks,
  Loader2,
  RefreshCw,
  Send,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { AuthGate } from "@/components/AuthGate";
import { SERVICE_BY_ID, type ServiceId } from "@/data/services";
import { GRANTS } from "@/data/grants";
import { PARTNERS, partnersFor } from "@/data/partners";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { ServiceIcon } from "@/components/ServiceIcon";
import { CopilotMark } from "@/components/Copilot";
import { DailyBrief } from "@/components/DailyBrief";
import { Button } from "@/components/ui/button";
import {
  buildLocalPlanSlides,
  readPlanContext,
  type PlanContext,
  type PlanSlide,
} from "@/lib/plan-draft";

export const Route = createFileRoute("/heute")({
  head: () => ({ meta: [{ title: "Heute · Command Center — matchfoundr" }] }),
  component: () => (
    <AuthGate>
      <CommandCenter />
    </AuthGate>
  ),
});

type DailyTask = {
  id: string;
  sId: ServiceId;
  title: string;
  desc: string;
  href: string;
  label: string;
  urgency: "hoch" | "mittel" | "niedrig";
  minutes: number;
};

type DailyState = {
  completed: string[];
  snoozed: string[];
  refreshedAt?: string;
};

type DailyTaskStatus = "open" | "done" | "snoozed";

const DAILY_STATE_KEY = "mf_daily_state_v1";
const EMPTY_DAILY_STATE: DailyState = { completed: [], snoozed: [] };

const QUICK_PROMPTS = [
  "Was ist heute der wichtigste nächste Schritt?",
  "Hilf mir den EXIST-Antrag weiter auszufüllen.",
  "Formuliere mir eine kurze Partner-Nachricht.",
];

function CommandCenter() {
  const { user, session, isDemo } = useAuth();
  const [planContext, setPlanContext] = useState<PlanContext | null>(() => readPlanContext());
  const [dailyState, setDailyState] = useState<DailyState>(() => readDailyState());
  const [remoteReady, setRemoteReady] = useState(false);
  const [copilotInput, setCopilotInput] = useState("");
  const [copilotAnswer, setCopilotAnswer] = useState<string | null>(null);
  const [copilotSending, setCopilotSending] = useState(false);

  useEffect(() => {
    writeDailyState(dailyState);
  }, [dailyState]);

  const today = useMemo(
    () =>
      new Date().toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" }),
    [],
  );
  const userName = planContext?.userName || "Founder";
  const firstName = userName.split(" ")[0] || "Founder";
  const planSlides = useMemo(() => buildLocalPlanSlides(planContext), [planContext]);
  const firstStep = useMemo(() => planSlides.find(isFirstStep), [planSlides]);
  const topGrant = GRANTS[0];
  const topPartners = useMemo(
    () => [
      ...partnersFor("mentor").slice(0, 1),
      ...partnersFor("growth").slice(0, 1),
      ...partnersFor("tax").slice(0, 1),
    ],
    [],
  );
  const dailyTasks = useMemo(
    () => buildDailyTasks(planContext, firstStep, topGrant, topPartners),
    [planContext, firstStep, topGrant, topPartners],
  );
  const taskDate = useMemo(() => getLocalDateKey(), []);
  const visibleTasks = dailyTasks.filter((task) => !dailyState.snoozed.includes(task.id));
  const completedCount = dailyTasks.filter((task) => dailyState.completed.includes(task.id)).length;
  const openTasks = visibleTasks.filter((task) => !dailyState.completed.includes(task.id));
  const nextFocus = openTasks[0];
  const nextPartner = topPartners[0];
  const progress = dailyTasks.length ? Math.round((completedCount / dailyTasks.length) * 100) : 0;

  useEffect(() => {
    if (!session || !user || isDemo || dailyTasks.length === 0) {
      setRemoteReady(false);
      return;
    }
    const currentUserId = user.id;
    let cancelled = false;
    async function syncDailyTasks() {
      const { data, error } = await supabase
        .from("daily_tasks")
        .select("task_key,status")
        .eq("user_id", currentUserId)
        .eq("task_date", taskDate);

      if (cancelled) return;
      if (error) {
        setRemoteReady(false);
        return;
      }

      const rows = data ?? [];
      const knownKeys = new Set(rows.map((row) => row.task_key));
      const missing = dailyTasks.filter((task) => !knownKeys.has(task.id));
      if (missing.length > 0) {
        await supabase.from("daily_tasks").upsert(
          missing.map((task) =>
            toDailyTaskInsert(currentUserId, taskDate, task, remoteStatusFor(task.id, dailyState)),
          ),
          { onConflict: "user_id,task_date,task_key" },
        );
      }

      const completed = rows.filter((row) => row.status === "done").map((row) => row.task_key);
      const snoozed = rows.filter((row) => row.status === "snoozed").map((row) => row.task_key);
      setDailyState((current) => ({
        ...current,
        completed: Array.from(
          new Set([...completed, ...current.completed.filter((id) => !knownKeys.has(id))]),
        ),
        snoozed: Array.from(
          new Set([...snoozed, ...current.snoozed.filter((id) => !knownKeys.has(id))]),
        ),
      }));
      setRemoteReady(true);
    }
    syncDailyTasks();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, user?.id, isDemo, taskDate, dailyTasks.map((task) => task.id).join("|")]);

  const toggleComplete = useCallback(
    (id: string) => {
      const task = dailyTasks.find((item) => item.id === id);
      const willComplete = !dailyState.completed.includes(id);
      setDailyState((current) => {
        const done = current.completed.includes(id);
        const completed = done
          ? current.completed.filter((item) => item !== id)
          : [...current.completed, id];
        return { ...current, completed };
      });
      if (session && user && !isDemo && task) {
        persistDailyTask(user.id, taskDate, task, willComplete ? "done" : "open");
      }
    },
    [dailyState.completed, dailyTasks, isDemo, session, taskDate, user],
  );

  const snooze = useCallback(
    (id: string) => {
      const task = dailyTasks.find((item) => item.id === id);
      setDailyState((current) => ({
        ...current,
        snoozed: current.snoozed.includes(id) ? current.snoozed : [...current.snoozed, id],
      }));
      if (session && user && !isDemo && task) {
        persistDailyTask(user.id, taskDate, task, "snoozed");
      }
      toast.success("Für heute ausgeblendet");
    },
    [dailyTasks, isDemo, session, taskDate, user],
  );

  const refreshDaily = useCallback(() => {
    setPlanContext(readPlanContext());
    setDailyState({ completed: [], snoozed: [], refreshedAt: new Date().toISOString() });
    setCopilotAnswer(null);
    if (session && user && !isDemo) {
      Promise.all(
        dailyTasks.map((task) => persistDailyTask(user.id, taskDate, task, "open")),
      ).catch(() => undefined);
    }
    toast.success("Heute neu priorisiert");
  }, [dailyTasks, isDemo, session, taskDate, user]);

  const sendToCopilot = useCallback(
    async (text?: string) => {
      const body = (text ?? copilotInput).trim();
      if (!body || copilotSending) return;
      setCopilotInput("");
      setCopilotSending(true);

      if (!session || isDemo) {
        window.setTimeout(() => {
          setCopilotAnswer(buildLocalDailyCopilotAnswer(body, nextFocus, topGrant, planContext));
          setCopilotSending(false);
        }, 450);
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke("copilot", {
          body: { task: "chat", message: body, extra: { onboarding: planContext } },
        });
        if (error) throw error;
        setCopilotAnswer(
          (data?.answer as string) ||
            buildLocalDailyCopilotAnswer(body, nextFocus, topGrant, planContext),
        );
      } catch {
        setCopilotAnswer(buildLocalDailyCopilotAnswer(body, nextFocus, topGrant, planContext));
        toast.error("Co-Pilot nutzt gerade den lokalen Modus");
      } finally {
        setCopilotSending(false);
      }
    },
    [copilotInput, copilotSending, isDemo, nextFocus, planContext, session, topGrant],
  );

  return (
    <div className="mx-auto max-w-6xl px-4 pt-5 pb-24 sm:px-6 sm:pt-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="eyebrow">{today}</div>
          <h1 className="mt-2 max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">
            Hi {firstName}, dein Tagesplan.
          </h1>
          <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-[var(--smoke)]">
            Erst Fokus klären, dann Co-Pilot nutzen, danach in den passenden Workspace springen.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            onClick={refreshDaily}
            className="glass-pill h-10 gap-2 rounded-full px-4 text-[13px]"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Neu sortieren
          </Button>
          <Link to="/plan">
            <Button className="h-10 gap-2 rounded-full bg-[var(--ember)] px-4 text-[13px] text-white shadow-ember hover:bg-[var(--ember-deep)]">
              <CopilotMark size={14} color="white" /> Plan
            </Button>
          </Link>
        </div>
      </div>

      <section className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
        <TodayStat label="Offen" value={String(openTasks.length)} note="Tasks heute" />
        <TodayStat
          label="Fortschritt"
          value={`${progress}%`}
          note={`${completedCount}/${dailyTasks.length} erledigt`}
        />
        <TodayStat label="Status" value={remoteReady ? "Cloud" : "Lokal"} note="Daily Sync" />
      </section>

      <DailyBrief
        dateKey={taskDate}
        input={{
          firstName,
          openCount: openTasks.length,
          completedCount,
          totalTasks: dailyTasks.length,
          grantName: topGrant?.name,
          grantDeadline: topGrant?.deadline,
          idea: planContext?.context.idea,
          goal: planContext?.context.goal,
          risk: planContext?.context.risk,
          nextFocus: nextFocus?.title,
        }}
      />

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_0.92fr]">
        <section
          data-tour="focus"
          className="glass-pane-ink grid gap-4 p-5 sm:grid-cols-[1fr_auto] sm:items-center"
        >
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <StepBadge number="1" label="Fokus heute" dark />
              <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-white/55">
                {nextFocus ? `${nextFocus.minutes} Min · ${nextFocus.label}` : "Heute erledigt"}
              </span>
            </div>
            <h2 className="text-[22px] font-semibold leading-tight tracking-tight text-[var(--cream)]">
              {nextFocus?.title || "Alles erledigt"}
            </h2>
            <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-white/70">
              {nextFocus?.desc ??
                "Öffne den Plan oder frage den Co-Pilot nach dem nächsten sinnvollen Sprint."}
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-white/55">
              <span className="rounded-full bg-white/10 px-2.5 py-1">
                {completedCount}/{dailyTasks.length} erledigt
              </span>
              {topGrant && (
                <span className="rounded-full bg-white/10 px-2.5 py-1">
                  {topGrant.name} · {topGrant.deadline}
                </span>
              )}
            </div>
          </div>
          {nextFocus && (
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => toggleComplete(nextFocus.id)}
                className="h-10 gap-2 rounded-lg bg-[var(--cream)] px-4 text-[13px] font-semibold text-[var(--ink)] hover:bg-white"
              >
                <Check className="h-3.5 w-3.5" /> Fertig
              </Button>
              <Link to={nextFocus.href}>
                <Button
                  variant="ghost"
                  className="h-10 rounded-lg border border-white/15 bg-white/5 px-4 text-[13px] text-[var(--cream)] hover:bg-white/10"
                >
                  Öffnen
                </Button>
              </Link>
            </div>
          )}
        </section>

        <section className="glass-pane flex flex-col p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <span
              className="flex h-10 w-10 items-center justify-center rounded-xl text-white"
              style={{ background: "var(--indigo-grad)" }}
            >
              <CopilotMark size={18} color="white" />
            </span>
            <div>
              <StepBadge number="2" label="Co-Pilot" />
              <div className="mt-1 text-[12px] text-[var(--smoke)]">
                Schreib direkt aus dem Tageskontext.
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-2">
            {QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                onClick={() => sendToCopilot(prompt)}
                className="rounded-2xl border border-[var(--ruled)] bg-white/55 px-3 py-2 text-left text-[12.5px] font-medium text-[var(--ink)] transition hover:bg-white"
              >
                {prompt}
              </button>
            ))}
          </div>

          <div className="mt-4 min-h-[112px] rounded-2xl border border-[var(--ruled)] bg-white/45 p-4">
            {copilotSending ? (
              <div className="flex h-full min-h-[80px] items-center justify-center gap-2 text-[13px] text-[var(--smoke)]">
                <Loader2 className="h-4 w-4 animate-spin" /> Co-Pilot denkt mit...
              </div>
            ) : copilotAnswer ? (
              <p className="whitespace-pre-line text-[13.5px] leading-relaxed text-[var(--ink)]">
                {copilotAnswer}
              </p>
            ) : (
              <p className="text-[13.5px] leading-relaxed text-[var(--smoke)]">
                Frage nach Priorität, Antrag, Nachricht oder nächstem Sprint.
              </p>
            )}
          </div>

          <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
            <textarea
              value={copilotInput}
              onChange={(e) => setCopilotInput(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                  e.preventDefault();
                  sendToCopilot();
                }
              }}
              rows={2}
              placeholder="Co-Pilot fragen..."
              className="min-h-[48px] resize-none rounded-2xl border border-[var(--ruled)] bg-white/70 px-3 py-2 text-[13px] outline-none transition focus:border-[var(--ember)] focus:bg-white"
            />
            <Button
              onClick={() => sendToCopilot()}
              disabled={!copilotInput.trim() || copilotSending}
              className="h-full min-h-[48px] rounded-2xl bg-[var(--ember)] px-4 text-white hover:bg-[var(--ember-deep)]"
              aria-label="An Co-Pilot senden"
            >
              {copilotSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </section>
      </div>

      <section className="glass-pane mt-5 p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <StepBadge number="3" label="Weiterarbeiten" />
            <p className="mt-1 text-[12.5px] text-[var(--smoke)]">
              Öffne genau den Bereich, den du jetzt brauchst.
            </p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <WorkspaceCard
            icon={Kanban}
            label="Board"
            title="Kanban"
            desc="Status und Owner prüfen"
            href="/kanban"
          />
          <WorkspaceCard
            icon={ListChecks}
            label="Tasks"
            title="Aufgaben"
            desc={`${openTasks.length} offene Punkte`}
            href="/aufgaben"
          />
          <WorkspaceCard
            icon={CalendarDays}
            label="Termine"
            title="Kalender"
            desc="Deadlines und Calls"
            href="/kalender"
          />
          <WorkspaceCard
            icon={Building2}
            label="Profil"
            title="Firma"
            desc="Landingpage pflegen"
            href="/firma"
          />
        </div>
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_0.7fr]">
        <section data-tour="conversations" className="glass-pane p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <div className="eyebrow">Tagesliste</div>
              <p className="mt-1 text-[12.5px] text-[var(--smoke)]">
                {completedCount}/{dailyTasks.length} erledigt ·{" "}
                {remoteReady ? "gespeichert" : "lokal"}
              </p>
            </div>
            <Link
              to="/aufgaben"
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold"
            >
              Alle <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="grid gap-2">
            {visibleTasks.slice(0, 4).map((task) => (
              <DailyActionCard
                key={task.id}
                task={task}
                done={dailyState.completed.includes(task.id)}
                onDone={() => toggleComplete(task.id)}
                onSnooze={() => snooze(task.id)}
              />
            ))}
            {visibleTasks.length === 0 && (
              <div className="rounded-2xl border border-[var(--ruled)] bg-white/45 p-5 text-[13px] text-[var(--smoke)]">
                Alles für heute ausgeblendet. Über „Neu sortieren” holst du die Tasks zurück.
              </div>
            )}
          </div>
        </section>

        <aside className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          {topGrant && (
            <Link
              to="/foerderung/$slug"
              params={{ slug: topGrant.slug }}
              className="glass-pane-soft block p-4 transition hover:-translate-y-0.5"
            >
              <div className="eyebrow">Nächste Förderung</div>
              <div className="mt-2 text-[15px] font-semibold tracking-tight">{topGrant.name}</div>
              <div className="mt-1 text-[12px] text-[var(--smoke)]">
                {topGrant.prefilled}% fertig · {topGrant.deadline}
              </div>
            </Link>
          )}
          {nextPartner && (
            <Link
              to={SERVICE_BY_ID[nextPartner.service as ServiceId]?.route ?? "/marketplace"}
              className="glass-pane-soft block p-4 transition hover:-translate-y-0.5"
            >
              <div className="eyebrow">Nächster Partner</div>
              <div className="mt-2 text-[15px] font-semibold tracking-tight">
                {nextPartner.name}
              </div>
              <div className="mt-1 text-[12px] text-[var(--smoke)]">{nextPartner.firm}</div>
            </Link>
          )}
          <Link
            to="/unterlagen"
            className="glass-pane-soft block p-4 transition hover:-translate-y-0.5"
          >
            <div className="eyebrow">Unterlagen</div>
            <div className="mt-2 text-[15px] font-semibold tracking-tight">Antragspaket</div>
            <div className="mt-1 text-[12px] text-[var(--smoke)]">Materialien und Entwürfe</div>
          </Link>
        </aside>
      </div>
    </div>
  );
}

function TodayStat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="glass-pane-soft min-w-0 p-3 sm:p-4">
      <div className="truncate font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--smoke)] sm:text-[10px]">
        {label}
      </div>
      <div className="mt-1 truncate text-xl font-semibold tracking-tight sm:text-2xl">{value}</div>
      <div className="mt-0.5 truncate text-[10.5px] text-[var(--smoke)] sm:text-[12px]">{note}</div>
    </div>
  );
}

function StepBadge({
  number,
  label,
  dark = false,
}: {
  number: string;
  label: string;
  dark?: boolean;
}) {
  return (
    <div
      className={[
        "inline-flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.14em]",
        dark ? "text-white/65" : "text-[var(--smoke)]",
      ].join(" ")}
    >
      <span
        className={[
          "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
          dark
            ? "bg-white/12 text-[var(--cream)]"
            : "bg-[var(--ember-tint)] text-[var(--ember-deep)]",
        ].join(" ")}
      >
        {number}
      </span>
      {label}
    </div>
  );
}

function WorkspaceCard({
  icon: Icon,
  label,
  title,
  desc,
  href,
}: {
  icon: LucideIcon;
  label: string;
  title: string;
  desc: string;
  href: string;
}) {
  return (
    <Link
      to={href}
      className="rounded-2xl border border-[var(--ruled)] bg-white/55 p-4 transition hover:-translate-y-0.5 hover:bg-white/75"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--ember-tint)] text-[var(--ember-deep)]">
          <Icon className="h-4 w-4" />
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--smoke)]">
          {label}
        </span>
      </div>
      <div className="mt-3 text-[15px] font-semibold tracking-tight">{title}</div>
      <div className="mt-1 text-[12px] text-[var(--smoke)]">{desc}</div>
    </Link>
  );
}

function DailyActionCard({
  task,
  done,
  onDone,
  onSnooze,
}: {
  task: DailyTask;
  done: boolean;
  onDone: () => void;
  onSnooze: () => void;
}) {
  const s = SERVICE_BY_ID[task.sId];
  return (
    <div
      className="grid gap-3 rounded-2xl border p-3 sm:grid-cols-[40px_1fr_auto] sm:items-center"
      style={{
        background: done
          ? "rgba(21,20,15,0.03)"
          : task.urgency === "hoch"
            ? "rgba(226,81,28,0.06)"
            : "rgba(251,250,247,0.55)",
        borderColor: done
          ? "rgba(21,20,15,0.06)"
          : task.urgency === "hoch"
            ? "rgba(226,81,28,0.18)"
            : "rgba(21,20,15,0.06)",
      }}
    >
      <ServiceBadge id={task.sId} />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={
              done
                ? "text-[14px] font-semibold tracking-tight text-[var(--smoke)] line-through"
                : "text-[14px] font-semibold tracking-tight"
            }
          >
            {task.title}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--smoke)]">
            · {s.short}
          </span>
        </div>
        <div className="mt-0.5 text-[12px] leading-relaxed text-[var(--smoke)]">{task.desc}</div>
        <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-[var(--ink-soft)]">
          <span className="inline-flex items-center gap-1">
            <Clock3 className="h-3 w-3" /> {task.minutes} Min
          </span>
          <span className="inline-flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> {task.label}
          </span>
        </div>
      </div>
      <div className="flex gap-2 sm:justify-end">
        <Button variant="ghost" size="sm" onClick={onDone} className="glass-pill rounded-full">
          {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
        </Button>
        <Button variant="ghost" size="sm" onClick={onSnooze} className="glass-pill rounded-full">
          Später
        </Button>
        <Link to={task.href}>
          <Button
            size="sm"
            className="rounded-full bg-[var(--ember)] text-white hover:bg-[var(--ember-deep)]"
          >
            Öffnen
          </Button>
        </Link>
      </div>
    </div>
  );
}

function ServiceBadge({ id }: { id: ServiceId }) {
  const s = SERVICE_BY_ID[id];
  return (
    <span
      className="flex h-10 w-10 items-center justify-center rounded-[10px] text-[var(--cream)]"
      style={{ background: s.hue, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.18)" }}
    >
      <ServiceIcon name={s.icon} size={18} stroke={2} />
    </span>
  );
}

function buildDailyTasks(
  context: PlanContext | null,
  firstStep: Extract<PlanSlide, { type: "first_step" }> | undefined,
  grant = GRANTS[0],
  partners = PARTNERS,
): DailyTask[] {
  const partner =
    context?.path === "talent" ? partnersFor("talent")[0] : partnersFor("mentor")[0] || partners[0];
  const growth = partnersFor("growth")[0] || partner;
  const tasks: DailyTask[] = [
    {
      id: "plan-first-step",
      sId: "cofounder",
      title: "Ersten Plan-Schritt festziehen",
      desc:
        firstStep?.action ||
        "Öffne deinen Plan und entscheide, welche Aktion heute wirklich zählt.",
      href: "/plan",
      label: "Plan",
      urgency: "hoch",
      minutes: 20,
    },
    {
      id: "funding-fit",
      sId: "funding",
      title: `${grant?.name || "Förderprogramm"} prüfen`,
      desc: grant
        ? `${grant.amount}, ${grant.duration}. Prüfe Materialien und nächsten Antragsschritt.`
        : "Prüfe die Top-Förderung für deine aktuelle Phase.",
      href: grant ? `/foerderung/${grant.slug}` : "/foerderung",
      label: "Funding",
      urgency: "hoch",
      minutes: 25,
    },
    {
      id: "mentor-match",
      sId: (partner?.service as ServiceId) || "mentor",
      title: `${partner?.name || "Mentor"} anstoßen`,
      desc: partner?.blurb || "Wähle einen Partner und lass den Co-Pilot den Fit prüfen.",
      href: partner ? `/${partner.service}` : "/marketplace",
      label: "Partner",
      urgency: "mittel",
      minutes: 15,
    },
    {
      id: "growth-signal",
      sId: "growth",
      title: "Ein Marktsignal erzeugen",
      desc:
        growth?.blurb ||
        "Starte eine kleine Outreach- oder Landingpage-Aktion, die echte Rückmeldung bringt.",
      href: "/growth",
      label: "GTM",
      urgency: "mittel",
      minutes: 30,
    },
  ];

  if (context?.path === "talent") {
    return tasks.map((task) =>
      task.id === "plan-first-step"
        ? {
            ...task,
            sId: "talent",
            title: "Match-Profil schärfen",
            desc: "Mach deine Skills, Rolle und Verfügbarkeit sichtbar, damit Founder dich sauber einschätzen können.",
            href: "/profile",
          }
        : task,
    );
  }
  return tasks;
}

function buildLocalDailyCopilotAnswer(
  prompt: string,
  nextFocus: DailyTask | undefined,
  grant = GRANTS[0],
  context: PlanContext | null,
): string {
  const idea = context?.context.idea || "dein Startup";
  const focus = nextFocus?.title || "deinen nächsten belastbaren Schritt";
  const grantLine = grant
    ? `${grant.name} ist aktuell der stärkste Förder-Hebel.`
    : "Prüfe zuerst den besten Förder-Hebel.";
  return [
    `Kurzantwort zu: "${prompt}"`,
    "",
    `1. Starte mit ${focus}. Das ist der kleinste Schritt, der heute Bewegung in ${idea} bringt.`,
    `2. ${grantLine} Sammle nur die fehlenden Unterlagen, statt den Antrag komplett neu zu denken.`,
    "3. Wenn du jemandem schreiben willst: ein Satz Kontext, ein konkreter Ask, ein Terminvorschlag. Ich kann dir daraus direkt eine Nachricht formulieren.",
  ].join("\n");
}

function readDailyState(): DailyState {
  if (typeof window === "undefined") return EMPTY_DAILY_STATE;
  try {
    const raw = localStorage.getItem(DAILY_STATE_KEY);
    return raw ? { ...EMPTY_DAILY_STATE, ...JSON.parse(raw) } : EMPTY_DAILY_STATE;
  } catch {
    return EMPTY_DAILY_STATE;
  }
}

function writeDailyState(state: DailyState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DAILY_STATE_KEY, JSON.stringify(state));
  } catch {
    // Ignore restricted storage.
  }
}

function getLocalDateKey(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function remoteStatusFor(id: string, state: DailyState): DailyTaskStatus {
  if (state.completed.includes(id)) return "done";
  if (state.snoozed.includes(id)) return "snoozed";
  return "open";
}

async function persistDailyTask(
  userId: string,
  taskDate: string,
  task: DailyTask,
  status: DailyTaskStatus,
): Promise<void> {
  const { error } = await supabase
    .from("daily_tasks")
    .upsert(toDailyTaskInsert(userId, taskDate, task, status), {
      onConflict: "user_id,task_date,task_key",
    });

  if (error) toast.error("Daily konnte nicht gespeichert werden");
}

function toDailyTaskInsert(
  userId: string,
  taskDate: string,
  task: DailyTask,
  status: DailyTaskStatus,
) {
  return {
    user_id: userId,
    task_date: taskDate,
    task_key: task.id,
    service: task.sId,
    title: task.title,
    description: task.desc,
    href: task.href,
    label: task.label,
    urgency: urgencyToRemote(task.urgency),
    minutes: task.minutes,
    status,
    metadata: {
      local_id: task.id,
      generated_by: "matchfoundr_daily",
    } satisfies Json,
  };
}

function urgencyToRemote(urgency: DailyTask["urgency"]): "high" | "medium" | "low" {
  if (urgency === "hoch") return "high";
  if (urgency === "niedrig") return "low";
  return "medium";
}

function isFirstStep(slide: PlanSlide): slide is Extract<PlanSlide, { type: "first_step" }> {
  return slide.type === "first_step";
}
