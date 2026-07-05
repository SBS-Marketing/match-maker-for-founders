// Guides — Schritt-für-Schritt-Wissen für kleine Gründungen.
// Clean: Suche, Kategorie-Chips, Karten. Keine Erklärtexte.

import { useMemo, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Clock3, Search } from "lucide-react";
import { AuthGate } from "@/components/AuthGate";
import { GUIDES, GUIDE_CATEGORIES, searchGuides, type GuideCategory } from "@/data/guides";

export const Route = createFileRoute("/guides/")({
  head: () => ({ meta: [{ title: "Guides — matchfoundr" }] }),
  component: () => (
    <AuthGate>
      <GuidesPage />
    </AuthGate>
  ),
});

const CATEGORY_LABEL: Record<GuideCategory, string> = Object.fromEntries(
  GUIDE_CATEGORIES.map((c) => [c.id, c.label]),
) as Record<GuideCategory, string>;

function GuidesPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<GuideCategory | "alle">("alle");

  const guides = useMemo(() => {
    const bySearch = searchGuides(query);
    return category === "alle" ? bySearch : bySearch.filter((g) => g.category === category);
  }, [query, category]);

  return (
    <div className="mx-auto max-w-4xl px-4 pt-6 pb-24 sm:px-6">
      {/* Suche */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--faint)]" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Wonach suchst du? Gewerbe, Steuern, Kunden…"
          className="h-12 w-full rounded-2xl border border-[var(--ruled)] bg-[var(--surface)] pl-10 pr-4 text-[14px] text-[var(--ink)] outline-none placeholder:text-[var(--faint)] focus:border-[var(--ember)]"
        />
      </div>

      {/* Kategorie-Chips */}
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {[{ id: "alle" as const, label: "Alle" }, ...GUIDE_CATEGORIES].map((c) => (
          <button
            key={c.id}
            onClick={() => setCategory(c.id)}
            className="min-h-[40px] shrink-0 rounded-full border px-4 text-[13px] font-semibold transition"
            style={{
              background: category === c.id ? "var(--ember-tint)" : "var(--surface)",
              borderColor: category === c.id ? "var(--ember)" : "var(--ruled)",
              color: category === c.id ? "var(--ember-deep)" : "var(--smoke)",
            }}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Karten */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {guides.map((guide) => (
          <Link
            key={guide.slug}
            to="/guides/$slug"
            params={{ slug: guide.slug }}
            className="group flex flex-col rounded-[18px] border border-[var(--ruled)] bg-[var(--surface)] p-5 shadow-warm transition hover:-translate-y-0.5 hover:shadow-warm-lg"
          >
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ember-deep)]">
              {CATEGORY_LABEL[guide.category]}
              <span className="inline-flex items-center gap-1 text-[var(--faint)]">
                <Clock3 className="h-3 w-3" /> {guide.minutes} Min
              </span>
            </div>
            <h2 className="mt-2 text-[16.5px] font-semibold leading-snug tracking-tight text-[var(--ink)]">
              {guide.title}
            </h2>
            <p className="mt-1.5 flex-1 text-[13px] leading-relaxed text-[var(--smoke)]">
              {guide.intro}
            </p>
            <span className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[var(--ember-deep)]">
              Lesen <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
            </span>
          </Link>
        ))}
      </div>

      {guides.length === 0 && (
        <div className="mt-6 rounded-2xl border border-[var(--ruled)] bg-[var(--surface-soft)] p-6 text-center text-[13.5px] text-[var(--smoke)]">
          Nichts gefunden zu „{query}" — frag den Co-Pilot, der kennt alle {GUIDES.length} Guides.
        </div>
      )}
    </div>
  );
}
