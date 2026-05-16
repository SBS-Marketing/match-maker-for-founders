import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/entdecken")({
  head: () => ({
    meta: [
      { title: "Entdecken — matchfoundr" },
      {
        name: "description",
        content:
          "Ein erster Blick auf Founder bei matchfoundr. Echte Profile, echte Ideen — mehr wartet hinter dem Login.",
      },
      { property: "og:title", content: "Entdecken — matchfoundr" },
      {
        property: "og:description",
        content:
          "Ein erster Blick auf Founder bei matchfoundr. Echte Profile, echte Ideen — mehr wartet hinter dem Login.",
      },
    ],
  }),
  component: DiscoverPage,
});

const FOUNDERS = [
  { name: "Lena, 29", role: "Technical Co-Founder", city: "Berlin", idea: "Klimadaten als API für mittelständische Industrie.", tags: ["AI", "B2B SaaS", "Climate"] },
  { name: "Jonas, 34", role: "Business / Sales", city: "München", idea: "Marktplatz für ungenutzte Lagerflächen in Innenstädten.", tags: ["Marketplace", "Logistik"] },
  { name: "Aylin, 27", role: "Product & Design", city: "Hamburg", idea: "Mental-Health-App für junge Eltern, kurze Sessions.", tags: ["Health", "Mobile", "B2C"] },
  { name: "Marek, 31", role: "Technical Co-Founder", city: "Köln", idea: "Open-Source-Tooling für Audits in regulierten Branchen.", tags: ["DevTools", "Fintech"] },
  { name: "Sofia, 26", role: "Growth / Marketing", city: "Leipzig", idea: "Kuratierte Reise-Editorials mit lokalem Handwerk.", tags: ["Travel", "Commerce"] },
  { name: "Tim, 38", role: "Domain Expert", city: "Stuttgart", idea: "Predictive Maintenance für mittelständische Fertigung.", tags: ["Industrial", "AI"] },
];

function DiscoverPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const startCta = () => navigate({ to: user ? "/discover" : "/auth" });

  return (
    <div>
      {/* HEADER */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-6 pt-24 pb-16 sm:pt-32">
          <div className="grid gap-10 sm:grid-cols-[200px_1fr] sm:gap-16">
            <div className="eyebrow pt-2">Entdecken</div>
            <div>
              <h1 className="text-balance text-5xl font-semibold tracking-tight sm:text-6xl">
                Ein erster Blick.<br />
                <span className="font-serif italic font-normal text-primary">
                  Mehr wartet hinter dem Login.
                </span>
              </h1>
              <p className="mt-6 max-w-2xl text-pretty text-[17px] leading-relaxed text-muted-foreground">
                Eine kleine Auswahl an Foundern, die gerade bei matchfoundr unterwegs sind.
                Wenn dich jemand interessiert — melde dich an und schreib direkt.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* GRID */}
      <section className="border-b border-border bg-secondary">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="relative">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {FOUNDERS.map((p) => (
                <article
                  key={p.name}
                  className="rounded-2xl border border-border bg-background p-6"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-full font-mono text-sm font-medium"
                        style={{ background: "var(--ember-tint)", color: "var(--ember-deep)" }}
                      >
                        {p.name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-sm font-semibold leading-tight">{p.name}</div>
                        <div className="text-xs text-muted-foreground">{p.city}</div>
                      </div>
                    </div>
                    <span className="eyebrow !text-[10px] text-right">{p.role}</span>
                  </div>
                  <p className="mt-5 text-[15px] leading-relaxed">„{p.idea}"</p>
                  <div className="mt-5 flex flex-wrap gap-1.5">
                    {p.tags.map((t) => (
                      <span
                        key={t}
                        className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="mt-20 flex flex-col items-center gap-4 text-center">
            <div className="eyebrow">+ 240 weitere Founder</div>
            <h3 className="font-serif italic text-3xl text-foreground sm:text-4xl">
              Mehr Founder entdecken.
            </h3>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
              <Button size="lg" onClick={startCta} className="gap-2">
                Jetzt anmelden <ArrowRight className="h-4 w-4" />
              </Button>
              <Link to="/">
                <Button size="lg" variant="ghost">
                  Zurück zur Startseite
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
