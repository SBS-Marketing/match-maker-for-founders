import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Mascot, type MascotHandle } from "@/components/Mascot";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/beta")({
  head: () => ({
    meta: [
      { title: "matchfoundr — Dein Gründer-Netzwerk" },
      {
        name: "description",
        content:
          "matchfoundr bringt Gründer, Experten und Kapital zusammen. Sichere dir einen der ersten Beta-Plätze.",
      },
      { property: "og:title", content: "matchfoundr — Dein Gründer-Netzwerk" },
      {
        property: "og:description",
        content: "Gründer, Experten und Kapital an einem Ort. Jetzt Beta-Platz sichern.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BetaPage,
});

const C = {
  canvas: "#FAF8F3",
  ember: "#E2511C",
  indigo: "#3756C4",
  ink: "#17150F",
  muted: "#6E665C",
  faint: "#9A9286",
  line: "rgba(23,21,15,.055)",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const CSS = `
.mfb-root{min-height:100vh;background:${C.canvas};color:${C.ink};font-family:"Geist",system-ui,-apple-system,sans-serif;
  display:flex;flex-direction:column;align-items:center;padding:22px 20px 18px;overflow-x:hidden}
.mfb-wrap{width:100%;max-width:720px;display:flex;flex-direction:column;flex:1}
.mfb-rise{opacity:0;transform:translateY(18px);animation:mfb-rise .7s cubic-bezier(.2,.7,.3,1) forwards}
@keyframes mfb-rise{to{opacity:1;transform:translateY(0)}}
@keyframes mfb-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.45;transform:scale(.8)}}
@keyframes mfb-pop{0%{opacity:0;transform:scale(.94)}100%{opacity:1;transform:scale(1)}}
.mfb-head{display:flex;align-items:center;justify-content:space-between;gap:12px}
.mfb-mark{display:inline-flex;align-items:baseline;font-weight:800;font-size:19px;letter-spacing:-.04em}
.mfb-badge{display:inline-flex;align-items:center;gap:7px;font-size:11px;text-transform:uppercase;
  letter-spacing:.16em;color:${C.faint};font-weight:600}
.mfb-badge i{width:7px;height:7px;border-radius:99px;background:${C.ember};animation:mfb-pulse 1.8s ease-in-out infinite}
.mfb-hero{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:18px;padding:28px 0}
.mfb-h1{font-size:clamp(30px,5.6vw,52px);font-weight:700;letter-spacing:-.04em;line-height:1.08;margin:0}
.mfb-h1 em{font-style:normal;color:${C.ember}}
.mfb-lead{max-width:42ch;color:${C.muted};font-size:16px;line-height:1.6;margin:0}
.mfb-points{display:flex;flex-wrap:wrap;justify-content:center;gap:10px;max-width:520px;margin-top:2px}
.mfb-point{display:inline-flex;align-items:center;gap:8px;font-size:13px;font-weight:600;color:${C.ink};
  background:#fff;border:1px solid ${C.line};border-radius:99px;padding:8px 14px;box-shadow:0 2px 10px rgba(23,21,15,.04)}
.mfb-point span{width:6px;height:6px;border-radius:99px;background:${C.ember};flex-shrink:0}
.mfb-form{display:flex;gap:10px;width:100%;max-width:420px;margin-top:8px}
.mfb-input{flex:1;height:52px;border-radius:14px;border:1px solid rgba(23,21,15,.1);background:#fff;
  padding:0 16px;font-size:15px;font-family:inherit;color:${C.ink};outline:none;transition:box-shadow .18s,border-color .18s}
.mfb-input::placeholder{color:${C.faint}}
.mfb-input:focus{border-color:${C.ember};box-shadow:0 0 0 3px rgba(226,81,28,.16)}
.mfb-btn{height:52px;padding:0 22px;border:0;border-radius:14px;cursor:pointer;color:#fff;font-weight:650;font-size:15px;
  font-family:inherit;white-space:nowrap;background:linear-gradient(150deg,#F2622A,#E2511C 46%,#B83C10);
  box-shadow:0 8px 20px rgba(184,60,16,.22);transition:transform .18s,box-shadow .18s}
.mfb-btn:hover{transform:translateY(-2px);box-shadow:0 14px 26px rgba(184,60,16,.26)}
.mfb-btn[disabled]{opacity:.65;cursor:default;transform:none}
.mfb-fine{font-size:12.5px;color:${C.faint};margin:0}
.mfb-done{background:#fff;border-radius:16px;box-shadow:0 12px 34px rgba(23,21,15,.07);border:1px solid ${C.line};
  padding:20px 24px;max-width:420px;animation:mfb-pop .5s cubic-bezier(.2,.7,.3,1) both}
.mfb-foot{display:flex;align-items:center;justify-content:center;gap:10px;font-size:12px;
  color:#B5AEA3;padding-top:18px}
.mfb-foot a{color:inherit;text-decoration:none}
@media (max-width:560px){
  .mfb-form{flex-direction:column}
  .mfb-input{width:100%;min-width:0}
  .mfb-btn{width:100%}
  .mfb-hero{padding:18px 0 28px;gap:16px}
  .mfb-head{flex-direction:column;gap:8px}
  .mfb-points{gap:8px}
  .mfb-point{font-size:12.5px;padding:7px 12px}
}
@media (prefers-reduced-motion:reduce){
  .mfb-rise,.mfb-done{animation:none!important;opacity:1!important;transform:none!important}
  .mfb-badge i{animation:none}
}
`;

function Rise({ delay, children, style }: { delay: number; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div className="mfb-rise" style={{ animationDelay: `${delay}s`, ...style }}>
      {children}
    </div>
  );
}

function BetaPage() {
  const mascot = useRef<MascotHandle>(null);
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const typeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backTimers = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const submitted = useRef(false);

  useEffect(() => {
    return () => {
      if (typeTimer.current) clearTimeout(typeTimer.current);
      backTimers.current.forEach(clearTimeout);
    };
  }, []);

  const onChange = useCallback((value: string) => {
    setEmail(value);
    if (typeTimer.current) clearTimeout(typeTimer.current);
    if (EMAIL_RE.test(value.trim())) {
      mascot.current?.setState("notify");
    } else {
      typeTimer.current = setTimeout(() => mascot.current?.setState("thinking"), 260);
    }
  }, []);

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const value = email.trim().toLowerCase();
      if (!EMAIL_RE.test(value)) {
        mascot.current?.setState("alert");
        inputRef.current?.focus();
        return;
      }
      setBusy(true);
      submitted.current = true;
      try {
        await supabase.rpc("join_waitlist", {
          p_email: value,
          p_name: "",
          p_metadata: { source: "beta-landing" },
        });
      } catch {
        /* Doppelte Mail oder Netzfehler: gleicher Erfolgszustand. */
      }
      setBusy(false);
      setDone(true);
      mascot.current?.setState("burst");
      backTimers.current.push(setTimeout(() => mascot.current?.setState("wink"), 2200));
      backTimers.current.push(setTimeout(() => mascot.current?.playSequence(), 4200));
    },
    [email],
  );

  return (
    <div className="mfb-root">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="mfb-wrap">
        <Rise delay={0}>
          <header className="mfb-head">
            <span className="mfb-mark">
              matchfoundr
              <Mascot
                state="idle"
                follow
                ink={C.ember}
                paper={C.canvas}
                style={{ width: "0.42em", height: "0.42em", display: "inline-block", marginLeft: ".05em" }}
              />
            </span>
            <span className="mfb-badge">
              <i />
              Private Beta
            </span>
          </header>
        </Rise>

        <section className="mfb-hero">
          <Rise delay={0.08}>
            <Mascot
              ref={mascot}
              follow
              intro
              ink={C.ember}
              paper={C.canvas}
              notif={C.indigo}
              cycle={["idle", "orbit", "idle", "wink", "comet", "idle", "thinking", "swirl"]}
              style={{ width: "clamp(150px,20vw,200px)", height: "clamp(150px,20vw,200px)" }}
            />
          </Rise>

          <Rise delay={0.18}>
            <h1 className="mfb-h1">
              Dein Netzwerk für
              <br />
              <em>Gründer, Experten & Kapital.</em>
            </h1>
          </Rise>

          <Rise delay={0.28} style={{ display: "flex", justifyContent: "center" }}>
            <p className="mfb-lead">
              matchfoundr bringt die richtigen Menschen zusammen. Mit einem KI-Co-Pilot, der dich von der ersten Idee bis zum Funding begleitet.
            </p>
          </Rise>

          <Rise delay={0.38}>
            <div className="mfb-points">
              <span className="mfb-point"><span />Co-Founder finden</span>
              <span className="mfb-point"><span />Experten buchen</span>
              <span className="mfb-point"><span />Funding vorbereiten</span>
            </div>
          </Rise>

          {done ? (
            <Rise delay={0} style={{ display: "flex", justifyContent: "center" }}>
              <div className="mfb-done">
                <p style={{ margin: 0, fontWeight: 700, fontSize: 16, letterSpacing: "-.02em" }}>
                  Du bist auf der Liste.
                </p>
                <p style={{ margin: "6px 0 0", fontSize: 13.5, color: C.muted, lineHeight: 1.55 }}>
                  Wir melden uns bei dir, sobald die Beta für dich startet.
                </p>
              </div>
            </Rise>
          ) : (
            <>
              <Rise delay={0.48} style={{ display: "flex", justifyContent: "center", width: "100%" }}>
                <form className="mfb-form" onSubmit={submit} noValidate>
                  <input
                    ref={inputRef}
                    className="mfb-input"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    aria-label="E-Mail-Adresse"
                    placeholder="deine@mail.de"
                    value={email}
                    onChange={(e) => onChange(e.target.value)}
                    onFocus={() => mascot.current?.setState("wide")}
                    onBlur={() => {
                      if (!submitted.current) mascot.current?.playSequence();
                    }}
                  />
                  <button className="mfb-btn" type="submit" disabled={busy}>
                    Beta-Platz sichern
                  </button>
                </form>
              </Rise>
              <Rise delay={0.58}>
                <p className="mfb-fine">
                  <strong style={{ color: C.muted }}>Kein Spam.</strong> Nur eine Mail, wenn es losgeht.
                </p>
              </Rise>
            </>
          )}
        </section>

        <Rise delay={0.68}>
          <footer className="mfb-foot">
            <a href="mailto:hallo@matchfoundr.de">Fragen? hallo@matchfoundr.de</a>
          </footer>
        </Rise>
      </div>
    </div>
  );
}
