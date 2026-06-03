import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, ChevronLeft, ChevronRight, Clock3, Plus, Trash2, X } from "lucide-react";
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
  const [sheet, setSheet] = useState<"day" | "create" | null>(null);
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("10:00");
  const [type, setType] = useState<CalendarEvent["type"]>("call");

  const seededEvents = useMemo(() => mergeDefaults(events), [events]);
  const eventsByDate = useMemo(() => groupEventsByDate(seededEvents), [seededEvents]);
  const monthDays = useMemo(() => buildMonthDays(monthCursor), [monthCursor]);
  const selectedEvents = (eventsByDate.get(selectedDay) ?? [])
    .slice()
    .sort((a, b) => a.time.localeCompare(b.time));
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
    setSheet("day");
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
    <div className="mx-auto flex h-[calc(100svh-10rem)] max-w-7xl flex-col overflow-hidden px-3 pt-3 sm:px-5 sm:pt-5 lg:h-[calc(100svh-6.5rem)]">
      <header className="flex shrink-0 items-center justify-between gap-2 pb-3">
        <div className="min-w-0">
          <div className="text-[12px] font-semibold text-[var(--smoke)]">
            {monthCursor.getFullYear()}
          </div>
          <h1 className="truncate text-[30px] font-semibold leading-tight tracking-tight sm:text-[38px]">
            {formatMonth(monthCursor)}
          </h1>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Button
            variant="ghost"
            onClick={jumpToday}
            className="hidden h-10 rounded-full px-4 text-[13px] sm:inline-flex"
          >
            Heute
          </Button>
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
          <Button
            onClick={() => setSheet("create")}
            className="h-10 w-10 rounded-full bg-[var(--ember)] p-0 text-white shadow-ember hover:bg-[var(--ember-deep)]"
            aria-label="Termin hinzufügen"
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <section className="glass-pane flex min-h-0 flex-1 flex-col overflow-hidden p-2 sm:p-4">
        <div className="grid shrink-0 grid-cols-7 border-b border-[var(--ruled)] pb-2">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="text-center text-[11px] font-semibold text-[var(--smoke)]"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="mt-2 grid min-h-0 flex-1 grid-cols-7 grid-rows-6 gap-1 sm:gap-2">
          {monthDays.map((day) => {
            const dayEvents = eventsByDate.get(day.key) ?? [];
            const active = day.key === selectedDay;
            return (
              <button
                key={day.key}
                onClick={() => {
                  setSelectedDay(day.key);
                  setSheet("day");
                }}
                className={[
                  "relative flex min-h-0 flex-col overflow-hidden rounded-[14px] border p-1.5 text-left transition sm:rounded-[18px] sm:p-2.5",
                  active
                    ? "border-[var(--ember)] bg-[var(--ember-tint)] text-[var(--ember-deep)] shadow-warm"
                    : "border-transparent bg-white/42 hover:border-[var(--ruled)] hover:bg-white/75",
                  !day.inMonth && !active ? "opacity-35" : "",
                ].join(" ")}
              >
                <span
                  className={[
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold",
                    day.isToday && !active
                      ? "bg-[var(--ember)] text-white"
                      : active
                        ? "bg-white/70 text-[var(--ember-deep)]"
                        : "text-[var(--ink)]",
                  ].join(" ")}
                >
                  {day.date.getDate()}
                </span>
                <span className="mt-auto flex min-h-2 gap-1">
                  {dayEvents.slice(0, 4).map((event) => (
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
                      "mt-1 hidden max-w-full truncate text-[10.5px] font-medium leading-tight sm:block",
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

      {sheet && (
        <CalendarSheet title={sheet === "create" ? "Termin hinzufügen" : formatDate(selectedDay)} onClose={() => setSheet(null)}>
          {sheet === "day" ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="eyebrow">Tagesplan</div>
                  <p className="mt-1 text-[13px] text-[var(--smoke)]">
                    {selectedEvents.length
                      ? `${selectedEvents.length} Einträge`
                      : "Noch nichts geplant"}
                  </p>
                </div>
                <Button
                  onClick={() => setSheet("create")}
                  className="h-9 gap-1.5 rounded-full bg-[var(--ember)] px-3 text-[12px] text-white hover:bg-[var(--ember-deep)]"
                >
                  <Plus className="h-3.5 w-3.5" /> Neu
                </Button>
              </div>
              <div className="max-h-[42svh] space-y-2 overflow-y-auto pr-1">
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
                    Dieser Tag ist frei.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <div className="eyebrow">{formatShortDate(selectedDay)}</div>
                <p className="mt-1 text-[13px] text-[var(--smoke)]">
                  Neuer Eintrag für {formatDate(selectedDay)}
                </p>
              </div>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Titel"
                className="h-12 w-full rounded-2xl border border-[var(--ruled)] bg-white/75 px-4 text-[15px] outline-none focus:border-[var(--ember)]"
              />
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="h-12 w-full rounded-2xl border border-[var(--ruled)] bg-white/75 px-4 text-[15px] outline-none focus:border-[var(--ember)]"
              />
              <div className="grid grid-cols-3 gap-2">
                {(["call", "deadline", "task"] as const).map((kind) => (
                  <button
                    key={kind}
                    onClick={() => setType(kind)}
                    className={[
                      "h-10 rounded-full border px-2 text-[12px] font-semibold transition",
                      type === kind
                        ? "border-[var(--ember)] bg-[var(--ember-tint)] text-[var(--ember-deep)]"
                        : "border-[var(--ruled)] bg-white/55 text-[var(--smoke)]",
                    ].join(" ")}
                  >
                    {labelFor(kind)}
                  </button>
                ))}
              </div>
              <Button
                onClick={addEvent}
                disabled={!title.trim()}
                className="h-11 w-full rounded-2xl bg-[var(--ember)] text-white hover:bg-[var(--ember-deep)]"
              >
                Hinzufügen
              </Button>
            </div>
          )}
        </CalendarSheet>
      )}
    </div>
  );
}

function CalendarSheet({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-[rgba(23,21,15,0.28)] px-3 pb-[86px] backdrop-blur-[1px] sm:items-center sm:pb-6">
      <section className="w-full max-w-[440px] rounded-[24px] border border-[var(--ruled)] bg-[var(--surface)] p-4 shadow-warm-lg sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="truncate text-[20px] font-semibold tracking-tight">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--smoke)] hover:bg-[var(--surface-soft)] hover:text-[var(--ink)]"
            aria-label="Kalenderdialog schließen"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </section>
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
