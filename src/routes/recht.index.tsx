import { createFileRoute, Link } from "@tanstack/react-router";
import { ADVISORS } from "@/data/advisors";
import { SERVICE_BY_ID } from "@/data/services";
import { ServiceIcon } from "@/components/ServiceIcon";
import { FitScore } from "@/components/Copilot";
import { MapPin, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/recht/")({
  head: () => ({ meta: [{ title: "Recht & Verträge — matchfoundr" }] }),
  component: RechtIndex,
});

function RechtIndex() {
  const s = SERVICE_BY_ID.legal;
  return (
    <div className="mx-auto max-w-5xl px-4 pt-10 pb-20 sm:px-6">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--cream)]" style={{ background: s.hue }}>
          <ServiceIcon name={s.icon} size={16} stroke={2} />
        </span>
        <span className="eyebrow">Recht & Verträge · {s.count} Anwälte</span>
      </div>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
        Anwälte, die <span className="font-serif italic font-normal">Startups</span> bauen.
      </h1>
      <p className="mt-4 max-w-2xl text-[15px] text-[var(--smoke)]">
        GmbH, Gründervertrag, ESOP, Cap Table, IP. Vorgefiltert vom Co-Pilot — kein Stundensatz-Glücksspiel.
      </p>

      <div className="mt-10 grid gap-5 md:grid-cols-2">
        {ADVISORS.filter((a) => a.slug === "lena-heller").concat(ADVISORS.filter((a) => a.slug !== "lena-heller")).map((a) => (
          <Link
            key={a.slug}
            to="/recht/$slug"
            params={{ slug: a.slug }}
            className="glass-pane block p-6 transition hover:-translate-y-0.5"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[18px] font-semibold tracking-tight">{a.name}</div>
                <div className="text-[12.5px] text-[var(--smoke)]">{a.firm}</div>
                <div className="mt-1 flex items-center gap-1 text-[11.5px] text-[var(--smoke)]">
                  <MapPin className="h-3 w-3" /> {a.city}
                </div>
              </div>
              <FitScore value={a.fit} />
            </div>
            <p className="mt-4 text-[13.5px] leading-relaxed text-[var(--ink-soft)]">{a.blurb}</p>
            <div className="mt-5 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--ink)]">
              Profil ansehen <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
