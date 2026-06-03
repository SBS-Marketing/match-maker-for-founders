import { createFileRoute, Link } from "@tanstack/react-router";
import { SERVICES } from "@/data/services";
import { ServiceTile } from "@/components/ServiceTile";
import { CopilotMark, AITag } from "@/components/Copilot";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/marketplace")({
  head: () => ({
    meta: [
      { title: "Marketplace — matchfoundr" },
      { name: "description", content: "Acht Disziplinen, alle vom Co-Pilot vermittelt: Co-Founder, Recht, Steuer, Förderung, Kapital, Mentoren, Talent, Growth." },
    ],
  }),
  component: Marketplace,
});

function Marketplace() {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-10 pb-24 sm:px-6">
      <div className="eyebrow">Marketplace</div>
      <h1 className="mt-3 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
        Was brauchst du <span className="text-[var(--ember)]">jetzt</span>?
      </h1>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-[var(--smoke)]">
        Wähle eine Kategorie oder lass den Co-Pilot direkt die passenden Angebote, Partner und Programme vorsortieren.
      </p>

      {/* Co-Pilot routing banner */}
      <div className="glass-pane-ink mt-8 grid gap-4 p-5 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:p-6">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/12">
          <CopilotMark size={18} color="var(--cream)" spark="var(--cream)" />
        </span>
        <div>
          <div className="mb-1 flex items-center gap-2">
            <AITag tone="dark">Co-Pilot</AITag>
            <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-white/55">
              schneller als blättern
            </span>
          </div>
          <p className="text-[17px] font-semibold leading-snug text-[var(--cream)]">
            Sag mir, wo du gerade hängst. Ich öffne die richtigen Türen parallel.
          </p>
        </div>
        <Link
          to="/co-pilot"
          className="shadow-ember inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--cream)] px-5 text-[14px] font-semibold text-[var(--ink)] hover:bg-white"
        >
          Co-Pilot starten <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SERVICES.map((s, i) => (
          <ServiceTile key={s.id} service={s} accented={i === 0} />
        ))}
      </div>
    </div>
  );
}
