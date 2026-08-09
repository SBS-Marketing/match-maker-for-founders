// ─────────────────────────────────────────────────────────────
// Admin → Guides: redaktionelle Guides in der DB anlegen und
// pflegen. Ergänzt die statischen Guides aus src/data/guides.ts —
// veröffentlichte DB-Guides sind über RLS öffentlich lesbar.
// ─────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Plus, Sparkles, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import {
  AdminBadge,
  AdminBtn,
  AdminCard,
  AdminCardHead,
  AdminEmpty,
  AdminLoading,
  AdminPills,
  AdminRow,
  AdminTable,
  AdminToggle,
  type Accent,
} from "@/components/admin/ui";
import { useSectionActions } from "@/components/admin/context";
import { formatDateDE } from "@/lib/admin-format";

export const Route = createFileRoute("/admin/guides")({
  head: () => ({ meta: [{ title: "Guides — Admin · matchfoundr" }] }),
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
  updated_at?: string | null;
};

const CATEGORIES = [
  { id: "gruendung", label: "Gründung" },
  { id: "foerderung", label: "Förderung" },
  { id: "recht", label: "Recht" },
  { id: "finanzen", label: "Finanzen" },
  { id: "team", label: "Team" },
];

const CATEGORY_ACCENT: Record<string, Accent> = {
  gruendung: "ember",
  foerderung: "green",
  recht: "indigo",
  finanzen: "amber",
};

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
      {
        h: "Wer bekommt einen Mikrokredit?",
        body: "Kleine Unternehmen und Gründer ohne Bankzugang…",
      },
      {
        h: "Ablauf über ein Mikrofinanzinstitut",
        body: "Du stellst den Antrag nicht bei einer Bank…",
      },
    ],
    published: true,
    updated_at: new Date().toISOString(),
  },
];

const GUIDE_COLS = "2fr 0.9fr 0.7fr 0.8fr 0.6fr 0.9fr";

