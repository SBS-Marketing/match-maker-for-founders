import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { IconMF } from "@/components/Logo";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const startCta = () => navigate({ to: user ? "/discover" : "/auth" });

  return (
    <div>
      {/* HERO */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-4xl px-6 pt-24 pb-24 text-center sm:pt-32 sm:pb-28">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 text-xs font-mono uppercase tracking-[0.18em] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            01 · Die Plattform
          </div>

          <h1 className="text-balance text-5xl font-semibold tracking-tight sm:text-6xl lg:text-7xl">
            Finde den Co-Founder,
            <br />
            <span className="font-serif italic font-normal text-primary">
              den du wirklich brauchst.
            </span>
          </h1>

          <p className="mx-auto mt-8 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
            matchfoundr ist ein fokussiertes Netzwerk für Gründer:innen auf der Suche nach
            ihrem ersten Partner. Echte Profile, kein Lebenslauf-Theater. Nur die eine Person,
            die das Unternehmen möglich macht.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" onClick={startCta} className="gap-2">
              Founder-Profil erstellen <ArrowRight className="h-4 w-4" />
            </Button>
            <Link to="/auth">
              <Button size="lg" variant="ghost">
                Anmelden
              </Button>
            </Link>
          </div>

          <div className="mt-16 flex justify-center">
            <IconMF size={56} />
          </div>
        </div>
      </section>

      {/* HOW */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="eyebrow mb-12">02 · So funktioniert es</div>
          <div className="grid gap-12 md:grid-cols-3">
            {[
              { n: "01", t: "Profil erstellen", d: "Wer du bist, was du baust, was du suchst — in unter fünf Minuten." },
              { n: "02", t: "Andere Founder entdecken", d: "Eine Person nach der anderen. Keine Listen, keine Algorithmen, die dich verkaufen." },
              { n: "03", t: "Direkt schreiben", d: "Wenn ihr euch beide für einander interessiert, beginnt das Gespräch sofort." },
            ].map((s) => (
              <div key={s.n} className="border-t border-border pt-6">
                <div className="eyebrow mb-4">{s.n}</div>
                <h3 className="text-xl font-semibold tracking-tight">{s.t}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MANIFESTO */}
      <section className="border-b border-border bg-secondary">
        <div className="mx-auto max-w-3xl px-6 py-28">
          <div className="eyebrow mb-10">03 · Manifest</div>
          <h2 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
            Kein Lebenslauf-Theater.
          </h2>
          <div className="mt-8 space-y-5 text-[17px] leading-relaxed text-muted-foreground">
            <p>
              Co-Founder finden ist keine Recruiting-Aufgabe. Es ist eine Entscheidung darüber,
              mit wem du die nächsten Jahre durchstehen willst — durch alles.
            </p>
            <p>
              Deshalb gibt es bei matchfoundr keine Punkte für Universitäten, keine Filter nach
              „Ex-FAANG", keine tausenden Profile zum Durchwischen. Stattdessen: ein klares
              Founder-Profil, das zeigt, wer du wirklich bist, was du baust und was du in einem
              Partner suchst.
            </p>
          </div>
          <p className="mt-10 font-serif italic text-3xl text-foreground">
            Eine Plattform. Eine Entscheidung. Eine Person.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-3xl px-6 py-24 text-center">
          <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Bereit anzufangen?
          </h2>
          <p className="mt-4 text-muted-foreground">
            Erstelle dein Founder-Profil und finde die Person, die dein Unternehmen möglich macht.
          </p>
          <Button size="lg" onClick={startCta} className="mt-8 gap-2">
            Founder-Profil erstellen <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </section>

      <footer>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-10 text-xs text-muted-foreground">
          <span className="font-mono uppercase tracking-[0.18em]">
            © {new Date().getFullYear()} matchfoundr
          </span>
          <span className="font-mono uppercase tracking-[0.18em]">Made for founders</span>
        </div>
      </footer>
    </div>
  );
}
