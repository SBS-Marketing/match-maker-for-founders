// ─────────────────────────────────────────────────────────────
// /deals — Browsebare Übersicht aller Startup-Deals & Credits
// Quelle: public/deals.json (wöchentlich via GitHub Action).
// ─────────────────────────────────────────────────────────────

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowUpRight, Filter, Sparkles } from "lucide-react";
import { DEALS, DEAL_CATEGORIES, DEALS_GENERATED_AT, DEALS_STATS } from "@/data/deals";

export const Route = createFileRoute("/deals")({
  head: () => ({
    meta: [
      { title: "Startup-Deals & Credits — matchfoundr" },
      {
        name: "description",
        content:
          "Kuratierte Vergünstigungen für Gründer: Cloud-Credits, SaaS-Rabatte, Legal-, HR- und Marketing-Deals — wöchentlich aktualisiert.",
      },
      { property: "og:title", content: "Startup-Deals & Credits — matchfoundr" },
      {
        property: "og:description",
        content:
          "Kuratierte Vergünstigungen für Gründer: Cloud-Credits, SaaS-Rabatte, Legal-, HR- und Marketing-Deals — wöchentlich aktualisiert.",
      },
    ],
  }),
  component: DealsPage,
});

function DealsPage() {
  const [cat, setCat] = useState<string>("all");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return DEALS.filter((d) => {
      if (cat !== "all" && d.cat !== cat) return false;
      if (!query) return true;
      const hay = `${d.company} ${d.product} ${d.desc} ${d.tags?.join(" ") ?? ""}`.toLowerCase();
      return hay.includes(query);
    });
  }, [cat, q]);

  const generated = DEALS_GENERATED_AT
    ? new Date(DEALS_GENERATED_AT).toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" })
    : null;

  return (
    <div className="mx-auto max-w-6xl px-4 pt-10 pb-24 sm:px-6">
      <section className="pt-6">
        <div className="eyebrow">
          Deals · {DEALS.length} aktiv
          {DEALS_STATS?.total_value_approx ? ` · Volumen ${DEALS_STATS.total_value_approx}` : ""}
        </div>
        <h1 className="mt-5 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
          Startup-<span className="text-[var(--ember)]">Deals & Credits</span>, kuratiert.
        </h1>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-[var(--smoke)]">
          Cloud-Credits, SaaS-Rabatte, Legal-, HR- und Marketing-Angebote. Wöchentlich neu gescannt
          {generated ? ` — Stand ${generated}` : ""}.
        </p>
      </section>

      {/* Filter */}
      <section className="mt-8 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setCat("all")}
          className={chipCls(cat === "all")}
          aria-pressed={cat === "all"}
        >
          <Sparkles className="h-3.5 w-3.5" /> Alle · {DEALS.length}
        </button>
        {DEAL_CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => setCat(c.id)}
            className={chipCls(cat === c.id)}
            aria-pressed={cat === c.id}
          >
            <span>{c.icon}</span> {c.label} · {c.count}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-1.5 rounded-xl border border-[var(--ruled)] bg-[var(--surface)] px-3 py-1.5">
          <Filter className="h-3.5 w-3.5 text-[var(--faint)]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Suche… (AWS, Legal, HR …)"
            className="w-44 bg-transparent text-[13px] text-[var(--ink)] outline-none placeholder:text-[var(--faint)]"
          />
        </div>
      </section>

      {/* Grid */}
      <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-dashed border-[var(--ruled)] p-10 text-center text-[13px] text-[var(--smoke)]">
            Keine Deals passen zu deiner Suche.
          </div>
        ) : (
          filtered.map((d) => (
            <a
              key={d.id}
              href={d.claim_url || d.url}
              target="_blank"
              rel="noreferrer"
              className="group flex flex-col rounded-2xl border border-[var(--ruled)] bg-[var(--surface)] p-4 transition hover:-translate-y-0.5 hover:border-[var(--ink-soft)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--canvas)] text-[20px]">
                    {d.logo || d.cat_icon}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-bold text-[var(--ink)]">{d.product}</p>
                    <p className="truncate text-[12px] text-[var(--smoke)]">{d.company}</p>
                  </div>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide ${badgeClass(
                    d.badge_class,
                  )}`}
                >
                  {d.badge}
                </span>
              </div>

              <p className="mt-3 text-[13px] font-semibold text-[var(--ink)]">{d.value}</p>
              <p className="mt-1 line-clamp-3 text-[12.5px] leading-relaxed text-[var(--smoke)]">{d.desc}</p>

              {d.tags?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {d.tags.slice(0, 4).map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-[var(--canvas)] px-2 py-0.5 text-[10.5px] font-medium text-[var(--ink-soft)]"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-auto flex items-center justify-between pt-4 text-[12px] text-[var(--faint)]">
                <span>{d.cat_label}</span>
                <span className="inline-flex items-center gap-1 font-semibold text-[var(--ink-soft)] group-hover:text-[var(--ember)]">
                  Angebot ansehen <ArrowUpRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </a>
          ))
        )}
      </section>
    </div>
  );
}

function chipCls(active: boolean) {
  return `inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[12.5px] font-semibold transition ${
    active
      ? "border-[var(--ink)] bg-[var(--ink)] text-white"
      : "border-[var(--ruled)] bg-[var(--surface)] text-[var(--smoke)] hover:text-[var(--ink)]"
  }`;
}

function badgeClass(kind: string): string {
  switch (kind) {
    case "epic":
      return "bg-[var(--ember-tint)] text-[var(--ember-deep)]";
    case "premium":
      return "bg-[var(--indigo)]/10 text-[var(--indigo)]";
    case "hot":
      return "bg-orange-100 text-orange-700";
    default:
      return "bg-[var(--canvas)] text-[var(--ink-soft)]";
  }
}
