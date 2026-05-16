import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Users, MessageSquare } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // If logged in, send to discover
  useEffect(() => {
    // no auto-redirect — let user see landing
  }, [user]);

  const startCta = () => navigate({ to: user ? "/discover" : "/auth" });

  return (
    <div>
      {/* HERO */}
      <section className="relative">
        <div className="mx-auto max-w-4xl px-6 pt-24 pb-20 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/40 px-3 py-1 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            01 — Die Plattform
          </div>
          <h1 className="text-balance text-5xl font-semibold tracking-tight sm:text-6xl">
            Finde den Co-Founder,
            <br />
            <span className="text-primary">den du wirklich brauchst.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg">
            matchfoundr ist ein fokussiertes Netzwerk für Gründer:innen auf der Suche nach ihrem ersten Partner.
            Echte Profile, kein Lebenslauf-Theater. Nur die eine Person, die das Unternehmen möglich macht.
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
        </div>

        {/* subtle grid bg */}
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-[0.035] [background:radial-gradient(circle_at_50%_0,white,transparent_60%)]" />
      </section>

      {/* HOW */}
      <section className="border-t border-border">
        <div className="mx-auto grid max-w-5xl gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-3 mt-20">
          {[
            { icon: Sparkles, title: "Profil erstellen", text: "Wer du bist, was du baust, was du suchst — in unter fünf Minuten." },
            { icon: Users, title: "Andere Founder entdecken", text: "Eine Person nach der anderen. Keine Listen, keine Algorithmen, die dich verkaufen." },
            { icon: MessageSquare, title: "Direkt schreiben", text: "Wenn ihr euch beide für einander interessiert, beginnt das Gespräch sofort." },
          ].map((s) => (
            <div key={s.title} className="bg-background p-8">
              <s.icon className="h-5 w-5 text-primary" />
              <h3 className="mt-4 font-medium">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* MANIFESTO */}
      <section className="border-t border-border mt-20">
        <div className="mx-auto max-w-3xl px-6 py-24">
          <h2 className="text-3xl font-semibold tracking-tight">Kein Lebenslauf-Theater.</h2>
          <div className="mt-6 space-y-4 text-muted-foreground">
            <p>
              Co-Founder finden ist keine Recruiting-Aufgabe. Es ist eine Entscheidung darüber, mit wem du
              die nächsten Jahre durchstehen willst — durch alles.
            </p>
            <p>
              Deshalb gibt es bei matchfoundr keine Punkte für Universitäten, keine Filter nach „Ex-FAANG", keine
              Tausende Profile zum Durchwischen. Stattdessen: ein klares Founder-Profil, das zeigt, wer du wirklich bist,
              was du baust und was du in einem Partner suchst.
            </p>
            <p className="text-foreground">Eine Plattform. Eine Entscheidung. Eine Person.</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-3xl px-6 py-20 text-center">
          <h2 className="text-3xl font-semibold tracking-tight">Bereit anzufangen?</h2>
          <p className="mt-3 text-muted-foreground">
            Erstelle dein Founder-Profil und finde die Person, die dein Unternehmen möglich macht.
          </p>
          <Button size="lg" onClick={startCta} className="mt-8 gap-2">
            Founder-Profil erstellen <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-8 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} matchfoundr</span>
          <span>Made for founders.</span>
        </div>
      </footer>
    </div>
  );
}
