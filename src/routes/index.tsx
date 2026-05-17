import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

const PREVIEW = [
  { initials: "AW", name: "Anna Wojcik", role: "Technical · Backend Infra", city: "Berlin", quote: "Hat Payments bei Stripe gebaut.", fit: 94, color: "var(--ember-deep)" },
  { initials: "MR", name: "Mathieu Royer", role: "Design + Product", city: "Paris", quote: "Sucht Technical Co-Founder.", fit: 87, color: "var(--ink-soft)" },
  { initials: "PR", name: "Priya Ramanathan", role: "Sales + GTM", city: "London", quote: "Gleicher Markt. Andere Bewegung.", fit: 81, color: "var(--ember)" },
];

const STATS = [
  { v: "14d", k: "Match in", d: "Median — vom Profil zum ersten Call" },
  { v: "78%", k: "Über 6 Monate dabei", d: "Paare, die unterschrieben haben" },
  { v: "8", k: "Cohorts", d: "Alle 6 Wochen, gecapped bei 60" },
  { v: "2024", k: "Seit", d: "matchfoundr ist in 4 Städten" },
];

const STEPS = [
  { n: "01", t: "Profil erstellen", d: "Wer du bist, was du baust, was du suchst — in unter fünf Minuten." },
  { n: "02", t: "Founder entdecken", d: "Eine Person nach der anderen. Keine Listen, keine Algorithmen, die dich verkaufen." },
  { n: "03", t: "Direkt schreiben", d: "Wenn ihr euch beide für einander interessiert, beginnt das Gespräch sofort." },
];

