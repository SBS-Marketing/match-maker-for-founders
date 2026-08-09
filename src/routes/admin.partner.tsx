// ─────────────────────────────────────────────────────────────
// Admin → Partner: den Katalog der Entdecken-Sektion pflegen
// (Tabelle partner_offers — iOS liest sie live, Web über die
// generierten Dateien aus der Scraper-Pipeline). Dazu die
// Bewerbungen aus partner_applications.
// ─────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Check, ImagePlus, Plus, Sparkles, Store, Trash2, Users, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { uploadImage } from "@/lib/upload";
import { SERVICES } from "@/data/services";
import {
  AdminBadge,
  AdminBtn,
  AdminCard,
  AdminCardHead,
  AdminEmpty,
  AdminKpi,
  AdminLoading,
  AdminPills,
  AdminRow,
  AdminTable,
  type Accent,
} from "@/components/admin/ui";
import { useSectionActions } from "@/components/admin/context";
import { downloadCsv, formatDateDE } from "@/lib/admin-format";

export const Route = createFileRoute("/admin/partner")({
  head: () => ({ meta: [{ title: "Partner-Angebote — Admin · matchfoundr" }] }),
  component: AdminPartner,
});

type Specialty = { label: string; level: number };

type ReviewStatus = "review" | "live" | "paused";

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
  logo_url: string | null;
  banner_url: string | null;
  specialties: Specialty[];
  is_active: boolean;
  review_status: string;
  perk: string | null;
  claims: number;
  submitted_at: string;
};

type Application = {
  id: string;
  company: string;
  field: string | null;
  city: string | null;
  contact_name: string | null;
  email: string | null;
  message: string | null;
  status: string;
  created_at: string;
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
  logo_url: null,
  banner_url: null,
  specialties: [],
  is_active: true,
  review_status: "live",
  perk: null,
  claims: 0,
  submitted_at: new Date().toISOString(),
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
    review_status: "review",
  },
];

const STATUS_META: Record<ReviewStatus, { label: string; accent: Accent }> = {
  review: { label: "Freigabe offen", accent: "amber" },
  live: { label: "live", accent: "green" },
  paused: { label: "pausiert", accent: "soft" },
};

const APP_STATUS: Record<string, Accent> = {
  neu: "indigo",
  geprueft: "soft",
  angenommen: "green",
  abgelehnt: "red",
};

const APP_STATUS_OPTIONS = ["neu", "geprueft", "angenommen", "abgelehnt"];

const FILTERS = [
  { value: "all", label: "Alle" },
  { value: "review", label: "Zur Freigabe" },
  { value: "live", label: "Live" },
  { value: "paused", label: "Pausiert" },
] as const;
type Filter = (typeof FILTERS)[number]["value"];

const OFFER_COLS = "1.7fr 1.1fr 1fr 0.7fr 0.9fr 1.2fr";
const APP_COLS = "1.6fr 0.9fr 0.8fr 0.7fr 0.8fr 1.1fr";

function daysSince(iso: string | null): number {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Math.floor((Date.now() - t) / 86_400_000));
}

