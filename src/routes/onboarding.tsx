import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ArrowLeft, Mic, MicOff, PencilLine, Sparkles, Check, Lightbulb, Wrench, Layers, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AuthGate } from "@/components/AuthGate";
import { toast } from "sonner";
import { SKILL_CATEGORIES, LOOKING_FOR_OPTIONS, type LookingFor } from "../../onboarding/skills";
import {
  ASSESSMENT_QUESTIONS,
  calculateAllScores,
  type AssessmentScores,
} from "../../onboarding/assessment";
import { INDUSTRIES, getIndustry, type Industry, type IndustryId } from "../../onboarding/industries";
import { RadarChart } from "@/components/onboarding/RadarChart";
import { LoadingConverge } from "@/components/onboarding/LoadingConverge";

export const Route = createFileRoute("/onboarding")({
  component: () => (
    <AuthGate>
      <Onboarding />
    </AuthGate>
  ),
});

// ─────────────────────────────────────────────────────────────
// State Machine
// ─────────────────────────────────────────────────────────────

type FounderType = "founder" | "talent" | "hybrid";

type ContextFields = {
  idea: string;
  role: string;
  stage: string;
  goal: string;
  risk: string;
};

type SkillState = {
  selected: string[];
  categories: string[];
  availability: number;
  looking_for: LookingFor[];
};

type State = {
  industry: IndustryId | null;
  path: FounderType | null;
  context: ContextFields;
  skills: SkillState;
  answers: Record<string, number>;
};

const EMPTY_STATE: State = {
  industry: null,
  path: null,
  context: { idea: "", role: "", stage: "", goal: "", risk: "" },
  skills: { selected: [], categories: [], availability: 20, looking_for: [] },
  answers: {},
};

const STORAGE_KEY = "matchfoundr_onboarding_v1";
const STEP_KEY = "matchfoundr_onboarding_step_v1";

type ContextQuestion = {
  key: keyof ContextFields;
  question: string;
  placeholder: string;
  options: string[];
  multi: boolean;
};

function buildContextQuestions(industry: Industry): ContextQuestion[] {
  const venture = industry.terms.venture;
  const partner = industry.terms.partner;
  return [
    {
      key: "idea",
      question: `Woran arbeitest du? Was für ein ${venture} entsteht?`,
      placeholder: `Erzähl in einem Satz, was du baust…`,
      options: ["SaaS-Tool", "Marketplace", "Mobile App", "AI/ML-Produkt", "Hardware", "Consumer-Brand", "B2B-Service", "Noch unklar"],
      multi: false,
    },
    {
      key: "role",
      question: `Was ist deine Rolle? Solo oder mit ${partner}?`,
      placeholder: `z. B. Solo, technisch`,
      options: [`Solo`, `Technischer ${partner}`, "Business/Sales", "Produkt/Design", "Mit Team (2–3)", "Mit Team (4+)"],
      multi: true,
    },
    {
      key: "stage",
      question: "Wo stehst du gerade?",
      placeholder: "Aktuelle Phase…",
      options: industry.terms.stage_options,
      multi: false,
    },
    {
      key: "goal",
      question: "Was willst du in den nächsten 3 Monaten erreichen?",
      placeholder: "z. B. erste 10 Kunden",
      options: ["Erstes Projekt fertig", "Erste 10 Kunden", `${partner} finden`, "Förderung sichern", "Team aufbauen", "Finanzierung"],
      multi: true,
    },
    {
      key: "risk",
      question: "Was ist dein größtes Risiko oder die nächste Deadline?",
      placeholder: "z. B. Runway endet in 6 Monaten",
      options: ["Runway < 6 Monate", "Antrags-Deadline", "Markt-Validierung offen", "Genehmigung/Zulassung offen", `Kein ${partner}`, "Kein Risiko gerade"],
      multi: false,
    },
  ];
}

// ─────────────────────────────────────────────────────────────
// Step keys per path
// ─────────────────────────────────────────────────────────────

function stepsFor(industry: IndustryId | null, path: FounderType | null): string[] {
  if (!industry) return ["industry"];
  if (!path) return ["industry", "type"];
  if (path === "founder") {
    return ["industry", "type", "input_method", "ctx_0", "ctx_1", "ctx_2", "ctx_3", "ctx_4", "assessment", "overview"];
  }
  if (path === "talent") {
    return ["industry", "type", "skills_picker", "looking_for", "availability", "assessment", "overview"];
  }
  // hybrid
  return ["industry", "type", "input_method", "ctx_0", "ctx_1", "ctx_2", "ctx_3", "ctx_4", "skills_picker", "looking_for", "availability", "assessment", "overview"];
}

// ─────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────

