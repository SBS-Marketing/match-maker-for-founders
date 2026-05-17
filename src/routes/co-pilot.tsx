import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SERVICE_BY_ID, type ServiceId } from "@/data/services";
import { ServiceIcon } from "@/components/ServiceIcon";
import { CopilotMark, AITag, ThinkingTrace } from "@/components/Copilot";
import { ArrowRight, Send } from "lucide-react";

export const Route = createFileRoute("/co-pilot")({
  head: () => ({
    meta: [{ title: "Co-Pilot — matchfoundr" }, { name: "description", content: "Die KI, die deinen Founder-Plan baut." }],
  }),
  component: CoPilot,
});

type Msg =
  | { who: "me"; t: string; body: string }
  | { who: "ai"; t: string; think?: string; body: string; plan?: PlanRow[] };

type PlanRow = { sId: ServiceId; t: string; d: string; cta: string };

const INITIAL: Msg[] = [
  {
    who: "me",
    t: "09:48",
    body: "Ich bin Designer/Product, hab einen B2B-SaaS-Prototyp für Buchhaltung in Friseur-Salons. Zwei Monate alt. Ich brauche jemand Technisches und will Q3 ausgründen — Berlin.",
  },
  {
    who: "ai",
    t: "09:48",
    think:
      "B2B vertikal · SMB · niedriger ACV · vermutlich pre-revenue · Berlin → GmbH · Q3 → 8–10 Wochen Vorlauf",
    body: "„Klar. Das, was du beschreibst, hat drei parallele Bewegungen — sonst wirst du im September gefangen sein."",
    plan: [
      { sId: "cofounder", t: "Spur 1 · Co-Founder", d: "3 Profile heute, 1. Call in 5 Tagen. Zielzeit zum Sign: 8 Wo.", cta: "3 Profile öffnen" },
      { sId: "legal", t: "Spur 2 · Anwalt für Gründung", d: "GmbH + Gründervertrag + ESOP-Pool. Top-Match: Dr. Heller, Berlin.", cta: "Brief versenden" },
      { sId: "funding", t: "Spur 3 · Förderung", d: "EXIST passt. Deadline in 12 Tagen — Antrag zu 78% von mir vorausgefüllt.", cta: "Antrag öffnen" },
    ],
  },
];

const SUGGESTIONS = [
  "Wer hilft mir mit dem ESOP-Pool?",
  "Mein Co-Founder springt ab — was jetzt?",
  "Welche Förderung passt für Hardware?",
  "Erster Sales-Hire — Profil + Recruiter",
];

const SOURCES = [
  "EXIST-Förderrichtlinie 2025",
  "Senat Berlin · Gründerberatung",
  "matchfoundr · 38 vergleichbare Fälle",
  "Profil Dr. Lena Heller",
];

const UNDERSTOOD = [
  "B2B SaaS · Vertikale: Friseur",
  "Solo · Designer/Product",
  "Pre-Revenue · 2 Mo Prototyp",
  "Berlin · GmbH geplant",
  "Q3 2026 Ausgründung",
];

