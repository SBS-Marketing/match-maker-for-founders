import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { SERVICES, SERVICE_BY_ID } from "@/data/services";
import { ServiceChip, ServiceTile } from "@/components/ServiceTile";
import { ServiceIcon } from "@/components/ServiceIcon";
import { CopilotMark, AITag, FitScore } from "@/components/Copilot";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "matchfoundr — Alles, was ein Founder braucht. KI-vermittelt." },
      { name: "description", content: "Co-Founder, Anwälte, Steuerberater, Förderprogramme, Mentoren, Hires — ein Co-Pilot, der dich zur richtigen Person bringt." },
      { property: "og:title", content: "matchfoundr — Founder-Plattform mit KI-Co-Pilot" },
      { property: "og:description", content: "Acht Disziplinen, ein Co-Pilot. Berlin · München · Wien · Zürich." },
    ],
  }),
  component: Landing,
});

const STATS = [
  { v: "14 Tage", k: "Erstes Match — Service-übergreifend" },
  { v: "€2.4M", k: "Förderung, freigeschaltet 2025" },
  { v: "78%", k: "Founder mit 3+ aktiven Services" },
  { v: "4 Städte", k: "Berlin · München · Wien · Zürich" },
];

const COPILOT_PICKS: { sId: keyof typeof SERVICE_BY_ID; n: string; l: string; fit: number }[] = [
  { sId: "cofounder", n: "Anna W.", l: "Backend · Berlin", fit: 94 },
  { sId: "legal", n: "Dr. Lena H.", l: "GmbH · ESOP", fit: 91 },
  { sId: "funding", n: "EXIST", l: "€125k · 12 Mo", fit: 89 },
];

