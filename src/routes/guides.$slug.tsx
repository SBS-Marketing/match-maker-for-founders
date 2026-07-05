// Guide-Artikel — ruhig lesbar, mobile-first, mit Co-Pilot-Anschluss.

import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Clock3 } from "lucide-react";
import { AuthGate } from "@/components/AuthGate";
import { CopilotMark } from "@/components/Copilot";
import { GUIDES, GUIDE_CATEGORIES, getGuide, type GuideSection } from "@/data/guides";

export const Route = createFileRoute("/guides/$slug")({
  loader: ({ params }) => {
    const guide = getGuide(params.slug);
    if (!guide) throw notFound();
    return { guide };
  },
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.guide.title} — matchfoundr` }],
  }),
  component: () => (
    <AuthGate>
      <GuideArticle />
    </AuthGate>
  ),
});

function GuideArticle() {
  const { guide } = Route.useLoaderData();
  const categoryLabel = GUIDE_CATEGORIES.find((c) => c.id === guide.category)?.label ?? "Guide";
  const related = GUIDES.filter(
    (g) => g.category === guide.category && g.slug !== guide.slug,
  ).slice(0, 2);

  return (
    <div className="mx-auto max-w-2xl px-4 pt-6 pb-24 sm:px-6">
      <Link
        to="/guides"
        className="inline-flex min-h-[44px] items-center gap-1.5 text-[13px] font-semibold text-[var(--smoke)] hover:text-[var(--ink)]"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Alle Guides
      </Link>

      {/* Kopf */}
      <div className="mt-2">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ember-deep)]">
          {categoryLabel}
          <span className="inline-flex items-center gap-1 text-[var(--faint)]">
            <Clock3 className="h-3 w-3" /> {guide.minutes} Min Lesezeit
          </span>
        </div>
        <h1 className="mt-2 text-[26px] font-semibold leading-tight tracking-tight text-[var(--ink)] sm:text-[30px]">
          {guide.title}
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-[var(--smoke)]">{guide.intro}</p>
      </div>

      {/* Abschnitte */}
      <article className="mt-6 space-y-6">
        {guide.sections.map((section, idx) => (
          <section key={section.h}>
            <h2 className="flex items-baseline gap-2.5 text-[17px] font-semibold tracking-tight text-[var(--ink)]">
              <span className="font-mono text-[11px] font-semibold text-[var(--ember)]">
                {String(idx + 1).padStart(2, "0")}
              </span>
              {section.h}
            </h2>
            <p className="mt-2 text-[14.5px] leading-relaxed text-[var(--ink-soft)]">
              {section.body}
            </p>
          </section>
        ))}
      </article>

      {/* Co-Pilot-Anschluss — Wissen wird Handlung */}
      <div className="mt-8 rounded-[18px] border border-[var(--ruled)] bg-[var(--surface)] p-5 shadow-warm">
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-xl text-white"
            style={{ background: "var(--indigo-grad)" }}
          >
            <CopilotMark size={15} color="white" />
          </span>
          <div>
            <div className="text-[14px] font-semibold text-[var(--ink)]">
              Auf dein Vorhaben anwenden?
            </div>
            <div className="text-[12px] text-[var(--smoke)]">
              Der Co-Pilot kennt deinen Stand und macht daraus konkrete Schritte.
            </div>
          </div>
        </div>
        <Link
          to="/co-pilot"
          className="mt-3.5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl text-[13.5px] font-semibold text-white sm:w-auto sm:px-5"
          style={{ background: "var(--indigo-grad)" }}
        >
          Co-Pilot fragen <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Verwandte Guides */}
      {related.length > 0 && (
        <div className="mt-6">
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--smoke)]">
            Passt dazu
          </div>
          <div className="mt-2.5 grid gap-2.5">
            {related.map((r) => (
              <Link
                key={r.slug}
                to="/guides/$slug"
                params={{ slug: r.slug }}
                className="flex min-h-[44px] items-center justify-between gap-3 rounded-2xl border border-[var(--ruled)] bg-[var(--surface)] px-4 py-3 text-[13.5px] font-semibold text-[var(--ink)] transition hover:bg-[var(--ember-tint)] hover:text-[var(--ember-deep)]"
              >
                {r.title}
                <ArrowRight className="h-3.5 w-3.5 shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