function CoPilot() {
  const [messages, setMessages] = useState<Msg[]>(INITIAL);
  const [input, setInput] = useState("");

  const send = (text?: string) => {
    const body = (text ?? input).trim();
    if (!body) return;
    const now = new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
    setMessages((m) => [
      ...m,
      { who: "me", t: now, body },
      {
        who: "ai",
        t: now,
        think: "verstanden · prüfe Netzwerk · ranke nach Fit & Verfügbarkeit",
        body: "„Geht klar — ich schaue mir das an und schlage dir gleich konkrete Schritte vor."",
      },
    ]);
    setInput("");
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 pb-16 sm:px-6">
      <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        {/* Chat */}
        <div className="glass-pane-ink flex h-[78vh] flex-col overflow-hidden p-0">
          <div className="flex items-center gap-3 border-b border-white/10 p-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--ember)] text-[var(--cream)] shadow-ember">
              <CopilotMark size={18} color="var(--cream)" spark="var(--cream)" />
            </span>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[15px] font-semibold tracking-tight text-[var(--cream)]">Co-Pilot</span>
                <AITag tone="dark">online</AITag>
              </div>
              <div className="mt-0.5 font-mono text-[10.5px] uppercase tracking-[0.12em] text-white/55">
                Session · Plan für Q3-Ausgründung
              </div>
            </div>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-6">
            {messages.map((m, i) =>
              m.who === "me" ? (
                <div key={i} className="ml-auto max-w-[78%]">
                  <div className="rounded-2xl rounded-br-sm bg-[var(--cream)] px-4 py-3 text-[14px] leading-snug text-[var(--ink)]">
                    {m.body}
                  </div>
                  <div className="mt-1 text-right font-mono text-[10px] text-white/40">{m.t}</div>
                </div>
              ) : (
                <div key={i} className="max-w-[90%]">
                  {m.think && (
                    <div className="mb-2">
                      <ThinkingTrace tone="dark">{m.think}</ThinkingTrace>
                    </div>
                  )}
                  <div className="rounded-2xl rounded-bl-sm border border-white/10 bg-white/5 px-4 py-3.5 font-serif text-[16px] italic leading-snug text-[var(--cream)]">
                    {m.body}
                  </div>
                  <div className="mt-1 font-mono text-[10px] text-white/40">Co-Pilot · {m.t}</div>

                  {m.plan && (
                    <div className="mt-3 rounded-2xl border border-white/12 bg-white/[0.07] p-4">
                      <div className="mb-3 flex items-center gap-2">
                        <ServiceIcon name="layers" size={14} stroke={2} className="text-[var(--cream)]" />
                        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/60">
                          Vorgeschlagener 3-Spur-Plan
                        </span>
                      </div>
                      {m.plan.map((row, j) => {
                        const s = SERVICE_BY_ID[row.sId];
                        return (
                          <div
                            key={j}
                            className={`grid grid-cols-[32px_1fr_auto] items-center gap-3 py-3 ${j === 0 ? "" : "border-t border-white/8"}`}
                          >
                            <span
                              className="flex h-8 w-8 items-center justify-center rounded-[9px] text-[var(--cream)]"
                              style={{ background: s.hue, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)" }}
                            >
                              <ServiceIcon name={s.icon} size={15} stroke={2} />
                            </span>
                            <div className="min-w-0">
                              <div className="text-[13.5px] font-semibold tracking-tight text-[var(--cream)]">{row.t}</div>
                              <div className="mt-0.5 text-[12px] leading-snug text-white/70">{row.d}</div>
                            </div>
                            <button className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-[11.5px] font-semibold text-[var(--cream)] hover:bg-white/15">
                              {row.cta} <ArrowRight className="h-3 w-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ),
            )}
          </div>

          {/* composer */}
          <div className="border-t border-white/10 p-4">
            <div className="mb-3 flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border border-white/12 bg-white/5 px-3 py-1 text-[11.5px] text-white/75 hover:bg-white/10"
                >
                  {s}
                </button>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
              className="flex items-center gap-2"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Schreib dem Co-Pilot, was du gerade brauchst…"
                className="flex-1 rounded-xl border border-white/12 bg-white/5 px-4 py-3 text-[14px] text-[var(--cream)] placeholder:text-white/40 focus:border-white/25 focus:outline-none"
              />
              <button
                type="submit"
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--ember)] text-[var(--cream)] hover:bg-[var(--ember-deep)]"
                aria-label="Senden"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-4">
          <div className="glass-pane p-5">
            <div className="eyebrow">Was der Co-Pilot verstanden hat</div>
            <ul className="mt-4 space-y-2">
              {UNDERSTOOD.map((u) => (
                <li key={u} className="flex items-start gap-2 text-[13.5px] text-[var(--ink-soft)]">
                  <span className="mt-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[var(--ember)]" />
                  {u}
                </li>
              ))}
            </ul>
          </div>
          <div className="glass-pane p-5">
            <div className="eyebrow">Quellen</div>
            <ul className="mt-4 space-y-2">
              {SOURCES.map((s) => (
                <li key={s} className="text-[13px] text-[var(--smoke)]">
                  <span className="font-mono text-[10px] tracking-[0.14em] text-[var(--ember-deep)]">SRC</span> · {s}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
