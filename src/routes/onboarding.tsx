// Onboarding — 3 Screens, unter 90 Sekunden, dann direkt ins Dashboard.
// 1 Modus · 2 Branche & Skills · 3 Kurzprofil. Kein Tutorial, kein Pop-up.

import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Check, Lightbulb, Loader2, Wrench } from "lucide-react";
import { toast } from "sonner";
import { AuthGate } from "@/components/AuthGate";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { writePlanContext, type PlanContext } from "@/lib/plan-draft";
import { INDUSTRIES, type IndustryId } from "../../onboarding/industries";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Los geht's — matchfoundr" }] }),
  component: () => (
    <AuthGate>
      <OnboardingPage />
    </AuthGate>
  ),
});

type Mode = "skills" | "idea";
type Availability = "fulltime" | "parttime" | "weekend";

const SKILL_TAGS = [
  "Entwicklung",
  "Design",
  "Vertrieb",
  "Marketing",
  "Finanzen",
  "Recht",
  "Handwerk",
  "Organisation",
  "Content & Social",
  "Kundenkontakt",
  "Einkauf & Logistik",
  "KI & Daten",
];

const AVAILABILITY: { id: Availability; label: string; sub: string; hours: number }[] = [
  { id: "fulltime", label: "Vollzeit", sub: "Das wird mein Hauptding", hours: 40 },
  { id: "parttime", label: "Teilzeit", sub: "Neben Job oder Studium", hours: 15 },
  { id: "weekend", label: "Wochenende", sub: "Erstmal nebenbei testen", hours: 8 },
];

