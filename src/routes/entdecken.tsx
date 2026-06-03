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

const AVATAR_COLORS = [
  "var(--ember)",
  "var(--ember-deep)",
  "var(--ink-soft)",
  "var(--smoke)",
  "var(--ember-light)",
  "#8B5A3C",
  "#3D5A4A",
  "#5A4A2A",
];

const FOUNDERS = [
  { name: "Lena Brandt", age: 29, role: "Technical Co-Founder", city: "Berlin", fit: 94, idea: "Klimadaten als API für mittelständische Industrie. Skaliert seit 2 Jahren — sucht jetzt jemand für GTM.", tags: ["AI", "B2B SaaS", "Climate"] },
  { name: "Jonas Kessler", age: 34, role: "Business / Sales", city: "München", fit: 87, idea: "Marktplatz für ungenutzte Lagerflächen in Innenstädten. Erste Pilotkunden in DACH.", tags: ["Marketplace", "Logistik"] },
  { name: "Aylin Demir", age: 27, role: "Product & Design", city: "Hamburg", fit: 82, idea: "Mental-Health-App für junge Eltern. Kurze Sessions, hohe Retention im Pilot.", tags: ["Health", "Mobile", "B2C"] },
  { name: "Marek Nowak", age: 31, role: "Technical Co-Founder", city: "Köln", fit: 79, idea: "Open-Source-Tooling für Audits in regulierten Branchen. Stark wachsende Community.", tags: ["DevTools", "Fintech"] },
  { name: "Sofia Hellström", age: 26, role: "Growth / Marketing", city: "Leipzig", fit: 76, idea: "Kuratierte Reise-Editorials mit lokalem Handwerk. Erste Magazin-Ausgabe sold out.", tags: ["Travel", "Commerce"] },
  { name: "Tim Berger", age: 38, role: "Domain Expert", city: "Stuttgart", fit: 73, idea: "Predictive Maintenance für mittelständische Fertigung. 15 Jahre Domain, sucht Tech.", tags: ["Industrial", "AI"] },
];

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function colorFor(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[h];
}

function DiscoverPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const startCta = () => navigate({ to: user ? "/discover" : "/auth" });

  return (
    <div className="mx-auto max-w-6xl px-4 pt-10 pb-24 sm:px-6">
      {/* HEADER */}
      <section className="pt-10">
        <div className="eyebrow">Entdecken · 6 Profile zur Vorschau</div>
        <h1 className="mt-5 text-balance text-5xl font-semibold tracking-tight sm:text-6xl">
          Menschen, die du{" "}
          <span className="text-[var(--ember)]">treffen solltest</span>.
        </h1>
        <p className="mt-6 max-w-2xl text-pretty text-[16px] leading-relaxed text-[var(--smoke)]">
          Eine kleine Auswahl an Foundern, die gerade bei matchfoundr unterwegs sind.
          Wenn dich jemand interessiert — melde dich an und schreib direkt.
        </p>
      </section>

      {/* GRID */}
      <section className="mt-14">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FOUNDERS.map((p, idx) => {
            const highlighted = idx === 0;
            return (
              <article
                key={p.name}
                className={`${highlighted ? "glass-pane-ember" : "glass-pane"} p-6`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-11 w-11 items-center justify-center rounded-full font-mono text-[13px] font-semibold"
                      style={{
                        background: highlighted ? "rgba(251,250,247,0.18)" : colorFor(p.name),
                        color: "var(--cream)",
                        boxShadow: "inset 0 0 0 1.5px rgba(255,255,255,0.2)",
                      }}
                    >
                      {initials(p.name)}
                    </div>
                    <div>
                      <div className={`text-[15px] font-semibold leading-tight ${highlighted ? "text-[var(--cream)]" : "text-[var(--ink)]"}`}>
                        {p.name}
                      </div>
                      <div
                        className="mt-0.5 text-[12px]"
                        style={{ color: highlighted ? "rgba(251,250,247,0.78)" : "var(--smoke)" }}
                      >
                        {p.role} · {p.city}
                      </div>
                    </div>
                  </div>
                  <div
                    className="rounded-full px-2.5 py-1 font-mono text-[11px] font-semibold"
                    style={{
                      background: highlighted ? "rgba(251,250,247,0.18)" : "var(--ember-tint)",
                      color: highlighted ? "var(--cream)" : "var(--ember-deep)",
                    }}
                  >
                    {p.fit}/100
                  </div>
                </div>

                <p
                  className="mt-5 text-[14px] leading-relaxed"
                  style={{ color: highlighted ? "rgba(251,250,247,0.92)" : "var(--ink-soft)" }}
                >
                  „{p.idea}"
                </p>

                <div className="mt-5 flex flex-wrap gap-1.5">
                  {p.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-full px-2.5 py-1 text-[11px]"
                      style={{
                        background: highlighted ? "rgba(251,250,247,0.16)" : "rgba(255,255,255,0.5)",
                        border: highlighted ? "1px solid rgba(255,200,170,0.4)" : "1px solid var(--ruled)",
                        color: highlighted ? "var(--cream)" : "var(--smoke)",
                      }}
                    >
                      {t}
                    </span>
                  ))}
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-[rgba(255,255,255,0.18)] pt-4">
                  <span
                    className="text-[11px] font-mono uppercase tracking-[0.16em]"
                    style={{ color: highlighted ? "rgba(251,250,247,0.65)" : "var(--smoke)" }}
                  >
                    Aktiv · vor 2h
                  </span>
                  <Button
                    size="sm"
                    onClick={startCta}
                    className={
                      highlighted
                        ? "h-8 rounded-full bg-[var(--cream)] px-3 text-[12px] text-[var(--ember-deep)] hover:bg-[var(--cream)]/90"
                        : "shadow-ember h-8 rounded-full bg-[var(--ember)] px-3 text-[12px] text-[var(--cream)] hover:bg-[var(--ember-deep)]"
                    }
                  >
                    Anschreiben <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                </div>
              </article>
            );
          })}
        </div>

        {/* CTA */}
        <div className="glass-pane mt-14 p-10 text-center sm:p-14">
          <div className="eyebrow">+ 240 weitere Founder</div>
          <h3 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Mehr Founder{" "}
            <span className="text-[var(--ember)]">entdecken</span>.
          </h3>
          <p className="mx-auto mt-4 max-w-md text-[14px] text-[var(--smoke)]">
            Melde dich an, um das vollständige Feed zu sehen und direkt zu schreiben.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Button
              size="lg"
              onClick={startCta}
              className="shadow-ember h-12 gap-2 rounded-xl bg-[var(--ember)] px-5 text-[var(--cream)] hover:bg-[var(--ember-deep)]"
            >
              Jetzt anmelden <ArrowRight className="h-4 w-4" />
            </Button>
            <Link to="/">
              <Button size="lg" variant="ghost" className="rounded-xl">
                Zurück zur Startseite
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
