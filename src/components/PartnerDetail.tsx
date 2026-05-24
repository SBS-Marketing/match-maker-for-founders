import { Link } from "@tanstack/react-router";
import { CalendarCheck, Check, ExternalLink, MapPin, MessageCircle, ShieldCheck } from "lucide-react";
import { AITag, CopilotMark, FitScore } from "@/components/Copilot";
import { ServiceIcon } from "@/components/ServiceIcon";
import { Button } from "@/components/ui/button";
import type { Partner } from "@/data/partners";
import { SERVICE_BY_ID } from "@/data/services";

type Props = {
  partner: Partner;
};

const slots = ["Di 14:00", "Mi 10:30", "Mi 16:00", "Do 09:00", "Do 15:30", "Fr 11:00"];

export function PartnerDetail({ partner }: Props) {
  const service = SERVICE_BY_ID[partner.service];
  const bookingUrl = partner.bookingUrl || partner.sourceUrl || "/co-pilot";

  return (
    <div className="mx-auto max-w-5xl px-4 pt-8 pb-24 sm:px-6">
      <div className="flex items-center gap-2 text-[12px] text-[var(--smoke)]">
        <Link to="/marketplace" className="hover:underline">Marketplace</Link>
        <span>/</span>
        <a href={service.route} className="inline-flex items-center gap-1.5 hover:underline">
          <span className="flex h-4 w-4 items-center justify-center rounded text-[var(--cream)]" style={{ background: service.hue }}>
            <ServiceIcon name={service.icon} size={9} stroke={2.4} />
          </span>
          {service.short}
        </a>
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-[1.18fr_0.82fr]">
        <main>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--cream)]" style={{ background: service.hue }}>
                  <ServiceIcon name={service.icon} size={17} stroke={2.2} />
                </span>
                <AITag tone="light">verifizierter Match</AITag>
              </div>
              <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">{partner.name}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-[14px] text-[var(--smoke)]">
                <span>{partner.firm}</span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {partner.city}
                </span>
                <FitScore value={partner.fit} />
              </div>
            </div>
          </div>

          <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-[var(--ink-soft)]">{partner.blurb}</p>

          <section className="glass-pane-ink mt-6 p-5">
            <div className="mb-2 flex items-center gap-2">
              <CopilotMark size={14} color="var(--cream)" />
              <AITag tone="dark">Co-Pilot · warum dieses Match</AITag>
            </div>
            <ul className="mt-3 space-y-2">
              {partner.why.map((reason) => (
                <li key={reason} className="flex items-start gap-2 text-[13.5px] leading-snug text-[var(--cream)]/90">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--ember-light)]" />
                  {reason}
                </li>
              ))}
            </ul>
          </section>

          <section className="glass-pane mt-5 p-5">
            <div className="eyebrow">Fokusbereiche</div>
            <div className="mt-4 space-y-3">
              {partner.specialties.map((specialty) => (
                <div key={specialty.label}>
                  <div className="flex justify-between gap-4 text-[13px]">
                    <span>{specialty.label}</span>
                    <span className="font-mono text-[11px] text-[var(--smoke)]">{Math.round(specialty.level * 100)}%</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[rgba(21,20,15,0.08)]">
                    <div className="h-full rounded-full" style={{ width: `${specialty.level * 100}%`, background: service.hue }} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="glass-pane mt-5 p-5">
            <div className="eyebrow">Network-Vouches</div>
            <div className="mt-4 space-y-4">
              {partner.vouches.map((vouch) => (
                <div key={`${vouch.from}-${vouch.role}`}>
                  <p className="font-serif text-[16px] italic leading-snug">"{vouch.quote}"</p>
                  <div className="mt-2 text-[12px] text-[var(--smoke)]">
                    <span className="font-semibold text-[var(--ink)]">{vouch.from}</span> · {vouch.role}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </main>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <section className="glass-pane p-5">
            <div className="eyebrow">Pakete</div>
            <div className="mt-4 space-y-3">
              {partner.packages.map((pkg) => (
                <div key={pkg.name} className="rounded-xl border border-[var(--ruled)] bg-white/45 p-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[14px] font-semibold">{pkg.name}</span>
                    <span className="shrink-0 text-[14px] font-semibold text-[var(--ember-deep)]">{pkg.price}</span>
                  </div>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--smoke)]">{pkg.desc}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="glass-pane p-5">
            <div className="eyebrow">Nächster Schritt</div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {slots.map((slot, index) => (
                <a
                  key={slot}
                  href={bookingUrl}
                  target={bookingUrl.startsWith("http") ? "_blank" : undefined}
                  rel={bookingUrl.startsWith("http") ? "noreferrer" : undefined}
                  className="rounded-lg border px-2 py-2.5 text-center text-[12.5px] transition hover:border-[var(--ember)] hover:bg-white"
                  style={{
                    background: index === 1 ? "var(--ember)" : "rgba(255,255,255,0.5)",
                    color: index === 1 ? "var(--cream)" : "var(--ink)",
                    borderColor: index === 1 ? "var(--ember)" : "var(--ruled)",
                  }}
                >
                  {slot}
                </a>
              ))}
            </div>
            <Button asChild className="shadow-ember mt-4 h-11 w-full rounded-xl bg-[var(--ember)] text-[var(--cream)] hover:bg-[var(--ember-deep)]">
              <a href={bookingUrl} target={bookingUrl.startsWith("http") ? "_blank" : undefined} rel={bookingUrl.startsWith("http") ? "noreferrer" : undefined}>
                <CalendarCheck className="h-4 w-4" />
                Gespräch anfragen
              </a>
            </Button>
            <Button asChild variant="outline" className="mt-2 h-10 w-full rounded-xl border-[var(--ruled)] bg-white/50">
              <Link to="/co-pilot">
                <MessageCircle className="h-4 w-4" />
                Co-Pilot vorbereiten
              </Link>
            </Button>
            {partner.sourceUrl ? (
              <a
                href={partner.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 flex items-center justify-center gap-1.5 text-[12px] font-semibold text-[var(--smoke)] hover:text-[var(--ink)]"
              >
                Quelle prüfen <ExternalLink className="h-3 w-3" />
              </a>
            ) : null}
          </section>

          <section className="glass-pane p-4">
            <div className="flex items-start gap-3 text-[12.5px] leading-relaxed text-[var(--smoke)]">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ember)]" />
              <span>
                Profil aus kuratierten Partnerdaten gebaut. Der Co-Pilot priorisiert Fit, Phase und nächste Aktion.
              </span>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
