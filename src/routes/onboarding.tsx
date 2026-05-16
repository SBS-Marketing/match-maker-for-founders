import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AuthGate } from "@/components/AuthGate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowRight, Check } from "lucide-react";

export const Route = createFileRoute("/onboarding")({
  component: () => (
    <AuthGate>
      <Onboarding />
    </AuthGate>
  ),
});

type Form = {
  display_name: string;
  location: string;
  photo_url: string;
  vision: string;
  stage: "" | "idea" | "mvp" | "revenue" | "scaling";
  commitment: "" | "full_time" | "part_time" | "exploring";
  looking_for: string;
  role: "" | "tech" | "business" | "product" | "design" | "other";
  industry: string;
  skills: string;
};

const STEPS = ["Identity", "Deine Story", "Stage", "Was du suchst", "Logistik", "Review"] as const;

const stageOptions: { value: Form["stage"]; l: string; d: string }[] = [
  { value: "idea", l: "Nur am Überlegen", d: "Ein paar Stunden pro Woche. Noch kein Prototyp, keine Nutzer." },
  { value: "mvp", l: "Baue nachts", d: "Ein echter Prototyp nimmt nach Feierabend Form an." },
  { value: "revenue", l: "Steige bald aus", d: "Kündigung ist raus oder in den nächsten 60 Tagen." },
  { value: "scaling", l: "Schon Vollzeit", d: "Job ist gekündigt. Die Runway-Uhr tickt." },
];
const commitmentChips: { value: Form["commitment"]; l: string }[] = [
  { value: "full_time", l: "In 30 Tagen" },
  { value: "full_time", l: "In 60 Tagen" },
  { value: "part_time", l: "In 90 Tagen" },
  { value: "part_time", l: "6 Monate" },
  { value: "exploring", l: "Wenn der Match passt" },
];
const roleOptions: { value: Form["role"]; l: string; d: string }[] = [
  { value: "tech", l: "Tech", d: "Code, Infrastruktur, Systeme." },
  { value: "business", l: "Business", d: "Sales, Ops, Finanzen, GTM." },
  { value: "product", l: "Product", d: "Discovery, Specs, Roadmap." },
  { value: "design", l: "Design", d: "UX, Brand, Craft." },
];

