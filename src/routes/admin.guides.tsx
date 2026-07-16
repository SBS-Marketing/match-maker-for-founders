// ─────────────────────────────────────────────────────────────
// Admin → Guides: redaktionelle Guides in der DB anlegen und
// pflegen. Ergänzt die statischen Guides aus src/data/guides.ts —
// veröffentlichte DB-Guides sind über RLS öffentlich lesbar.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { BookOpen, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";

export const Route = createFileRoute("/admin/guides")({
  component: AdminGuides,
});

type Section = { h: string; body: string };

type GuideRow = {
  id: string | null; // null = neu
  slug: string;
  title: string;
  category: string;
  minutes: number;
  intro: string;
  sections: Section[];
  published: boolean;
};

const CATEGORIES = [
  { id: "gruendung", label: "Gründung" },
  { id: "foerderung", label: "Förderung" },
  { id: "recht", label: "Recht" },
  { id: "finanzen", label: "Finanzen" },
  { id: "team", label: "Team" },
];

const EMPTY_GUIDE: GuideRow = {
  id: null,
  slug: "",
  title: "",
  category: "gruendung",
  minutes: 5,
  intro: "",
  sections: [{ h: "", body: "" }],
  published: false,
};

const PREVIEW_GUIDES: GuideRow[] = [
  {
    id: "demo-1",
    slug: "mikrokredit-beantragen",
    title: "Mikrokredit beantragen — so klappt es beim ersten Anlauf",
    category: "finanzen",
    minutes: 6,
    intro: "Bis 25.000 € ohne Hausbank: Mikrokreditfonds Deutschland Schritt für Schritt.",
    sections: [
      { h: "Wer bekommt einen Mikrokredit?", body: "Kleine Unternehmen und Gründer ohne Bankzugang…" },
      { h: "Ablauf über ein Mikrofinanzinstitut", body: "Du stellst den Antrag nicht bei einer Bank…" },
    ],
    published: true,
  },
];