function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const startCta = () => navigate({ to: user ? "/discover" : "/auth" });

  return (
    <div className="mx-auto max-w-6xl px-4 pt-10 pb-24 sm:px-6">
      {/* HERO */}
      <section className="grid gap-8 pt-8 lg:grid-cols-[1.15fr_0.85fr] lg:gap-12 lg:pt-14">
        {/* Hero left */}
        <div>
          <div className="glass-pill inline-flex items-center gap-2 py-1.5 pl-1.5 pr-3">
            <span className="rounded-full bg-[var(--ember)] px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--cream)]">
              Neu
            </span>
            <span className="eyebrow !text-[10px]">Spring Cohort · 412 Founder</span>
          </div>

          <h1 className="mt-7 text-balance text-5xl font-semibold leading-[1.02] tracking-tight sm:text-6xl lg:text-[80px]">
            Finde den{" "}
            <span className="font-serif italic font-normal">founder</span>,
            <br />
            mit dem du es{" "}
            <span className="font-serif italic font-normal">baust</span>
            <span className="text-[var(--ember)]">.</span>
          </h1>

          <p className="mt-7 max-w-xl text-pretty text-[17px] leading-relaxed text-[var(--smoke)]">
            Wir sind keine Dating-App für Startups. Wir sind eine langsame,
            bewusste Suche — drei Monate Gespräche, bevor jemand etwas unterschreibt.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Button
              size="lg"
              onClick={startCta}
              className="shadow-ember h-12 gap-2 rounded-xl bg-[var(--ember)] px-5 text-[15px] text-[var(--cream)] hover:bg-[var(--ember-deep)]"
            >
              In 12 Minuten starten <ArrowRight className="h-4 w-4" />
            </Button>
            <button
              type="button"
              className="glass-pill flex h-12 items-center gap-3 pl-1.5 pr-5 text-[14px] text-[var(--ink)] transition hover:bg-white/70"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--ink)] text-[var(--cream)]">
                <Play className="h-3.5 w-3.5 fill-current" />
              </span>
              So funktioniert's
              <span className="eyebrow !text-[10px] !tracking-[0.14em]">2:14</span>
            </button>
          </div>

          <div className="mt-14">
            <div className="eyebrow mb-4">Founder von</div>
            <div className="flex flex-wrap items-center gap-x-7 gap-y-3 text-[var(--ink)]/65">
              <span className="font-mono text-sm font-semibold tracking-tight">Stripe</span>
              <span className="text-sm font-medium italic" style={{ fontFamily: "var(--font-serif)" }}>Linear</span>
              <span className="font-sans text-sm font-extrabold uppercase tracking-[0.2em]">Figma</span>
              <span className="font-sans text-sm font-medium">vercel<span className="text-[var(--ember)]">/</span></span>
              <span className="font-mono text-sm">n8n</span>
            </div>
          </div>
        </div>

        {/* Hero right — live match preview */}
        <div className="glass-pane p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="eyebrow">Heute · 3 likely fits</div>
            <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.18em] text-[var(--smoke)]">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Live
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {PREVIEW.map((p) => (
              <div key={p.initials} className="glass-pane-soft flex items-center gap-4 p-4">
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-mono text-[13px] font-semibold text-[var(--cream)]"
                  style={{ background: p.color, boxShadow: "inset 0 0 0 1.5px rgba(255,255,255,0.18)" }}
                >
                  {p.initials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <div className="truncate text-[14px] font-semibold text-[var(--ink)]">{p.name}</div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--smoke)]">{p.city}</div>
                  </div>
                  <div className="mt-0.5 truncate text-[12px] text-[var(--smoke)]">{p.role}</div>
                  <div
                    className="mt-1.5 truncate text-[12px] italic text-[var(--ink-soft)]"
                    style={{ fontFamily: "var(--font-serif)" }}
                  >
                    „{p.quote}"
                  </div>
                </div>
                <div className="text-right">
                  <div className="eyebrow !text-[9px]">Fit</div>
                  <div
                    className="text-2xl font-semibold leading-none text-[var(--ember)]"
                    style={{ letterSpacing: "-0.035em" }}
                  >
                    {p.fit}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 flex items-center justify-between text-[11px] font-mono uppercase tracking-[0.18em] text-[var(--smoke)]">
            <span>Sample Feed · Live Preview</span>
            <Link to="/entdecken" className="text-[var(--ink)] hover:text-[var(--ember)]">
              Alle 11 →
            </Link>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="mt-20">
        <div className="glass-pane grid grid-cols-2 divide-y divide-[var(--ruled)] sm:grid-cols-4 sm:divide-x sm:divide-y-0">
          {STATS.map((s) => (
            <div key={s.k} className="p-6 sm:p-7">
              <div
                className="text-4xl font-semibold text-[var(--ink)]"
                style={{ letterSpacing: "-0.035em" }}
              >
                {s.v}
              </div>
              <div className="eyebrow mt-2">{s.k}</div>
              <div className="mt-1 text-[12px] leading-relaxed text-[var(--smoke)]">{s.d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW */}
      <section id="how-it-works" className="mt-24 scroll-mt-28">
        <div className="grid gap-10 sm:grid-cols-[200px_1fr] sm:gap-16">
          <div className="eyebrow pt-2">02 · So funktioniert es</div>
          <h2 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
            Drei Schritte.
            <br />
            <span className="font-serif italic font-normal text-[var(--ember)]">Eine Begegnung.</span>
          </h2>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="glass-pane p-7">
              <div
                className="font-serif text-5xl italic text-[var(--ember)]"
                style={{ letterSpacing: "-0.02em" }}
              >
                {s.n}
              </div>
              <h3 className="mt-5 text-xl font-semibold tracking-tight">{s.t}</h3>
              <p className="mt-3 text-[14px] leading-relaxed text-[var(--smoke)]">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* DISCOVER TEASER */}
      <section id="find-a-match" className="mt-24 scroll-mt-28">
        <div className="glass-pane grid gap-8 p-8 sm:grid-cols-[200px_1fr] sm:gap-12 sm:p-12">
          <div className="eyebrow pt-2">03 · Entdecken</div>
          <div>
            <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              Wirf einen Blick rein.
              <br />
              <span className="font-serif italic font-normal text-[var(--ember)]">
                Bevor du dich anmeldest.
              </span>
            </h2>
            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-[var(--smoke)]">
              Eine kleine Auswahl an Foundern, die gerade bei matchfoundr unterwegs sind —
              offen einsehbar, ohne Account.
            </p>
            <div className="mt-7">
              <Link to="/entdecken">
                <Button
                  size="lg"
                  className="shadow-ember h-11 gap-2 rounded-xl bg-[var(--ember)] text-[var(--cream)] hover:bg-[var(--ember-deep)]"
                >
                  Founder ansehen <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* MANIFEST */}
      <section id="stories" className="mt-24 scroll-mt-28">
        <div className="glass-pane-ink p-8 sm:p-12">
          <div
            className="eyebrow"
            style={{ color: "rgba(251,250,247,0.55)" }}
          >
            04 · Manifest
          </div>
          <h2 className="mt-6 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Kein Lebenslauf-Theater.
          </h2>
          <div className="mt-7 max-w-2xl space-y-5 text-[16px] leading-relaxed" style={{ color: "rgba(251,250,247,0.78)" }}>
            <p>
              Co-Founder finden ist keine Recruiting-Aufgabe. Es ist eine Entscheidung darüber,
              mit wem du die nächsten Jahre durchstehen willst — durch alles.
            </p>
            <p>
              Deshalb gibt es bei matchfoundr keine Punkte für Universitäten, keine Filter nach
              „Ex-FAANG", keine tausenden Profile zum Durchwischen. Stattdessen: ein klares
              Founder-Profil, das zeigt, wer du wirklich bist.
            </p>
          </div>
          <p
            className="mt-10 font-serif text-3xl italic"
            style={{ color: "var(--cream)" }}
          >
            Eine Plattform. Eine Entscheidung. Eine Person.
          </p>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="mt-24 scroll-mt-28">
        <div className="grid gap-10 sm:grid-cols-[200px_1fr] sm:gap-16">
          <div className="eyebrow pt-2">05 · Pricing</div>
          <h2 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
            Fair.{" "}
            <span className="font-serif italic font-normal text-[var(--ember)]">Transparent.</span>
          </h2>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          <div className="glass-pane p-7">
            <div className="eyebrow">Explorer</div>
            <div className="mt-4 text-5xl font-semibold tracking-tight" style={{ letterSpacing: "-0.035em" }}>
              €0
            </div>
            <p className="mt-3 text-[13px] text-[var(--smoke)]">Profil erstellen, Founder entdecken, erste Gespräche.</p>
          </div>
          <div className="glass-pane p-7 ring-1 ring-[var(--ember)]/30">
            <div className="eyebrow text-[var(--ember)]">Cohort</div>
            <div className="mt-4 text-5xl font-semibold tracking-tight" style={{ letterSpacing: "-0.035em" }}>
              €49<span className="text-base font-normal text-[var(--smoke)]">/Monat</span>
            </div>
            <p className="mt-3 text-[13px] text-[var(--smoke)]">Volle Cohort-Teilnahme, alle 6 Wochen, gecapped bei 60.</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mt-24">
        <div className="glass-pane p-10 text-center sm:p-14">
          <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Bereit anzufangen?
          </h2>
          <p className="mx-auto mt-4 max-w-md text-[15px] text-[var(--smoke)]">
            Erstelle dein Founder-Profil und finde die Person, die dein Unternehmen möglich macht.
          </p>
          <Button
            size="lg"
            onClick={startCta}
            className="shadow-ember mt-8 h-12 gap-2 rounded-xl bg-[var(--ember)] px-6 text-[var(--cream)] hover:bg-[var(--ember-deep)]"
          >
            Founder-Profil erstellen <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </section>

      <footer className="mt-16 flex items-center justify-between px-2 text-[11px] font-mono uppercase tracking-[0.18em] text-[var(--smoke)]">
        <span>© {new Date().getFullYear()} matchfoundr</span>
        <span>Made for founders</span>
      </footer>
    </div>
  );
}
