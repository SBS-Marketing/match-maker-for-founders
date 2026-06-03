import { Link } from "@tanstack/react-router";
import { SERVICE_BY_ID, type ServiceId } from "@/data/services";
import { ServiceIcon } from "@/components/ServiceIcon";
import { CopilotMark } from "@/components/Copilot";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function ServiceSkeleton({ id }: { id: ServiceId }) {
  const s = SERVICE_BY_ID[id];
  return (
    <div className="mx-auto max-w-4xl px-4 pt-12 pb-20 sm:px-6">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--cream)]" style={{ background: s.hue }}>
          <ServiceIcon name={s.icon} size={18} stroke={2} />
        </span>
        <span className="eyebrow">{s.label}</span>
      </div>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
        {s.label.split(" ")[0]}{" "}
        <span className="text-[var(--ember)]">kuratiert</span>.
      </h1>
      <p className="mt-4 max-w-xl text-[15px] text-[var(--smoke)]">{s.blurb}</p>

      <div className="glass-pane mt-10 p-8">
        <div className="flex items-center gap-2">
          <CopilotMark size={16} />
          <span className="eyebrow">Co-Pilot übernimmt</span>
        </div>
        <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-[var(--ink-soft)]">
          Statt eine Liste zu durchforsten — beschreib dem Co-Pilot deine Situation. Er bringt
          dir die 3 besten {s.short}-Partner direkt, ranked nach Fit und Verfügbarkeit.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/co-pilot">
            <Button className="shadow-ember h-11 gap-2 rounded-xl bg-[var(--ember)] px-5 text-[var(--cream)] hover:bg-[var(--ember-deep)]">
              Co-Pilot starten <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link to="/marketplace">
            <Button variant="ghost" className="glass-pill h-11 rounded-xl px-5">
              Andere Disziplinen
            </Button>
          </Link>
        </div>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="glass-pane-soft p-5">
            <div className="h-3 w-1/2 rounded bg-[rgba(21,20,15,0.08)]" />
            <div className="mt-3 h-2 w-3/4 rounded bg-[rgba(21,20,15,0.06)]" />
            <div className="mt-2 h-2 w-2/3 rounded bg-[rgba(21,20,15,0.06)]" />
            <div className="mt-5 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--smoke)]">
              In Kürze
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