function AdminPartner() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const { isPreview, checking } = useIsAdmin();
  const [partners, setPartners] = useState<PartnerRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [applications, setApplications] = useState<Application[] | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [editing, setEditing] = useState<PartnerRow | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"logo" | "banner" | null>(null);

  const load = () => {
    // Warten bis der Admin-Check durch ist (verhindert Demo/Echt-Race).
    if (checking) return;
    if (isPreview) {
      setPartners(PREVIEW_PARTNERS);
      setApplications([]);
      return;
    }
    supabase
      .from("partner_offers")
      .select(
        "slug,name,firm,service_id,city,blurb,fit,source_url,booking_url,logo_url,banner_url,specialties,is_active,review_status,perk,claims,submitted_at",
      )
      .order("service_id")
      .order("fit", { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          setLoadError(error.message);
          toast.error(`Partner laden fehlgeschlagen: ${error.message}`);
        } else {
          setLoadError(null);
        }
        setPartners(
          ((data ?? []) as Array<Omit<PartnerRow, "specialties"> & { specialties: unknown }>).map(
            (p) => ({
              ...p,
              specialties: Array.isArray(p.specialties) ? (p.specialties as Specialty[]) : [],
            }),
          ),
        );
      });
    supabase
      .from("partner_applications")
      .select("id,company,field,city,contact_name,email,message,status,created_at")
      .order("created_at", { ascending: false })
      .then(({ data }) => setApplications((data as Application[]) ?? []));
  };

  useEffect(load, [isPreview, checking]);

  const rows = useMemo(() => partners ?? [], [partners]);
  const apps = useMemo(() => applications ?? [], [applications]);

  const visible = useMemo(
    () => rows.filter((p) => filter === "all" || p.review_status === filter),
    [rows, filter],
  );

  const kpis = useMemo(() => {
    const inReview = rows.filter((p) => p.review_status === "review");
    const oldest = inReview
      .map((p) => daysSince(p.submitted_at))
      .reduce((max, d) => Math.max(max, d), 0);
    const live = rows.filter((p) => p.review_status === "live" && p.is_active);
    const month = Date.now() - 30 * 86_400_000;
    const liveRecent = live.filter((p) => new Date(p.submitted_at).getTime() >= month).length;
    return {
      review: inReview.length,
      oldest,
      live: live.length,
      liveRecent,
      claims: rows.reduce((sum, p) => sum + (p.claims ?? 0), 0),
      apps: apps.length,
      appsNew: apps.filter((a) => a.status === "neu").length,
    };
  }, [rows, apps]);

  useSectionActions(
    {
      newLabel: "Angebot anlegen",
      onNew: () => openNew(),
      onExport: () =>
        downloadCsv(
          "partner-angebote.csv",
          ["Angebot", "Partner", "Ort", "Vorteil", "Einlösungen", "Status"],
          rows.map((p) => [p.name, p.firm, p.city, p.perk, p.claims, p.review_status]),
        ),
    },
    [rows],
  );

  function openNew() {
    setEditing({ ...EMPTY_FORM, specialties: [], submitted_at: new Date().toISOString() });
    setIsNew(true);
  }

  function invalidateCounts() {
    void queryClient.invalidateQueries({ queryKey: ["admin", "pending-counts"] });
  }

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
    toast.success(isNew ? "Angebot angelegt." : "Angebot gespeichert.");
    setEditing(null);
    invalidateCounts();
    load();
  }

  async function remove(slug: string) {
    if (!window.confirm("Angebot wirklich löschen? (Pausieren reicht meist.)")) return;
    if (isPreview) {
      setPartners((prev) => (prev ?? []).filter((p) => p.slug !== slug));
      return;
    }
    const { error } = await supabase.from("partner_offers").delete().eq("slug", slug);
    if (error) toast.error(error.message);
    else {
      toast.success("Angebot gelöscht.");
      invalidateCounts();
      load();
    }
  }

  /** Status optimistisch setzen, bei Fehler zurückrollen. */
  async function setStatus(p: PartnerRow, next: ReviewStatus, message: string) {
    const active = next === "live";
    const before = { review_status: p.review_status, is_active: p.is_active };
    setPartners((prev) =>
      (prev ?? []).map((x) =>
        x.slug === p.slug ? { ...x, review_status: next, is_active: active } : x,
      ),
    );
    if (isPreview) return;
    const { error } = await supabase
      .from("partner_offers")
      .update({ review_status: next, is_active: active })
      .eq("slug", p.slug);
    if (error) {
      setPartners((prev) => (prev ?? []).map((x) => (x.slug === p.slug ? { ...x, ...before } : x)));
      toast.error(`Änderung fehlgeschlagen: ${error.message}`);
      return;
    }
    toast.success(message);
    invalidateCounts();
  }

  async function setApplicationStatus(app: Application, next: string) {
    const before = app.status;
    setApplications((prev) =>
      (prev ?? []).map((a) => (a.id === app.id ? { ...a, status: next } : a)),
    );
    if (isPreview) return;
    const { error } = await supabase
      .from("partner_applications")
      .update({ status: next })
      .eq("id", app.id);
    if (error) {
      setApplications((prev) =>
        (prev ?? []).map((a) => (a.id === app.id ? { ...a, status: before } : a)),
      );
      toast.error(`Status setzen fehlgeschlagen: ${error.message}`);
      return;
    }
    toast.success("Status aktualisiert.");
  }

  async function onImage(kind: "logo" | "banner", file: File | undefined) {
    if (!file || !editing) return;
    setUploading(kind);
    try {
      const url = await uploadImage(file, auth);
      setEditing({ ...editing, [kind === "logo" ? "logo_url" : "banner_url"]: url });
      toast.success(kind === "logo" ? "Logo hochgeladen." : "Banner hochgeladen.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload fehlgeschlagen.");
    } finally {
      setUploading(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminKpi
          icon={Store}
          accent="amber"
          label="Zur Freigabe"
          value={String(kpis.review)}
          compare={kpis.review > 0 ? `längste ${kpis.oldest} Tage` : "nichts offen"}
        />
        <AdminKpi
          icon={Check}
          accent="green"
          label="Live-Angebote"
          value={String(kpis.live)}
          delta={{ dir: kpis.liveRecent > 0 ? "up" : "flat", label: `+${kpis.liveRecent}` }}
          compare="30 Tage"
        />
        <AdminKpi
          icon={Sparkles}
          accent="ember"
          label="Einlösungen"
          value={String(kpis.claims)}
          compare="gesamt"
        />
        <AdminKpi
          icon={Users}
          accent="indigo"
          label="Bewerbungen"
          value={String(kpis.apps)}
          compare={`${kpis.appsNew} neu`}
        />
      </div>

      <AdminCard>
        <AdminCardHead
          icon={Store}
          accent="ember"
          title="Partner-Angebote"
          sub="Freigeben schaltet das Angebot in der Deals-Welt frei"
          right={
            <AdminBtn icon={Plus} variant="ember" onClick={openNew}>
              Angebot anlegen
            </AdminBtn>
          }
        />
        <div className="mb-3">
          <AdminPills options={[...FILTERS]} value={filter} onChange={setFilter} />
        </div>
        {partners === null ? (
          <AdminLoading />
        ) : loadError ? (
          <AdminEmpty label={`Fehler: ${loadError}`} />
        ) : visible.length === 0 ? (
          <AdminEmpty
            label={
              rows.length === 0
                ? "Noch keine Angebote — die Scraper-Pipeline füllt den Katalog oder leg manuell an."
                : "Keine Angebote in dieser Ansicht"
            }
          />
        ) : (
          <AdminTable
            cols={OFFER_COLS}
            head={["Angebot", "Partner", "Vorteil", "Einlösungen", "Status", "Aktion"]}
          >
            {visible.map((p) => {
              const status = (STATUS_META[p.review_status as ReviewStatus] ??
                STATUS_META.paused) as { label: string; accent: Accent };
              return (
                <AdminRow
                  key={p.slug}
                  cols={OFFER_COLS}
                  cells={[
                    <div key="n" className="flex min-w-0 items-center gap-2">
                      {p.logo_url ? (
                        <img
                          src={p.logo_url}
                          alt=""
                          loading="lazy"
                          className="h-8 w-8 shrink-0 rounded-lg bg-white object-contain p-0.5"
                          style={{ border: "1px solid var(--a-border-soft)" }}
                        />
                      ) : (
                        <span
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                          style={{ background: "var(--a-soft)", color: "var(--a-faint)" }}
                        >
                          <Store className="h-3.5 w-3.5" />
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="truncate" style={{ fontWeight: 650 }}>
                          {p.name}
                        </p>
                        <p
                          className="truncate font-mono"
                          style={{ fontSize: 11, color: "var(--a-faint)" }}
                        >
                          {p.service_id} ·{" "}
                          {p.review_status === "review"
                            ? `seit ${daysSince(p.submitted_at)} Tagen offen`
                            : `seit ${formatDateDE(p.submitted_at)}`}
                        </p>
                      </div>
                    </div>,
                    <div key="f" className="min-w-0">
                      <p className="truncate" style={{ fontWeight: 600 }}>
                        {p.firm}
                      </p>
                      <p className="truncate" style={{ fontSize: 11.5, color: "var(--a-faint)" }}>
                        {p.city}
                      </p>
                    </div>,
                    <span key="v" className="truncate" style={{ color: "var(--a-smoke)" }}>
                      {p.perk?.trim() || "—"}
                    </span>,
                    <span key="c" className="admin-num" style={{ fontWeight: 600 }}>
                      {p.claims ?? 0}
                    </span>,
                    <AdminBadge key="s" variant={status.accent}>
                      {status.label}
                    </AdminBadge>,
                    <div key="a" className="flex flex-wrap items-center gap-1">
                      {p.review_status === "review" ? (
                        <>
                          <AdminBtn
                            icon={Check}
                            variant="primary"
                            onClick={() =>
                              setStatus(p, "live", "Angebot ist jetzt öffentlich sichtbar.")
                            }
                          >
                            Freigeben
                          </AdminBtn>
                          <AdminBtn
                            variant="quiet"
                            onClick={() => {
                              if (!window.confirm(`Angebot „${p.name}“ ablehnen?`)) return;
                              void setStatus(
                                p,
                                "paused",
                                "Angebot abgelehnt und nicht mehr sichtbar.",
                              );
                            }}
                          >
                            Ablehnen
                          </AdminBtn>
                        </>
                      ) : (
                        <>
                          <AdminBtn
                            onClick={() => {
                              setEditing({ ...p, specialties: [...p.specialties] });
                              setIsNew(false);
                            }}
                          >
                            Bearbeiten
                          </AdminBtn>
                          {p.review_status === "live" ? (
                            <AdminBtn
                              variant="quiet"
                              onClick={() =>
                                setStatus(p, "paused", "Angebot pausiert — nicht mehr sichtbar.")
                              }
                            >
                              Pausieren
                            </AdminBtn>
                          ) : (
                            <AdminBtn
                              variant="quiet"
                              onClick={() =>
                                setStatus(p, "live", "Angebot ist wieder öffentlich sichtbar.")
                              }
                            >
                              Reaktivieren
                            </AdminBtn>
                          )}
                        </>
                      )}
                      <AdminBtn
                        icon={Trash2}
                        variant="quiet"
                        title="Löschen"
                        onClick={() => remove(p.slug)}
                      />
                    </div>,
                  ]}
                />
              );
            })}
          </AdminTable>
        )}
      </AdminCard>

      <AdminCard>
        <AdminCardHead
          icon={Users}
          accent="indigo"
          title="Partner-Bewerbungen"
          sub="partner_applications"
        />
        {applications === null ? (
          <AdminLoading />
        ) : apps.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <p style={{ fontSize: 14.5, fontWeight: 650 }}>Noch keine Bewerbungen</p>
            <p style={{ fontSize: 13, color: "var(--a-smoke)", maxWidth: 420 }}>
              Bewerbungen über das öffentliche Partner-Formular landen automatisch in{" "}
              <span className="font-mono">partner_applications</span> und erscheinen hier.
            </p>
          </div>
        ) : (
          <AdminTable
            cols={APP_COLS}
            head={["Firma", "Bereich", "Ort", "Eingang", "Status", "Aktion"]}
          >
            {apps.map((a) => (
              <AdminRow
                key={a.id}
                cols={APP_COLS}
                cells={[
                  <div key="c" className="min-w-0">
                    <p className="truncate" style={{ fontWeight: 650 }}>
                      {a.company}
                    </p>
                    <p
                      className="truncate font-mono"
                      style={{ fontSize: 11, color: "var(--a-faint)" }}
                    >
                      {[a.contact_name, a.email].filter(Boolean).join(" · ") ||
                        "keine Kontaktdaten"}
                    </p>
                  </div>,
                  <span key="f" style={{ color: "var(--a-smoke)" }}>
                    {a.field ?? "—"}
                  </span>,
                  <span key="o" style={{ color: "var(--a-smoke)" }}>
                    {a.city ?? "—"}
                  </span>,
                  <span key="d" style={{ color: "var(--a-smoke)" }}>
                    {formatDateDE(a.created_at)}
                  </span>,
                  <AdminBadge key="s" variant={APP_STATUS[a.status] ?? "soft"}>
                    {a.status}
                  </AdminBadge>,
                  <div key="a" className="flex items-center gap-1.5">
                    <AdminBtn
                      variant="ghost"
                      disabled={!a.email}
                      onClick={() => {
                        if (!a.email) return;
                        window.location.href = `mailto:${a.email}?subject=${encodeURIComponent(
                          "Deine Partner-Anfrage bei matchfoundr",
                        )}`;
                      }}
                    >
                      Antworten
                    </AdminBtn>
                    <select
                      value={a.status}
                      onChange={(e) => setApplicationStatus(a, e.target.value)}
                      className="h-8 rounded-lg px-1.5 text-[12px]"
                      style={{
                        border: "1px solid var(--a-border-soft)",
                        background: "var(--a-surface-solid)",
                        color: "var(--a-ink)",
                      }}
                      aria-label="Status setzen"
                    >
                      {APP_STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>,
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
                {isNew ? "Neues Angebot" : "Angebot bearbeiten"}
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

              <Field label="Vorteil / Perk">
                <input
                  value={editing.perk ?? ""}
                  onChange={(e) => setEditing({ ...editing, perk: e.target.value || null })}
                  className={inputCls}
                  placeholder="20 % Rabatt im ersten Jahr"
                />
              </Field>

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

              <Field label="Logo (Quadrat) & Banner">
                <div className="flex flex-wrap items-center gap-2.5">
                  {editing.logo_url ? (
                    <img
                      src={editing.logo_url}
                      alt=""
                      className="h-12 w-12 rounded-xl border border-[var(--ruled)] bg-white object-contain p-1"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-dashed border-[var(--ruled)] text-[var(--faint)]">
                      <ImagePlus className="h-4 w-4" />
                    </div>
                  )}
                  <label className="cursor-pointer rounded-xl border border-[var(--ruled)] px-3 py-2 text-[12.5px] font-semibold text-[var(--ink)]">
                    {uploading === "logo" ? "Lädt…" : "Logo"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => onImage("logo", e.target.files?.[0])}
                    />
                  </label>
                  {editing.banner_url ? (
                    <img
                      src={editing.banner_url}
                      alt=""
                      className="h-12 w-24 rounded-lg border border-[var(--ruled)] object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-24 items-center justify-center rounded-lg border border-dashed border-[var(--ruled)] text-[var(--faint)]">
                      <ImagePlus className="h-4 w-4" />
                    </div>
                  )}
                  <label className="cursor-pointer rounded-xl border border-[var(--ruled)] px-3 py-2 text-[12.5px] font-semibold text-[var(--ink)]">
                    {uploading === "banner" ? "Lädt…" : "Banner"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => onImage("banner", e.target.files?.[0])}
                    />
                  </label>
                </div>
              </Field>

              <Field label="Freigabe-Status">
                <select
                  value={editing.review_status}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      review_status: e.target.value,
                      is_active: e.target.value === "live",
                    })
                  }
                  className={inputCls}
                >
                  <option value="review">Freigabe offen</option>
                  <option value="live">live</option>
                  <option value="paused">pausiert</option>
                </select>
              </Field>

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
