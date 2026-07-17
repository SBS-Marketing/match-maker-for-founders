// ─────────────────────────────────────────────────────────────
// Admin → Partner: den Katalog der Entdecken-Sektion pflegen
// (Tabelle partner_offers — iOS liest sie live, Web über die
// generierten Dateien aus der Scraper-Pipeline).
// ─────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Plus, Store, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { SERVICES } from "@/data/services";

export const Route = createFileRoute("/admin/partner")({
  component: AdminPartner,
});

type Specialty = { label: string; level: number };

type PartnerRow = {
  slug: string;
  name: string;
  firm: string;
  service_id: string;
  city: string;
  blurb: string;
  fit: number;
  source_url: string | null;
  booking_url: string | null;
  specialties: Specialty[];
  is_active: boolean;
};

// cofounder läuft über Swipe — Partner gibt es für die 7 Service-Kategorien.
const PARTNER_SERVICES = SERVICES.filter((s) => s.id !== "cofounder");

const EMPTY_FORM: PartnerRow = {
  slug: "",
  name: "",
  firm: "",
  service_id: "legal",
  city: "Deutschland",
  blurb: "",
  fit: 80,
  source_url: null,
  booking_url: null,
  specialties: [],
  is_active: true,
};

const PREVIEW_PARTNERS: PartnerRow[] = [
  {
    ...EMPTY_FORM,
    slug: "demo-ihk-gruendungsberatung",
    name: "IHK-Gründungsberatung",
    firm: "IHK",
    service_id: "mentor",
    city: "Deine Region",
    blurb: "Persönliche Beratung vor Ort: Businessplan-Feedback und Behördenwege.",
    fit: 90,
    specialties: [
      { label: "Businessplan", level: 0.96 },
      { label: "Tragfähigkeit", level: 0.9 },
    ],
  },
  {
    ...EMPTY_FORM,
    slug: "demo-mikrokreditfonds",
    name: "Mein Mikrokredit",
    firm: "Mikrokreditfonds Deutschland",
    service_id: "funding",
    blurb: "Kredite bis 25.000 € ohne Hausbank über Mikrofinanzinstitute.",
    fit: 90,
    is_active: false,
  },
];