function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const startCta = () => navigate({ to: user ? "/heute" : "/auth" });

  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 pb-24 sm:px-6">
      {/* HERO */}
      <section className="grid gap-10 pt-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
        <div>
          <div className="glass-pill inline-flex items-center gap-2 py-1.5 pl-1.5 pr-3">
            <span className="rounded-full bg-[var(--ink)] px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--cream)]">
              v2 · Platform
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--smoke)]">
              1.847 Partner · 8 Disziplinen · 1 Co-Pilot
            </span>
          </div>

          <h1 className="mt-7 text-balance text-5xl font-semibold leading-[0.98] tracking-tight sm:text-6xl lg:text-[76px]">
            Alles, was ein
            <br />
            <span className="font-serif italic font-normal">Founder</span> braucht
            <span className="text-[var(--ember)]">.</span>
            <br />
            KI-vermittelt.
          </h1>

          <p className="mt-7 max-w-xl text-pretty text-[17px] leading-relaxed text-[var(--smoke)]">
            Co-Founder, Anwälte, Steuerberater, Förderprogramme, Mentoren, frühe Hires —
            ein Co-Pilot, der versteht, wo du gerade stehst, und genau die richtigen
            Menschen und Programme an einen Tisch holt.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button
              onClick={startCta}
              className="shadow-ember h-12 gap-2 rounded-xl bg-[var(--ember)] px-5 text-[15px] font-semibold text-[var(--cream)] hover:bg-[var(--ember-deep)]"
            >
              Erzähl dem Co-Pilot von dir
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Link to="/marketplace">
              <Button
                variant="ghost"
                className="glass-pill h-12 gap-2 rounded-xl px-5 text-[15px] text-[var(--ink)]"
              >
                <ServiceIcon name="layers" size={16} stroke={2} />
                Marketplace ansehen
              </Button>
            </Link>
          </div>

          {/* trust strip */}
          <div className="mt-10 grid grid-cols-2 gap-y-6 border-t border-[var(--ruled)] pt-6 sm:grid-cols-4">
            {STATS.map((s, i) => (
              <div
                key={s.k}
                className={i === 0 ? "" : "sm:border-l sm:border-[var(--ruled)] sm:pl-5"}
              >
                <div className="text-[22px] font-semibold leading-none tracking-tight text-[var(--ink)]">
                  {s.v}
                </div>
                <div className="mt-1.5 text-[11px] leading-snug text-[var(--smoke)]">{s.k}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Co-Pilot preview pane */}
        <div className="glass-pane flex flex-col gap-4 p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--ink)] text-[var(--cream)]">
                <CopilotMark size={16} color="var(--cream)" />
              </span>
              <div>
                <div className="text-[14px] font-semibold leading-tight">Co-Pilot</div>
                <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--smoke)]">
                  Live · denkt mit
                </div>
              </div>
            </div>
            <AITag>AI</AITag>
          </div>

          <div
            className="rounded-2xl border border-[rgba(21,20,15,0.06)] bg-[rgba(21,20,15,0.04)] p-3.5 text-[13.5px] leading-relaxed text-[var(--ink)]"
          >
            <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--smoke)]">
              Du · 10:14
            </div>
            „B2B-SaaS, zwei Monate Prototyp, ich bin Designer, suche technischen Co-Founder.
            Wir wollen Q3 ausgründen — GmbH in Berlin. Was brauche ich jetzt?"
          </div>

          <div className="glass-pane-soft flex flex-col gap-3 p-4">
            <div className="flex items-center gap-2">
              <CopilotMark size={14} />
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--smoke)]">
                Co-Pilot · in 1.8s
              </span>
            </div>
            <p className="font-serif text-[15.5px] italic leading-snug text-[var(--ink)]">
              „Drei Dinge parallel: einen technischen Co-Founder, einen Anwalt für den
              Gründervertrag, und du solltest EXIST in den nächsten 6 Wochen anschauen —
              Q3 ist machbar, wenn ihr jetzt startet."
            </p>
            <div className="grid grid-cols-3 gap-2">
              {COPILOT_PICKS.map((r) => {
                const s = SERVICE_BY_ID[r.sId];
                return (
                  <div
                    key={r.n}
                    className="rounded-xl border border-[rgba(21,20,15,0.07)] bg-[rgba(251,250,247,0.7)] p-2.5"
                  >
                    <div className="mb-1.5 flex items-center gap-1.5">
                      <span
                        className="inline-flex h-4 w-4 items-center justify-center rounded-[5px] text-[var(--cream)]"
                        style={{ background: s.hue }}
                      >
                        <ServiceIcon name={s.icon} size={10} stroke={2.2} />
                      </span>
                      <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--smoke)]">
                        {s.short}
                      </span>
                    </div>
                    <div className="text-[13px] font-semibold leading-tight tracking-tight text-[var(--ink)]">
                      {r.n}
                    </div>
                    <div className="mt-0.5 text-[11px] text-[var(--smoke)]">{r.l}</div>
                    <div className="mt-1.5">
                      <FitScore value={r.fit} />
                    </div>
                  </div>
                );
              })}
            </div>
            <Link
              to="/co-pilot"
              className="flex items-center justify-between pt-1 text-[12.5px] font-semibold text-[var(--ink)]"
            >
              <span className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-[var(--smoke)]">
                +5 weitere Empfehlungen
              </span>
              <span className="inline-flex items-center gap-1.5">
                Plan generieren <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-1">
            {SERVICES.map((s) => (
              <ServiceChip key={s.id} service={s} />
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="scroll-mt-28 mt-24">
        <div className="eyebrow">02 · So funktioniert es</div>
        <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          Eine KI für alle <span className="font-serif italic font-normal">Gewerke</span>.
        </h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            { n: "01", t: "Erzähl dem Co-Pilot von dir", d: "Idee, Stage, Stadt, was dich gerade blockiert. 5 Minuten, keine Lebenslauf-Theater." },
            { n: "02", t: "Co-Pilot baut den Plan", d: "Welche zwei bis drei Bewegungen jetzt parallel laufen müssen — und wer sie macht." },
            { n: "03", t: "Du sprichst mit echten Menschen", d: "Co-Founder, Anwalt, Förder-Officer, Mentor — vorgefiltert, direkt erreichbar." },
          ].map((s) => (
            <div key={s.n} className="glass-pane p-6">
              <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--ember-deep)]">
                {s.n}
              </div>
              <div className="mt-3 text-[18px] font-semibold tracking-tight">{s.t}</div>
              <p className="mt-2 text-[14px] leading-relaxed text-[var(--smoke)]">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FIND A MATCH — Marketplace teaser */}
      <section id="find-a-match" className="scroll-mt-28 mt-24">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="eyebrow">03 · Marketplace</div>
            <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              Acht Disziplinen. <span className="font-serif italic font-normal">Ein</span> Co-Pilot.
            </h2>
          </div>
          <Link to="/marketplace" className="hidden text-sm font-medium text-[var(--ink)] hover:underline sm:inline">
            Alle ansehen →
          </Link>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map((s, i) => (
            <ServiceTile key={s.id} service={s} accented={i === 0} compact />
          ))}
        </div>
      </section>

      {/* STORIES */}
      <section id="stories" className="scroll-mt-28 mt-24">
        <div className="eyebrow">04 · Stories</div>
        <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          Was Founder darüber <span className="font-serif italic font-normal">sagen</span>.
        </h2>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {[
            { name: "Lena H.", role: "Founder, Cohort.io · Berlin", q: "„Der Co-Pilot hat Anwalt und EXIST am selben Tag eingefädelt. Wir haben Q3 wirklich geschafft." },
            { name: "Marcus K.", role: "CTO, Onsight · München", q: "„Steuerberater, ESOP-Anwalt und unser erster Hire — drei Services, alles über matchfoundr." },
          ].map((s) => (
            <div key={s.name} className="glass-pane p-7">
              <Sparkles className="h-4 w-4 text-[var(--ember)]" />
              <p className="mt-4 font-serif text-[20px] italic leading-snug">{s.q}</p>
              <div className="mt-5 text-[13px] text-[var(--smoke)]">
                <span className="font-semibold text-[var(--ink)]">{s.name}</span> · {s.role}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="scroll-mt-28 mt-24">
        <div className="eyebrow">05 · Pricing</div>
        <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          Fair für <span className="font-serif italic font-normal">Founder</span>.
        </h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            { name: "Explorer", price: "€0", d: "Co-Pilot Light, 2 Service-Anfragen / Monat, Marketplace-Browsing." },
            { name: "Builder", price: "€39 / Mo", d: "Co-Pilot voll, alle Services, unbegrenzte Intros, EXIST-Antrags-Assistenz.", accent: true },
            { name: "Cohort", price: "€149 / Mo", d: "Builder + 1:1 Programm-Begleitung über 12 Wochen mit Operator-Coach." },
          ].map((p) => (
            <div
              key={p.name}
              className={p.accent ? "glass-pane-ember p-7" : "glass-pane p-7"}
            >
              <div
                className="font-mono text-[11px] uppercase tracking-[0.16em]"
                style={{ color: p.accent ? "rgba(255,255,255,0.7)" : "var(--smoke)" }}
              >
                {p.name}
              </div>
              <div className="mt-3 text-[36px] font-semibold leading-none tracking-tight">
                {p.price}
              </div>
              <p
                className="mt-4 text-[14px] leading-relaxed"
                style={{ color: p.accent ? "rgba(255,255,255,0.85)" : "var(--smoke)" }}
              >
                {p.d}
              </p>
              <Button
                onClick={startCta}
                className={
                  p.accent
                    ? "mt-6 h-10 w-full rounded-xl bg-[var(--cream)] text-[var(--ink)] hover:bg-white"
                    : "mt-6 h-10 w-full rounded-xl bg-[var(--ink)] text-[var(--cream)] hover:bg-[var(--ink-soft)]"
                }
              >
                Starten
              </Button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
