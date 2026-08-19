// matchfoundr Maskottchen — React-Wrapper um die Vanilla-Engine in /mf-mascot.js.
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type CSSProperties,
} from "react";

export type MascotLook = {
  yaw: number;
  pitch: number;
  mix: number;
  spin: number;
  wander: number;
};

type MascotOptions = {
  state?: string;
  cycle?: string[];
  follow?: boolean;
  intro?: boolean;
  ink?: string;
  paper?: string;
  notif?: string;
  mode?: "state" | "sequence";
  frozenAt?: number;
};

type MascotInstance = {
  setState: (id: string) => void;
  playSequence: () => void;
  destroy: () => void;
  engine: { setLook: (look: MascotLook | null, now: number, morph?: number) => void; sample: (now: number) => unknown };
  draw: (frame: unknown) => void;
};

declare global {
  interface Window {
    MFMascot?: {
      Mascot: new (host: HTMLElement, opts: MascotOptions) => MascotInstance;
    };
  }
}

const SRC = "/mf-mascot.js";
let loader: Promise<void> | null = null;

function loadEngine(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.MFMascot) return Promise.resolve();
  if (loader) return loader;
  loader = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SRC}"]`);
    const script = existing ?? document.createElement("script");
    script.addEventListener("load", () => resolve());
    script.addEventListener("error", () => reject(new Error("mf-mascot.js konnte nicht geladen werden")));
    if (!existing) {
      script.src = SRC;
      script.async = true;
      document.head.appendChild(script);
    }
  });
  return loader;
}

export type MascotHandle = {
  setState: (id: string) => void;
  playSequence: () => void;
};

export type MascotProps = {
  state?: string;
  cycle?: string[];
  follow?: boolean;
  intro?: boolean;
  ink?: string;
  paper?: string;
  notif?: string;
  /** Ein einziges, statisches Bild zum Zeitpunkt t (Sekunden) — keine Animation. */
  frozenAt?: number;
  /** Fester Blick, nur sinnvoll zusammen mit frozenAt. */
  look?: MascotLook;
  className?: string;
  style?: CSSProperties;
};

export const Mascot = forwardRef<MascotHandle, MascotProps>(function Mascot(
  { state, cycle, follow, intro, ink, paper, notif, frozenAt, look, className, style },
  ref,
) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const botRef = useRef<MascotInstance | null>(null);

  const cycleKey = cycle ? cycle.join(",") : "";

  useEffect(() => {
    let cancelled = false;
    loadEngine()
      .then(() => {
        if (cancelled || !hostRef.current || !window.MFMascot) return;
        const bot = new window.MFMascot.Mascot(hostRef.current, {
          state,
          cycle,
          follow,
          intro,
          ink,
          paper,
          notif,
          mode: cycle ? "sequence" : state ? "state" : "sequence",
          ...(frozenAt !== undefined ? { frozenAt } : {}),
        });
        botRef.current = bot;
        if (frozenAt !== undefined && look) {
          bot.engine.setLook(look, frozenAt, 1 / 60);
          bot.draw(bot.engine.sample(frozenAt));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      botRef.current?.destroy();
      botRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cycleKey, follow, intro, ink, paper, notif, frozenAt]);

  useEffect(() => {
    if (state && !cycle && frozenAt === undefined) botRef.current?.setState(state);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  useImperativeHandle(
    ref,
    () => ({
      setState: (id: string) => botRef.current?.setState(id),
      playSequence: () => botRef.current?.playSequence(),
    }),
    [],
  );

  return (
    <div
      ref={hostRef}
      className={className}
      aria-hidden="true"
      style={{ position: "relative", display: "block", ...style }}
    />
  );
});