function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState<State>(() => {
    if (typeof window === "undefined") return EMPTY_STATE;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? { ...EMPTY_STATE, ...JSON.parse(raw) } : EMPTY_STATE;
    } catch {
      return EMPTY_STATE;
    }
  });
  const [stepIdx, setStepIdx] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    try {
      const raw = localStorage.getItem(STEP_KEY);
      const n = raw ? parseInt(raw, 10) : 0;
      return Number.isFinite(n) && n >= 0 ? n : 0;
    } catch {
      return 0;
    }
  });
  const [direction, setDirection] = useState<1 | -1>(1);
  const [submitting, setSubmitting] = useState(false);
  const resumedRef = useRef(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch { /* ignore */ }
  }, [state]);

  useEffect(() => {
    try {
      localStorage.setItem(STEP_KEY, String(stepIdx));
    } catch { /* ignore */ }
  }, [stepIdx]);

  // Show resume hint once if user returns mid-flow
  useEffect(() => {
    if (resumedRef.current) return;
    resumedRef.current = true;
    if (stepIdx > 0 && state.path) {
      toast.success("Fortschritt wiederhergestellt", {
        description: "Du machst da weiter, wo du aufgehört hast.",
        action: {
          label: "Neu starten",
          onClick: () => {
            try {
              localStorage.removeItem(STORAGE_KEY);
              localStorage.removeItem(STEP_KEY);
            } catch { /* ignore */ }
            setState(EMPTY_STATE);
            setStepIdx(0);
          },
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const industry = useMemo(() => getIndustry(state.industry ?? "tech"), [state.industry]);
  const contextQuestions = useMemo(() => buildContextQuestions(industry), [industry]);
  const steps = stepsFor(state.industry, state.path);
  const currentStep = steps[stepIdx] ?? "industry";

  const goNext = useCallback(() => {
    setDirection(1);
    setStepIdx((i) => Math.min(i + 1, steps.length - 1));
  }, [steps.length]);

  const goBack = useCallback(() => {
    setDirection(-1);
    setStepIdx((i) => Math.max(i - 1, 0));
  }, []);

  const updateState = useCallback((patch: Partial<State>) => {
    setState((s) => ({ ...s, ...patch }));
  }, []);

  const updateCtx = useCallback((key: keyof ContextFields, value: string) => {
    setState((s) => ({ ...s, context: { ...s.context, [key]: value } }));
  }, []);

  const updateSkills = useCallback((patch: Partial<SkillState>) => {
    setState((s) => ({ ...s, skills: { ...s.skills, ...patch } }));
  }, []);

  // ── Submission ──────────────────────────────────────────────
  const submitAll = useCallback(async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      const scores = calculateAllScores(state.answers);

      // Persist profile founder_type
      await supabase.from("profiles").update({ founder_type: state.path }).eq("id", user.id);

      // Persist context for founder/hybrid
      if (state.path === "founder" || state.path === "hybrid") {
        await supabase.from("copilot_context").upsert({
          user_id: user.id,
          idea: state.context.idea || null,
          role: state.context.role || null,
          stage: state.context.stage || null,
          goal: state.context.goal || null,
          risk: state.context.risk || null,
          raw_context: state.context,
          updated_at: new Date().toISOString(),
        });
      }

      // Persist skills for talent/hybrid
      if (state.path === "talent" || state.path === "hybrid") {
        await supabase.from("founder_skills").insert({
          user_id: user.id,
          skills: state.skills.selected,
          categories: state.skills.categories,
          availability: state.skills.availability,
          looking_for: state.skills.looking_for,
        });
      }

      // Persist assessment
      await supabase.from("founder_assessment").insert({
        user_id: user.id,
        raw_answers: state.answers,
        scores,
      });

      // Trigger plan generation (fire and forget – it can take a while)
      supabase.functions.invoke("copilot", { body: { task: "plan_generate", message: "" } }).catch(() => undefined);

      try {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(STEP_KEY);
      } catch { /* ignore */ }

      // Trigger tutorial overlay on /heute
      try { sessionStorage.setItem("mf_tutorial", "1"); } catch {}

      // Redirect to dashboard
      navigate({ to: "/heute" });
    } catch (e) {
      console.error(e);
      toast.error("Speichern fehlgeschlagen. Bitte erneut versuchen.");
      setSubmitting(false);
    }
  }, [user, state, navigate]);

  if (submitting) {
    return (
      <main className="min-h-screen" style={{ background: "var(--cream)" }}>
        <LoadingConverge />
      </main>
    );
  }

  const progress = state.path ? (stepIdx / (steps.length - 1)) * 100 : 0;

  return (
    <main className="min-h-screen overflow-hidden" style={{ background: "var(--cream)" }}>
      {/* Progress bar */}
      <div className="fixed inset-x-0 top-0 z-50 h-1 bg-[var(--paper)]">
        <motion.div
          className="h-full"
          style={{ background: "var(--ember)" }}
          initial={false}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        />
      </div>

      {/* Back button */}
      {stepIdx > 0 && currentStep !== "overview" && (
        <button
          onClick={goBack}
          className="fixed left-4 top-6 z-40 flex h-9 w-9 items-center justify-center rounded-full bg-[var(--paper)] text-[var(--ink)] transition-colors hover:bg-[var(--ember-tint)]"
          aria-label="Zurück"
        >
          <ArrowLeft size={16} />
        </button>
      )}

      <div className="relative mx-auto min-h-screen max-w-2xl">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStep}
            custom={direction}
            initial={{ x: direction > 0 ? "100%" : "-100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: direction > 0 ? "-100%" : "100%", opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="min-h-screen px-6 pb-12 pt-20"
          >
            {currentStep === "industry" && (
              <StepIndustry
                selected={state.industry}
                onChoose={(id) => {
                  updateState({ industry: id });
                  setDirection(1);
                  setTimeout(() => setStepIdx(1), 400);
                }}
              />
            )}

            {currentStep === "type" && (
              <StepType
                industry={industry}
                onChoose={(p) => {
                  updateState({ path: p });
                  setDirection(1);
                  setStepIdx(2);
                }}
              />
            )}

            {currentStep === "input_method" && (
              <StepInputMethod
                onForm={() => goNext()}
                onVoiceComplete={(parsed) => {
                  setState((s) => ({ ...s, context: { ...s.context, ...parsed } }));
                  // Skip context questions, jump to next non-context step
                  setDirection(1);
                  const next = steps.findIndex((s, i) => i > stepIdx && !s.startsWith("ctx_"));
                  setStepIdx(next === -1 ? steps.length - 1 : next);
                }}
              />
            )}

            {currentStep.startsWith("ctx_") && (
              <StepContextQuestion
                idx={Number(currentStep.split("_")[1])}
                questions={contextQuestions}
                value={state.context[contextQuestions[Number(currentStep.split("_")[1])].key]}
                onChange={(v) => updateCtx(contextQuestions[Number(currentStep.split("_")[1])].key, v)}
                onNext={goNext}
              />
            )}

            {currentStep === "skills_picker" && (
              <StepSkillPicker
                skills={state.skills}
                primaryCategories={industry.primary_skills}
                onChange={updateSkills}
                onNext={goNext}
              />
            )}

            {currentStep === "looking_for" && (
              <StepLookingFor
                selected={state.skills.looking_for}
                onChange={(v) => updateSkills({ looking_for: v })}
                onNext={goNext}
              />
            )}

            {currentStep === "availability" && (
              <StepAvailability
                value={state.skills.availability}
                onChange={(v) => updateSkills({ availability: v })}
                onNext={goNext}
              />
            )}

            {currentStep === "assessment" && (
              <StepAssessment
                answers={state.answers}
                onChange={(answers) => updateState({ answers })}
                onComplete={goNext}
              />
            )}

            {currentStep === "overview" && (
              <StepOverview
                state={state}
                industry={industry}
                contextQuestions={contextQuestions}
                onEditContext={(key, value) => updateCtx(key, value)}
                onEditSkills={(patch) => updateSkills(patch)}
                onSubmit={submitAll}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </main>
  );
}

// ─────────────────────────────────────────────────────────────
// Screen: Industry select (0a)
// ─────────────────────────────────────────────────────────────

function StepIndustry({
  selected,
  onChoose,
}: {
  selected: IndustryId | null;
  onChoose: (id: IndustryId) => void;
}) {
  return (
    <div className="flex flex-col gap-8">
      <header>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--ember)]">Schritt 1</p>
        <h1 className="mt-2 font-serif text-4xl leading-tight text-[var(--ink)] md:text-5xl">
          Was <em className="text-[var(--ember)]">baust du auf</em>?
        </h1>
        <p className="mt-3 text-[var(--ink)]/60">Wähle deine Branche — alles weitere passt sich an.</p>
      </header>
      <div className="grid grid-cols-2 gap-3">
        {INDUSTRIES.map((ind) => {
          const active = selected === ind.id;
          return (
            <motion.button
              key={ind.id}
              onClick={() => onChoose(ind.id)}
              whileTap={{ scale: 0.96 }}
              whileHover={{ scale: 1.02 }}
              animate={{
                backgroundColor: active ? "var(--ember)" : "var(--paper)",
                color: active ? "var(--cream)" : "var(--ink)",
              }}
              transition={{ type: "spring", stiffness: 300, damping: 22 }}
              className="flex flex-col items-start gap-2 rounded-2xl border border-[var(--ink)]/10 p-5 text-left"
            >
              <span className="text-3xl">{ind.emoji}</span>
              <span className="font-serif text-lg leading-tight">{ind.label}</span>
              <span className="text-xs opacity-70">{ind.description}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Screen: Type select
// ─────────────────────────────────────────────────────────────

function StepType({ industry, onChoose }: { industry: Industry; onChoose: (p: FounderType) => void }) {
  const partner = industry.terms.partner;
  const venture = industry.terms.venture;
  const options: { id: FounderType; title: string; sub: string; Icon: typeof Lightbulb }[] = [
    { id: "founder", title: "Ich hab eine Idee", sub: `und suche einen ${partner}`, Icon: Lightbulb },
    { id: "talent", title: "Ich hab Skills", sub: `und suche ein ${venture}`, Icon: Wrench },
    { id: "hybrid", title: "Ich hab beides", sub: "Idee + Skills", Icon: Layers },
  ];
  return (
    <div className="flex flex-col gap-8">
      <header>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--ember)]">Willkommen</p>
        <h1 className="mt-2 font-serif text-4xl leading-tight text-[var(--ink)] md:text-5xl">
          Was beschreibt dich <em className="text-[var(--ember)]">am besten</em>?
        </h1>
      </header>
      <div className="flex flex-col gap-3">
        {options.map(({ id, title, sub, Icon }) => (
          <motion.button
            key={id}
            onClick={() => onChoose(id)}
            whileTap={{ scale: 0.98 }}
            whileHover={{ scale: 1.01 }}
            className="group flex items-center gap-4 rounded-2xl border border-[var(--ink)]/10 bg-[var(--paper)] p-6 text-left transition-colors hover:border-[var(--ember)]"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--ink)] text-[var(--cream)] transition-colors group-hover:bg-[var(--ember)]">
              <Icon size={22} />
            </div>
            <div className="flex-1">
              <div className="font-serif text-2xl text-[var(--ink)]">{title}</div>
              <div className="text-sm text-[var(--ink)]/60">{sub}</div>
            </div>
            <ArrowRight size={20} className="text-[var(--ink)]/30 transition-all group-hover:translate-x-1 group-hover:text-[var(--ember)]" />
          </motion.button>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Screen: Input method (voice vs form)
// ─────────────────────────────────────────────────────────────

function StepInputMethod({
  onForm,
  onVoiceComplete,
}: {
  onForm: () => void;
  onVoiceComplete: (parsed: Partial<ContextFields>) => void;
}) {
  const [mode, setMode] = useState<null | "voice">(null);
  if (mode === "voice") return <VoiceCapture onDone={onVoiceComplete} onCancel={() => setMode(null)} />;
  return (
    <div className="flex flex-col gap-8">
      <header>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--ember)]">Schritt 1</p>
        <h1 className="mt-2 font-serif text-4xl leading-tight text-[var(--ink)] md:text-5xl">
          Erzähl uns von <em className="text-[var(--ember)]">deinem Projekt</em>
        </h1>
        <p className="mt-3 text-[var(--ink)]/70">Wie willst du anfangen?</p>
      </header>
      <div className="flex flex-col gap-3">
        <motion.button
          whileTap={{ scale: 0.98 }}
          whileHover={{ scale: 1.01 }}
          onClick={() => setMode("voice")}
          className="flex items-center gap-4 rounded-2xl border border-[var(--ink)]/10 bg-[var(--paper)] p-6 text-left hover:border-[var(--ember)]"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--ember)] text-[var(--cream)]">
            <Mic size={22} />
          </div>
          <div className="flex-1">
            <div className="font-serif text-2xl text-[var(--ink)]">Per Voice</div>
            <div className="text-sm text-[var(--ink)]/60">Sprich 30 – 90 Sekunden, wir extrahieren den Rest</div>
          </div>
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.98 }}
          whileHover={{ scale: 1.01 }}
          onClick={onForm}
          className="flex items-center gap-4 rounded-2xl border border-[var(--ink)]/10 bg-[var(--paper)] p-6 text-left hover:border-[var(--ember)]"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--ink)] text-[var(--cream)]">
            <PencilLine size={22} />
          </div>
          <div className="flex-1">
            <div className="font-serif text-2xl text-[var(--ink)]">Per Formular</div>
            <div className="text-sm text-[var(--ink)]/60">Schritt für Schritt, 5 Fragen</div>
          </div>
        </motion.button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Voice capture
// ─────────────────────────────────────────────────────────────

function VoiceCapture({
  onDone,
  onCancel,
}: {
  onDone: (parsed: Partial<ContextFields>) => void;
  onCancel: () => void;
}) {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
      setElapsed(0);
      timerRef.current = window.setInterval(() => setElapsed((s) => s + 1), 1000);
    } catch (e) {
      console.error(e);
      toast.error("Mikrofon-Zugriff verweigert");
    }
  }, []);

  const stop = useCallback(async () => {
    const mr = mediaRecorderRef.current;
    if (!mr) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setRecording(false);
    setProcessing(true);

    await new Promise<void>((resolve) => {
      mr.onstop = () => resolve();
      mr.stop();
    });
    mr.stream.getTracks().forEach((t) => t.stop());

    const blob = new Blob(chunksRef.current, { type: "audio/webm" });

    try {
      // Get auth token
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) throw new Error("Nicht angemeldet");

      const fd = new FormData();
      fd.append("file", blob, "voice.webm");

      const res = await fetch("/api/stt", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) throw new Error(`STT fehlgeschlagen (${res.status})`);
      const { text } = await res.json();
      if (!text || text.trim().length < 10) {
        toast.error("Aufnahme zu kurz oder leer");
        setProcessing(false);
        return;
      }

      // Send to copilot context_parse
      const { data, error } = await supabase.functions.invoke("copilot", {
        body: { task: "context_parse", message: text },
      });
      if (error) throw error;
      const ctx = (data?.context ?? {}) as Partial<ContextFields>;
      toast.success("Kontext erkannt");
      onDone({
        idea: ctx.idea ?? "",
        role: ctx.role ?? "",
        stage: ctx.stage ?? "",
        goal: ctx.goal ?? "",
        risk: ctx.risk ?? "",
      });
    } catch (e) {
      console.error(e);
      toast.error((e as Error).message || "Transkription fehlgeschlagen");
      setProcessing(false);
    }
  }, [onDone]);

  if (processing) {
    return <LoadingConverge label="Verstehe, was du gesagt hast…" />;
  }

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-8 text-center">
      <header>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--ember)]">Voice</p>
        <h1 className="mt-2 font-serif text-4xl text-[var(--ink)]">Erzähl uns von deiner Idee</h1>
        <p className="mt-3 max-w-md text-[var(--ink)]/60">
          Was baust du, in welcher Rolle, wo stehst du, was willst du erreichen, was ist dein Risiko?
        </p>
      </header>

      <motion.button
        onClick={recording ? stop : start}
        whileTap={{ scale: 0.95 }}
        animate={recording ? { scale: [1, 1.06, 1] } : { scale: 1 }}
        transition={recording ? { duration: 1.2, repeat: Infinity } : { duration: 0.2 }}
        className="flex h-32 w-32 items-center justify-center rounded-full text-[var(--cream)] shadow-2xl"
        style={{ background: recording ? "var(--ember-deep)" : "var(--ember)" }}
      >
        {recording ? <MicOff size={40} /> : <Mic size={40} />}
      </motion.button>

      <div className="font-mono text-sm text-[var(--ink)]/60">
        {recording ? `Aufnahme läuft… ${elapsed}s` : "Tippen, um zu starten"}
      </div>

      <button onClick={onCancel} className="text-sm text-[var(--ink)]/50 underline">
        Lieber tippen
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Context form question (one at a time)
// ─────────────────────────────────────────────────────────────

