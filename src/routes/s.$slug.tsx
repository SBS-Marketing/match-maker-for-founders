// Öffentliches Firmenprofil — die Werbefläche eines Startups.
// Ohne App-Shell, ohne Login: teilbar auf LinkedIn, in Pitches, überall.

import { useEffect, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { readComposition, type CompanyComposition } from "@/lib/company-blocks";
import { CompanyBlocksView } from "@/components/CompanyBlocksView";

export const Route = createFileRoute("/s/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug} — auf matchfoundr` },
      {
        name: "description",
        content: "Ein Startup-Profil auf matchfoundr — der Plattform für Founder.",
      },
    ],
  }),
  component: PublicCompanyPage,
});

type LoadState = "loading" | "ready" | "notfound";

function PublicCompanyPage() {
  const { slug } = Route.useParams();
  const [composition, setComposition] = useState<CompanyComposition | null>(null);
  const [state, setState] = useState<LoadState>("loading");

  useEffect(() => {
    let cancelled = false;

    // "preview" = lokale Vorschau aus dem eigenen Builder (Demo-Modus).
    if (slug === "preview") {
      const local = readComposition(null);
      if (local.blocks.length > 0) {
        setComposition(local);
        setState("ready");
      } else {
        setState("notfound");
      }
      return;
    }

    supabase
      .from("company_profiles")
      .select("name, composition, published")
      .eq("slug", slug)
      .eq("published", true)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const remote = data?.composition as unknown as CompanyComposition | undefined;
        if (remote && Array.isArray(remote.blocks) && remote.blocks.length > 0) {
          setComposition(remote);
          setState("ready");
        } else {
          setState("notfound");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (state === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--canvas)] text-sm text-[var(--smoke)]">
        Lade Profil…
      </div>
    );
  }

  if (state === "notfound" || !composition) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--canvas)] px-4">
        <div className="max-w-md text-center">
          <Building2 className="mx-auto h-10 w-10 text-[var(--faint)]" />
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-[var(--ink)]">
            Profil nicht gefunden
          </h1>
          <p className="mt-2 text-[14px] leading-relaxed text-[var(--smoke)]">
            Dieses Firmenprofil existiert nicht oder ist nicht öffentlich.
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-[var(--ember)] px-5 text-[13.5px] font-semibold text-white hover:bg-[var(--ember-deep)]"
          >
            Zu matchfoundr <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--canvas)]">
      {/* Schlanke öffentliche Top-Leiste */}
      <header className="sticky top-0 z-20 border-b border-[var(--ruled-soft)] bg-[rgba(250,248,243,0.92)] backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="text-[16px] font-bold tracking-[-0.03em] text-[var(--ink)]">
            matchfoundr<span className="text-[var(--ember)]">.</span>
          </Link>
          <Link
            to="/auth"
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[var(--ember)] px-4 text-[12.5px] font-semibold text-white shadow-ember hover:bg-[var(--ember-deep)]"
          >
            Eigenes Profil erstellen <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>

      {/* Profil-Inhalt */}
      <main className="mx-auto max-w-5xl px-3 py-6 sm:px-6 sm:py-10">
        <div className="overflow-hidden rounded-[22px] border border-[var(--ruled)] bg-[var(--surface)] shadow-warm-lg">
          <CompanyBlocksView composition={composition} />
        </div>

        {/* Community-Fußzeile */}
        <div className="mt-8 rounded-[18px] border border-[var(--ruled)] bg-[var(--surface)] p-6 text-center">
          <div className="text-[15px] font-semibold text-[var(--ink)]">
            {composition.name} baut auf matchfoundr.
          </div>
          <p className="mx-auto mt-1 max-w-md text-[13px] leading-relaxed text-[var(--smoke)]">
            Co-Founder, Förderung, Kapital, Mentoren — eine Plattform, ein Co-Pilot. Bau dein
            Vorhaben mit uns.
          </p>
          <Link
            to="/auth"
            className="mt-4 inline-flex h-10 items-center gap-2 rounded-full border border-[var(--ruled)] bg-[var(--surface-soft)] px-5 text-[13px] font-semibold text-[var(--ink)] hover:bg-[var(--ember-tint)] hover:text-[var(--ember-deep)]"
          >
            Kostenlos starten <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </main>
    </div>
  );
}
