import { useEffect, useLayoutEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

export type TourStep = {
  id: string;
  target?: string; // data-tour selector value; omit for centered modal
  title: string;
  body: string;
};

const STEPS: TourStep[] = [
  {
    id: "welcome",
    title: "Willkommen bei matchfoundr.",
    body: "Dein Command Center ist live. In 60 Sekunden zeigen wir dir das Wichtigste.",
  },
  {
    id: "focus",
    target: "focus",
    title: "Heutiger Fokus",
    body: "Dein Co-Pilot priorisiert täglich drei Dinge. Übernehmen oder verschieben.",
  },
  {
    id: "conversations",
    target: "conversations",
    title: "Aktive Gespräche",
    body: "Alle laufenden Threads — Co-Founder, Recht, Förderung, Steuer an einem Ort.",
  },
  {
    id: "agenda",
    target: "agenda",
    title: "Deine Agenda",
    body: "Was heute auf dem Kalender steht — Calls, Termine, Deadlines.",
  },
  {
    id: "funding",
    target: "funding",
    title: "Funding-Pipeline",
    body: "Dein wichtigster offener Antrag. Co-Pilot füllt bis zu 78% vorab.",
  },
];

const DONE_KEY = "mf_tutorial_done";

type Rect = { top: number; left: number; width: number; height: number };

function useTargetRect(selector: string | undefined): Rect | null {
  const [rect, setRect] = useState<Rect | null>(null);

  useLayoutEffect(() => {
    if (!selector) {
      setRect(null);
      return;
    }
    const el = document.querySelector<HTMLElement>(`[data-tour="${selector}"]`);
    if (!el) {
      setRect(null);
      return;
    }
    const measure = () => {
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    measure();
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    ro.observe(document.body);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    const t = window.setTimeout(measure, 350); // post-scroll
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
      window.clearTimeout(t);
    };
  }, [selector]);

  return rect;
}

export function TutorialOverlay({ onClose }: { onClose: () => void }) {
  const [i, setI] = useState(0);
  const step = STEPS[i];
  const rect = useTargetRect(step.target);

  const finish = useCallback(() => {
    try {
      localStorage.setItem(DONE_KEY, "1");
    } catch {}
    onClose();
  }, [onClose]);

  const next = useCallback(() => {
    if (i >= STEPS.length - 1) finish();
    else setI((v) => v + 1);
  }, [i, finish]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
      if (e.key === "Enter" || e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, finish]);

  const PAD = 8;
  const hole = rect
    ? {
        top: rect.top - PAD,
        left: rect.left - PAD,
        width: rect.width + PAD * 2,
        height: rect.height + PAD * 2,
      }
    : null;

  // Tooltip placement: below target if room, else above, else center
  let tipStyle: React.CSSProperties = {
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
  };
  if (hole) {
    const vh = typeof window !== "undefined" ? window.innerHeight : 800;
    const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
    const tipW = Math.min(380, vw - 32);
    const below = hole.top + hole.height + 16;
    const above = hole.top - 16;
    const placeBelow = below + 180 < vh;
    const top = placeBelow ? below : Math.max(16, above - 180);
    let left = hole.left + hole.width / 2 - tipW / 2;
    left = Math.max(16, Math.min(vw - tipW - 16, left));
    tipStyle = { top, left, width: tipW };
  }

  return (
    <div className="fixed inset-0 z-[100]" aria-modal="true" role="dialog">
      {/* Backdrop with cutout via 4 rectangles */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step.id + "-bg"}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="absolute inset-0"
          onClick={() => {/* swallow */}}
        >
          {hole ? (
            <>
              {/* top */}
              <div className="absolute left-0 right-0 top-0 bg-[rgba(21,20,15,0.72)]" style={{ height: Math.max(0, hole.top) }} />
              {/* bottom */}
              <div
                className="absolute left-0 right-0 bg-[rgba(21,20,15,0.72)]"
                style={{ top: hole.top + hole.height, bottom: 0 }}
              />
              {/* left */}
              <div
                className="absolute bg-[rgba(21,20,15,0.72)]"
                style={{ top: hole.top, left: 0, width: Math.max(0, hole.left), height: hole.height }}
              />
              {/* right */}
              <div
                className="absolute bg-[rgba(21,20,15,0.72)]"
                style={{ top: hole.top, left: hole.left + hole.width, right: 0, height: hole.height }}
              />
              {/* Highlight outline */}
              <motion.div
                layout
                className="pointer-events-none absolute rounded-2xl"
                style={{
                  top: hole.top,
                  left: hole.left,
                  width: hole.width,
                  height: hole.height,
                  boxShadow: "0 0 0 2px var(--ember), 0 0 0 6px rgba(226,81,28,0.18)",
                }}
              />
            </>
          ) : (
            <div className="absolute inset-0 bg-[rgba(21,20,15,0.78)]" />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Tooltip card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step.id + "-tip"}
          initial={{ opacity: 0, y: 8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.98 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="absolute"
          style={tipStyle}
        >
          <div
            className="rounded-2xl border p-5 shadow-2xl"
            style={{
              background: "var(--cream)",
              borderColor: "rgba(21,20,15,0.08)",
              maxWidth: 380,
            }}
          >
            <div className="eyebrow">
              Schritt {i + 1} von {STEPS.length}
            </div>
            <h3 className="mt-2 text-[20px] font-semibold tracking-tight text-[var(--ink)]">
              {step.title}
            </h3>
            <p className="mt-2 font-serif text-[15px] italic leading-snug text-[var(--smoke)]">
              „{step.body}"
            </p>

            <div className="mt-4 flex items-center justify-between gap-2">
              <button
                onClick={finish}
                className="text-[12px] font-medium text-[var(--smoke)] hover:text-[var(--ink)]"
              >
                Überspringen
              </button>
              <div className="flex items-center gap-1.5">
                {STEPS.map((_, idx) => (
                  <span
                    key={idx}
                    className="h-1.5 rounded-full transition-all"
                    style={{
                      width: idx === i ? 18 : 6,
                      background: idx === i ? "var(--ember)" : "rgba(21,20,15,0.18)",
                    }}
                  />
                ))}
              </div>
              <Button
                onClick={next}
                className="h-9 rounded-lg bg-[var(--ink)] px-4 text-[12px] font-semibold text-[var(--cream)] hover:bg-[var(--ink-soft)]"
              >
                {i >= STEPS.length - 1 ? "Loslegen" : "Weiter"}
              </Button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export function shouldShowTutorial(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const trigger = sessionStorage.getItem("mf_tutorial") === "1";
    const done = localStorage.getItem(DONE_KEY) === "1";
    if (trigger) sessionStorage.removeItem("mf_tutorial");
    return trigger && !done;
  } catch {
    return false;
  }
}
