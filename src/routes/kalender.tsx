import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, Plus, Trash2 } from "lucide-react";
import { AuthGate } from "@/components/AuthGate";
import { Button } from "@/components/ui/button";
import { GRANTS } from "@/data/grants";
import { partnersFor } from "@/data/partners";

export const Route = createFileRoute("/kalender")({
  head: () => ({ meta: [{ title: "Kalender — matchfoundr" }] }),
  component: () => (
    <AuthGate>
      <CalendarPage />
    </AuthGate>
  ),
});

type CalendarEvent = {
  id: string;
  title: string;
  date: string;
  time: string;
  type: "deadline" | "call" | "task";
  done: boolean;
};

type MonthDay = {
  key: string;
  date: Date;
  inMonth: boolean;
  isToday: boolean;
};

const STORAGE_KEY = "mf_calendar_events_v1";
const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

function CalendarPage() {
  const todayKey = getLocalDateKey(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>(() => readEvents());
  const [selectedDay, setSelectedDay] = useState(todayKey);
  const [monthCursor, setMonthCursor] = useState(() => startOfMonth(new Date()));
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("10:00");
  const [type, setType] = useState<CalendarEvent["type"]>("call");

  const seededEvents = useMemo(() => mergeDefaults(events), [events]);
  const eventsByDate = useMemo(() => groupEventsByDate(seededEvents), [seededEvents]);
  const monthDays = useMemo(() => buildMonthDays(monthCursor), [monthCursor]);
  const selectedEvents = (eventsByDate.get(selectedDay) ?? [])
    .slice()
    .sort((a, b) => a.time.localeCompare(b.time));
  const upcoming = seededEvents
    .filter((event) => !event.done && event.date >= todayKey)
    .slice()
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  const next = upcoming[0];

  useEffect(() => {
    writeEvents(events);
  }, [events]);

  function addEvent() {
    const cleanTitle = title.trim();
    if (!cleanTitle) return;
    setEvents((current) => [
      {
        id: `custom-${Date.now()}`,
        title: cleanTitle,
        date: selectedDay,
        time,
        type,
        done: false,
      },
      ...current,
    ]);
    setTitle("");
  }

  function updateEvent(id: string, patch: Partial<CalendarEvent>) {
    const fallback = seededEvents.find((event) => event.id === id);
    setEvents((current) => {
      if (current.some((event) => event.id === id)) {
        return current.map((event) => (event.id === id ? { ...event, ...patch } : event));
      }
      return fallback ? [{ ...fallback, ...patch }, ...current] : current;
    });
  }

  function removeEvent(id: string) {
    setEvents((current) => current.filter((event) => event.id !== id));
  }

  function jumpMonth(direction: -1 | 1) {
    setMonthCursor((current) => addMonths(current, direction));
  }

  function jumpToday() {
    const now = new Date();
    setSelectedDay(todayKey);
    setMonthCursor(startOfMonth(now));
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pt-5 pb-24 sm:px-6 sm:pt-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="eyebrow">Kalender</div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Monatsansicht für Termine und Deadlines.
          </h1>
          <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-[var(--smoke)]">
            Antragsfristen, Partner-Calls und Teamtermine landen in einer ruhigen Monatsansicht mit schnellem Tagesplan.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            onClick={jumpToday}
            className="glass-pill rounded-full px-4 text-[13px]"
          >
            Heute
          </Button>
          <Link to="/heute">
            <Button className="rounded-full bg-[var(--ember)] px-4 text-[13px] text-white shadow-ember hover:bg-[var(--ember-deep)]">
              Fokus
            </Button>
          </Link>
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <section className="glass-pane p-3 sm:p-5">
          <div className="flex items-center justify-between gap-3 px-1 pb-4">
            <div>
              <div className="text-[13px] font-medium text-[var(--smoke)]">
                {monthCursor.getFullYear()}
              </div>
              <div className="text-3xl font-semibold tracking-tight sm:text-4xl">
                {formatMonth(monthCursor)}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => jumpMonth(-1)}
                className="glass-pill h-10 w-10 rounded-full p-0"
                aria-label="Vorheriger Monat"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => jumpMonth(1)}
                className="glass-pill h-10 w-10 rounded-full p-0"
                aria-label="Nächster Monat"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7 border-b border-[var(--ruled)] pb-2">
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="text-center font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--smoke)]"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="mt-2 grid grid-cols-7 gap-1 sm:gap-2">
            {monthDays.map((day) => {
              const dayEvents = eventsByDate.get(day.key) ?? [];
              const active = day.key === selectedDay;
              return (
                <button
                  key={day.key}
                  onClick={() => setSelectedDay(day.key)}
                  className={[
                    "relative flex min-h-[66px] flex-col rounded-[18px] border p-2 text-left transition sm:min-h-[96px] sm:p-3",
                    active
                      ? "border-[var(--ember)] bg-[var(--ember-tint)] text-[var(--ember-deep)] shadow-warm"
                      : "border-transparent bg-white/42 hover:border-[var(--ruled)] hover:bg-white/70",
                    !day.inMonth && !active ? "opacity-40" : "",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "flex h-7 w-7 items-center justify-center rounded-full text-[13px] font-semibold",
                      day.isToday && !active
                        ? "bg-[var(--ember)] text-white"
                        : active
                          ? "bg-white/70 text-[var(--ember-deep)]"
                          : "text-[var(--ink)]",
                    ].join(" ")}
                  >
                    {day.date.getDate()}
                  </span>
                  <span className="mt-auto flex gap-1">
                    {dayEvents.slice(0, 3).map((event) => (
                      <span
                        key={event.id}
                        className={[
                          "h-1.5 w-1.5 rounded-full",
                          active ? "bg-[var(--ember)]" : dotClass(event.type),
                        ].join(" ")}
                      />
                    ))}
                  </span>
                  {dayEvents.length > 0 && (
                    <span
                      className={[
                        "mt-1 hidden truncate text-[10.5px] font-medium sm:block",
                        active ? "text-[var(--ember-deep)]/75" : "text-[var(--smoke)]",
                      ].join(" ")}
                    >
                      {dayEvents[0].title}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        <aside className="space-y-4">
          <section className="glass-pane-ink p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10">
                <CalendarDays className="h-5 w-5" />
              </span>
              <div>
                <div className="text-[15px] font-semibold text-[var(--cream)]">
                  {formatDate(selectedDay)}
                </div>
                <div className="text-[12px] text-white/55">
                  {selectedEvents.length
                    ? `${selectedEvents.length} Einträge`
                    : "Kein Termin an diesem Tag"}
                </div>
              </div>
            </div>
            <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[20px] font-semibold leading-snug text-[var(--cream)]">
                {selectedEvents[0]?.title ||
                  next?.title ||
                  "Plane den nächsten Antragsschritt oder Partner-Call."}
              </div>
              {(selectedEvents[0] || next) && (
                <div className="mt-3 flex items-center gap-2 text-[13px] text-white/65">
                  <Clock3 className="h-4 w-4" /> {(selectedEvents[0] || next)?.time} Uhr ·{" "}
                  {labelFor((selectedEvents[0] || next)?.type ?? "task")}
                </div>
              )}
            </div>
          </section>

          <section className="glass-pane p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="eyebrow">Tagesplan</div>
                <p className="mt-1 text-[12.5px] text-[var(--smoke)]">
                  {formatShortDate(selectedDay)} · {selectedEvents.length} Termine
                </p>
              </div>
              <Link to="/unterlagen" className="text-[13px] font-semibold">
                Unterlagen
              </Link>
            </div>
            <div className="space-y-3">
              {selectedEvents.map((event) => (
                <EventRow
                  key={event.id}
                  event={event}
                  onUpdate={updateEvent}
                  onRemove={removeEvent}
                />
              ))}
              {selectedEvents.length === 0 && (
                <div className="rounded-2xl border border-dashed border-[var(--ruled)] p-4 text-[13px] text-[var(--smoke)]">
                  Für diesen Tag ist noch nichts geplant.
                </div>
              )}
            </div>
          </section>

          <section className="glass-pane p-4 sm:p-5">
            <div className="eyebrow">Termin hinzufügen</div>
            <div className="mt-4 grid gap-3">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={`Neuer Termin am ${formatShortDate(selectedDay)}`}
                className="rounded-2xl border border-[var(--ruled)] bg-white/70 px-3 py-2 text-[13px] outline-none focus:border-[var(--ember)]"
              />
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="rounded-2xl border border-[var(--ruled)] bg-white/70 px-3 py-2 text-[13px] outline-none focus:border-[var(--ember)]"
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {(["call", "deadline", "task"] as const).map((kind) => (
                <button
                  key={kind}
                  onClick={() => setType(kind)}
                  className={[
                    "rounded-full border px-3 py-1.5 text-[12px] font-semibold transition",
                    type === kind
                      ? "border-[var(--ember)] bg-[var(--ember-tint)] text-[var(--ember-deep)]"
                      : "border-[var(--ruled)] bg-white/55 text-[var(--smoke)]",
                  ].join(" ")}
                >
                  {labelFor(kind)}
                </button>
              ))}
              <Button
                onClick={addEvent}
                disabled={!title.trim()}
                className="h-8 gap-1.5 rounded-full bg-[var(--ember)] px-3 text-[12px] text-[var(--cream)] hover:bg-[var(--ember-deep)]"
              >
                <Plus className="h-3.5 w-3.5" /> Hinzufügen
              </Button>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function EventRow({
  event,
  onUpdate,
  onRemove,
}: {
  event: CalendarEvent;
  onUpdate: (id: string, patch: Partial<CalendarEvent>) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-[52px_1fr_auto] items-center gap-3 rounded-2xl border border-[var(--ruled)] bg-white/50 p-3">
      <div>
        <div className="font-mono text-[11px] font-semibold text-[var(--ember-deep)]">
          {event.time}
        </div>
        <div className="mt-1 text-[10.5px] text-[var(--smoke)]">{labelFor(event.type)}</div>
      </div>
      <div className="min-w-0">
        <div
          className={
            event.done
              ? "text-[14px] font-semibold text-[var(--smoke)] line-through"
              : "text-[14px] font-semibold"
          }
        >
          {event.title}
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onUpdate(event.id, { done: !event.done })}
          className="glass-pill rounded-full"
          aria-label="Termin erledigen"
        >
          <Check className="h-3.5 w-3.5" />
        </Button>
        {event.id.startsWith("custom-") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemove(event.id)}
            className="glass-pill rounded-full"
            aria-label="Termin löschen"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

function mergeDefaults(events: CalendarEvent[]): CalendarEvent[] {
  const grant = GRANTS[0];
  const mentor = partnersFor("mentor")[0];
  const defaults: CalendarEvent[] = [
    {
      id: "default-grant",
      title: `${grant?.name || "Förderprogramm"}: fehlende Unterlagen prüfen`,
      date: getDateOffset(1),
      time: "09:30",
      type: "deadline",
      done: false,
    },
    {
      id: "default-mentor",
      title: `${mentor?.name || "Mentor"} Erstgespräch vorbereiten`,
      date: getDateOffset(2),
      time: "14:00",
      type: "call",
      done: false,
    },
    {
      id: "default-weekly",
      title: "Wochenreview mit Co-Pilot",
      date: getDateOffset(5),
      time: "16:00",
      type: "task",
      done: false,
    },
  ];
  const customIds = new Set(events.map((event) => event.id));
  return [...events, ...defaults.filter((event) => !customIds.has(event.id))];
}

function groupEventsByDate(events: CalendarEvent[]) {
  const map = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    const group = map.get(event.date) ?? [];
    group.push(event);
    map.set(event.date, group);
  }
  return map;
}

function buildMonthDays(month: Date): MonthDay[] {
  const first = startOfMonth(month);
  const startOffset = (first.getDay() + 6) % 7;
  const gridStart = addDays(first, -startOffset);
  return Array.from({ length: 42 }, (_, index) => {
    const date = addDays(gridStart, index);
    return {
      key: getLocalDateKey(date),
      date,
      inMonth: date.getMonth() === first.getMonth(),
      isToday: getLocalDateKey(date) === getLocalDateKey(new Date()),
    };
  });
}

function readEvents(): CalendarEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeEvents(events: CalendarEvent[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function getDateOffset(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return getLocalDateKey(date);
}

function getLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateKey(value: string) {
  return new Date(`${value}T12:00:00`);
}

function formatMonth(value: Date) {
  return value.toLocaleDateString("de-DE", { month: "long" });
}

function formatDate(value: string) {
  return parseDateKey(value).toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function formatShortDate(value: string) {
  return parseDateKey(value).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
  });
}

function dotClass(type: CalendarEvent["type"]) {
  if (type === "deadline") return "bg-[var(--ember)]";
  if (type === "call") return "bg-[var(--indigo)]";
  return "bg-[var(--smoke)]";
}

function labelFor(type: CalendarEvent["type"]) {
  if (type === "deadline") return "Deadline";
  if (type === "task") return "Aufgabe";
  return "Call";
}
