// Heute — der ruhige Startpunkt des Tages.
// Ein Fokus, eine kompakte Liste, ein kurzer Draht zum Co-Pilot. Mehr nicht.

import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Building2,
  Check,
  ListChecks,
  Loader2,
  RefreshCw,
  Send,
  Stamp,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { AuthGate } from "@/components/AuthGate";
import { SERVICE_BY_ID, type ServiceId } from "@/data/services";
import { GRANTS } from "@/data/grants";
import { partnersFor } from "@/data/partners";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { CopilotMark } from "@/components/Copilot";
import { MorningReport } from "@/components/MorningReport";
import { askCopilot, type CopilotNav } from "@/lib/copilot-client";
import {
  buildLocalPlanSlides,
  readPlanContext,
  type PlanContext,
  type PlanSlide,
} from "@/lib/plan-draft";

export const Route = createFileRoute("/heute")({
  head: () => ({ meta: [{ title: "Heute — matchfoundr" }] }),
  component: () => (
    <AuthGate>
      <TodayPage />
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

type DailyState = { completed: string[]; snoozed: string[]; refreshedAt?: string };
type DailyTaskStatus = "open" | "done" | "snoozed";

const DAILY_STATE_KEY = "mf_daily_state_v1";
const EMPTY_DAILY_STATE: DailyState = { completed: [], snoozed: [] };

function TodayPage() {
  const { user, session, isDemo } = useAuth();
  const [planContext, setPlanContext] = useState<PlanContext | null>(() => readPlanContext());
  const [dailyState, setDailyState] = useState<DailyState>(() => readDailyState());
  const [copilotInput, setCopilotInput] = useState("");
  const [copilotAnswer, setCopilotAnswer] = useState<string | null>(null);
  const [copilotNav, setCopilotNav] = useState<CopilotNav[]>([]);
  const [copilotSending, setCopilotSending] = useState(false);

  useEffect(() => {
    writeDailyState(dailyState);
  }, [dailyState]);

  const today = useMemo(
    () =>
      new Date().toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" }),
    [],
  );
  const firstName = (planContext?.userName || "Founder").split(" ")[0];
  const planSlides = useMemo(() => buildLocalPlanSlides(planContext), [planContext]);
  const firstStep = useMemo(() => planSlides.find(isFirstStep), [planSlides]);
  const topGrant = GRANTS[0];
  const dailyTasks = useMemo(
    () => buildDailyTasks(planContext, firstStep, topGrant),
    [planContext, firstStep, topGrant],
  );
  const taskDate = useMemo(() => getLocalDateKey(), []);
  const visibleTasks = dailyTasks.filter((t) => !dailyState.snoozed.includes(t.id));
  const openTasks = visibleTasks.filter((t) => !dailyState.completed.includes(t.id));
  const nextFocus = openTasks[0];
  const doneCount = dailyTasks.filter((t) => dailyState.completed.includes(t.id)).length;

  // Cloud-Sync der Tages-Tasks (eingeloggt).
  useEffect(() => {
    if (!session || !user || isDemo || dailyTasks.length === 0) return;
    const uid = user.id;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("daily_tasks")
        .select("task_key,status")
        .eq("user_id", uid)
        .eq("task_date", taskDate);
      if (cancelled || error) return;
      const rows = data ?? [];
      const known = new Set(rows.map((r) => r.task_key));
      const missing = dailyTasks.filter((t) => !known.has(t.id));
      if (missing.length > 0) {
        await supabase.from("daily_tasks").upsert(
          missing.map((t) =>
            toDailyTaskInsert(uid, taskDate, t, remoteStatusFor(t.id, dailyState)),
          ),
          { onConflict: "user_id,task_date,task_key" },
        );
      }
      setDailyState((cur) => ({
        ...cur,
        completed: Array.from(
          new Set([
            ...rows.filter((r) => r.status === "done").map((r) => r.task_key),
            ...cur.completed.filter((id) => !known.has(id)),
          ]),
        ),
        snoozed: Array.from(
          new Set([
            ...rows.filter((r) => r.status === "snoozed").map((r) => r.task_key),
            ...cur.snoozed.filter((id) => !known.has(id)),
          ]),
        ),
      }));
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, user?.id, isDemo, taskDate, dailyTasks.map((t) => t.id).join("|")]);

  const toggleDone = useCallback(
    (id: string) => {
      const task = dailyTasks.find((t) => t.id === id);
      const willComplete = !dailyState.completed.includes(id);
      setDailyState((cur) => ({
        ...cur,
        completed: cur.completed.includes(id)
          ? cur.completed.filter((x) => x !== id)
          : [...cur.completed, id],
      }));
      if (session && user && !isDemo && task) {
        persistDailyTask(user.id, taskDate, task, willComplete ? "done" : "open");
      }
    },
    [dailyState.completed, dailyTasks, isDemo, session, taskDate, user],
  );

  const refresh = useCallback(() => {
    setPlanContext(readPlanContext());
    setDailyState({ completed: [], snoozed: [], refreshedAt: new Date().toISOString() });
    setCopilotAnswer(null);
    setCopilotNav([]);
    toast.success("Neu sortiert");
  }, []);

  const sendToCopilot = useCallback(
    async (text?: string) => {
      const body = (text ?? copilotInput).trim();
      if (!body || copilotSending) return;
      setCopilotInput("");
      setCopilotSending(true);
      const result = await askCopilot({
        message: body,
        surface: "/heute",
        history: [],
        planContext,
        auth: { session, user, isDemo },
      });
      setCopilotAnswer(result.answer);
      setCopilotNav(result.navigation);
      setCopilotSending(false);
    },
    [copilotInput, copilotSending, isDemo, planContext, session, user],
  );

  return (
    <div className="mx-auto max-w-4xl px-4 pt-6 pb-24 sm:px-6">
      {/* Kopfzeile — klein und ruhig */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-[var(--ink)]">
            Guten Morgen, {firstName}.
          </h1>
          <div className="mt-0.5 text-[12.5px] text-[var(--smoke)]">
            {today} · {doneCount}/{dailyTasks.length} erledigt
          </div>
        </div>
        <button
          onClick={refresh}
          aria-label="Neu sortieren"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--ruled)] bg-[var(--surface)] text-[var(--smoke)] hover:text-[var(--ink)]"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Morgenreport des Co-Piloten (8:00, wenn vorhanden) */}
      <div className="mt-4">
        <MorningReport />
      </div>

      {/* DER eine Fokus */}
      <section
        className="mt-5 rounded-[20px] p-5 text-white shadow-[var(--ember-glow)] sm:p-6"
        style={{ background: "var(--ember-grad)" }}
      >
        <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/75">
          Dein nächster Schritt
        </div>
        <h2 className="mt-2 text-[21px] font-semibold leading-snug tracking-tight">
          {nextFocus?.title || "Alles erledigt für heute."}
        </h2>
        {nextFocus?.desc && (
          <p className="mt-1.5 max-w-xl text-[13.5px] leading-relaxed text-white/85">
            {nextFocus.desc}
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          {nextFocus ? (
            <>
              <Link
                to={nextFocus.href}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-[13px] font-semibold text-[var(--ember-deep)] hover:bg-[var(--cream)]"
              >
                Loslegen <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <button
                onClick={() => toggleDone(nextFocus.id)}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 text-[13px] font-semibold text-white hover:bg-white/20"
              >
                <Check className="h-3.5 w-3.5" /> Erledigt
              </button>
            </>
          ) : (
            <Link
              to="/plan"
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-[13px] font-semibold text-[var(--ember-deep)] hover:bg-[var(--cream)]"
            >
              Plan ansehen <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </section>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {/* Kompakte Tagesliste */}
        <section className="rounded-[18px] border border-[var(--ruled)] bg-[var(--surface)] p-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--smoke)]">
            Heute
          </div>
          <ul className="mt-3 space-y-1">
            {visibleTasks.map((task) => {
              const done = dailyState.completed.includes(task.id);
              return (
                <li
                  key={task.id}
                  className="group flex items-center gap-2.5 rounded-xl px-2 py-2 hover:bg-[var(--surface-soft)]"
                >
                  <button
                    onClick={() => toggleDone(task.id)}
                    aria-label={done ? "Als offen markieren" : "Als erledigt markieren"}
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition"
                    style={{
                      background: done ? "var(--ember)" : "transparent",
                      borderColor: done ? "var(--ember)" : "var(--ruled)",
                    }}
                  >
                    {done && <Check className="h-3 w-3 text-white" />}
                  </button>
                  <span
                    className={`min-w-0 flex-1 truncate text-[13.5px] ${
                      done ? "text-[var(--faint)] line-through" : "text-[var(--ink)]"
                    }`}
                  >
                    {task.title}
                  </span>
                  <span className="hidden shrink-0 font-mono text-[10px] uppercase tracking-wide text-[var(--faint)] sm:inline">
                    {SERVICE_BY_ID[task.sId].short}
                  </span>
                  <Link
                    to={task.href}
                    aria-label={`${task.title} öffnen`}
                    className="shrink-0 text-[var(--faint)] opacity-0 transition group-hover:opacity-100 hover:text-[var(--ink)]"
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </li>
              );
            })}
            {visibleTasks.length === 0 && (
              <li className="rounded-xl bg-[var(--surface-soft)] px-3 py-3 text-[13px] text-[var(--smoke)]">
                Nichts offen. Über ↻ holst du neue Vorschläge.
              </li>
            )}
          </ul>
        </section>

        {/* Mini Co-Pilot */}
        <section className="flex flex-col rounded-[18px] border border-[var(--ruled)] bg-[var(--surface)] p-4">
          <div className="flex items-center gap-2">
            <span
              className="flex h-7 w-7 items-center justify-center rounded-lg text-white"
              style={{ background: "var(--indigo-grad)" }}
            >
              <CopilotMark size={13} color="white" />
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--smoke)]">
              Frag den Co-Pilot
            </span>
          </div>

          <div className="mt-3 min-h-[72px] flex-1 rounded-xl bg-[var(--surface-soft)] p-3">
            {copilotSending ? (
              <div className="flex h-full min-h-[48px] items-center gap-2 text-[12.5px] text-[var(--smoke)]">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> denkt nach…
              </div>
            ) : copilotAnswer ? (
              <div>
                <p className="whitespace-pre-line text-[13px] leading-relaxed text-[var(--ink)]">
                  {copilotAnswer}
                </p>
                {copilotNav.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {copilotNav.map((nav) => (
                      <Link
                        key={nav.to + nav.label}
                        to={nav.to}
                        className="inline-flex items-center gap-1 rounded-full bg-[var(--indigo-tint)] px-2.5 py-1 text-[11.5px] font-semibold text-[var(--indigo-ink)]"
                      >
                        {nav.label} <ArrowRight className="h-3 w-3" />
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-[12.5px] leading-relaxed text-[var(--faint)]">
                „Wo fange ich an?" · „Was kostet die Gründung?" · „Wer kann mir helfen?"
              </p>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendToCopilot();
            }}
            className="mt-3 flex gap-2"
          >
            <input
              value={copilotInput}
              onChange={(e) => setCopilotInput(e.target.value)}
              placeholder="Frag mich was…"
              className="h-10 min-w-0 flex-1 rounded-xl border border-[var(--ruled)] bg-[var(--surface)] px-3 text-[13px] text-[var(--ink)] outline-none placeholder:text-[var(--faint)] focus:border-[var(--indigo)]"
            />
            <button
              type="submit"
              disabled={copilotSending || !copilotInput.trim()}
              aria-label="Senden"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white disabled:opacity-50"
              style={{ background: "var(--indigo-grad)" }}
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </section>
      </div>

      {/* Shortcuts — eine ruhige Zeile */}
      <section className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Shortcut to="/foerderung" icon={Stamp} label="Förderung" />
        <Shortcut to="/firma" icon={Building2} label="Firmenprofil" />
        <Shortcut to="/aufgaben" icon={ListChecks} label="Aufgaben" />
        <Shortcut to="/discover" icon={Users} label="Mitgründer" />
      </section>
    </div>
  );
}

function Shortcut({ to, icon: Icon, label }: { to: string; icon: LucideIcon; label: string }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2.5 rounded-2xl border border-[var(--ruled)] bg-[var(--surface)] px-3.5 py-3 text-[13px] font-semibold text-[var(--ink)] transition hover:-translate-y-0.5 hover:bg-[var(--ember-tint)] hover:text-[var(--ember-deep)]"
    >
      <Icon className="h-4 w-4 shrink-0 text-[var(--ember)]" />
      {label}
    </Link>
  );
}

// ─── Tages-Tasks: praktisch und klein gedacht ─────────────────

function buildDailyTasks(
  context: PlanContext | null,
  firstStep: Extract<PlanSlide, { type: "first_step" }> | undefined,
  grant = GRANTS[0],
): DailyTask[] {
  const mentor = partnersFor("mentor")[0];
  const idea = context?.context.idea;
  return [
    {
      id: "plan-first-step",
      sId: "cofounder",
      title: "Deinen ersten Schritt machen",
      desc:
        firstStep?.action ||
        "Öffne deinen Plan und entscheide, welcher kleine Schritt heute wirklich zählt.",
      href: "/plan",
      label: "Plan",
      urgency: "hoch",
      minutes: 20,
    },
    {
      id: "funding-fit",
      sId: "funding",
      title: "Förderung für deinen Start prüfen",
      desc: grant
        ? `Schau, ob ${grant.name} oder ein kleines regionales Programm zu ${idea || "deinem Vorhaben"} passt.`
        : "Prüfe, welche Unterstützung es für deinen Start gibt — oft reichen die kleinen Programme.",
      href: "/foerderung",
      label: "Förderung",
      urgency: "mittel",
      minutes: 15,
    },
    {
      id: "community-signal",
      sId: "cofounder",
      title: "Eine Person kennenlernen, die mitbauen könnte",
      desc: "Wische durch die Profile und schick eine ehrliche erste Nachricht.",
      href: "/discover",
      label: "Community",
      urgency: "mittel",
      minutes: 10,
    },
    {
      id: "mentor-match",
      sId: "mentor",
      title: mentor ? `${mentor.name} um Rat fragen` : "Jemanden fragen, der es schon gemacht hat",
      desc: "Eine konkrete Frage an jemanden, der deinen Weg schon gegangen ist.",
      href: "/mentoren",
      label: "Mentor",
      urgency: "niedrig",
      minutes: 15,
    },
  ];
}

// ─── Persistenz-Helfer ────────────────────────────────────────

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
    /* */
  }
}

function getLocalDateKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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
  if (error) toast.error("Konnte nicht speichern");
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
    metadata: { local_id: task.id, generated_by: "matchfoundr_daily" } satisfies Json,
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