function OnboardingPage() {
  const { user, session, isDemo } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [mode, setMode] = useState<Mode | null>(null);
  const [industry, setIndustry] = useState<IndustryId | null>(null);
  const [skills, setSkills] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [pitch, setPitch] = useState("");
  const [plz, setPlz] = useState("");
  const [availability, setAvailability] = useState<Availability | null>(null);

  const selectedIndustry = useMemo(
    () => INDUSTRIES.find((i) => i.id === industry) ?? null,
    [industry],
  );

  const canFinish = name.trim().length > 1 && role.trim().length > 1 && availability !== null;
  const canNext =
    step === 0 ? mode !== null : step === 1 ? industry !== null && skills.length > 0 : canFinish;

  function toggleSkill(tag: string) {
    setSkills((cur) => (cur.includes(tag) ? cur.filter((t) => t !== tag) : [...cur, tag]));
  }

  async function finish() {
    if (!canFinish || !mode || !selectedIndustry || !availability || saving) return;
    setSaving(true);

    const hours = AVAILABILITY.find((a) => a.id === availability)?.hours ?? 15;
    const context: PlanContext = {
      userName: name.trim(),
      path: mode === "skills" ? "talent" : "founder",
      industry: selectedIndustry.id,
      industryLabel: selectedIndustry.label,
      ventureTerm: selectedIndustry.terms.venture,
      partnerTerm: selectedIndustry.terms.partner,
      copilotContext: selectedIndustry.copilot_context,
      context: {
        idea: pitch.trim() || undefined,
        role: role.trim(),
        stage: mode === "idea" ? "Idee" : undefined,
      },
      skills: { selected: skills, availability: hours },
      createdAt: new Date().toISOString(),
    };
    writePlanContext(context);

    if (session && user && !isDemo) {
      try {
        await supabase
          .from("profiles")
          .update({
            display_name: name.trim(),
            founder_type: mode === "skills" ? "talent" : "founder",
            industry: selectedIndustry.id,
            venture_term: selectedIndustry.terms.venture,
            partner_term: selectedIndustry.terms.partner,
            skills,
            location: plz.trim() || null,
            vision: pitch.trim() || null,
            onboarded_at: new Date().toISOString(),
          })
          .eq("id", user.id);
      } catch (err) {
        console.error("profile save failed", err);
      }
    }

    toast.success(`Willkommen, ${name.trim().split(" ")[0]}!`);
    navigate({ to: "/heute" });
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col px-5 pb-10 pt-8">
      {/* Kopf: Marke + Fortschritt */}
      <div className="flex items-center justify-between">
        <span className="text-[16px] font-bold tracking-[-0.03em] text-[var(--cream)]">
          matchfoundr<span className="text-[var(--ember)]">.</span>
        </span>
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-1.5 rounded-full transition-all duration-300"
              style={{
                width: i === step ? 22 : 8,
                background: i <= step ? "var(--ember)" : "rgba(255,255,255,0.2)",
              }}
            />
          ))}
        </div>
      </div>

      {/* Schritt 1 — Modus */}
      {step === 0 && (
        <div className="flex flex-1 flex-col justify-center">
          <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-[var(--cream)]">
            Womit startest du?
          </h1>
          <div className="mt-6 grid gap-3">
            <ModeCard
              active={mode === "skills"}
              icon={Wrench}
              title="Ich biete Skills"
              sub="Ich kann etwas — und suche ein Vorhaben oder Menschen, die mich brauchen."
              onClick={() => setMode("skills")}
            />
            <ModeCard
              active={mode === "idea"}
              icon={Lightbulb}
              title="Ich habe eine Idee"
              sub="Ich will etwas aufbauen — und suche Menschen, die mitmachen."
              onClick={() => setMode("idea")}
            />
          </div>
        </div>
      )}

      {/* Schritt 2 — Branche & Skills */}
      {step === 1 && (
        <div className="flex flex-1 flex-col justify-center py-6">
          <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-[var(--cream)]">
            Deine Welt.
          </h1>
          <div className="mt-5">
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">
              Branche
            </div>
            <div className="mt-2.5 grid grid-cols-2 gap-2">
              {INDUSTRIES.map((ind) => (
                <button
                  key={ind.id}
                  onClick={() => setIndustry(ind.id)}
                  className="flex min-h-[52px] items-center gap-2.5 rounded-2xl border px-3.5 py-2.5 text-left transition"
                  style={{
                    background:
                      industry === ind.id ? "rgba(226,81,28,0.16)" : "rgba(255,255,255,0.05)",
                    borderColor: industry === ind.id ? "var(--ember)" : "rgba(255,255,255,0.12)",
                  }}
                >
                  <span className="text-[17px]">{ind.emoji}</span>
                  <span className="text-[13px] font-semibold leading-tight text-[var(--cream)]">
                    {ind.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div className="mt-6">
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">
              {mode === "skills" ? "Das kann ich" : "Das brauche ich"}
            </div>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {SKILL_TAGS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleSkill(tag)}
                  className="min-h-[44px] rounded-full border px-4 text-[13px] font-medium transition"
                  style={{
                    background: skills.includes(tag) ? "var(--ember)" : "rgba(255,255,255,0.05)",
                    borderColor: skills.includes(tag) ? "var(--ember)" : "rgba(255,255,255,0.14)",
                    color: skills.includes(tag) ? "white" : "rgba(255,255,255,0.85)",
                  }}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Schritt 3 — Kurzprofil */}
      {step === 2 && (
        <div className="flex flex-1 flex-col justify-center py-6">
          <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-[var(--cream)]">
            Fast geschafft.
          </h1>
          <div className="mt-5 space-y-4">
            <Field label="Dein Name">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Vorname reicht"
                autoFocus
                className="onb-input"
              />
            </Field>
            <Field label={mode === "skills" ? "Deine Rolle" : "Deine Rolle im Vorhaben"}>
              <input
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder={
                  mode === "skills"
                    ? "z.B. Elektriker, Designerin, Entwickler"
                    : "z.B. Gründerin, Macher, Organisator"
                }
                className="onb-input"
              />
            </Field>
            <Field label="Dein Pitch in einem Satz" hint={`${pitch.length}/140`}>
              <textarea
                value={pitch}
                onChange={(e) => setPitch(e.target.value.slice(0, 140))}
                rows={2}
                placeholder={
                  mode === "skills"
                    ? "z.B. Ich baue Websites, die Handwerkern Kunden bringen."
                    : "z.B. Ich eröffne eine Padelhalle in Köln und suche einen Macher."
                }
                className="onb-input resize-none"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="PLZ">
                <input
                  value={plz}
                  onChange={(e) => setPlz(e.target.value.replace(/\D/g, "").slice(0, 5))}
                  inputMode="numeric"
                  placeholder="50667"
                  className="onb-input"
                />
              </Field>
            </div>
            <Field label="Verfügbarkeit">
              <div className="grid gap-2">
                {AVAILABILITY.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setAvailability(a.id)}
                    className="flex min-h-[52px] items-center justify-between rounded-2xl border px-4 py-2.5 text-left transition"
                    style={{
                      background:
                        availability === a.id ? "rgba(226,81,28,0.16)" : "rgba(255,255,255,0.05)",
                      borderColor:
                        availability === a.id ? "var(--ember)" : "rgba(255,255,255,0.12)",
                    }}
                  >
                    <span>
                      <span className="block text-[13.5px] font-semibold text-[var(--cream)]">
                        {a.label}
                      </span>
                      <span className="block text-[11.5px] text-white/55">{a.sub}</span>
                    </span>
                    {availability === a.id && <Check className="h-4 w-4 text-[var(--ember)]" />}
                  </button>
                ))}
              </div>
            </Field>
          </div>
        </div>
      )}

      {/* Fußzeile: Zurück / Weiter */}
      <div className="mt-6 flex items-center gap-3">
        {step > 0 && (
          <button
            onClick={() => setStep((s) => s - 1)}
            aria-label="Zurück"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/15 text-white/70 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        <button
          onClick={() => (step < 2 ? setStep((s) => s + 1) : finish())}
          disabled={!canNext || saving}
          className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl text-[14.5px] font-semibold text-white transition disabled:opacity-40"
          style={{ background: "var(--ember-grad)", boxShadow: "var(--ember-glow)" }}
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              {step < 2 ? "Weiter" : "Los geht's"}
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>

      <style>{`
        .onb-input {
          width: 100%;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,0.14);
          background: rgba(255,255,255,0.06);
          padding: 12px 14px;
          font-size: 15px;
          color: var(--cream);
          outline: none;
          transition: border-color 0.2s;
        }
        .onb-input::placeholder { color: rgba(255,255,255,0.35); }
        .onb-input:focus { border-color: var(--ember); }
      `}</style>
    </div>
  );
}

function ModeCard({
  active,
  icon: Icon,
  title,
  sub,
  onClick,
}: {
  active: boolean;
  icon: typeof Wrench;
  title: string;
  sub: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex min-h-[92px] items-start gap-4 rounded-3xl border p-5 text-left transition-all duration-200"
      style={{
        background: active ? "rgba(226,81,28,0.16)" : "rgba(255,255,255,0.05)",
        borderColor: active ? "var(--ember)" : "rgba(255,255,255,0.12)",
        transform: active ? "scale(1.01)" : "scale(1)",
      }}
    >
      <span
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
        style={{ background: active ? "var(--ember)" : "rgba(255,255,255,0.1)" }}
      >
        <Icon className="h-5 w-5 text-white" />
      </span>
      <span>
        <span className="block text-[16px] font-semibold text-[var(--cream)]">{title}</span>
        <span className="mt-1 block text-[13px] leading-snug text-white/60">{sub}</span>
      </span>
    </button>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">
        {label}
        {hint && <span>{hint}</span>}
      </span>
      {children}
    </label>
  );
}
