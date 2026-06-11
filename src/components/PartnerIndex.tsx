import { MapPin, ArrowRight } from "lucide-react";
import { AITag, FitScore } from "@/components/Copilot";
import { ServiceIcon } from "@/components/ServiceIcon";
import { SERVICE_BY_ID, type ServiceId } from "@/data/services";
import { partnersFor } from "@/data/partners";

type Props = {
  service: ServiceId;
  title: string;
  accent: string;
};

export function PartnerIndex({ service, title, accent }: Props) {
  const s = SERVICE_BY_ID[service];
  const partners = partnersFor(service);

  return (
    <div className="mx-auto flex h-[calc(100svh-10rem)] max-w-5xl flex-col overflow-hidden px-3 pt-3 sm:h-auto sm:px-6 sm:pt-10 sm:pb-24">
      <div className="flex shrink-0 items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--cream)]" style={{ background: s.hue }}>
          <ServiceIcon name={s.icon} size={16} stroke={2} />
        </span>
        <span className="eyebrow">{s.label} · {partners.length || s.count} kuratiert</span>
      </div>
      <h1 className="mt-3 shrink-0 text-balance text-[28px] font-semibold leading-tight tracking-tight sm:mt-4 sm:text-5xl">
        {title} <span className="text-[var(--ember)]">{accent}</span>.
      </h1>
      <p className="mt-4 hidden max-w-2xl text-[15px] text-[var(--smoke)] sm:block">{s.blurb}</p>

      <div className="mt-4 grid min-h-0 flex-1 gap-4 overflow-y-auto pr-1 sm:mt-8 sm:flex-none sm:overflow-visible md:grid-cols-2">
        {partners.map((partner) => (
          <article key={partner.slug} className="glass-pane p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[18px] font-semibold tracking-tight">{partner.name}</div>
                <div className="text-[12.5px] text-[var(--smoke)]">{partner.firm}</div>
                <div className="mt-1 flex items-center gap-1 text-[11.5px] text-[var(--smoke)]">
                  <MapPin className="h-3 w-3" /> {partner.city}
                </div>
              </div>
              <FitScore value={partner.fit} />
            </div>

            <p className="mt-4 text-[13.5px] leading-relaxed text-[var(--ink-soft)]">{partner.blurb}</p>

            <div className="mt-4 flex flex-wrap gap-2">
              {partner.specialties.slice(0, 4).map((specialty) => (
                <span key={specialty.label} className="rounded-full bg-[var(--paper)] px-2.5 py-1 text-[11px] font-medium text-[var(--ink-soft)]">
                  {specialty.label}
                </span>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <AITag tone="light">Co-Pilot Match</AITag>
              <a
                href={`${s.route}/${partner.slug}`}
                className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--ink)]"
              >
                Profil öffnen <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
