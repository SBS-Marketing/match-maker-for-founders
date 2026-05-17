import { createFileRoute, Link } from "@tanstack/react-router";
import { AuthGate } from "@/components/AuthGate";
import { SERVICE_BY_ID, type ServiceId } from "@/data/services";
import { ServiceIcon } from "@/components/ServiceIcon";
import { CopilotMark, AITag } from "@/components/Copilot";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check, Calendar } from "lucide-react";

export const Route = createFileRoute("/heute")({
  head: () => ({ meta: [{ title: "Heute · Command Center — matchfoundr" }] }),
  component: () => (
    <AuthGate>
      <CommandCenter />
    </AuthGate>
  ),
});

type Row = { sId: ServiceId; name: string; status: string; note: string; t: string; hot?: boolean };
const FEED: Row[] = [
  { sId: "cofounder", name: "Anna Wojcik", status: "Tag 6 von 90", note: "„Freitag passt — Doku kommt vorher.", t: "2m", hot: true },
  { sId: "legal", name: "Dr. Lena Heller", status: "Vertragsentwurf", note: "„ESOP-Pool auf 12,5% — passt das?", t: "1h", hot: true },
  { sId: "funding", name: "EXIST · DLR", status: "Antrag offen", note: "Co-Pilot: 3 Felder fehlen", t: "3h" },
  { sId: "mentor", name: "Felix Krämer", status: "Office Hour", note: "Termin Mittwoch 17:00", t: "1d" },
  { sId: "tax", name: "Marek Lewandowski", status: "Erstgespräch", note: "„Schick mir Cap Table Draft"", t: "2d" },
];

function CommandCenter() {
  const today = new Date().toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" });
  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 pb-20 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="eyebrow">{today} · Berlin</div>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
            Guten Morgen<span className="text-[var(--ember)]">.</span>{" "}
            <span className="font-serif italic font-normal text-[var(--smoke)]">Drei Dinge heute.</span>
          </h1>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" className="glass-pill h-10 gap-2 rounded-full px-4 text-[13px]">
            <Calendar className="h-3.5 w-3.5" /> Diese Woche
          </Button>
          <Link to="/co-pilot">
            <Button className="h-10 gap-2 rounded-full bg-[var(--ink)] px-4 text-[13px] text-[var(--cream)] hover:bg-[var(--ink-soft)]">
              <CopilotMark size={14} color="var(--cream)" /> Plan aktualisieren
            </Button>
          </Link>
        </div>
      </div>

      {/* Focus banner */}
      <div className="glass-pane-ink mt-6 grid gap-4 p-6 sm:grid-cols-[1fr_auto] sm:items-center">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <AITag tone="dark">Co-Pilot</AITag>
            <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-white/55">
              Heute · empfohlener Fokus
            </span>
          </div>
          <p className="max-w-2xl font-serif text-[20px] italic leading-snug text-[var(--cream)]">
            „Anna hat das Onepager gelesen. Buch den Freitag. Parallel: schick Dr. Hellers Kanzlei den
            Vertragsentwurf — du verlierst sonst die ProFIT-Frist am 28."
          </p>
        </div>
        <div className="flex gap-2">
          <Button className="h-10 gap-2 rounded-lg bg-[var(--cream)] px-4 text-[13px] font-semibold text-[var(--ink)] hover:bg-white">
            <Check className="h-3.5 w-3.5" /> Übernehmen
          </Button>
          <Button variant="ghost" className="h-10 rounded-lg border border-white/15 bg-white/5 px-4 text-[13px] text-[var(--cream)] hover:bg-white/10">
            Später
          </Button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.3fr_0.85fr_0.85fr]">
        {/* Active conversations */}
        <div className="glass-pane flex flex-col gap-3 p-5">
          <div className="flex items-center justify-between">
            <span className="eyebrow">Aktive Gespräche · {FEED.length} offen</span>
            <span className="font-mono text-[11px] text-[var(--smoke)]">Letzte Aktivität</span>
          </div>
          {FEED.map((r) => {
            const s = SERVICE_BY_ID[r.sId];
            return (
              <div
                key={r.name}
                className="grid grid-cols-[40px_1fr_auto] items-center gap-3 rounded-2xl border p-3"
                style={{
                  background: r.hot ? "rgba(226,81,28,0.06)" : "rgba(251,250,247,0.55)",
                  borderColor: r.hot ? "rgba(226,81,28,0.18)" : "rgba(21,20,15,0.06)",
                }}
              >
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-[10px] text-[var(--cream)]"
                  style={{ background: s.hue, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.18)" }}
                >
                  <ServiceIcon name={s.icon} size={18} stroke={2} />
                </span>
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[14px] font-semibold tracking-tight">{r.name}</span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--smoke)]">
                      · {s.short}
                    </span>
                    {r.hot && (
                      <span className="rounded-full bg-[var(--ember)] px-2 py-[1px] font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-[var(--cream)]">
                        Hot
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-[12px] text-[var(--smoke)]">{r.status} · {r.note}</div>
                </div>
                <span className="font-mono text-[11px] text-[var(--smoke)]">{r.t}</span>
              </div>
            );
          })}
        </div>

        {/* Agenda */}
        <div className="glass-pane p-5">
          <div className="eyebrow">Agenda heute</div>
          <ul className="mt-4 space-y-3">
            {[
              { t: "10:30", what: "Call · Anna Wojcik", who: "Co-Founder" },
              { t: "13:00", what: "Notar-Termin Heller", who: "Recht" },
              { t: "16:00", what: "EXIST · 3 Felder", who: "Förderung" },
            ].map((a) => (
              <li key={a.t} className="flex items-start gap-3">
                <span className="font-mono text-[11px] font-semibold text-[var(--ember-deep)]">{a.t}</span>
                <div>
                  <div className="text-[13.5px] font-semibold">{a.what}</div>
                  <div className="text-[11px] text-[var(--smoke)]">{a.who}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Funding pipeline */}
        <Link to="/foerderung/$slug" params={{ slug: "exist" }} className="glass-pane block p-5 transition hover:-translate-y-0.5">
          <div className="eyebrow">Funding-Pipeline</div>
          <div className="mt-4 text-[18px] font-semibold tracking-tight">EXIST · DLR</div>
          <div className="text-[12px] text-[var(--smoke)]">€125k · 12 Monate · Deadline 28. Mai</div>
          <div className="mt-4">
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--ember-deep)]">
                78% vorausgefüllt
              </span>
              <span className="font-mono text-[11px] text-[var(--smoke)]">Co-Pilot</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[rgba(21,20,15,0.08)]">
              <div className="h-full rounded-full bg-[var(--ember)]" style={{ width: "78%" }} />
            </div>
          </div>
          <div className="mt-5 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--ink)]">
            Antrag weiterführen <ArrowRight className="h-3.5 w-3.5" />
          </div>
        </Link>
      </div>
    </div>
  );
}
