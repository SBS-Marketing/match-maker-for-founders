import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { LoadingConverge } from "@/components/onboarding/LoadingConverge";
import { CopilotMark } from "@/components/Copilot";
import {
  PLAN_CACHE_KEY,
  buildLocalPlanSlides,
  readPlanContext,
  type PlanSlide as Slide,
} from "@/lib/plan-draft";

export const Route = createFileRoute("/plan")({
  component: PlanPage,
});

function PlanPage() {
  const navigate = useNavigate();
  const { user, session, loading, isDemo } = useAuth();
  const [slides, setSlides] = useState<Slide[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [idx, setIdx] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);

  useEffect(() => {
    let cancelled = false;
    if (loading) return;

    try {
      const cached = localStorage.getItem(PLAN_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSlides(filterSlides(parsed));
          return;
        }
      }
    } catch { /* ignore */ }

    const onboardingContext = readPlanContext();
    const fallbackSlides = filterSlides(buildLocalPlanSlides(onboardingContext));

    if (!user || isDemo || !session) {
      if (fallbackSlides.length > 0) setSlides(fallbackSlides);
      else setError("Plan konnte nicht erstellt werden.");
      return;
    }

    (async () => {
      try {
        const { data, error: err } = await supabase.functions.invoke("copilot", {
          body: { task: "plan_generate", message: "", extra: { onboarding: onboardingContext } },
        });
        if (cancelled) return;
        if (err) throw err;
        const raw = data?.slides;
        const arr: Slide[] = Array.isArray(raw) ? raw : [];
        if (arr.length === 0) {
          if (fallbackSlides.length > 0) {
            setSlides(fallbackSlides);
            return;
          }
          setError("Plan konnte nicht erstellt werden.");
          return;
        }
        const filtered = filterSlides(arr);
        try { localStorage.setItem(PLAN_CACHE_KEY, JSON.stringify(filtered)); } catch { /* ignore */ }
        setSlides(filtered);
      } catch (e) {
        if (cancelled) return;
        console.error(e);
        if (fallbackSlides.length > 0) {
          setSlides(fallbackSlides);
          return;
        }
        setError("Plan konnte nicht geladen werden.");
      }
    })();

    return () => { cancelled = true; };
  }, [user, session, loading, isDemo]);

  const total = slides?.length ?? 0;
  const isLast = idx === total - 1;
  const canSkip = idx >= 2;

  const goNext = useCallback(() => {
    if (!slides) return;
    if (idx < slides.length - 1) {
      setDirection(1);
      setIdx((i) => i + 1);
    }
  }, [idx, slides]);

  const goPrev = useCallback(() => {
    if (idx > 0) {
      setDirection(-1);
      setIdx((i) => i - 1);
    }
  }, [idx]);

  const goDashboard = useCallback(() => {
    navigate({ to: "/heute" });
  }, [navigate]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); goNext(); }
      if (e.key === "ArrowLeft") { e.preventDefault(); goPrev(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev]);

  const handleDragEnd = (_e: unknown, info: PanInfo) => {
    if (info.offset.x < -60) goNext();
    else if (info.offset.x > 60) goPrev();
  };

  if (!slides && !error) {
    return (
      <main className="min-h-screen" style={{ background: "var(--cream)" }}>
        <LoadingConverge label="Dein Plan wird erstellt…" />
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4" style={{ background: "var(--cream)" }}>
        <p className="font-serif text-2xl text-[var(--ink)]">{error}</p>
        <button
          onClick={goDashboard}
          className="rounded-2xl bg-[var(--ember)] px-6 py-3 font-medium text-[var(--cream)]"
        >
          Zum Dashboard
        </button>
      </main>
    );
  }

  const current = slides![idx];

  return (
    <main className="relative h-screen w-screen overflow-hidden" style={{ background: "var(--cream)" }}>
      {canSkip && (
        <button
          onClick={goDashboard}
          className="fixed right-6 top-6 z-40 font-mono text-xs uppercase tracking-[0.2em] opacity-60 transition-opacity hover:opacity-100"
          style={{ mixBlendMode: "difference", color: "#aaa" }}
        >
          Überspringen
        </button>
      )}

      <div className="relative h-full w-full">
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={idx}
            custom={direction}
            initial={{ opacity: 0, x: direction * 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -60 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.18}
            onDragEnd={handleDragEnd}
            className="absolute inset-0 cursor-grab active:cursor-grabbing"
          >
            <SlideRenderer
              slide={current}
              idx={idx}
              total={total}
              isLast={isLast}
              onCTA={goDashboard}
              onNext={goNext}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {idx > 0 && (
        <button
          onClick={goPrev}
          aria-label="Zurück"
          className="fixed left-4 top-1/2 z-30 hidden -translate-y-1/2 rounded-full bg-[var(--ink)]/10 p-3 text-[var(--ink)] backdrop-blur transition-all hover:bg-[var(--ink)]/20 md:block"
        >
          <ChevronLeft size={20} />
        </button>
      )}
      {!isLast && (
        <button
          onClick={goNext}
          aria-label="Weiter"
          className="fixed right-4 top-1/2 z-30 hidden -translate-y-1/2 rounded-full bg-[var(--ink)]/10 p-3 text-[var(--ink)] backdrop-blur transition-all hover:bg-[var(--ink)]/20 md:block"
        >
          <ChevronRight size={20} />
        </button>
      )}

      <div className="fixed inset-x-0 bottom-6 z-30 flex items-center justify-center gap-2">
        {slides!.map((_, i) => (
          <button
            key={i}
            onClick={() => { setDirection(i > idx ? 1 : -1); setIdx(i); }}
            aria-label={`Slide ${i + 1}`}
            className="h-2 rounded-full transition-all"
            style={{
              width: i === idx ? 24 : 8,
              background: i === idx ? "var(--ember)" : "rgba(21,20,15,0.2)",
            }}
          />
        ))}
      </div>
    </main>
  );
}

