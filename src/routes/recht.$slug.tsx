import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { ADVISORS } from "@/data/advisors";
import { SERVICE_BY_ID } from "@/data/services";
import { ServiceIcon } from "@/components/ServiceIcon";
import { CopilotMark, AITag, FitScore } from "@/components/Copilot";
import { Button } from "@/components/ui/button";
import { MapPin, Check } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/recht/$slug")({
  component: AdvisorDetail,
  loader: ({ params }) => {
    const advisor = ADVISORS.find((a) => a.slug === params.slug);
    if (!advisor) throw notFound();
    return { advisor };
  },
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.advisor.name} — matchfoundr` }],
  }),
});

function AdvisorDetail() {
  const { advisor } = Route.useLoaderData();
  const s = SERVICE_BY_ID.legal;
  const [picked, setPicked] = useState<string | null>(null);

  const slots = ["Di 14:00", "Mi 10:30", "Mi 16:00", "Do 09:00", "Do 15:30", "Fr 11:00"];

  return (
    <div className="mx-auto max-w-5xl px-4 pt-8 pb-20 sm:px-6">
      <div className="flex items-center gap-2 text-[12px] text-[var(--smoke)]">
        <Link to="/marketplace" className="hover:underline">Marketplace</Link>
        <span>/</span>
        <Link to="/recht" className="inline-flex items-center gap-1.5 hover:underline">
          <span className="flex h-4 w-4 items-center justify-center rounded text-[var(--cream)]" style={{ background: s.hue }}>
            <ServiceIcon name={s.icon} size={9} stroke={2.4} />
          </span>
          Recht
        </Link>
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{advisor.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-[14px] text-[var(--smoke)]">
            <span>{advisor.firm}</span>
            <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {advisor.city}</span>
            <FitScore value={advisor.fit} />
          </div>

          {/* AI fit */}
          <div className="glass-pane-ink mt-6 p-5">
            <div className="mb-2 flex items-center gap-2">
              <CopilotMark size={14} color="var(--cream)" />
              <AITag tone="dark">Co-Pilot · warum dieses Match</AITag>
            </div>
            <ul className="mt-3 space-y-2">
              {advisor.why.map((w: string) => (
                <li key={w} className="flex items-start gap-2 text-[13.5px] leading-snug text-[var(--cream)]/90">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--ember-light)]" />
                  {w}
                </li>
              ))}
            </ul>
          </div>

          {/* specialties */}
          <div className="glass-pane mt-5 p-5">
            <div className="eyebrow">Fachgebiete</div>
            <div className="mt-4 space-y-3">
              {advisor.specialties.map((sp: any) => (
                <div key={sp.label}>
                  <div className="flex justify-between text-[13px]">
                    <span>{sp.label}</span>
                    <span className="font-mono text-[11px] text-[var(--smoke)]">{Math.round(sp.level * 100)}%</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[rgba(21,20,15,0.08)]">
                    <div className="h-full rounded-full" style={{ width: `${sp.level * 100}%`, background: s.hue }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* vouches */}
          <div className="glass-pane mt-5 p-5">
            <div className="eyebrow">Network-Vouches</div>
            <div className="mt-4 space-y-4">
              {advisor.vouches.map((v: any) => (
                <div key={v.from}>
                  <p className="text-[15px] font-medium leading-relaxed text-[var(--ink-soft)]">„{v.quote}"</p>
                  <div className="mt-2 text-[12px] text-[var(--smoke)]">
                    <span className="font-semibold text-[var(--ink)]">{v.from}</span> · {v.role}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Pricing + booking */}
        <div className="space-y-4">
          <div className="glass-pane p-5">
            <div className="eyebrow">Pakete</div>
            <div className="mt-4 space-y-3">
              {advisor.packages.map((p: any) => (
                <div key={p.name} className="rounded-xl border border-[var(--ruled)] bg-white/40 p-4">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[14px] font-semibold">{p.name}</span>
                    <span className="text-[14px] font-semibold text-[var(--ember-deep)]">{p.price}</span>
                  </div>
                  <p className="mt-1 text-[12.5px] text-[var(--smoke)]">{p.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-pane p-5">
            <div className="eyebrow">Erstgespräch buchen</div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {slots.map((s) => (
                <button
                  key={s}
                  onClick={() => setPicked(s)}
                  className="rounded-lg border px-2 py-2.5 text-[12.5px] transition"
                  style={{
                    background: picked === s ? "var(--ember)" : "rgba(255,255,255,0.5)",
                    color: picked === s ? "var(--cream)" : "var(--ink)",
                    borderColor: picked === s ? "var(--ember)" : "var(--ruled)",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
            <Button className="shadow-ember mt-4 h-11 w-full rounded-xl bg-[var(--ember)] text-[var(--cream)] hover:bg-[var(--ember-deep)]" disabled={!picked}>
              {picked ? `${picked} bestätigen` : "Slot wählen"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