function AdminGuides() {
  const { isPreview, checking } = useIsAdmin();
  const queryClient = useQueryClient();
  const [guides, setGuides] = useState<GuideRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState<GuideRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [category, setCategory] = useState<string>("all");

  const load = () => {
    // Warten bis der Admin-Check durch ist (verhindert Demo/Echt-Race).
    if (checking) return;
    if (isPreview) {
      setGuides(PREVIEW_GUIDES);
      return;
    }
    supabase
      .from("guides")
      .select("id,slug,title,category,minutes,intro,sections,published,updated_at")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          setLoadError(error.message);
          toast.error(`Guides laden fehlgeschlagen: ${error.message}`);
        } else {
          setLoadError(null);
        }
        setGuides(
          ((data ?? []) as Array<Omit<GuideRow, "sections"> & { sections: unknown }>).map((g) => ({
            ...g,
            sections: Array.isArray(g.sections) ? (g.sections as Section[]) : [],
          })),
        );
      });
  };

  useEffect(load, [isPreview, checking]);

  const rows = useMemo(() => guides ?? [], [guides]);

  const pills = useMemo(() => {
    const present = new Set(rows.map((g) => g.category));
    const known = CATEGORIES.filter((c) => present.has(c.id)).map((c) => ({
      value: c.id,
      label: c.label,
    }));
    const extra = [...present]
      .filter((c) => !CATEGORIES.some((k) => k.id === c))
      .map((c) => ({ value: c, label: c }));
    return [{ value: "all", label: "Alle" }, ...known, ...extra];
  }, [rows]);

  const visible = useMemo(
    () => rows.filter((g) => category === "all" || g.category === category),
    [rows, category],
  );

  useSectionActions(
    {
      newLabel: "Neuer Guide",
      onNew: () => setEditing({ ...EMPTY_GUIDE, sections: [{ h: "", body: "" }] }),
    },
    [],
  );

  function invalidateCounts() {
    void queryClient.invalidateQueries({ queryKey: ["admin", "pending-counts"] });
  }

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
      setGuides((prev) => [
        { ...row, id: `demo-${Date.now()}`, updated_at: new Date().toISOString() },
        ...(prev ?? []).filter((g) => g.slug !== row.slug),
      ]);
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
    invalidateCounts();
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
      invalidateCounts();
      load();
    }
  }

  /** Optimistisch umschalten, bei Fehler zurückrollen. */
  async function togglePublish(guide: GuideRow) {
    const next = !guide.published;
    setGuides((prev) =>
      (prev ?? []).map((g) => (g.slug === guide.slug ? { ...g, published: next } : g)),
    );
    if (isPreview || !guide.id) return;
    const { error } = await supabase.from("guides").update({ published: next }).eq("id", guide.id);
    if (error) {
      setGuides((prev) =>
        (prev ?? []).map((g) => (g.slug === guide.slug ? { ...g, published: !next } : g)),
      );
      toast.error(`Umschalten fehlgeschlagen: ${error.message}`);
      return;
    }
    toast.success(next ? "Guide ist jetzt öffentlich lesbar." : "Guide ist wieder ein Entwurf.");
    invalidateCounts();
  }

  return (
    <div className="flex flex-col gap-4">
      <AdminCard>
        <AdminCardHead
          icon={BookOpen}
          accent="ember"
          title="Guides"
          sub="DB-Guides ergänzen die eingebauten Guides — veröffentlichte sind sofort für alle lesbar"
          right={
            <AdminBtn
              icon={Plus}
              variant="ember"
              onClick={() => setEditing({ ...EMPTY_GUIDE, sections: [{ h: "", body: "" }] })}
            >
              Neuer Guide
            </AdminBtn>
          }
        />
        {rows.length > 0 && (
          <div className="mb-3">
            <AdminPills options={pills} value={category} onChange={setCategory} />
          </div>
        )}
        {guides === null ? (
          <AdminLoading />
        ) : loadError ? (
          <AdminEmpty label={`Fehler: ${loadError}`} />
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2.5 py-10 text-center">
            <p style={{ fontSize: 14.5, fontWeight: 650 }}>Noch keine Guides in der Datenbank</p>
            <p style={{ fontSize: 13, color: "var(--a-smoke)", maxWidth: 420 }}>
              Die statischen Guides der App bleiben davon unberührt — DB-Guides kommen zusätzlich
              dazu.
            </p>
            <AdminBtn
              icon={Plus}
              variant="ember"
              onClick={() => setEditing({ ...EMPTY_GUIDE, sections: [{ h: "", body: "" }] })}
            >
              Ersten Guide anlegen
            </AdminBtn>
          </div>
        ) : visible.length === 0 ? (
          <AdminEmpty label="Keine Guides in dieser Kategorie" />
        ) : (
          <AdminTable
            cols={GUIDE_COLS}
            head={["Guide", "Kategorie", "Lesezeit", "Abschnitte", "Live", "Aktion"]}
          >
            {visible.map((g) => (
              <AdminRow
                key={g.slug}
                cols={GUIDE_COLS}
                cells={[
                  <div key="t" className="min-w-0">
                    <p className="truncate" style={{ fontWeight: 650 }}>
                      {g.title}
                    </p>
                    <p
                      className="truncate font-mono"
                      style={{ fontSize: 11, color: "var(--a-faint)" }}
                    >
                      /{g.slug}
                      {g.updated_at ? ` · geändert ${formatDateDE(g.updated_at)}` : ""}
                    </p>
                  </div>,
                  <AdminBadge key="c" variant={CATEGORY_ACCENT[g.category] ?? "soft"}>
                    {CATEGORIES.find((c) => c.id === g.category)?.label ?? g.category}
                  </AdminBadge>,
                  <span key="m" className="admin-num">
                    {g.minutes} Min
                  </span>,
                  <span key="s" className="admin-num">
                    {g.sections.length}
                  </span>,
                  <AdminToggle
                    key="l"
                    checked={g.published}
                    onChange={() => togglePublish(g)}
                    label="Guide veröffentlichen"
                  />,
                  <div key="a" className="flex items-center gap-1">
                    <AdminBtn
                      onClick={() =>
                        setEditing({
                          ...g,
                          sections: g.sections.length ? [...g.sections] : [{ h: "", body: "" }],
                        })
                      }
                    >
                      Öffnen
                    </AdminBtn>
                    <AdminBtn
                      icon={Trash2}
                      variant="quiet"
                      title="Löschen"
                      onClick={() => remove(g)}
                    />
                  </div>,
                ]}
              />
            ))}
          </AdminTable>
        )}
      </AdminCard>

      <div className="grid gap-3 lg:grid-cols-2">
        <MostReadCard />
        <AdminCard>
          <AdminCardHead
            icon={Sparkles}
            accent="indigo"
            title="Redaktions-Hinweis"
            sub="Wie DB-Guides in der App landen"
          />
          <p style={{ fontSize: 13, color: "var(--a-smoke)", lineHeight: 1.6 }}>
            Guides aus der Datenbank ergänzen die statischen Guides in der App. Nicht
            veröffentlichte Entwürfe sind ausschließlich für Admins sichtbar — die RLS-Policy gibt
            eine Zeile erst mit <span className="font-mono">published = true</span> für alle frei.
          </p>
        </AdminCard>
      </div>

      {/* ── Editor ── */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-6">
          <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-[22px] bg-[var(--surface)] p-5 sm:rounded-[22px]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[16px] font-bold text-[var(--ink)]">
                {editing.id ? "Guide bearbeiten" : "Neuer Guide"}
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
                    onChange={(e) =>
                      setEditing({ ...editing, minutes: Number(e.target.value) || 1 })
                    }
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
                              setEditing({
                                ...editing,
                                sections: editing.sections.filter((_, j) => j !== i),
                              })
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

// ── Meistgelesen ─────────────────────────────────────────────

type GuideView = { title: string; count: number };

/** Rangliste aus activity_events — nur wenn dort Guide-Aufrufe protokolliert sind. */
function MostReadCard() {
  const { isPreview, checking } = useIsAdmin();
  const views = useQuery<GuideView[]>({
    queryKey: ["admin", "guide-views", isPreview],
    enabled: !checking,
    staleTime: 60_000,
    queryFn: async () => {
      if (isPreview) return [];
      const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
      const { data, error } = await supabase
        .from("activity_events")
        .select("title,type,created_at")
        .like("type", "guide%")
        .gte("created_at", since)
        .limit(2000);
      if (error) throw new Error(error.message);
      const map = new Map<string, number>();
      for (const row of data ?? []) {
        const key = row.title || "Ohne Titel";
        map.set(key, (map.get(key) ?? 0) + 1);
      }
      return [...map.entries()]
        .map(([title, count]) => ({ title, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);
    },
  });

  const rows = views.data ?? [];
  const max = rows[0]?.count ?? 1;

  return (
    <AdminCard>
      <AdminCardHead icon={BookOpen} accent="amber" title="Meistgelesen" sub="30 Tage" />
      {views.isLoading ? (
        <AdminLoading />
      ) : views.isError ? (
        <AdminEmpty label={`Fehler: ${(views.error as Error).message}`} />
      ) : rows.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--a-smoke)", lineHeight: 1.6 }}>
          Noch keine Aufrufstatistik. Sobald Guide-Aufrufe in{" "}
          <span className="font-mono">activity_events</span> protokolliert werden, erscheint hier
          die Rangliste.
        </p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {rows.map((r) => (
            <div key={r.title}>
              <div className="mb-1 flex items-center justify-between gap-3">
                <span className="truncate" style={{ fontSize: 13, fontWeight: 600 }}>
                  {r.title}
                </span>
                <span className="admin-num" style={{ fontSize: 12.5, color: "var(--a-smoke)" }}>
                  {r.count}
                </span>
              </div>
              <div
                style={{
                  height: 6,
                  borderRadius: 99,
                  background: "var(--a-deep)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${Math.round((r.count / max) * 100)}%`,
                    background: "var(--a-amber)",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminCard>
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
      .slice(0, 60) || `guide-${Date.now()}`
  );
}
