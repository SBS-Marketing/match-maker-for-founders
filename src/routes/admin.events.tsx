// ─────────────────────────────────────────────────────────────
// Admin → Events: community_events anlegen, bearbeiten, Banner
// hochladen, veröffentlichen und Anmeldungen einsehen.
// Dieselbe Tabelle speist die iOS-App (Community-Tab) und Web.
// ─────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Check, ImagePlus, Plus, Ticket, Trash2, Users, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { uploadImage } from "@/lib/upload";
import { SERVICES } from "@/data/services";
import {
  AdminBadge,
  AdminBar,
  AdminBtn,
  AdminCard,
  AdminCardHead,
  AdminEmpty,
  AdminKpi,
  AdminLoading,
  AdminRow,
  AdminTable,
  AdminToggle,
} from "@/components/admin/ui";
import { useSectionActions } from "@/components/admin/context";
import { dateTimeDE, downloadCsv, relativeDE } from "@/lib/admin-format";

export const Route = createFileRoute("/admin/events")({
  head: () => ({ meta: [{ title: "Events — Admin · matchfoundr" }] }),
  component: AdminEvents,
});

type EventRow = {
  id: string;
  title: string;
  kind: string;
  service_id: string;
  starts_at: string | null;
  date_label: string | null;
  time_label: string | null;
  city: string | null;
  venue: string | null;
  spots: number;
  taken: number;
  host: string | null;
  blurb: string | null;
  agenda: string[];
  banner_image_url: string | null;
  is_published: boolean;
  recurrence_group_id?: string | null;
  recurrence_rule?: string | null;
};

type Registration = {
  id: string;
  event_id: string;
  name: string | null;
  email: string | null;
  created_at: string;
};

const EVENT_KINDS = ["Event", "Meetup", "Workshop", "Stammtisch", "Webinar"];

type RecurrenceRule = "none" | "weekly" | "biweekly" | "monthly";

const RECURRENCE_LABELS: Record<RecurrenceRule, string> = {
  none: "Einmalig",
  weekly: "Jede Woche",
  biweekly: "Alle 2 Wochen",
  monthly: "Jeden Monat",
};

const EMPTY_FORM: EventRow = {
  id: "",
  title: "",
  kind: "Event",
  service_id: "growth",
  starts_at: null,
  date_label: null,
  time_label: null,
  city: null,
  venue: null,
  spots: 20,
  taken: 0,
  host: null,
  blurb: null,
  agenda: [],
  banner_image_url: null,
  is_published: true,
  recurrence_group_id: null,
  recurrence_rule: null,
};

const PREVIEW_EVENTS: EventRow[] = [
  {
    ...EMPTY_FORM,
    id: "demo-gruenderstammtisch",
    title: "Gründerstammtisch Köln",
    kind: "Stammtisch",
    city: "Köln",
    venue: "Startplatz, Im Mediapark 5",
    date_label: "Do, 24. Juli",
    time_label: "19:00",
    spots: 30,
    taken: 18,
    host: "matchfoundr Team",
    blurb: "Lockerer Austausch für kleine Gründer — Padelhalle bis Webdesign-Agentur.",
    agenda: ["Ankommen & Kennenlernen", "3 Kurz-Pitches", "Offenes Netzwerken"],
    is_published: true,
  },
  {
    ...EMPTY_FORM,
    id: "demo-foerder-workshop",
    title: "Workshop: Gründungszuschuss richtig beantragen",
    kind: "Workshop",
    city: "Online",
    date_label: "Di, 5. August",
    time_label: "17:30",
    spots: 50,
    taken: 12,
    host: "IHK-Partnerin Sandra M.",
    blurb: "Schritt für Schritt durch den Antrag — mit echten Beispielen.",
    agenda: ["Voraussetzungen", "Unterlagen-Checkliste", "Q&A"],
    is_published: false,
  },
];

const EVENT_COLS = "1.8fr 1.1fr 1.1fr 0.9fr 0.9fr 0.6fr 0.9fr";
const REG_COLS = "1.2fr 1.4fr 0.9fr 0.8fr";