function AdminGuides() {
  const { isPreview, checking } = useIsAdmin();
  const [guides, setGuides] = useState<GuideRow[] | null>(null);
  const [editing, setEditing] = useState<GuideRow | null>(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    // Warten bis der Admin-Check durch ist (verhindert Demo/Echt-Race).
    if (checking) return;
    if (isPreview) {
      setGuides(PREVIEW_GUIDES);
      return;
    }
    supabase
      .from("guides")
      .select("id,slug,title,category,minutes,intro,sections,published")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) toast.error(`Guides laden fehlgeschlagen: ${error.message}`);
        setGuides(
          ((data ?? []) as Array<Omit<GuideRow, "sections"> & { sections: unknown }>).map((g) => ({
            ...g,
            sections: Array.isArray(g.sections) ? (g.sections as Section[]) : [],
          })),
        );
      });
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [isPreview, checking]);

  async function save() {
    if (!editing) return;
    const title = editing.title.trim();
    if (!title) {
      toast.error("Titel fehlt.");
      return;
    }
    const row = {
      slug: editing.slug.trim() || slugify(title),
      title,
      category: editing.category,
      minutes: Math.max(1, editing.minutes),
      intro: editing.intro.trim(),
      sections: editing.sections.filter((s) => s.h.trim() || s.body.trim()),
      published: editing.published,
    };

    if (isPreview) {
      setGuides((prev) => [{ ...row, id: `demo-${Date.now()}` }, ...(prev ?? []).filter((g) => g.slug !== row.slug)]);
      setEditing(null);
      toast.success("Demo: Guide nur lokal gespeichert.");
      return;
    }

    setSaving(true);
    const query = editing.id
      ? supabase.from("guides").update(row).eq("id", editing.id)
      : supabase.from("guides").insert(row);
    const { error } = await query;
    setSaving(false);
    if (error) {
      toast.error(`Speichern fehlgeschlagen: ${error.message}`);
      return;
    }
    toast.success(editing.id ? "Guide gespeichert." : "Guide angelegt.");
    setEditing(null);
    load();
  }

  async function remove(guide: GuideRow) {
    if (!window.confirm(`Guide „${guide.title}“ löschen?`)) return;
    if (isPreview || !guide.id) {
      setGuides((prev) => (prev ?? []).filter((g) => g.slug !== guide.slug));
      return;
    }
    const { error } = await supabase.from("guides").delete().eq("id", guide.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Guide gelöscht.");
      load();
    }
  }

  async function togglePublish(guide: GuideRow) {
    if (isPreview || !guide.id) {
      setGuides((prev) => (prev ?? []).map((g) => (g.slug === guide.slug ? { ...g, published: !g.published } : g)));
      return;
    }
    const { error } = await supabase.from("guides").update({ published: !guide.published }).eq("id", guide.id);
    if (error) toast.error(error.message);
    else load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-[var(--smoke)]">
          DB-Guides ergänzen die eingebauten Guides — veröffentlichte sind sofort für alle lesbar.
        </p>
        <button
          onClick={() => setEditing({ ...EMPTY_GUIDE, sections: [{ h: "", body: "" }] })}
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-[var(--ink)] px-3.5 py-2 text-[13px] font-semibold text-white"
        >
          <Plus className="h-4 w-4" /> Neuer Guide
        </button>
      </div>

      {guides === null ? (
        <p className="py-8 text-center text-[13px] text-[var(--smoke)]">Lade…</p>
      ) : guides.length === 0 ? (
        <div className="rounded-[18px] border border-dashed border-[var(--ruled)] p-8 text-center">
          <BookOpen className="mx-auto h-6 w-6 text-[var(--faint)]" />
          <p className="mt-2 text-[13px] text-[var(--smoke)]">Noch keine redaktionellen Guides.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {guides.map((g) => (
            <div
              key={g.slug}
              className="flex flex-wrap items-center justify-between gap-2 rounded-[18px] border border-[var(--ruled)] bg-[var(--surface)] p-3.5"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-[14px] font-bold text-[var(--ink)]">{g.title}</p>
                  <span
                    className={
                      g.published
                        ? "rounded-full bg-[var(--ember-tint)] px-2 py-0.5 text-[11px] font-bold text-[var(--ember-deep)]"
                        : "rounded-full bg-[var(--canvas)] px-2 py-0.5 text-[11px] font-bold text-[var(--faint)]"
                    }
                  >
                    {g.published ? "Live" : "Entwurf"}
                  </span>
                </div>
                <p className="mt-0.5 text-[12px] text-[var(--smoke)]">
                  {CATEGORIES.find((c) => c.id === g.category)?.label ?? g.category} · {g.minutes} Min ·{" "}
                  {g.sections.length} Abschnitte
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => togglePublish(g)}
                  className="rounded-lg border border-[var(--ruled)] px-2.5 py-1.5 text-[12px] font-semibold text-[var(--smoke)] hover:text-[var(--ink)]"
                >
                  {g.published ? "Verbergen" : "Veröffentlichen"}
                </button>
                <button
                  onClick={() => setEditing({ ...g, sections: g.sections.length ? [...g.sections] : [{ h: "", body: "" }] })}
                  className="rounded-lg border border-[var(--ruled)] p-2 text-[var(--smoke)] hover:text-[var(--ink)]"
                  aria-label="Bearbeiten"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => remove(g)}
                  className="rounded-lg border border-[var(--ruled)] p-2 text-[var(--smoke)] hover:text-[var(--ember-deep)]"
                  aria-label="Löschen"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Editor ── */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-6">
          <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-[22px] bg-[var(--surface)] p-5 sm:rounded-[22px]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[16px] font-bold text-[var(--ink)]">
                {editing.id ? "Guide bearbeiten" : "Neuer Guide"}
              </h2>
              <button onClick={() => setEditing(null)} className="rounded-lg p-1.5 text-[var(--smoke)]" aria-label="Schließen">
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <div className="space-y-3">
              <Field label="Titel *">
                <input
                  value={editing.title}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  className={inputCls}
                  placeholder="Mikrokredit beantragen — so klappt es"
                />
              </Field>

              <div className="grid grid-cols-2 gap-2.5">
                <Field label="Kategorie">
                  <select
                    value={editing.category}
                    onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                    className={inputCls}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Lesezeit (Min)">
                  <input
                    type="number"
                    min={1}
                    value={editing.minutes}
                    onChange={(e) => setEditing({ ...editing, minutes: Number(e.target.value) || 1 })}
                    className={inputCls}
                  />
                </Field>
              </div>

              <Field label="Intro">
                <textarea
                  value={editing.intro}
                  onChange={(e) => setEditing({ ...editing, intro: e.target.value })}
                  className={`${inputCls} min-h-16 resize-y`}
                  placeholder="Worum geht es in einem Satz?"
                />
              </Field>

              <div>
                <p className="mb-1.5 text-[12px] font-bold text-[var(--smoke)]">Abschnitte</p>
                <div className="space-y-3">
                  {editing.sections.map((section, i) => (
                    <div key={i} className="rounded-xl border border-[var(--ruled)] p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-[11.5px] font-bold uppercase tracking-wide text-[var(--faint)]">
                          Abschnitt {i + 1}
                        </span>
                        {editing.sections.length > 1 && (
                          <button
                            onClick={() =>
                              setEditing({ ...editing, sections: editing.sections.filter((_, j) => j !== i) })
                            }
                            className="text-[var(--smoke)] hover:text-[var(--ember-deep)]"
                            aria-label="Abschnitt entfernen"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      <input
                        value={section.h}
                        onChange={(e) => updateSection(i, { ...section, h: e.target.value })}
                        className={`${inputCls} mb-2`}
                        placeholder="Überschrift"
                      />
                      <textarea
                        value={section.body}
                        onChange={(e) => updateSection(i, { ...section, body: e.target.value })}
                        className={`${inputCls} min-h-24 resize-y`}
                        placeholder="Inhalt des Abschnitts…"
                      />
                    </div>
                  ))}
                </div>
                <button
                  onClick={() =>
                    setEditing({ ...editing, sections: [...editing.sections, { h: "", body: "" }] })
                  }
                  className="mt-2 flex items-center gap-1 text-[12.5px] font-semibold text-[var(--indigo)]"
                >
                  <Plus className="h-3.5 w-3.5" /> Abschnitt hinzufügen
                </button>
              </div>

              <label className="flex items-center gap-2 text-[13px] font-semibold text-[var(--ink)]">
                <input
                  type="checkbox"
                  checked={editing.published}
                  onChange={(e) => setEditing({ ...editing, published: e.target.checked })}
                  className="h-4 w-4 accent-[var(--ember)]"
                />
                Sofort veröffentlichen
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setEditing(null)}
                  className="rounded-xl border border-[var(--ruled)] px-4 py-2 text-[13px] font-semibold text-[var(--smoke)]"
                >
                  Abbrechen
                </button>
                <button
                  onClick={save}
                  disabled={saving}
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

  function updateSection(index: number, next: Section) {
    if (!editing) return;
    setEditing({
      ...editing,
      sections: editing.sections.map((s, i) => (i === index ? next : s)),
    });
  }
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
      .slice(0, 60) || `guide-${Date.now()}`
  );
}