function filterSlides(arr: Slide[]): Slide[] {
  return arr.filter((s) => {
    if (s.type === "dealbreaker") {
      const r = s.risk;
      if (r === null || r === undefined) return false;
      const txt = String(r).trim().toLowerCase();
      if (txt === "" || txt === "null" || txt === "keins" || txt === "kein risiko") return false;
    }
    return true;
  });
}

function SlideRenderer({
  slide, idx, total, isLast, onCTA, onNext,
}: {
  slide: Slide;
  idx: number;
  total: number;
  isLast: boolean;
  onCTA: () => void;
  onNext: () => void;
}) {
  const counter = (
    <p className="absolute right-6 top-6 font-mono text-xs uppercase tracking-[0.25em] opacity-50">
      {String(idx + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
    </p>
  );

  switch (slide.type) {
    case "headline":
      return (
        <div
          className="relative flex h-full w-full flex-col items-center justify-center px-6 text-center"
          style={{ background: "var(--ember)", color: "#FBF8F1" }}
        >
          {counter}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, type: "spring", stiffness: 120, damping: 18 }}
            className="mb-8"
          >
            <CopilotMark size={64} color="#FBF8F1" spark="#15140f" />
          </motion.div>
          {slide.tag && (
            <motion.span
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mb-6 rounded-full border border-white/30 px-4 py-1.5 font-mono text-xs uppercase tracking-[0.2em]"
            >
              {slide.tag}
            </motion.span>
          )}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="max-w-3xl font-serif text-4xl leading-[1.05] md:text-6xl"
          >
            {slide.title}
          </motion.h1>
          {slide.subtitle && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.9 }}
              transition={{ delay: 0.9 }}
              className="mt-6 max-w-xl text-lg md:text-xl"
            >
              {slide.subtitle}
            </motion.p>
          )}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.7 }}
            transition={{ delay: 1.4 }}
            className="absolute bottom-20 font-mono text-xs uppercase tracking-[0.2em]"
          >
            Wische zum Starten →
          </motion.p>
        </div>
      );

    case "situation":
      return (
        <div
          className="relative flex h-full w-full flex-col justify-center px-8 md:px-20"
          style={{ background: "var(--paper)", color: "var(--ink)" }}
        >
          {counter}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-6 font-mono text-xs uppercase tracking-[0.25em] text-[var(--ember)]"
          >
            {slide.label || "Wo du stehst"}
          </motion.p>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="max-w-3xl font-serif text-3xl leading-[1.2] md:text-5xl"
          >
            {slide.text}
          </motion.p>
        </div>
      );

    case "track": {
      const altBg = slide.nummer % 2 === 0 ? "var(--paper)" : "#FBF8F1";
      const pColor =
        slide.priority === "hoch" ? "var(--ember)" :
        slide.priority === "mittel" ? "#C7A56A" : "#8a8a8a";
      return (
        <div
          className="relative flex h-full w-full flex-col justify-center px-8 py-16 md:px-20"
          style={{ background: altBg, color: "var(--ink)" }}
        >
          {counter}
          <div className="mx-auto w-full max-w-3xl">
            <div className="mb-4 flex items-center gap-3">
              <span className="font-mono text-xs uppercase tracking-[0.25em] text-[var(--ink)]/50">
                {slide.label || `Spur ${String(slide.nummer).padStart(2, "0")}`}
              </span>
              {slide.priority && (
                <span className="flex items-center gap-1.5 rounded-full bg-[var(--ink)]/5 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em]">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: pColor }} />
                  {slide.priority}
                </span>
              )}
            </div>
            <motion.h2
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="font-serif text-3xl leading-[1.1] md:text-5xl"
            >
              {slide.title}
            </motion.h2>
            {slide.why && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.75 }}
                transition={{ delay: 0.3 }}
                className="mt-4 max-w-2xl text-base md:text-lg"
              >
                {slide.why}
              </motion.p>
            )}
            {Array.isArray(slide.steps) && slide.steps.length > 0 && (
              <ol className="mt-8 space-y-3">
                {slide.steps.map((s, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.1 }}
                    className="flex gap-3 text-base md:text-lg"
                  >
                    <span className="mt-1 font-mono text-xs text-[var(--ember)]">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span>{s}</span>
                  </motion.li>
                ))}
              </ol>
            )}
            {slide.timeframe && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9 }}
                className="mt-8 inline-block rounded-full border border-[var(--ink)]/20 px-4 py-1.5 font-mono text-xs uppercase tracking-[0.18em]"
              >
                {slide.timeframe}
              </motion.span>
            )}
          </div>
        </div>
      );
    }

    case "first_step":
      return (
        <div
          className="relative flex h-full w-full flex-col justify-center px-8 md:px-20"
          style={{ background: "var(--ink)", color: "#FBF8F1" }}
        >
          {counter}
          <div className="mx-auto w-full max-w-3xl">
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-6 font-mono text-xs uppercase tracking-[0.25em] text-[var(--ember)]"
            >
              {slide.label || "Diese Woche"}
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="font-serif text-3xl leading-[1.15] md:text-5xl"
            >
              {slide.action}
            </motion.h2>
            {slide.why && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.7 }}
                transition={{ delay: 0.5 }}
                className="mt-6 max-w-2xl text-base md:text-lg"
              >
                {slide.why}
              </motion.p>
            )}
            {!isLast && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                onClick={onNext}
                className="mt-10 inline-flex items-center gap-2 rounded-2xl bg-[var(--ember)] px-6 py-3 font-medium text-[#FBF8F1]"
              >
                Weiter <ArrowRight size={18} />
              </motion.button>
            )}
            {isLast && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                onClick={onCTA}
                className="mt-10 inline-flex items-center gap-2 rounded-2xl bg-[var(--ember)] px-6 py-3 font-medium text-[#FBF8F1]"
              >
                Zum Dashboard <ArrowRight size={18} />
              </motion.button>
            )}
          </div>
        </div>
      );

    case "dealbreaker":
      return (
        <div
          className="relative flex h-full w-full flex-col justify-center px-8 md:px-20"
          style={{ background: "var(--paper)", color: "var(--ink)" }}
        >
          {counter}
          <div className="mx-auto w-full max-w-3xl">
            <div className="mb-6 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ background: "var(--ember)" }} />
              <p className="font-mono text-xs uppercase tracking-[0.25em] text-[var(--ink)]/60">
                {slide.label || "Im Blick behalten"}
              </p>
            </div>
            <motion.h2
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="font-serif text-2xl leading-[1.2] md:text-4xl"
            >
              {slide.risk}
            </motion.h2>
            {slide.mitigation && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-8 rounded-2xl border-l-4 border-[var(--ember)] bg-white/50 p-6"
              >
                <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--ink)]/50">
                  So entschärfst du es
                </p>
                <p className="text-base md:text-lg">{slide.mitigation}</p>
              </motion.div>
            )}
            {isLast && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                onClick={onCTA}
                className="mt-10 inline-flex items-center gap-2 rounded-2xl bg-[var(--ember)] px-6 py-3 font-medium text-[#FBF8F1]"
              >
                Zum Dashboard <ArrowRight size={18} />
              </motion.button>
            )}
          </div>
        </div>
      );

    default:
      return null;
  }
}
