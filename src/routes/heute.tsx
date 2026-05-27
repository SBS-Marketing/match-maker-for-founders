import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Calendar,
  Check,
  CheckCircle2,
  Clock3,
  FileText,
  MessageSquare,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { AuthGate } from "@/components/AuthGate";
import { SERVICE_BY_ID, type ServiceId } from "@/data/services";
import { GRANTS } from "@/data/grants";
import { PARTNERS, partnersFor } from "@/data/partners";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { ServiceIcon } from "@/components/ServiceIcon";
import { CopilotMark, AITag, FitScore } from "@/components/Copilot";
import { Button } from "@/components/ui/button";
import { TutorialOverlay, shouldShowTutorial } from "@/components/onboarding/TutorialOverlay";
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

type DailyMessage = {
  id: string;
  sId: ServiceId;
  name: string;
  status: string;
  note: string;
  t: string;
  hot?: boolean;
  href: string;
};

type DailyState = {
  completed: string[];
  snoozed: string[];
  refreshedAt?: string;
};

type DailyTaskStatus = "open" | "done" | "snoozed";

const DAILY_STATE_KEY = "mf_daily_state_v1";

const EMPTY_DAILY_STATE: DailyState = {
  completed: [],
  snoozed: [],
};

function CommandCenter() {
  const { user, session, isDemo } = useAuth();
  const [showTutorial, setShowTutorial] = useState(false);
  const [showWeek, setShowWeek] = useState(false);
  const [planContext, setPlanContext] = useState<PlanContext | null>(() => readPlanContext());
  const [dailyState, setDailyState] = useState<DailyState>(() => readDailyState());
  const [remoteReady, setRemoteReady] = useState(false);

  useEffect(() => {
    if (shouldShowTutorial()) {
      const t = window.setTimeout(() => setShowTutorial(true), 250);
      return () => window.clearTimeout(t);
    }
  }, []);

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
  const tracks = useMemo(() => planSlides.filter(isTrack), [planSlides]);
  const topGrant = GRANTS[0];
  const topPartners = useMemo(
    () => [
      ...partnersFor("mentor").slice(0, 1),
      ...partnersFor("growth").slice(0, 1),
      ...partnersFor("tax").slice(0, 1),
      ...partnersFor("capital").slice(0, 1),
      ...partnersFor("talent").slice(0, 1),
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
  const openVisibleCount = visibleTasks.filter(
    (task) => !dailyState.completed.includes(task.id),
  ).length;
  const progress = dailyTasks.length ? Math.round((completedCount / dailyTasks.length) * 100) : 0;
  const messages = useMemo(() => buildMessages(topGrant, topPartners), [topGrant, topPartners]);
  const nextFocus = visibleTasks.find((task) => !dailyState.completed.includes(task.id));
  const weeklyPlan = useMemo(() => buildWeeklyPlan(tracks, dailyTasks), [tracks, dailyTasks]);

  useEffect(() => {
    if (!session || !user || isDemo || dailyTasks.length === 0) {
      setRemoteReady(false);
      return;
    }
    let cancelled = false;
    async function syncDailyTasks() {
      const { data, error } = await supabase
        .from("daily_tasks")
        .select("task_key,status")
        .eq("user_id", user.id)
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
            toDailyTaskInsert(user.id, taskDate, task, remoteStatusFor(task.id, dailyState)),
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
    if (session && user && !isDemo) {
      Promise.all(
        dailyTasks.map((task) => persistDailyTask(user.id, taskDate, task, "open")),
      ).catch(() => undefined);
    }
    toast.success("Heute neu priorisiert");
  }, [dailyTasks, isDemo, session, taskDate, user]);

  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 pb-24 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="eyebrow">{today} · Daily Overview</div>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
            Guten Morgen, {firstName}
            <span className="text-[var(--ember)]">.</span>{" "}
            <span className="font-serif italic font-normal text-[var(--smoke)]">
              Das zählt heute.
            </span>
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="ghost"
            onClick={() => setShowWeek((value) => !value)}
            className="glass-pill h-10 gap-2 rounded-full px-4 text-[13px]"
          >
            <Calendar className="h-3.5 w-3.5" /> Diese Woche
          </Button>
          <Button
            variant="ghost"
            onClick={refreshDaily}
            className="glass-pill h-10 gap-2 rounded-full px-4 text-[13px]"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Neu sortieren
          </Button>
          <Link to="/plan">
            <Button className="h-10 gap-2 rounded-full bg-[var(--ink)] px-4 text-[13px] text-[var(--cream)] hover:bg-[var(--ink-soft)]">
              <CopilotMark size={14} color="var(--cream)" /> Plan öffnen
            </Button>
          </Link>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <MetricCard
          label="Heute offen"
          value={String(openVisibleCount)}
          sub={`${completedCount}/${dailyTasks.length} erledigt`}
        />
        <MetricCard
          label="Pipeline"
          value={`${GRANTS.length + PARTNERS.length}`}
          sub="Deals, Förderung, Partner"
        />
        <MetricCard
          label="Plan-Fortschritt"
          value={`${progress}%`}
          sub={
            remoteReady
              ? "serverseitig gespeichert"
              : planContext
                ? "aus Onboarding berechnet"
                : "Fallback aktiv"
          }
        />
      </div>

      <div
        data-tour="focus"
        className="glass-pane-ink mt-6 grid gap-4 p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-6"
      >
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <AITag tone="dark">Co-Pilot</AITag>
            <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-white/55">
              {nextFocus ? `Empfohlener Fokus · ${nextFocus.minutes} Min` : "Heute erledigt"}
            </span>
          </div>
          <p className="max-w-2xl font-serif text-[20px] italic leading-snug text-[var(--cream)]">
            {nextFocus?.desc ??
              "Alle Daily-Actions sind erledigt. Öffne deinen Plan, wenn du die nächste Priorität nachziehen willst."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {nextFocus && (
            <Button
              onClick={() => toggleComplete(nextFocus.id)}
              className="h-10 gap-2 rounded-lg bg-[var(--cream)] px-4 text-[13px] font-semibold text-[var(--ink)] hover:bg-white"
            >
              <Check className="h-3.5 w-3.5" /> Erledigt
            </Button>
          )}
          {nextFocus && (
            <Link to={nextFocus.href}>
              <Button
                variant="ghost"
                className="h-10 rounded-lg border border-white/15 bg-white/5 px-4 text-[13px] text-[var(--cream)] hover:bg-white/10"
              >
                Öffnen
              </Button>
            </Link>
          )}
        </div>
      </div>

      {showWeek && (
        <section className="glass-pane mt-5 p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <div className="eyebrow">Wochenplan</div>
              <p className="mt-1 text-[13px] text-[var(--smoke)]">
                Aus deinem Planentwurf abgeleitet, damit die Daily Page nicht im luftleeren Raum
                hängt.
              </p>
            </div>
            <FitScore value={Math.max(62, 92 - dailyState.snoozed.length * 6)} label="klar" />
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {weeklyPlan.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-[var(--ruled)] bg-white/45 p-4"
              >
                <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ember-deep)]">
                  {item.when}
                </div>
                <div className="mt-2 text-[14px] font-semibold tracking-tight">{item.title}</div>
                <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--smoke)]">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.25fr_0.85fr_0.85fr]">
        <section data-tour="conversations" className="glass-pane flex flex-col gap-3 p-5">
          <div className="flex items-center justify-between">
            <span className="eyebrow">Heute-Actions · {openVisibleCount} offen</span>
            <span className="font-mono text-[11px] text-[var(--smoke)]">{progress}%</span>
          </div>
          {visibleTasks.map((task) => (
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
        </section>

        <section data-tour="agenda" className="glass-pane p-5">
          <div className="eyebrow">Agenda heute</div>
          <ul className="mt-4 space-y-3">
            {buildAgenda(visibleTasks).map((item) => (
              <li key={item.t} className="flex items-start gap-3">
                <span className="w-10 font-mono text-[11px] font-semibold text-[var(--ember-deep)]">
                  {item.t}
                </span>
                <div>
                  <div className="text-[13.5px] font-semibold">{item.what}</div>
                  <div className="text-[11px] text-[var(--smoke)]">{item.who}</div>
                </div>
              </li>
            ))}
          </ul>
          <Link
            to="/co-pilot"
            className="mt-5 inline-flex items-center gap-1.5 text-[13px] font-semibold"
          >
            Co-Pilot fragen <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </section>

        {topGrant && (
          <Link
            data-tour="funding"
            to="/foerderung/$slug"
            params={{ slug: topGrant.slug }}
            className="glass-pane block p-5 transition hover:-translate-y-0.5"
          >
            <div className="eyebrow">Funding-Pipeline</div>
            <div className="mt-4 text-[18px] font-semibold tracking-tight">{topGrant.name}</div>
            <div className="text-[12px] text-[var(--smoke)]">
              {topGrant.amount} · {topGrant.duration} · {topGrant.deadline}
            </div>
            <div className="mt-4">
              <div className="flex items-baseline justify-between">
                <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--ember-deep)]">
                  {topGrant.prefilled}% vorausgefüllt
                </span>
                <span className="font-mono text-[11px] text-[var(--smoke)]">
                  Fit {topGrant.fit}
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[rgba(21,20,15,0.08)]">
                <div
                  className="h-full rounded-full bg-[var(--ember)]"
                  style={{ width: `${topGrant.prefilled}%` }}
                />
              </div>
            </div>
            <div className="mt-5 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--ink)]">
              Antrag weiterführen <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </Link>
        )}
      </div>

      <section className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="glass-pane p-5">
          <div className="eyebrow">Aktive Signale</div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {messages.map((message) => (
              <Link
                key={message.id}
                to={message.href}
                className="grid grid-cols-[40px_1fr_auto] items-center gap-3 rounded-2xl border p-3 transition hover:-translate-y-0.5"
                style={{
                  background: message.hot ? "rgba(226,81,28,0.06)" : "rgba(251,250,247,0.55)",
                  borderColor: message.hot ? "rgba(226,81,28,0.18)" : "rgba(21,20,15,0.06)",
                }}
              >
                <ServiceBadge id={message.sId} />
                <div className="min-w-0">
                  <div className="truncate text-[14px] font-semibold tracking-tight">
                    {message.name}
                  </div>
                  <div className="mt-0.5 truncate text-[12px] text-[var(--smoke)]">
                    {message.status} · {message.note}
                  </div>
                </div>
                <span className="font-mono text-[11px] text-[var(--smoke)]">{message.t}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="glass-pane p-5">
          <div className="eyebrow">Kontext</div>
          <div className="mt-4 space-y-3 text-[13px]">
            <ContextRow
              label="Vorhaben"
              value={planContext?.context.idea || "Noch kein Onboarding-Kontext"}
            />
            <ContextRow label="Phase" value={planContext?.context.stage || "frühe Phase"} />
            <ContextRow
              label="Ziel"
              value={planContext?.context.goal || "nächsten belastbaren Schritt finden"}
            />
            <ContextRow label="Risiko" value={planContext?.context.risk || "Priorität schärfen"} />
          </div>
          <Link
            to="/onboarding"
            className="mt-5 inline-flex items-center gap-1.5 text-[13px] font-semibold"
          >
            Kontext aktualisieren <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>

      {showTutorial && <TutorialOverlay onClose={() => setShowTutorial(false)} />}
    </div>
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
            className="rounded-full bg-[var(--ink)] text-[var(--cream)] hover:bg-[var(--ink-soft)]"
          >
            Öffnen
          </Button>
        </Link>
      </div>
    </div>
  );
}

function MetricCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="glass-pane-soft p-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--smoke)]">
        {label}
      </div>
      <div className="mt-2 text-3xl font-semibold tracking-tight text-[var(--ink)]">{value}</div>
      <div className="mt-1 text-[12px] text-[var(--smoke)]">{sub}</div>
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

function ContextRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--ruled)] bg-white/40 p-3">
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--smoke)]">
        {label}
      </div>
      <div className="mt-1 text-[13px] leading-relaxed text-[var(--ink)]">{value}</div>
    </div>
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

function buildMessages(grant = GRANTS[0], partners = PARTNERS): DailyMessage[] {
  const mentor = partnersFor("mentor")[0];
  const tax = partnersFor("tax")[0];
  const capital = partnersFor("capital")[0];
  const growth = partnersFor("growth")[0];
  return [
    {
      id: "grant",
      sId: "funding",
      name: grant?.name || "Förderung",
      status: grant?.deadline || "Fit prüfen",
      note: `${grant?.prefilled || 60}% vorausgefüllt`,
      t: "jetzt",
      hot: true,
      href: grant ? `/foerderung/${grant.slug}` : "/foerderung",
    },
    {
      id: "mentor",
      sId: "mentor",
      name: mentor?.name || "Mentor Match",
      status: "Office Hour",
      note: mentor?.firm || "Co-Pilot Match",
      t: "heute",
      hot: true,
      href: "/mentoren",
    },
    {
      id: "tax",
      sId: "tax",
      name: tax?.name || "Tax Check",
      status: "Unterlagen",
      note: tax?.packages[0]?.name || "Erstcheck",
      t: "morgen",
      href: "/steuer",
    },
    {
      id: "capital",
      sId: "capital",
      name: capital?.name || "Capital Desk",
      status: "Finanzierung",
      note: capital?.packages[0]?.name || "Readiness",
      t: "2d",
      href: "/kapital",
    },
    {
      id: "growth",
      sId: "growth",
      name: growth?.name || "Growth Sprint",
      status: "Marktsignal",
      note: growth?.packages[0]?.name || "Sprint",
      t: "3d",
      href: "/growth",
    },
  ];
}

function buildAgenda(tasks: DailyTask[]) {
  const slots = ["09:30", "11:00", "14:00", "16:30"];
  return tasks.slice(0, 4).map((task, idx) => ({
    t: slots[idx] || "17:00",
    what: task.title,
    who: SERVICE_BY_ID[task.sId].short,
  }));
}

function buildWeeklyPlan(tracks: Extract<PlanSlide, { type: "track" }>[], tasks: DailyTask[]) {
  if (tracks.length) {
    return tracks.slice(0, 3).map((track, idx) => ({
      when: idx === 0 ? "Heute" : idx === 1 ? "Morgen" : "Diese Woche",
      title: track.title,
      desc: track.steps?.[0] || track.why || "Nächsten Schritt definieren.",
    }));
  }
  return tasks.slice(0, 3).map((task, idx) => ({
    when: idx === 0 ? "Heute" : idx === 1 ? "Morgen" : "Diese Woche",
    title: task.title,
    desc: task.desc,
  }));
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

function isTrack(slide: PlanSlide): slide is Extract<PlanSlide, { type: "track" }> {
  return slide.type === "track";
}