function StepContextQuestion({
  idx,
  questions,
  value,
  onChange,
  onNext,
}: {
  idx: number;
  questions: ContextQuestion[];
  value: string;
  onChange: (v: string) => void;
  onNext: () => void;
}) {
  const q = questions[idx];
  const canNext = value.trim().length >= 2;

  // Parse current value into selected chip set (case-insensitive)
  const selectedChips = new Set(
    value
      .split(/,\s*/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
  const isChipSelected = (opt: string) => selectedChips.has(opt.toLowerCase());

  const toggleChip = (opt: string) => {
    if (q.multi) {
      const parts = value
        .split(/,\s*/)
        .map((s) => s.trim())
        .filter(Boolean);
      const lower = opt.toLowerCase();
      const exists = parts.some((p) => p.toLowerCase() === lower);
      const next = exists
        ? parts.filter((p) => p.toLowerCase() !== lower)
        : [...parts, opt];
      onChange(next.join(", "));
    } else {
      // Single-select: replace value with chip (toggle off if same)
      onChange(isChipSelected(opt) ? "" : opt);
    }
  };

  return (
    <div className="flex min-h-[70vh] flex-col justify-between">
      <header>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--ember)]">
          Frage {idx + 1} von {questions.length}
        </p>
        <h1 className="mt-3 font-serif text-3xl leading-tight text-[var(--ink)] md:text-4xl">
          {q.question}
        </h1>

        <div className="mt-5">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink)]/50">
            {q.multi ? "Schnellauswahl · mehrere möglich" : "Schnellauswahl"}
          </p>
          <div className="flex flex-wrap gap-2">
            {q.options.map((opt) => {
              const active = isChipSelected(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => toggleChip(opt)}
                  className={
                    "rounded-full border px-3.5 py-1.5 text-[13px] transition-colors " +
                    (active
                      ? "border-[var(--ember)] bg-[var(--ember)] text-[var(--cream)]"
                      : "border-[var(--ink)]/15 bg-[var(--paper)] text-[var(--ink)] hover:border-[var(--ember)]")
                  }
                >
                  {active ? "✓ " : ""}
                  {opt}
                </button>
              );
            })}
          </div>
        </div>

        <p className="mt-5 mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink)]/50">
          Oder frei schreiben
        </p>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={q.placeholder}
          rows={4}
          className="w-full resize-none rounded-2xl border border-[var(--ink)]/10 bg-[var(--paper)] p-5 text-lg text-[var(--ink)] outline-none placeholder:text-[var(--ink)]/30 focus:border-[var(--ember)]"
        />
      </header>
      <div className="mt-8">
        <button
          onClick={onNext}
          disabled={!canNext}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--ember)] py-4 font-medium text-[var(--cream)] transition-all disabled:opacity-40"
        >
          Weiter <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Skill picker
