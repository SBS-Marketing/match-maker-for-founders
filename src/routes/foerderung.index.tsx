import { createFileRoute, Link } from "@tanstack/react-router";
import { GRANTS } from "@/data/grants";
import { SERVICE_BY_ID } from "@/data/services";
import { ServiceIcon } from "@/components/ServiceIcon";
import { FitScore } from "@/components/Copilot";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/foerderung/")({
  head: () => ({ meta: [{ title: "Förderprogramme — matchfoundr" }] }),
  component: () => {
    const s = SERVICE_BY_ID.funding;
    return (
      <div className="mx-auto max-w-5xl px-4 pt-10 pb-20 sm:px-6">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--cream)]" style={{ background: s.hue }}>
            <ServiceIcon name={s.icon} size={16} stroke={2} />
          </span>
          <span className="eyebrow">Förderprogramme · {s.count} aktiv</span>
        </div>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
          Öffentliche <span className="font-serif italic font-normal">Förderung</span>, live gematcht.
        </h1>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {GRANTS.map((g) => (
            <Link key={g.slug} to="/foerderung/$slug" params={{ slug: g.slug }} className="glass-pane block p-6 transition hover:-translate-y-0.5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[18px] font-semibold tracking-tight">{g.name}</div>
                  <div className="text-[12.5px] text-[var(--smoke)]">{g.body}</div>
                </div>
                <FitScore value={g.fit} />
              </div>
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-[var(--ink-soft)]">
                <span><b>{g.amount}</b> Volumen</span>
                <span>{g.duration}</span>
                <span>Deadline: {g.deadline}</span>
              </div>
              <p className="mt-3 text-[13px] leading-relaxed text-[var(--smoke)]">{g.summary}</p>
              <div className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold">
                Details <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    );
  },
});