function AdminEvents() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const { isPreview, checking } = useIsAdmin();
  const [events, setEvents] = useState<EventRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [editing, setEditing] = useState<EventRow | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [recurrence, setRecurrence] = useState<RecurrenceRule>("none");
  const [recurrenceUntil, setRecurrenceUntil] = useState<string>("");
  const [recurrenceCount, setRecurrenceCount] = useState<number>(8);

  const load = () => {
    // Warten bis der Admin-Check durch ist, damit Echt- und Demo-Laden
    // sich nicht gegenseitig überschreiben.
    if (checking) return;
    if (isPreview) {
      setEvents(PREVIEW_EVENTS);
      setRegistrations([]);
      return;
    }
    supabase
      .from("community_events")
      .select(
        "id,title,kind,service_id,starts_at,date_label,time_label,city,venue,spots,taken,host,blurb,agenda,banner_image_url,is_published,recurrence_group_id,recurrence_rule",
      )
      .order("starts_at", { ascending: true, nullsFirst: false })
      .then(({ data, error }) => {
        if (error) {
          setLoadError(error.message);
          toast.error(`Events laden fehlgeschlagen: ${error.message}`);
        } else {
          setLoadError(null);
        }
        setEvents((data as EventRow[]) ?? []);
      });
    supabase
      .from("community_event_registrations")
      .select("id,event_id,name,email,created_at")
      .order("created_at", { ascending: false })
      .then(({ data }) => setRegistrations((data as Registration[]) ?? []));
  };

  useEffect(load, [isPreview, checking]);

  const rows = useMemo(() => events ?? [], [events]);

  const titleById = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of rows) map.set(e.id, e.title);
    return map;
  }, [rows]);

  /** Künftige Termine zuerst (aufsteigend), vergangene danach (absteigend). */
  const sorted = useMemo(() => {
    const now = Date.now();
    const time = (e: EventRow) => (e.starts_at ? new Date(e.starts_at).getTime() : null);
    const upcoming = rows
      .filter((e) => (time(e) ?? now) >= now)
      .sort((a, b) => (time(a) ?? 0) - (time(b) ?? 0));
    const past = rows
      .filter((e) => (time(e) ?? now) < now)
      .sort((a, b) => (time(b) ?? 0) - (time(a) ?? 0));
    return { upcoming, past };
  }, [rows]);

  const kpis = useMemo(() => {
    const now = Date.now();
    const live = rows.filter((e) => e.is_published);
    const drafts = rows.length - live.length;
    const week = Date.now() - 7 * 86_400_000;
    const recentRegs = registrations.filter(
      (r) => new Date(r.created_at).getTime() >= week,
    ).length;
    const withSpots = live.filter((e) => e.spots > 0);
    const fill = withSpots.length
      ? Math.round(
          (withSpots.reduce((sum, e) => sum + Math.min(1, e.taken / e.spots), 0) /
            withSpots.length) *
            100,
        )
      : 0;
    const nearFull = withSpots.filter((e) => e.taken / e.spots >= 0.85).length;
    const freeFuture = rows
      .filter((e) => !e.starts_at || new Date(e.starts_at).getTime() >= now)
      .reduce((sum, e) => sum + Math.max(0, e.spots - e.taken), 0);
    return {
      live: live.length,
      drafts,
      regs: registrations.length,
      recentRegs,
      fill,
      nearFull,
      freeFuture,
    };
  }, [rows, registrations]);

  useSectionActions(
    {
      newLabel: "Neues Event",
      onNew: () => openNew(),
      onExport: () => exportRegistrations(),
    },
    [rows, registrations],
  );

  function openNew() {
    setEditing({ ...EMPTY_FORM });
    setIsNew(true);
    setRecurrence("none");
    setRecurrenceUntil("");
    setRecurrenceCount(8);
  }

  function exportRegistrations() {
    if (registrations.length === 0) {
      toast.error("Noch keine Anmeldungen zum Exportieren.");
      return;
    }
    downloadCsv(
      "teilnehmerliste.csv",
      ["Name", "E-Mail", "Event", "Angemeldet am"],
      registrations.map((r) => [
        r.name ?? "",
        r.email ?? "",
        titleById.get(r.event_id) ?? r.event_id,
        r.created_at,
      ]),
    );
  }

  function buildOccurrences(base: EventRow): EventRow[] {
    const startsBase = base.starts_at ? new Date(base.starts_at) : null;
    if (!startsBase || recurrence === "none") return [base];

    const untilDate = recurrenceUntil ? new Date(recurrenceUntil + "T23:59:59") : null;
    const maxCount = Math.max(1, Math.min(52, recurrenceCount || 8));
    const groupId =
      base.recurrence_group_id || `grp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const stepDays = recurrence === "weekly" ? 7 : recurrence === "biweekly" ? 14 : 0;
    const out: EventRow[] = [];
    for (let i = 0; i < maxCount; i++) {
      const d = new Date(startsBase);
      if (recurrence === "monthly") d.setMonth(d.getMonth() + i);
      else d.setDate(d.getDate() + stepDays * i);
      if (untilDate && d > untilDate) break;

      const iso = d.toISOString();
      out.push({
        ...base,
        id: i === 0 ? base.id : `${base.id}-${i + 1}`,
        starts_at: iso,
        date_label: d.toLocaleDateString("de-DE", {
          weekday: "short",
          day: "numeric",
          month: "long",
        }),
        time_label: d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }),
        recurrence_group_id: groupId,
        recurrence_rule: recurrence,
      });
    }
    return out;
  }

  async function save() {
    if (!editing) return;
    const title = editing.title.trim();
    if (!title) {
      toast.error("Titel fehlt.");
      return;
    }
    const id = isNew ? slugify(title) : editing.id;
    const starts = editing.starts_at ? new Date(editing.starts_at) : null;
    const baseRow: EventRow = {
      ...editing,
      id,
      title,
      date_label:
        editing.date_label?.trim() ||
        (starts
          ? starts.toLocaleDateString("de-DE", { weekday: "short", day: "numeric", month: "long" })
          : null),
      time_label:
        editing.time_label?.trim() ||
        (starts
          ? starts.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })
          : null),
      agenda: editing.agenda.map((a) => a.trim()).filter(Boolean),
    };

    const isRecurringNew = isNew && recurrence !== "none" && !!starts;
    const rowsToSave = isRecurringNew ? buildOccurrences(baseRow) : [baseRow];

    if (isPreview) {
      setEvents((prev) => {
        const rest = (prev ?? []).filter((e) => !rowsToSave.some((r) => r.id === e.id));
        return [...rest, ...rowsToSave];
      });
      setEditing(null);
      toast.success(
        isRecurringNew
          ? `Demo: ${rowsToSave.length} Termine lokal angelegt.`
          : "Demo: Event nur lokal gespeichert.",
      );
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from("community_events")
      .upsert(rowsToSave, { onConflict: "id" });
    setSaving(false);
    if (error) {
      toast.error(`Speichern fehlgeschlagen: ${error.message}`);
      return;
    }
    toast.success(
      isRecurringNew
        ? `Serie angelegt: ${rowsToSave.length} Termine ${baseRow.is_published ? "live" : "als Entwurf"}.`
        : baseRow.is_published
          ? isNew
            ? "Event veröffentlicht und in der App sichtbar."
            : "Event gespeichert und in der App sichtbar."
          : isNew
            ? "Event als Entwurf angelegt."
            : "Event als Entwurf gespeichert.",
    );
    setEditing(null);
    invalidateCounts();
    load();
  }

  function invalidateCounts() {
    void queryClient.invalidateQueries({ queryKey: ["admin", "pending-counts"] });
  }

  async function remove(id: string) {
    if (!window.confirm("Event wirklich löschen? Anmeldungen werden mit entfernt.")) return;
    if (isPreview) {
      setEvents((prev) => (prev ?? []).filter((e) => e.id !== id));
      return;
    }
    const { error } = await supabase.from("community_events").delete().eq("id", id);
    if (error) toast.error(`Löschen fehlgeschlagen: ${error.message}`);
    else {
      toast.success("Event gelöscht.");
      invalidateCounts();
      load();
    }
  }

  async function removeSeries(groupId: string) {
    const count = rows.filter((e) => e.recurrence_group_id === groupId).length;
    if (
      !window.confirm(`Ganze Serie mit ${count} Terminen löschen? Anmeldungen werden mit entfernt.`)
    )
      return;
    if (isPreview) {
      setEvents((prev) => (prev ?? []).filter((e) => e.recurrence_group_id !== groupId));
      return;
    }
    const { error } = await supabase
      .from("community_events")
      .delete()
      .eq("recurrence_group_id", groupId);
    if (error) toast.error(`Löschen fehlgeschlagen: ${error.message}`);
    else {
      toast.success("Serie gelöscht.");
      invalidateCounts();
      load();
    }
  }

  /** Optimistisch umschalten, bei Fehler zurückrollen. */
  async function togglePublish(ev: EventRow) {
    const next = !ev.is_published;
    setEvents((prev) => (prev ?? []).map((e) => (e.id === ev.id ? { ...e, is_published: next } : e)));
    if (isPreview) return;
    const { error } = await supabase
      .from("community_events")
      .update({ is_published: next })
      .eq("id", ev.id);
    if (error) {
      setEvents((prev) =>
        (prev ?? []).map((e) => (e.id === ev.id ? { ...e, is_published: !next } : e)),
      );
      toast.error(`Umschalten fehlgeschlagen: ${error.message}`);
      return;
    }
    toast.success(next ? "Event ist jetzt in der App sichtbar." : "Event ist wieder ein Entwurf.");
    invalidateCounts();
  }

  async function removeRegistration(reg: Registration) {
    if (!window.confirm(`Anmeldung von „${reg.name || reg.email || "Gast"}“ entfernen?`)) return;
    if (isPreview) {
      setRegistrations((prev) => prev.filter((r) => r.id !== reg.id));
      return;
    }
    const { error } = await supabase
      .from("community_event_registrations")
      .delete()
      .eq("id", reg.id);
    if (error) {
      toast.error(`Entfernen fehlgeschlagen: ${error.message}`);
      return;
    }
    const event = rows.find((e) => e.id === reg.event_id);
    if (event) {
      await supabase
        .from("community_events")
        .update({ taken: Math.max(0, event.taken - 1) })
        .eq("id", event.id);
    }
    toast.success("Anmeldung entfernt, Platz wieder frei.");
    load();
  }

  async function onBanner(file: File | undefined) {
    if (!file || !editing) return;
    setUploading(true);
    try {
      const url = await uploadImage(file, auth);
      setEditing({ ...editing, banner_image_url: url });
      toast.success("Banner hochgeladen. Speichern nicht vergessen.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload fehlgeschlagen.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminKpi
          icon={CalendarDays}
          accent="indigo"
          label="Events live"
          value={String(kpis.live)}
          compare={`${kpis.drafts} Entwürfe`}
        />
        <AdminKpi
          icon={Users}
          accent="green"
          label="Anmeldungen"
          value={String(kpis.regs)}
          delta={{ dir: kpis.recentRegs > 0 ? "up" : "flat", label: `+${kpis.recentRegs}` }}
          compare="7 Tage"
        />
        <AdminKpi
          icon={Check}
          accent="amber"
          label="Auslastung"
          value={String(kpis.fill)}
          unit="%"
          compare={`${kpis.nearFull} fast voll`}
        />
        <AdminKpi
          icon={Ticket}
          accent="ember"
          label="Freie Plätze gesamt"
          value={String(kpis.freeFuture)}
          compare="künftige Termine"
        />
      </div>

      <AdminCard>
        <AdminCardHead
          icon={CalendarDays}
          accent="indigo"
          title="Events"
          sub="Veröffentlichen schaltet das Event sofort in der App frei"
          right={
            <div className="flex items-center gap-2">
              <AdminBtn icon={Plus} variant="ember" onClick={openNew}>
                Neues Event
              </AdminBtn>
            </div>
          }
        />
        {events === null ? (
          <AdminLoading />
        ) : loadError ? (
          <AdminEmpty label={`Fehler: ${loadError}`} />
        ) : rows.length === 0 ? (
          <AdminEmpty label="Noch keine Events — leg das erste an." />
        ) : (
          <AdminTable
            cols={EVENT_COLS}
            head={["Event", "Wann", "Wo", "Host", "Plätze", "Live", "Aktion"]}
          >
            {[...sorted.upcoming, ...sorted.past].map((ev) => (
              <EventTableRow
                key={ev.id}
                ev={ev}
                past={sorted.past.some((p) => p.id === ev.id)}
                onToggle={() => togglePublish(ev)}
                onEdit={() => {
                  setEditing({ ...ev });
                  setIsNew(false);
                }}
                onDelete={() => remove(ev.id)}
                onDeleteSeries={
                  ev.recurrence_group_id
                    ? () => removeSeries(ev.recurrence_group_id as string)
                    : undefined
                }
              />
            ))}
          </AdminTable>
        )}
      </AdminCard>

      <AdminCard>
        <AdminCardHead
          icon={Users}
          accent="green"
          title="Letzte Anmeldungen"
          sub="community_event_registrations"
          right={
            <AdminBtn variant="quiet" onClick={exportRegistrations}>
              Teilnehmerliste
            </AdminBtn>
          }
        />
        {registrations.length === 0 ? (
          <AdminEmpty label="Noch keine Anmeldungen" />
        ) : (
          <AdminTable cols={REG_COLS} head={["Name", "Event", "Wann", "Aktion"]}>
            {registrations.slice(0, 25).map((r) => (
              <AdminRow
                key={r.id}
                cols={REG_COLS}
                cells={[
                  <span key="n" className="truncate" style={{ fontWeight: 600 }}>
                    {r.name || r.email || "Ohne Namen"}
                  </span>,
                  <span key="e" className="truncate" style={{ color: "var(--a-smoke)" }}>
                    {titleById.get(r.event_id) ?? r.event_id}
                  </span>,
                  <span key="w" style={{ color: "var(--a-smoke)" }} title={dateTimeDE(r.created_at)}>
                    {relativeDE(r.created_at, "—")}
                  </span>,
                  <AdminBtn key="a" variant="quiet" onClick={() => removeRegistration(r)}>
                    Entfernen
                  </AdminBtn>,
                ]}
              />
            ))}
          </AdminTable>
        )}
      </AdminCard>

      {/* ── Editor ── */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-6">
          <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-[22px] bg-[var(--surface)] p-5 sm:rounded-[22px]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[16px] font-bold text-[var(--ink)]">
                {isNew ? "Neues Event" : "Event bearbeiten"}
              </h2>
              <button
                onClick={() => setEditing(null)}
                className="rounded-lg p-1.5 text-[var(--smoke)]"
                aria-label="Schließen"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <div className="space-y-3">
              <Field label="Titel *">
                <input
                  value={editing.title}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  className={inputCls}
                  placeholder="Gründerstammtisch Köln"
                />
              </Field>

              <div className="grid grid-cols-2 gap-2.5">
                <Field label="Art">
                  <select
                    value={editing.kind}
                    onChange={(e) => setEditing({ ...editing, kind: e.target.value })}
                    className={inputCls}
                  >
                    {EVENT_KINDS.map((k) => (
                      <option key={k}>{k}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Bereich">
                  <select
                    value={editing.service_id}
                    onChange={(e) => setEditing({ ...editing, service_id: e.target.value })}
                    className={inputCls}
                  >
                    {SERVICES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <Field label="Start">
                  <input
                    type="datetime-local"
                    value={editing.starts_at ? editing.starts_at.slice(0, 16) : ""}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        starts_at: e.target.value ? new Date(e.target.value).toISOString() : null,
                      })
                    }
                    className={inputCls}
                  />
                </Field>
                <Field label="Plätze">
                  <input
                    type="number"
                    min={0}
                    value={editing.spots}
                    onChange={(e) =>
                      setEditing({ ...editing, spots: Math.max(0, Number(e.target.value) || 0) })
                    }
                    className={inputCls}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <Field label="Stadt">
                  <input
                    value={editing.city ?? ""}
                    onChange={(e) => setEditing({ ...editing, city: e.target.value || null })}
                    className={inputCls}
                    placeholder="Köln / Online"
                  />
                </Field>
                <Field label="Ort / Venue">
                  <input
                    value={editing.venue ?? ""}
                    onChange={(e) => setEditing({ ...editing, venue: e.target.value || null })}
                    className={inputCls}
                    placeholder="Startplatz, Im Mediapark 5"
                  />
                </Field>
              </div>

              <Field label="Host">
                <input
                  value={editing.host ?? ""}
                  onChange={(e) => setEditing({ ...editing, host: e.target.value || null })}
                  className={inputCls}
                  placeholder="matchfoundr Team"
                />
              </Field>

              <Field label="Kurzbeschreibung">
                <textarea
                  value={editing.blurb ?? ""}
                  onChange={(e) => setEditing({ ...editing, blurb: e.target.value || null })}
                  className={`${inputCls} min-h-20 resize-y`}
                  placeholder="Worum geht es, für wen lohnt es sich?"
                />
              </Field>

              <Field label="Agenda (eine Zeile pro Punkt)">
                <textarea
                  value={editing.agenda.join("\n")}
                  onChange={(e) => setEditing({ ...editing, agenda: e.target.value.split("\n") })}
                  className={`${inputCls} min-h-20 resize-y`}
                  placeholder={"Ankommen & Kennenlernen\n3 Kurz-Pitches\nOffenes Netzwerken"}
                />
              </Field>

              <Field label="Banner">
                <div className="flex items-center gap-2.5">
                  {editing.banner_image_url ? (
                    <img
                      src={editing.banner_image_url}
                      alt=""
                      className="h-14 w-24 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-14 w-24 items-center justify-center rounded-lg border border-dashed border-[var(--ruled)] text-[var(--faint)]">
                      <ImagePlus className="h-4 w-4" />
                    </div>
                  )}
                  <label className="cursor-pointer rounded-xl border border-[var(--ruled)] px-3 py-2 text-[12.5px] font-semibold text-[var(--ink)]">
                    {uploading
                      ? "Lädt…"
                      : editing.banner_image_url
                        ? "Banner ersetzen"
                        : "Banner hochladen"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => onBanner(e.target.files?.[0])}
                    />
                  </label>
                  {editing.banner_image_url && (
                    <button
                      onClick={() => setEditing({ ...editing, banner_image_url: null })}
                      className="text-[12px] font-semibold text-[var(--smoke)]"
                    >
                      Entfernen
                    </button>
                  )}
                </div>
              </Field>

              {isNew && (
                <div className="space-y-2.5 rounded-2xl border border-[var(--ruled)] bg-[var(--canvas)] p-3">
                  <p className="text-[13px] font-bold text-[var(--ink)]">Wiederholung</p>
                  <p className="text-[12px] text-[var(--smoke)]">
                    Legt beim Speichern alle Termine der Serie auf einmal an (z. B. jeden Dienstag).
                    Basiert auf dem oben gewählten Start-Datum & Uhrzeit.
                  </p>
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                    <Field label="Rhythmus">
                      <select
                        value={recurrence}
                        onChange={(e) => setRecurrence(e.target.value as RecurrenceRule)}
                        className={inputCls}
                      >
                        {(["none", "weekly", "biweekly", "monthly"] as RecurrenceRule[]).map((r) => (
                          <option key={r} value={r}>
                            {RECURRENCE_LABELS[r]}
                          </option>
                        ))}
                      </select>
                    </Field>
                    {recurrence !== "none" && (
                      <>
                        <Field label="Endet spätestens am">
                          <input
                            type="date"
                            value={recurrenceUntil}
                            onChange={(e) => setRecurrenceUntil(e.target.value)}
                            className={inputCls}
                          />
                        </Field>
                        <Field label="Max. Termine">
                          <input
                            type="number"
                            min={1}
                            max={52}
                            value={recurrenceCount}
                            onChange={(e) =>
                              setRecurrenceCount(
                                Math.max(1, Math.min(52, Number(e.target.value) || 1)),
                              )
                            }
                            className={inputCls}
                          />
                        </Field>
                      </>
                    )}
                  </div>
                  {recurrence !== "none" && !editing.starts_at && (
                    <p className="text-[12px] text-[var(--ember-deep)]">
                      Bitte oben ein Start-Datum & Uhrzeit setzen.
                    </p>
                  )}
                </div>
              )}

              <div className="rounded-2xl border border-[var(--ruled)] bg-[var(--canvas)] p-3">
                <label className="flex items-center gap-2 text-[13px] font-semibold text-[var(--ink)]">
                  <input
                    type="checkbox"
                    checked={editing.is_published}
                    onChange={(e) => setEditing({ ...editing, is_published: e.target.checked })}
                    className="h-4 w-4 accent-[var(--ember)]"
                  />
                  In der App live schalten
                </label>
                {!editing.is_published && (
                  <p className="mt-1 pl-6 text-[12px] text-[var(--smoke)]">
                    Entwürfe werden nicht in die iOS-App synchronisiert.
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setEditing(null)}
                  className="rounded-xl border border-[var(--ruled)] px-4 py-2 text-[13px] font-semibold text-[var(--smoke)]"
                >
                  Abbrechen
                </button>
                <button
                  onClick={save}
                  disabled={saving || uploading}
                  className="rounded-xl bg-[var(--ink)] px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-50"
                >
                  {saving ? "Speichert…" : "Speichern"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EventTableRow({
  ev,
  past,
  onToggle,
  onEdit,
  onDelete,
  onDeleteSeries,
}: {
  ev: EventRow;
  past: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDeleteSeries?: () => void;
}) {
  const pct = ev.spots > 0 ? Math.round((ev.taken / ev.spots) * 100) : 0;
  const tight = pct >= 90;
  return (
    <div style={{ opacity: past ? 0.55 : 1 }}>
      <AdminRow
        cols={EVENT_COLS}
        cells={[
          <div key="t" className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="truncate" style={{ fontWeight: 650 }}>
                {ev.title}
              </span>
              <AdminBadge>{ev.kind}</AdminBadge>
              {ev.recurrence_group_id && <AdminBadge variant="indigo">Serie</AdminBadge>}
            </div>
            <p className="truncate font-mono" style={{ fontSize: 11, color: "var(--a-faint)" }}>
              {ev.id}
            </p>
          </div>,
          <span key="w" style={{ color: "var(--a-smoke)" }}>
            {ev.date_label ?? (ev.starts_at ? dateTimeDE(ev.starts_at) : "—")}
            {ev.time_label ? ` · ${ev.time_label}` : ""}
          </span>,
          <div key="o" className="min-w-0">
            <p className="truncate" style={{ color: "var(--a-smoke)" }}>
              {ev.city ?? "—"}
            </p>
            {ev.venue && (
              <p className="truncate" style={{ fontSize: 11.5, color: "var(--a-faint)" }}>
                {ev.venue}
              </p>
            )}
          </div>,
          <span key="h" className="truncate" style={{ color: "var(--a-smoke)" }}>
            {ev.host ?? "—"}
          </span>,
          <div key="p">
            <p
              className="admin-num"
              style={{ fontWeight: 650, color: tight ? "var(--a-amber)" : "var(--a-ink)" }}
            >
              {ev.taken} / {ev.spots}
            </p>
            <AdminBar value={pct} color={tight ? "var(--a-amber)" : "var(--a-green)"} height={6} />
          </div>,
          <AdminToggle
            key="l"
            checked={ev.is_published}
            onChange={onToggle}
            label="Event veröffentlichen"
          />,
          <div key="a" className="flex items-center gap-1">
            <AdminBtn onClick={onEdit}>Bearbeiten</AdminBtn>
            <AdminBtn icon={Trash2} variant="quiet" title="Löschen" onClick={onDelete} />
            {onDeleteSeries && (
              <AdminBtn variant="quiet" title="Ganze Serie löschen" onClick={onDeleteSeries}>
                Serie
              </AdminBtn>
            )}
          </div>,
        ]}
      />
    </div>
  );
}

const inputCls =
  "h-10 w-full rounded-xl border border-[var(--ruled)] bg-[var(--surface)] px-3 text-[13px] text-[var(--ink)] outline-none placeholder:text-[var(--faint)] focus:border-[var(--indigo)]";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] font-bold text-[var(--smoke)]">{label}</span>
      {children}
    </label>
  );
}

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/ä/g, "ae")
      .replace(/ö/g, "oe")
      .replace(/ü/g, "ue")
      .replace(/ß/g, "ss")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || `event-${Date.now()}`
  );
}