// ─────────────────────────────────────────────────────────────

const MAX_SKILLS = 8;

function StepSkillPicker({
  skills,
  primaryCategories,
  onChange,
  onNext,
}: {
  skills: SkillState;
  primaryCategories: string[];
  onChange: (patch: Partial<SkillState>) => void;
  onNext: () => void;
}) {
  // Order categories: primary (from industry) first, then the rest
  const orderedCategories = useMemo(() => {
    const primary = primaryCategories
      .map((id) => SKILL_CATEGORIES.find((c) => c.id === id))
      .filter((c): c is (typeof SKILL_CATEGORIES)[number] => Boolean(c));
    const primaryIds = new Set(primary.map((c) => c.id));
    const rest = SKILL_CATEGORIES.filter((c) => !primaryIds.has(c.id));
    return [...primary, ...rest];
  }, [primaryCategories]);

  const [activeCat, setActiveCat] = useState<string>(orderedCategories[0].id);
  const cat = orderedCategories.find((c) => c.id === activeCat) ?? orderedCategories[0];

  const toggleSkill = (skill: string) => {
    const isSelected = skills.selected.includes(skill);
    if (isSelected) {
      const next = skills.selected.filter((s) => s !== skill);
      const cats = SKILL_CATEGORIES.filter((c) => c.skills.some((s) => next.includes(s))).map((c) => c.id);
      onChange({ selected: next, categories: cats });
    } else {
      if (skills.selected.length >= MAX_SKILLS) {
        toast.error(`Max. ${MAX_SKILLS} Skills`);
        return;
      }
      const next = [...skills.selected, skill];
      const cats = SKILL_CATEGORIES.filter((c) => c.skills.some((s) => next.includes(s))).map((c) => c.id);
      onChange({ selected: next, categories: cats });
    }
  };

  return (
    <div className="flex min-h-[70vh] flex-col gap-6">
      <header>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--ember)]">
          Deine Skills · {skills.selected.length}/{MAX_SKILLS}
        </p>
        <h1 className="mt-2 font-serif text-3xl leading-tight text-[var(--ink)] md:text-4xl">
          Was bringst du <em className="text-[var(--ember)]">mit</em>?
        </h1>
      </header>

      {/* Category chips */}
      <div className="-mx-6 flex gap-2 overflow-x-auto px-6 pb-1">
        {orderedCategories.map((c) => (
          <button
            key={c.id}
            onClick={() => setActiveCat(c.id)}
            className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm transition-all ${
              activeCat === c.id
                ? "border-transparent bg-[var(--ember)] text-[var(--cream)]"
                : "border-[var(--ink)]/10 bg-[var(--paper)] text-[var(--ink)]"
            }`}
          >
            <span>{c.emoji}</span>
            <span>{c.label}</span>
          </button>
        ))}
      </div>

      {/* Skill tags */}
      <div className="flex flex-wrap gap-2">
        {cat.skills.map((s) => {
          const selected = skills.selected.includes(s);
          return (
            <motion.button
              key={s}
              onClick={() => toggleSkill(s)}
              whileTap={{ scale: 0.95 }}
              animate={{ scale: selected ? 1.04 : 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 22 }}
              className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                selected
                  ? "border-transparent bg-[var(--ember)] text-[var(--cream)]"
                  : "border-[var(--ink)]/15 bg-transparent text-[var(--ink)]"
              }`}
            >
              {s}
            </motion.button>
          );
        })}
      </div>

      <div className="mt-auto pt-6">
        <button
          onClick={onNext}
          disabled={skills.selected.length === 0}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--ember)] py-4 font-medium text-[var(--cream)] transition-all disabled:opacity-40"
        >
          Weiter <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Looking for
