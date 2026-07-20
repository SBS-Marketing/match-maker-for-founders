// ─────────────────────────────────────────────────────────────
// Admin → Events: community_events anlegen, bearbeiten, Banner
// hochladen, veröffentlichen und Anmeldungen einsehen.
// Dieselbe Tabelle speist die iOS-App (Community-Tab) und Web.
// ─────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, ImagePlus, Pencil, Plus, Trash2, Users, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { uploadImage } from "@/lib/upload";
import { SERVICES } from "@/data/services";

export const Route = createFileRoute("/admin/events")({
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

function AdminEvents() {
  const auth = useAuth();
  const { isPreview, checking } = useIsAdmin();
  const [events, setEvents] = useState<EventRow[] | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [editing, setEditing] = useState<EventRow | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [regsFor, setRegsFor] = useState<string | null>(null);
  const [recurrence, setRecurrence] = useState<RecurrenceRule>("none");
  const [recurrenceUntil, setRecurrenceUntil] = useState<string>("");
  const [recurrenceCount, setRecurrenceCount] = useState<number>(8);

  const load = () => {
    // Warten bis der Admin-Check durch ist, damit Echt- und Demo-Laden
    // sich nicht gegenseitig überschreiben.
    if (checking) return;
    if (isPreview) {
      setEvents(PREVIEW_EVENTS);
      setRegistrations([
        {
          id: "r1",
          event_id: "demo-gruenderstammtisch",
          name: "Lena K.",
          email: "lena@example.com",
          created_at: new Date().toISOString(),
        },
        {
          id: "r2",
          event_id: "demo-gruenderstammtisch",
          name: "Tarek B.",
          email: "tarek@example.com",
          created_at: new Date().toISOString(),
        },
      ]);
      return;
    }
    supabase
      .from("community_events")
      .select(
        "id,title,kind,service_id,starts_at,date_label,time_label,city,venue,spots,taken,host,blurb,agenda,banner_image_url,is_published",
      )
      .order("starts_at", { ascending: true, nullsFirst: false })
      .then(({ data, error }) => {
        if (error) toast.error(`Events laden fehlgeschlagen: ${error.message}`);
        setEvents((data as EventRow[]) ?? []);
      });
    supabase
      .from("community_event_registrations")
      .select("id,event_id,name,email,created_at")
      .order("created_at", { ascending: false })
      .then(({ data }) => setRegistrations((data as Registration[]) ?? []));
  };

  useEffect(load, [isPreview, checking]);

  const regCount = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of registrations) m.set(r.event_id, (m.get(r.event_id) ?? 0) + 1);
    return m;
  }, [registrations]);

  function buildOccurrences(base: EventRow): EventRow[] {
    const startsBase = base.starts_at ? new Date(base.starts_at) : null;
    if (!startsBase || recurrence === "none") return [base];

    const untilDate = recurrenceUntil ? new Date(recurrenceUntil + "T23:59:59") : null;
    const maxCount = Math.max(1, Math.min(52, recurrenceCount || 8));
    const groupId = base.recurrence_group_id || `grp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

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
        date_label: d.toLocaleDateString("de-DE", { weekday: "short", day: "numeric", month: "long" }),
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
    const rows = isRecurringNew ? buildOccurrences(baseRow) : [baseRow];

    if (isPreview) {
      setEvents((prev) => {
        const rest = (prev ?? []).filter((e) => !rows.some((r) => r.id === e.id));
        return [...rest, ...rows];
      });
      setEditing(null);
      toast.success(
        isRecurringNew
          ? `Demo: ${rows.length} Termine lokal angelegt.`
          : "Demo: Event nur lokal gespeichert.",
      );
      return;
    }

    setSaving(true);
    const { error } = await supabase.from("community_events").upsert(rows, { onConflict: "id" });
    setSaving(false);
    if (error) {
      toast.error(`Speichern fehlgeschlagen: ${error.message}`);
      return;
    }
    toast.success(
      isRecurringNew
        ? `Serie angelegt: ${rows.length} Termine ${baseRow.is_published ? "live" : "als Entwurf"}.`
        : baseRow.is_published
          ? isNew
            ? "Event veröffentlicht und in der App sichtbar."
            : "Event gespeichert und in der App sichtbar."
          : isNew
            ? "Event als Entwurf angelegt."
            : "Event als Entwurf gespeichert.",
    );
    setEditing(null);
    load();
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
      load();
    }
  }

  async function togglePublish(ev: EventRow) {
    if (isPreview) {
      setEvents((prev) =>
        (prev ?? []).map((e) => (e.id === ev.id ? { ...e, is_published: !e.is_published } : e)),
      );
      return;
    }
    const { error } = await supabase
      .from("community_events")
      .update({ is_published: !ev.is_published })
      .eq("id", ev.id);
    if (error) toast.error(error.message);
    else load();
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-[var(--smoke)]">
          Live-Events erscheinen automatisch in der iOS-App (Community) und auf der Plattform.
          Entwürfe bleiben nur hier.
        </p>
        <button
          onClick={() => {
            setEditing({ ...EMPTY_FORM });
            setIsNew(true);
          }}
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-[var(--ink)] px-3.5 py-2 text-[13px] font-semibold text-white"
        >
          <Plus className="h-4 w-4" /> Neues Event
        </button>
      </div>

      {events === null ? (
        <p className="py-8 text-center text-[13px] text-[var(--smoke)]">Lade…</p>
      ) : events.length === 0 ? (
        <div className="rounded-[18px] border border-dashed border-[var(--ruled)] p-8 text-center">
          <CalendarDays className="mx-auto h-6 w-6 text-[var(--faint)]" />
          <p className="mt-2 text-[13px] text-[var(--smoke)]">
            Noch keine Events — leg das erste an.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {events.map((ev) => (
            <div
              key={ev.id}
              className="overflow-hidden rounded-[18px] border border-[var(--ruled)] bg-[var(--surface)]"
            >
              {ev.banner_image_url && (
                <img src={ev.banner_image_url} alt="" className="h-28 w-full object-cover" />
              )}
              <div className="flex flex-wrap items-center justify-between gap-2 p-3.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-[14px] font-bold text-[var(--ink)]">{ev.title}</p>
                    <span
                      className={
                        ev.is_published
                          ? "rounded-full bg-[var(--ember-tint)] px-2 py-0.5 text-[11px] font-bold text-[var(--ember-deep)]"
                          : "rounded-full bg-[var(--canvas)] px-2 py-0.5 text-[11px] font-bold text-[var(--faint)]"
                      }
                    >
                      {ev.is_published ? "Live" : "Entwurf"}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[12px] text-[var(--smoke)]">
                    {[ev.kind, ev.date_label, ev.time_label && `${ev.time_label} Uhr`, ev.city]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setRegsFor(regsFor === ev.id ? null : ev.id)}
                    className="flex items-center gap-1 rounded-lg border border-[var(--ruled)] px-2.5 py-1.5 text-[12px] font-semibold text-[var(--smoke)] hover:text-[var(--ink)]"
                  >
                    <Users className="h-3.5 w-3.5" /> {regCount.get(ev.id) ?? 0}
                  </button>
                  <button
                    onClick={() => togglePublish(ev)}
                    className="rounded-lg border border-[var(--ruled)] px-2.5 py-1.5 text-[12px] font-semibold text-[var(--smoke)] hover:text-[var(--ink)]"
                  >
                    {ev.is_published ? "Verbergen" : "Veröffentlichen"}
                  </button>
                  <button
                    onClick={() => {
                      setEditing({ ...ev });
                      setIsNew(false);
                    }}
                    className="rounded-lg border border-[var(--ruled)] p-2 text-[var(--smoke)] hover:text-[var(--ink)]"
                    aria-label="Bearbeiten"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => remove(ev.id)}
                    className="rounded-lg border border-[var(--ruled)] p-2 text-[var(--smoke)] hover:text-[var(--ember-deep)]"
                    aria-label="Löschen"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              {regsFor === ev.id && (
                <div className="border-t border-[var(--ruled)] bg-[var(--canvas)] px-3.5 py-3">
                  <p className="mb-1.5 text-[12px] font-bold text-[var(--ink)]">
                    Anmeldungen ({regCount.get(ev.id) ?? 0})
                  </p>
                  {(registrations.filter((r) => r.event_id === ev.id) ?? []).length === 0 ? (
                    <p className="text-[12px] text-[var(--smoke)]">Noch keine Anmeldungen.</p>
                  ) : (
                    <ul className="space-y-1">
                      {registrations
                        .filter((r) => r.event_id === ev.id)
                        .map((r) => (
                          <li
                            key={r.id}
                            className="flex justify-between text-[12.5px] text-[var(--ink)]"
                          >
                            <span>{r.name || "Ohne Name"}</span>
                            <span className="text-[var(--smoke)]">{r.email || "—"}</span>
                          </li>
                        ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

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
