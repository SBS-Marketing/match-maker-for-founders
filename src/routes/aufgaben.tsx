import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, ListChecks, MoveRight, Sparkles } from "lucide-react";
import { AuthGate } from "@/components/AuthGate";
import { Button } from "@/components/ui/button";
import { GRANTS } from "@/data/grants";
import { partnersFor } from "@/data/partners";

export const Route = createFileRoute("/aufgaben")({
  head: () => ({ meta: [{ title: "Aufgaben — matchfoundr" }] }),
  component: () => (
    <AuthGate>
      <TasksPage />
    </AuthGate>
  ),
});

type LaneId = "now" | "next" | "later";
type Task = {
  id: string;
  title: string;
  note: string;
  lane: LaneId;
  done: boolean;
  href: string;
};

const STORAGE_KEY = "mf_work_tasks_v1";
const LANES: { id: LaneId; title: string; note: string }[] = [
  { id: "now", title: "Jetzt", note: "Heute oder morgen" },
  { id: "next", title: "Nächste Woche", note: "Planbar, aber nicht akut" },
  { id: "later", title: "Später", note: "Im Blick behalten" },
];

function TasksPage() {
  const defaults = useMemo(() => buildDefaultTasks(), []);
  const [tasks, setTasks] = useState<Task[]>(() => readTasks(defaults));
  const [customTitle, setCustomTitle] = useState("");
  const openNow = tasks.filter((task) => task.lane === "now" && !task.done).length;

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }, [tasks]);

  function patchTask(id: string, patch: Partial<Task>) {
    setTasks((current) => current.map((task) => (task.id === id ? { ...task, ...patch } : task)));
  }

  function addTask() {
    const title = customTitle.trim();
    if (!title) return;
    setTasks((current) => [
      {
        id: `custom-${Date.now()}`,
        title,
        note: "Manuell angelegt",
        lane: "now",
        done: false,
        href: "/heute",
      },
      ...current,
    ]);
    setCustomTitle("");
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pt-5 pb-24 sm:px-6 sm:pt-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="eyebrow">Operative Liste</div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Aufgaben, ohne den Heute-Tab zu überladen.
          </h1>
          <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-[var(--smoke)]">
            Alles Operative ist vorsortiert: jetzt erledigen, als nächstes planen oder sauber parken.
          </p>
        </div>
        <Link to="/heute">
          <Button variant="ghost" className="glass-pill rounded-full px-4 text-[13px]">
            Heute
          </Button>
        </Link>
      </div>

      <section className="glass-pane-ink mt-5 grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-center">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10">
            <ListChecks className="h-5 w-5" />
          </span>
          <div>
            <div className="text-[15px] font-semibold text-[var(--cream)]">
              {openNow} offene Jetzt-Aufgaben
            </div>
            <div className="text-[12px] text-white/55">Snooze, verschieben oder direkt öffnen.</div>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-[260px_auto]">
          <input
            value={customTitle}
            onChange={(e) => setCustomTitle(e.target.value)}
            placeholder="Neue Aufgabe..."
            className="rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-[13px] text-[var(--cream)] outline-none placeholder:text-white/35 focus:border-white/35"
          />
          <Button
            onClick={addTask}
            disabled={!customTitle.trim()}
            className="rounded-2xl bg-[var(--cream)] px-4 text-[var(--ink)] hover:bg-white"
          >
            Hinzufügen
          </Button>
        </div>
      </section>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        {LANES.map((lane) => (
          <section key={lane.id} className="glass-pane p-4">
            <div className="mb-3">
              <div className="text-[15px] font-semibold tracking-tight">{lane.title}</div>
              <div className="text-[12px] text-[var(--smoke)]">{lane.note}</div>
            </div>
            <div className="space-y-3">
              {tasks
                .filter((task) => task.lane === lane.id)
                .map((task) => (
                  <div
                    key={task.id}
                    className="rounded-2xl border border-[var(--ruled)] bg-white/50 p-3"
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => patchTask(task.id, { done: !task.done })}
                        className={[
                          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
                          task.done
                            ? "bg-[var(--ember)] text-white"
                            : "bg-[rgba(21,20,15,0.06)] text-[var(--smoke)]",
                        ].join(" ")}
                        aria-label="Aufgabe abhaken"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <div className="min-w-0 flex-1">
                        <div
                          className={
                            task.done
                              ? "text-[14px] font-semibold text-[var(--smoke)] line-through"
                              : "text-[14px] font-semibold"
                          }
                        >
                          {task.title}
                        </div>
                        <div className="mt-1 text-[12px] leading-relaxed text-[var(--smoke)]">
                          {task.note}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 pl-11">
                      <Link to={task.href}>
                        <Button
                          size="sm"
                          className="h-8 rounded-full bg-[var(--ember)] text-white hover:bg-[var(--ember-deep)]"
                        >
                          Öffnen
                        </Button>
                      </Link>
                      {lane.id !== "later" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            patchTask(task.id, { lane: lane.id === "now" ? "next" : "later" })
                          }
                          className="glass-pill h-8 gap-1.5 rounded-full"
                        >
                          <MoveRight className="h-3.5 w-3.5" /> Später
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </section>
        ))}
      </div>

      <Link
        to="/co-pilot"
        className="glass-pane mt-5 flex items-center justify-between gap-3 p-4 transition hover:-translate-y-0.5"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl text-white" style={{ background: "var(--indigo-grad)" }}>
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <div className="text-[14px] font-semibold">
              Co-Pilot kann daraus einen Sprintplan machen
            </div>
            <div className="text-[12px] text-[var(--smoke)]">
              Offene Aufgaben in klare Reihenfolge bringen.
            </div>
          </div>
        </div>
        <MoveRight className="h-4 w-4 shrink-0" />
      </Link>
    </div>
  );
}

function buildDefaultTasks(): Task[] {
  const grant = GRANTS[0];
  const mentor = partnersFor("mentor")[0];
  const growth = partnersFor("growth")[0];
  return [
    {
      id: "grant-materials",
      title: `${grant?.name || "Förderprogramm"} Materialien schließen`,
      note: "Fehlende Unterlagen und Pflichtfelder sauber vorbereiten.",
      lane: "now",
      done: false,
      href: grant ? `/foerderung/${grant.slug}` : "/foerderung",
    },
    {
      id: "mentor-message",
      title: `${mentor?.name || "Mentor"} anschreiben`,
      note: "Kurzer Ask, Kontext und zwei Terminvorschläge.",
      lane: "now",
      done: false,
      href: "/mentoren",
    },
    {
      id: "growth-signal",
      title: "Ein neues Marktsignal erzeugen",
      note: growth?.packages[0]?.desc || "Landingpage, Outreach oder Interview-Sprint starten.",
      lane: "next",
      done: false,
      href: "/growth",
    },
    {
      id: "legal-cleanup",
      title: "Rechts-Setup prüfen",
      note: "IP, Vesting und Gründungsdokumente vor dem nächsten Funding-Schritt.",
      lane: "later",
      done: false,
      href: "/recht",
    },
  ];
}

function readTasks(defaults: Task[]): Task[] {
  if (typeof window === "undefined") return defaults;
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null") as Task[] | null;
    if (!stored?.length) return defaults;
    const storedIds = new Set(stored.map((task) => task.id));
    return [...stored, ...defaults.filter((task) => !storedIds.has(task.id))];
  } catch {
    return defaults;
  }
}