function AdminPartner() {
  const { isPreview, checking } = useIsAdmin();
  const [partners, setPartners] = useState<PartnerRow[] | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [editing, setEditing] = useState<PartnerRow | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = () => {
    // Warten bis der Admin-Check durch ist (verhindert Demo/Echt-Race).
    if (checking) return;
    if (isPreview) {
      setPartners(PREVIEW_PARTNERS);
      return;
    }
    supabase
      .from("partner_offers")
      .select(
        "slug,name,firm,service_id,city,blurb,fit,source_url,booking_url,specialties,is_active",
      )
      .order("service_id")
      .order("fit", { ascending: false })
      .then(({ data, error }) => {
        if (error) toast.error(`Partner laden fehlgeschlagen: ${error.message}`);
        setPartners(
          ((data ?? []) as Array<Omit<PartnerRow, "specialties"> & { specialties: unknown }>).map(
            (p) => ({
              ...p,
              specialties: Array.isArray(p.specialties) ? (p.specialties as Specialty[]) : [],
            }),
          ),
        );
      });
  };

  useEffect(load, [isPreview, checking]);

  const visible = useMemo(
    () => (partners ?? []).filter((p) => filter === "all" || p.service_id === filter),
    [partners, filter],
  );

  const countByService = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of partners ?? []) m.set(p.service_id, (m.get(p.service_id) ?? 0) + 1);
    return m;
  }, [partners]);

  async function save() {
    if (!editing) return;
    const name = editing.name.trim();
    if (!name || !editing.firm.trim()) {
      toast.error("Name und Firma/Organisation fehlen.");
      return;
    }
    const row = {
      ...editing,
      slug: isNew ? editing.slug.trim() || slugify(name) : editing.slug,
      name,
      firm: editing.firm.trim(),
      blurb: editing.blurb.trim(),
      fit: Math.min(96, Math.max(60, editing.fit)),
      specialties: editing.specialties.filter((s) => s.label.trim()),
    };

    if (isPreview) {
      setPartners((prev) => [row, ...(prev ?? []).filter((p) => p.slug !== row.slug)]);
      setEditing(null);
      toast.success("Demo: Partner nur lokal gespeichert.");
      return;
    }

    setSaving(true);
    const { error } = await supabase.from("partner_offers").upsert(row, { onConflict: "slug" });
    setSaving(false);
    if (error) {
      toast.error(`Speichern fehlgeschlagen: ${error.message}`);
      return;
    }
    toast.success(isNew ? "Partner angelegt." : "Partner gespeichert.");
    setEditing(null);
    load();
  }

  async function remove(slug: string) {
    if (!window.confirm("Partner wirklich löschen? (Deaktivieren reicht meist.)")) return;
    if (isPreview) {
      setPartners((prev) => (prev ?? []).filter((p) => p.slug !== slug));
      return;
    }
    const { error } = await supabase.from("partner_offers").delete().eq("slug", slug);
    if (error) toast.error(error.message);
    else {
      toast.success("Partner gelöscht.");
      load();
    }
  }

  async function toggleActive(p: PartnerRow) {
    if (isPreview) {
      setPartners((prev) =>
        (prev ?? []).map((x) => (x.slug === p.slug ? { ...x, is_active: !x.is_active } : x)),
      );
      return;
    }
    const { error } = await supabase
      .from("partner_offers")
      .update({ is_active: !p.is_active })
      .eq("slug", p.slug);
    if (error) toast.error(error.message);
    else load();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] text-[var(--smoke)]">
          Der Katalog hinter „Entdecken“ — aktive Partner erscheinen in iOS-App und Marktplatz.
        </p>
        <button
          onClick={() => {
            setEditing({ ...EMPTY_FORM, specialties: [] });
            setIsNew(true);
          }}
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-[var(--ink)] px-3.5 py-2 text-[13px] font-semibold text-white"
        >
          <Plus className="h-4 w-4" /> Neuer Partner
        </button>
      </div>

      {/* Kategorie-Filter */}
      <div className="flex flex-wrap gap-1.5">
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
          Alle ({partners?.length ?? 0})
        </FilterChip>
        {PARTNER_SERVICES.map((s) => (
          <FilterChip key={s.id} active={filter === s.id} onClick={() => setFilter(s.id)}>
            {s.short} ({countByService.get(s.id) ?? 0})
          </FilterChip>
        ))}
      </div>

      {partners === null ? (
        <p className="py-8 text-center text-[13px] text-[var(--smoke)]">Lade…</p>
      ) : visible.length === 0 ? (
        <div className="rounded-[18px] border border-dashed border-[var(--ruled)] p-8 text-center">
          <Store className="mx-auto h-6 w-6 text-[var(--faint)]" />
          <p className="mt-2 text-[13px] text-[var(--smoke)]">
            {partners.length === 0
              ? "Noch keine Partner — die Scraper-Pipeline füllt den Katalog (siehe Insights) oder leg manuell an."
              : "Keine Partner in dieser Kategorie."}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {visible.map((p) => (
            <div
              key={p.slug}
              className="flex flex-wrap items-center justify-between gap-2 rounded-[18px] border border-[var(--ruled)] bg-[var(--surface)] p-3.5"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-[14px] font-bold text-[var(--ink)]">{p.name}</p>
                  <span
                    className={
                      p.is_active
                        ? "rounded-full bg-[var(--ember-tint)] px-2 py-0.5 text-[11px] font-bold text-[var(--ember-deep)]"
                        : "rounded-full bg-[var(--canvas)] px-2 py-0.5 text-[11px] font-bold text-[var(--faint)]"
                    }
                  >
                    {p.is_active ? "Aktiv" : "Aus"}
                  </span>
                </div>
                <p className="mt-0.5 text-[12px] text-[var(--smoke)]">
                  {[
                    PARTNER_SERVICES.find((s) => s.id === p.service_id)?.short ?? p.service_id,
                    p.firm,
                    p.city,
                    `Fit ${p.fit}`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => toggleActive(p)}
                  className="rounded-lg border border-[var(--ruled)] px-2.5 py-1.5 text-[12px] font-semibold text-[var(--smoke)] hover:text-[var(--ink)]"
                >
                  {p.is_active ? "Deaktivieren" : "Aktivieren"}
                </button>
                <button
                  onClick={() => {
                    setEditing({ ...p, specialties: [...p.specialties] });
                    setIsNew(false);
                  }}
                  className="rounded-lg border border-[var(--ruled)] p-2 text-[var(--smoke)] hover:text-[var(--ink)]"
                  aria-label="Bearbeiten"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => remove(p.slug)}
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
          <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-[22px] bg-[var(--surface)] p-5 sm:rounded-[22px]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[16px] font-bold text-[var(--ink)]">
                {isNew ? "Neuer Partner" : "Partner bearbeiten"}
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
              <div className="grid grid-cols-2 gap-2.5">
                <Field label="Name / Angebot *">
                  <input
                    value={editing.name}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                    className={inputCls}
                    placeholder="IHK-Gründungsberatung"
                  />
                </Field>
                <Field label="Firma / Organisation *">
                  <input
                    value={editing.firm}
                    onChange={(e) => setEditing({ ...editing, firm: e.target.value })}
                    className={inputCls}
                    placeholder="IHK"
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <Field label="Kategorie">
                  <select
                    value={editing.service_id}
                    onChange={(e) => setEditing({ ...editing, service_id: e.target.value })}
                    className={inputCls}
                  >
                    {PARTNER_SERVICES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Stadt / Region">
                  <input
                    value={editing.city}
                    onChange={(e) => setEditing({ ...editing, city: e.target.value })}
                    className={inputCls}
                    placeholder="Deutschland / Remote"
                  />
                </Field>
              </div>

              <Field label="Kurzbeschreibung">
                <textarea
                  value={editing.blurb}
                  onChange={(e) => setEditing({ ...editing, blurb: e.target.value })}
                  className={`${inputCls} min-h-20 resize-y`}
                  placeholder="Was bietet der Partner, für wen lohnt es sich?"
                />
              </Field>

              <div className="grid grid-cols-2 gap-2.5">
                <Field label="Website">
                  <input
                    value={editing.source_url ?? ""}
                    onChange={(e) => setEditing({ ...editing, source_url: e.target.value || null })}
                    className={inputCls}
                    placeholder="https://…"
                  />
                </Field>
                <Field label="Buchungs-/Kontakt-Link">
                  <input
                    value={editing.booking_url ?? ""}
                    onChange={(e) =>
                      setEditing({ ...editing, booking_url: e.target.value || null })
                    }
                    className={inputCls}
                    placeholder="https://…"
                  />
                </Field>
              </div>

              <Field label={`Fit-Score (${editing.fit})`}>
                <input
                  type="range"
                  min={60}
                  max={96}
                  value={editing.fit}
                  onChange={(e) => setEditing({ ...editing, fit: Number(e.target.value) })}
                  className="w-full accent-[var(--ember)]"
                />
              </Field>

              <Field label="Schwerpunkte (Komma-getrennt)">
                <input
                  value={editing.specialties.map((s) => s.label).join(", ")}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      specialties: e.target.value
                        .split(",")
                        .map((label, i) => ({
                          label: label.trim(),
                          level: [0.96, 0.9, 0.84, 0.78, 0.72][i] ?? 0.7,
                        }))
                        .filter((s) => s.label),
                    })
                  }
                  className={inputCls}
                  placeholder="Businessplan, Tragfähigkeit, Behörden"
                />
              </Field>

              <label className="flex items-center gap-2 text-[13px] font-semibold text-[var(--ink)]">
                <input
                  type="checkbox"
                  checked={editing.is_active}
                  onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
                  className="h-4 w-4 accent-[var(--ember)]"
                />
                Aktiv (sichtbar in App & Web)
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
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={
        active
          ? "rounded-full bg-[var(--ink)] px-3 py-1.5 text-[12px] font-semibold text-white"
          : "rounded-full border border-[var(--ruled)] bg-[var(--surface)] px-3 py-1.5 text-[12px] font-semibold text-[var(--smoke)] hover:text-[var(--ink)]"
      }
    >
      {children}
    </button>
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
      .slice(0, 60) || `partner-${Date.now()}`
  );
}
