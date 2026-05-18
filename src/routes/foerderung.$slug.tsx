import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { GRANTS } from "@/data/grants";
import { SERVICE_BY_ID } from "@/data/services";
import { ServiceIcon } from "@/components/ServiceIcon";
import { CopilotMark, AITag } from "@/components/Copilot";
import { Button } from "@/components/ui/button";
import { Check, AlertTriangle, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/foerderung/$slug")({
  loader: ({ params }) => {
    const grant = GRANTS.find((g) => g.slug === params.slug);
    if (!grant) throw notFound();
    return { grant };
  },
  head: ({ loaderData }) => ({ meta: [{ title: `${loaderData?.grant.name} — matchfoundr` }] }),
  component: GrantDetail,
});

function GrantDetail() {
  const { grant } = Route.useLoaderData();
  const s = SERVICE_BY_ID.funding;

  return (
    <div className="mx-auto max-w-5xl px-4 pt-8 pb-20 sm:px-6">
      <div className="flex items-center gap-2 text-[12px] text-[var(--smoke)]">
        <Link to="/marketplace" className="hover:underline">Marketplace</Link>
        <span>/</span>
        <Link to="/foerderung" className="inline-flex items-center gap-1.5 hover:underline">
          <span className="flex h-4 w-4 items-center justify-center rounded text-[var(--cream)]" style={{ background: s.hue }}>
            <ServiceIcon name={s.icon} size={9} stroke={2.4} />
          </span>
          Förderung
        </Link>
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{grant.name}</h1>
          <div className="mt-2 text-[14px] text-[var(--smoke)]">{grant.body}</div>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[13.5px]">
            <span><b className="text-[var(--ember-deep)]">{grant.amount}</b> Volumen</span>
            <span><b>{grant.duration}</b></span>
            <span>Deadline: <b>{grant.deadline}</b></span>
          </div>
          <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-[var(--ink-soft)]">{grant.summary}</p>

          {/* Eligibility */}
          <div className="glass-pane-ink mt-6 p-5">
            <div className="mb-3 flex items-center gap-2">
              <CopilotMark size={14} color="var(--cream)" />
              <AITag tone="dark">Co-Pilot · Eligibility-Check</AITag>
            </div>
            <ul className="space-y-2.5">
              {grant.eligibility.map((e: any) => {
                const isOk = e.ok === true;
                const isWarn = e.ok === "warn";
                return (
                  <li key={e.item} className="flex items-start gap-2.5 text-[13.5px] leading-snug text-[var(--cream)]/90">
                    {isOk ? (
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ember-light)]" />
                    ) : isWarn ? (
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ember-light)]" />
                    ) : (
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />
                    )}
                    <span>
                      <span className="font-semibold text-[var(--cream)]">{e.item}</span>
                      {e.note && <span className="text-white/65"> — {e.note}</span>}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Timeline */}
          <div className="glass-pane mt-5 p-5">
            <div className="eyebrow">Timeline</div>
            <div className="mt-4 space-y-3">
              {grant.timeline.map((p, i) => (
                <div key={p.phase} className="grid grid-cols-[60px_1fr] gap-3">
                  <div>
                    <div className="font-mono text-[11px] font-semibold text-[var(--ember-deep)]">{`0${i + 1}`}</div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--smoke)]">{p.weeks}</div>
                  </div>
                  <div>
                    <div className="text-[14px] font-semibold tracking-tight">{p.phase}</div>
                    <div className="text-[12.5px] text-[var(--smoke)]">{p.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA + materials */}
        <div className="space-y-4">
          <div className="glass-pane-ember p-5">
            <div className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-white/75">Co-Pilot Assist</div>
            <div className="mt-3 text-[44px] font-semibold leading-none tracking-tight">{grant.prefilled}%</div>
            <div className="text-[13px] text-white/85">deines Antrags ist vorausgefüllt</div>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/20">
              <div className="h-full rounded-full bg-white" style={{ width: `${grant.prefilled}%` }} />
            </div>
            <Button className="mt-5 h-11 w-full gap-2 rounded-xl bg-[var(--cream)] text-[var(--ink)] hover:bg-white">
              Antrag weiterführen <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="glass-pane p-5">
            <div className="eyebrow">Materialien</div>
            <ul className="mt-4 space-y-2.5">
              {grant.materials.map((m) => (
                <li key={m.item} className="flex items-start gap-2 text-[13px]">
                  <span
                    className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border"
                    style={{
                      background: m.done ? "var(--ember)" : "transparent",
                      borderColor: m.done ? "var(--ember)" : "var(--ruled)",
                    }}
                  >
                    {m.done && <Check className="h-3 w-3 text-[var(--cream)]" />}
                  </span>
                  <span className={m.done ? "text-[var(--smoke)] line-through" : "text-[var(--ink)]"}>{m.item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