// ─────────────────────────────────────────────────────────────

function StepLookingFor({
  selected,
  onChange,
  onNext,
}: {
  selected: LookingFor[];
  onChange: (v: LookingFor[]) => void;
  onNext: () => void;
}) {
  const toggle = (id: LookingFor) => {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  };
  return (
    <div className="flex min-h-[70vh] flex-col gap-6">
      <header>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--ember)]">Was suchst du?</p>
        <h1 className="mt-2 font-serif text-3xl leading-tight text-[var(--ink)] md:text-4xl">
          Wie willst du <em className="text-[var(--ember)]">einsteigen</em>?
        </h1>
        <p className="mt-2 text-sm text-[var(--ink)]/60">Mehrfachauswahl möglich</p>
      </header>
      <div className="flex flex-col gap-3">
        {LOOKING_FOR_OPTIONS.map((o) => {
          const isSel = selected.includes(o.id);
          return (
            <motion.button
              key={o.id}
              onClick={() => toggle(o.id)}
              whileTap={{ scale: 0.98 }}
              className={`flex items-center gap-4 rounded-2xl border p-5 text-left transition-colors ${
                isSel ? "border-[var(--ember)] bg-[var(--ember-tint)]" : "border-[var(--ink)]/10 bg-[var(--paper)]"
              }`}
            >
              <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${isSel ? "border-[var(--ember)] bg-[var(--ember)]" : "border-[var(--ink)]/30"}`}>
                {isSel && <Check size={14} className="text-[var(--cream)]" />}
              </div>
              <div className="flex-1">
                <div className="font-medium text-[var(--ink)]">{o.label}</div>
                <div className="text-sm text-[var(--ink)]/60">{o.desc}</div>
              </div>
            </motion.button>
          );
        })}
      </div>
      <div className="mt-auto pt-6">
        <button
          onClick={onNext}
          disabled={selected.length === 0}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--ember)] py-4 font-medium text-[var(--cream)] transition-all disabled:opacity-40"
        >
          Weiter <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Availability slider
// ─────────────────────────────────────────────────────────────

const AVAIL_SNAPS = [5, 10, 20, 30, 40];
function StepAvailability({
  value,
  onChange,
  onNext,
}: {
  value: number;
  onChange: (v: number) => void;
  onNext: () => void;
}) {
  const label = value >= 40 ? "Full-time (40h+)" : `${value} Stunden / Woche`;
  return (
    <div className="flex min-h-[70vh] flex-col gap-8">
      <header>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--ember)]">Verfügbarkeit</p>
        <h1 className="mt-2 font-serif text-3xl leading-tight text-[var(--ink)] md:text-4xl">
          Wie viel Zeit kannst du <em className="text-[var(--ember)]">investieren</em>?
        </h1>
      </header>

      <div className="mt-12">
        <div className="text-center font-serif text-5xl text-[var(--ember)]">{label}</div>
        <input
          type="range"
          min={5}
          max={40}
          step={5}
          value={value}
          onChange={(e) => {
            const v = Number(e.target.value);
            const snap = AVAIL_SNAPS.reduce((p, c) => (Math.abs(c - v) < Math.abs(p - v) ? c : p), AVAIL_SNAPS[0]);
            onChange(snap);
          }}
          className="mt-8 w-full accent-[var(--ember)]"
        />
        <div className="mt-2 flex justify-between font-mono text-xs text-[var(--ink)]/40">
          {AVAIL_SNAPS.map((s) => (
            <span key={s}>{s === 40 ? "40+" : s}</span>
          ))}
        </div>
      </div>

      <div className="mt-auto pt-6">
        <button
          onClick={onNext}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--ember)] py-4 font-medium text-[var(--cream)]"
        >
          Weiter <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Assessment (15 questions, 1–5 slider)
// ─────────────────────────────────────────────────────────────

function StepAssessment({
  answers,
  onChange,
  onComplete,
}: {
  answers: Record<string, number>;
  onChange: (a: Record<string, number>) => void;
  onComplete: () => void;
}) {
  const [idx, setIdx] = useState(() => {
    // Resume at first unanswered
    const i = ASSESSMENT_QUESTIONS.findIndex((q) => answers[q.id] === undefined);
    return i === -1 ? 0 : i;
  });
  const q = ASSESSMENT_QUESTIONS[idx];
  const value = answers[q.id] ?? 3;

  const setValue = (v: number) => {
    onChange({ ...answers, [q.id]: v });
  };

  const next = () => {
    if (answers[q.id] === undefined) {
      onChange({ ...answers, [q.id]: value });
    }
    if (idx + 1 >= ASSESSMENT_QUESTIONS.length) {
      onComplete();
    } else {
      setIdx(idx + 1);
    }
  };

  return (
    <div className="flex min-h-[80vh] flex-col justify-between">
      <header>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--ember)]">
          Frage {idx + 1} von {ASSESSMENT_QUESTIONS.length} · ~2 Min.
        </p>
        <h1 className="mt-4 font-serif text-2xl leading-snug text-[var(--ink)] md:text-3xl">
          {q.text}
        </h1>
      </header>

      <div className="mt-12">
        {/* 5-dot slider */}
        <div className="flex items-center justify-between gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <motion.button
              key={n}
              onClick={() => setValue(n)}
              whileTap={{ scale: 0.85 }}
              animate={{ scale: value === n ? 1.2 : 1 }}
              className="flex h-14 w-14 items-center justify-center rounded-full transition-colors"
              style={{
                background: value >= n ? "var(--ember)" : "var(--paper)",
                border: value === n ? "2px solid var(--ink)" : "2px solid transparent",
              }}
            >
              <span className={`font-mono text-sm ${value >= n ? "text-[var(--cream)]" : "text-[var(--ink)]/40"}`}>
                {n}
              </span>
            </motion.button>
          ))}
        </div>
        <div className="mt-4 flex justify-between text-xs text-[var(--ink)]/60">
          <span className="max-w-[40%]">{q.low_label}</span>
          <span className="max-w-[40%] text-right">{q.high_label}</span>
        </div>
      </div>

      <div className="mt-12">
        <button
          onClick={next}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--ember)] py-4 font-medium text-[var(--cream)]"
        >
          {idx + 1 >= ASSESSMENT_QUESTIONS.length ? "Assessment abschließen" : "Weiter"}{" "}
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Overview
// ─────────────────────────────────────────────────────────────

function StepOverview({
  state,
  industry,
  contextQuestions,
  onEditContext,
  onEditSkills,
  onSubmit,
}: {
  state: State;
  industry: Industry;
  contextQuestions: ContextQuestion[];
  onEditContext: (key: keyof ContextFields, value: string) => void;
  onEditSkills: (patch: Partial<SkillState>) => void;
  onSubmit: () => void;
}) {
  const scores = useMemo(() => calculateAllScores(state.answers), [state.answers]);
  const showContext = state.path === "founder" || state.path === "hybrid";
  const showSkills = state.path === "talent" || state.path === "hybrid";

  return (
    <div className="flex flex-col gap-10 pb-24">
      <header>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--ember)]">Dein Profil</p>
        <h1 className="mt-2 font-serif text-4xl leading-tight text-[var(--ink)]">
          Sieht <em className="text-[var(--ember)]">gut aus</em>. Bereit?
        </h1>
      </header>

      {/* Type card */}
      <section className="rounded-2xl bg-[var(--ink)] p-6 text-[var(--cream)]">
        <div className="font-mono text-xs uppercase tracking-[0.2em] opacity-60">
          {industry.emoji} {industry.label} · Typ
        </div>
        <div className="mt-1 font-serif text-2xl capitalize">
          {state.path === "founder" && "🚀 Founder"}
          {state.path === "talent" && "🛠 Talent"}
          {state.path === "hybrid" && "✨ Hybrid"}
        </div>
      </section>

      {showContext && (
        <section>
          <h2 className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-[var(--ink)]/60">
            Dein {industry.terms.venture}
          </h2>
          <div className="flex flex-col divide-y divide-[var(--ink)]/10 rounded-2xl bg-[var(--paper)]">
            {contextQuestions.map((q) => (
              <EditableRow
                key={q.key}
                label={labelForCtx(q.key)}
                value={state.context[q.key]}
                onChange={(v) => onEditContext(q.key, v)}
              />
            ))}
          </div>
        </section>
      )}

      {showSkills && (
        <section>
          <h2 className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-[var(--ink)]/60">Deine Skills</h2>
          <div className="flex flex-wrap gap-2">
            {state.skills.selected.map((s) => (
              <span key={s} className="rounded-full bg-[var(--ember)] px-3 py-1.5 text-sm text-[var(--cream)]">
                {s}
              </span>
            ))}
          </div>
          <div className="mt-3 text-sm text-[var(--ink)]/60">
            {state.skills.availability >= 40 ? "Full-time" : `${state.skills.availability}h / Woche`} ·{" "}
            {state.skills.looking_for.length} Engagement-Optionen
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-[var(--ink)]/60">Persönlichkeit</h2>
        <div className="flex justify-center rounded-2xl bg-[var(--paper)] p-4">
          <RadarChart scores={scores} size={280} />
        </div>
      </section>

      <button
        onClick={onSubmit}
        className="sticky bottom-4 mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--ember)] py-5 text-lg font-medium text-[var(--cream)] shadow-2xl"
      >
        <Sparkles size={20} /> Deinen Plan generieren
      </button>
    </div>
  );
}

function labelForCtx(key: keyof ContextFields): string {
  switch (key) {
    case "idea": return "Idee";
    case "role": return "Rolle";
    case "stage": return "Stand";
    case "goal": return "Ziel";
    case "risk": return "Risiko";
  }
}

function EditableRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);

  if (editing) {
    return (
      <div className="flex flex-col gap-2 p-4">
        <div className="font-mono text-xs uppercase tracking-[0.15em] text-[var(--ember)]">{label}</div>
        <textarea
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          className="w-full resize-none rounded-xl border border-[var(--ink)]/10 bg-[var(--cream)] p-3 text-[var(--ink)] outline-none focus:border-[var(--ember)]"
        />
        <div className="flex justify-end gap-2">
          <button onClick={() => setEditing(false)} className="rounded-lg px-3 py-1 text-sm text-[var(--ink)]/60">
            Abbrechen
          </button>
          <button
            onClick={() => { onChange(draft); setEditing(false); }}
            className="rounded-lg bg-[var(--ember)] px-3 py-1 text-sm text-[var(--cream)]"
          >
            Speichern
          </button>
        </div>
      </div>
    );
  }
  return (
    <button onClick={() => setEditing(true)} className="flex items-start gap-3 p-4 text-left transition-colors hover:bg-[var(--ember-tint)]/40">
      <Info size={14} className="mt-1 text-[var(--ink)]/30" />
      <div className="flex-1">
        <div className="font-mono text-xs uppercase tracking-[0.15em] text-[var(--ink)]/50">{label}</div>
        <div className="mt-1 text-[var(--ink)]">{value || <span className="italic text-[var(--ink)]/40">— nicht ausgefüllt —</span>}</div>
      </div>
      <PencilLine size={16} className="text-[var(--ink)]/40" />
    </button>
  );
}