function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [autosave, setAutosave] = useState<string>("");
  const [form, setForm] = useState<Form>({
    display_name: "",
    location: "",
    photo_url: "",
    vision: "",
    stage: "",
    commitment: "",
    looking_for: "",
    role: "",
    industry: "",
    skills: "",
  });
  const [commitChip, setCommitChip] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setForm({
          display_name: data.display_name ?? "",
          location: data.location ?? "",
          photo_url: data.photo_url ?? "",
          vision: data.vision ?? "",
          stage: (data.stage as any) ?? "",
          commitment: (data.commitment as any) ?? "",
          looking_for: data.looking_for ?? "",
          role: (data.role as any) ?? "",
          industry: data.industry ?? "",
          skills: (data.skills ?? []).join(", "),
        });
      });
  }, [user]);

  // autosave indicator (debounced visual only)
  useEffect(() => {
    const t = setTimeout(() => setAutosave("vor 4s"), 1200);
    return () => clearTimeout(t);
  }, [form, step]);

  const validateStep = (): string | null => {
    if (step === 0) {
      if (form.display_name.trim().length < 2) return "Name zu kurz";
    }
    if (step === 1) {
      if (form.vision.trim().length < 20) return "Mindestens 20 Zeichen für deine Story";
    }
    if (step === 2 && !form.stage) return "Wähle eine Stage";
    if (step === 3 && form.looking_for.trim().length < 20) return "Mindestens 20 Zeichen";
    if (step === 4 && !form.role) return "Wähle deine Rolle";
    return null;
  };

  const next = () => {
    const err = validateStep();
    if (err) return toast.error(err);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const submit = async () => {
    const schema = z.object({
      display_name: z.string().trim().min(2).max(80),
      vision: z.string().trim().min(20).max(1000),
      looking_for: z.string().trim().min(20).max(1000),
      role: z.enum(["tech", "business", "product", "design", "other"]),
      stage: z.enum(["idea", "mvp", "revenue", "scaling"]),
      commitment: z.enum(["full_time", "part_time", "exploring"]),
    });
    const parsed = schema.safeParse(form);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setSaving(true);
    const skills = form.skills
      ? form.skills.split(",").map((s) => s.trim()).filter(Boolean)
      : [];
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: form.display_name,
        location: form.location || null,
        photo_url: form.photo_url || null,
        vision: form.vision,
        looking_for: form.looking_for,
        role: form.role || null,
        stage: form.stage || null,
        commitment: form.commitment || null,
        industry: form.industry || null,
        skills,
        onboarded_at: new Date().toISOString(),
      })
      .eq("id", user!.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Profil gespeichert.");
    navigate({ to: "/discover" });
  };

  return (
    <div className="min-h-[calc(100vh-56px)] px-6 py-8 md:px-10">
      {/* Top bar */}
      <div
        className="glass-pill mx-auto flex max-w-5xl items-center gap-4 px-5 py-2.5"
        style={{
          background: "rgba(21,20,15,0.45)",
          border: "1px solid rgba(255,255,255,0.10)",
          color: "var(--cream)",
        }}
      >
        <span className="font-semibold tracking-tight">
          matchfoundr<span style={{ color: "var(--ember)" }}>.</span>
        </span>
        <span className="flex-1" />
        <span className="eyebrow" style={{ color: "rgba(255,255,255,0.6)" }}>
          Setup · Schritt {step + 1} von {STEPS.length}
        </span>
        <button
          className="text-sm"
          style={{ color: "rgba(255,255,255,0.6)" }}
          onClick={() => navigate({ to: "/" })}
        >
          Speichern & raus
        </button>
      </div>

      {/* Progress dots */}
      <div className="mx-auto mt-6 flex max-w-5xl flex-wrap items-center justify-center gap-x-3 gap-y-2">
        {STEPS.map((s, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <div key={s} className="flex items-center gap-3">
              <span
                className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em]"
                style={{
                  color: active
                    ? "var(--cream)"
                    : done
                      ? "rgba(255,255,255,0.6)"
                      : "rgba(255,255,255,0.3)",
                }}
              >
                <span
                  className="flex h-[22px] w-[22px] items-center justify-center rounded-full text-[11px] font-semibold"
                  style={{
                    background: active
                      ? "var(--ember)"
                      : done
                        ? "rgba(255,255,255,0.15)"
                        : "rgba(255,255,255,0.06)",
                    border: `1px solid ${active ? "rgba(255,200,170,0.5)" : "rgba(255,255,255,0.12)"}`,
                    color: "var(--cream)",
                  }}
                >
                  {done ? <Check className="h-3 w-3" /> : i + 1}
                </span>
                {s}
              </span>
              {i < STEPS.length - 1 && (
                <span className="h-px w-6" style={{ background: "rgba(255,255,255,0.15)" }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Form card */}
      <div className="mx-auto mt-8 flex max-w-[880px] items-center justify-center">
        <div
          className="glass-pane w-full px-7 py-9 md:px-14 md:py-10"
          style={{ background: "rgba(251,250,247,0.82)", color: "var(--ink)" }}
        >
          <div className="eyebrow">
            {String(step + 1).padStart(2, "0")} · {STEPS[step]}
          </div>

          {step === 0 && (
            <>
              <h2 className="mt-3 text-4xl font-semibold leading-[1.05] tracking-tight">
                Wer bist <span className="font-serif italic font-normal">du?</span>
              </h2>
              <p className="mt-3 max-w-[560px] text-[15px] leading-relaxed text-[var(--smoke)]">
                Echter Name, echtes Foto. Andere Founder entscheiden hier in Sekunden.
              </p>
              <div className="mt-7 grid gap-5">
                <Field label="Name">
                  <Input
                    value={form.display_name}
                    onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                    placeholder="Vor- und Nachname"
                  />
                </Field>
                <Field label="Foto-URL (optional)">
                  <Input
                    value={form.photo_url}
                    onChange={(e) => setForm({ ...form, photo_url: e.target.value })}
                    placeholder="https://…"
                  />
                </Field>
                <Field label="Standort (optional)">
                  <Input
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    placeholder="Berlin, Remote, …"
                  />
                </Field>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <h2 className="mt-3 text-4xl font-semibold leading-[1.05] tracking-tight">
                Was baust du, <span className="font-serif italic font-normal">ehrlich?</span>
              </h2>
              <p className="mt-3 max-w-[560px] text-[15px] leading-relaxed text-[var(--smoke)]">
                Keine Pitch-Folie. Schreib so wie du einer Freundin am Abend erzählen würdest, was dich packt.
              </p>
              <div className="mt-7">
                <Field label="Deine Geschichte (mind. 20 Zeichen)">
                  <Textarea
                    rows={7}
                    value={form.vision}
                    onChange={(e) => setForm({ ...form, vision: e.target.value })}
                    placeholder="Ich habe fünf Jahre bei … gebaut. Jetzt will ich …"
                  />
                </Field>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="mt-3 text-4xl font-semibold leading-[1.05] tracking-tight">
                Wo stehst du, <span className="font-serif italic font-normal">ehrlich?</span>
              </h2>
              <p className="mt-3 max-w-[560px] text-[15px] leading-relaxed text-[var(--smoke)]">
                Wir matchen Founder die ungefähr gleich weit sind. Lügen hilft niemandem — wähl die nächstgelegene Wahrheit.
              </p>
              <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {stageOptions.map((opt) => {
                  const sel = form.stage === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setForm({ ...form, stage: opt.value })}
                      className="flex items-start gap-3.5 rounded-2xl p-5 text-left transition"
                      style={{
                        background: sel ? "rgba(226,81,28,0.10)" : "rgba(255,255,255,0.55)",
                        border: sel
                          ? "1.5px solid var(--ember)"
                          : "1px solid rgba(21,20,15,0.10)",
                        boxShadow: sel
                          ? "0 10px 24px -10px rgba(178,59,14,0.30)"
                          : "none",
                      }}
                    >
                      <span
                        className="mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md"
                        style={{
                          background: sel ? "var(--ember)" : "transparent",
                          border: sel ? "none" : "1.5px solid rgba(21,20,15,0.25)",
                        }}
                      >
                        {sel && <Check className="h-3.5 w-3.5" style={{ color: "var(--cream)" }} />}
                      </span>
                      <span>
                        <div className="text-base font-semibold tracking-tight">{opt.l}</div>
                        <div className="mt-1 text-[13px] leading-snug text-[var(--smoke)]">{opt.d}</div>
                      </span>
                    </button>
                  );
                })}
              </div>

              <div
                className="mt-6 rounded-2xl px-5 py-4"
                style={{
                  background: "rgba(21,20,15,0.04)",
                  border: "1px solid rgba(21,20,15,0.06)",
                }}
              >
                <div className="eyebrow mb-3">Wann gehst du Vollzeit?</div>
                <div className="flex flex-wrap gap-2">
                  {commitmentChips.map((c, i) => {
                    const sel = commitChip === i;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setCommitChip(i);
                          setForm({ ...form, commitment: c.value });
                        }}
                        className="rounded-full px-3.5 py-2 text-sm font-medium transition"
                        style={{
                          background: sel ? "var(--ink)" : "rgba(255,255,255,0.7)",
                          color: sel ? "var(--cream)" : "var(--ink)",
                          border: sel
                            ? "1px solid transparent"
                            : "1px solid rgba(21,20,15,0.10)",
                        }}
                      >
                        {c.l}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h2 className="mt-3 text-4xl font-semibold leading-[1.05] tracking-tight">
                Wen suchst du, <span className="font-serif italic font-normal">wirklich?</span>
              </h2>
              <p className="mt-3 max-w-[560px] text-[15px] leading-relaxed text-[var(--smoke)]">
                Sei spezifisch. „Ein Technical Co-Founder der … kann" schlägt „jemand smartes" jedes Mal.
              </p>
              <div className="mt-7">
                <Field label="Was suchst du in einem Co-Founder?">
                  <Textarea
                    rows={7}
                    value={form.looking_for}
                    onChange={(e) => setForm({ ...form, looking_for: e.target.value })}
                    placeholder="Jemand der Systeme baut. Hat schon Payments-Infrastruktur gesehen …"
                  />
                </Field>
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <h2 className="mt-3 text-4xl font-semibold leading-[1.05] tracking-tight">
                Was bringst du <span className="font-serif italic font-normal">mit?</span>
              </h2>
              <p className="mt-3 max-w-[560px] text-[15px] leading-relaxed text-[var(--smoke)]">
                Deine Rolle, deine Branche, deine Skills. Knapp.
              </p>
              <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {roleOptions.map((opt) => {
                  const sel = form.role === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setForm({ ...form, role: opt.value })}
                      className="flex items-start gap-3.5 rounded-2xl p-5 text-left transition"
                      style={{
                        background: sel ? "rgba(226,81,28,0.10)" : "rgba(255,255,255,0.55)",
                        border: sel
                          ? "1.5px solid var(--ember)"
                          : "1px solid rgba(21,20,15,0.10)",
                      }}
                    >
                      <span
                        className="mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md"
                        style={{
                          background: sel ? "var(--ember)" : "transparent",
                          border: sel ? "none" : "1.5px solid rgba(21,20,15,0.25)",
                        }}
                      >
                        {sel && <Check className="h-3.5 w-3.5" style={{ color: "var(--cream)" }} />}
                      </span>
                      <span>
                        <div className="text-base font-semibold tracking-tight">{opt.l}</div>
                        <div className="mt-1 text-[13px] leading-snug text-[var(--smoke)]">{opt.d}</div>
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-6 grid gap-5">
                <Field label="Branche (optional)">
                  <Input
                    value={form.industry}
                    onChange={(e) => setForm({ ...form, industry: e.target.value })}
                    placeholder="Fintech, B2B SaaS, …"
                  />
                </Field>
                <Field label="Skills (Komma-getrennt)">
                  <Input
                    value={form.skills}
                    onChange={(e) => setForm({ ...form, skills: e.target.value })}
                    placeholder="React, Sales, Pitching"
                  />
                </Field>
              </div>
            </>
          )}

          {step === 5 && (
            <>
              <h2 className="mt-3 text-4xl font-semibold leading-[1.05] tracking-tight">
                Bereit zum <span className="font-serif italic font-normal">veröffentlichen?</span>
              </h2>
              <p className="mt-3 max-w-[560px] text-[15px] leading-relaxed text-[var(--smoke)]">
                Letzter Blick auf dein Profil. Du kannst alles jederzeit ändern.
              </p>
              <div
                className="mt-7 grid gap-3 rounded-2xl p-5 text-sm"
                style={{
                  background: "rgba(21,20,15,0.04)",
                  border: "1px solid rgba(21,20,15,0.06)",
                }}
              >
                <ReviewRow label="Name" value={form.display_name} />
                <ReviewRow label="Standort" value={form.location || "—"} />
                <ReviewRow label="Stage" value={form.stage || "—"} />
                <ReviewRow label="Commitment" value={form.commitment || "—"} />
                <ReviewRow label="Rolle" value={form.role || "—"} />
                <ReviewRow label="Branche" value={form.industry || "—"} />
                <ReviewRow label="Skills" value={form.skills || "—"} />
                <ReviewRow label="Story" value={form.vision.slice(0, 120) + (form.vision.length > 120 ? "…" : "")} />
                <ReviewRow label="Sucht" value={form.looking_for.slice(0, 120) + (form.looking_for.length > 120 ? "…" : "")} />
              </div>
            </>
          )}

          {/* Footer */}
          <div
            className="mt-8 flex items-center justify-between border-t pt-6"
            style={{ borderColor: "rgba(21,20,15,0.08)" }}
          >
            <span className="eyebrow" style={{ letterSpacing: "0.06em" }}>
              ~{Math.max(1, STEPS.length - step - 1) * 30}s übrig · Autospeichern {autosave || "live"}
            </span>
            <div className="flex gap-2.5">
              {step > 0 && (
                <Button
                  variant="outline"
                  onClick={back}
                  className="h-11 rounded-xl border-[rgba(21,20,15,0.15)] bg-transparent text-[var(--ink)]"
                >
                  Zurück
                </Button>
              )}
              {step < STEPS.length - 1 ? (
                <Button
                  onClick={next}
                  className="shadow-ember h-11 gap-2 rounded-xl bg-[var(--ember)] px-6 text-[var(--cream)] hover:bg-[var(--ember-deep)]"
                >
                  Weiter · {STEPS[step + 1]}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={submit}
                  disabled={saving}
                  className="shadow-ember h-11 gap-2 rounded-xl bg-[var(--ember)] px-6 text-[var(--cream)] hover:bg-[var(--ember-deep)]"
                >
                  {saving ? "Speichere…" : "Profil veröffentlichen"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-4">
      <span className="w-32 shrink-0 text-[var(--smoke)]">{label}</span>
      <span className="font-medium text-[var(--ink)]">{value}</span>
    </div>
  );
}
