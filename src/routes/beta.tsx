import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Mascot, type MascotHandle } from "@/components/Mascot";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/beta")({
  head: () => ({
    meta: [
      { title: "Beta-Zugang — matchfoundr für die ersten 500 Gründer" },
      {
        name: "description",
        content:
          "matchfoundr bringt Gründer, Experten und Kapital zusammen. Sichere dir jetzt einen Platz in Welle 1 der privaten Beta.",
      },
      { property: "og:title", content: "Beta-Zugang — matchfoundr für die ersten 500 Gründer" },
      {
        property: "og:description",
        content: "Wir öffnen in Wellen. Trag dich ein und du bist in der ersten dabei.",
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

const WORLDS: Array<[string, string]> = [
  ["Recht", "#13957A"],
  ["Steuern", "#D79014"],
  ["Funding", "#E03A2E"],
  ["Kapital", "#3A6FD6"],
  ["Mentoring", "#8A55D2"],
  ["Talent", "#2E9E50"],
  ["Growth", "#DB4B93"],
  ["Founder", "#E2511C"],
];

const CSS = `
.mfb-root{min-height:100vh;background:${C.canvas};color:${C.ink};font-family:"Geist",system-ui,-apple-system,sans-serif;
  display:flex;flex-direction:column;align-items:center;padding:22px 20px 18px;overflow-x:hidden}
.mfb-wrap{width:100%;max-width:1120px;display:flex;flex-direction:column;flex:1}
.mfb-rise{opacity:0;transform:translateY(16px);animation:mfb-rise .8s cubic-bezier(.2,.7,.3,1) forwards}
@keyframes mfb-rise{to{opacity:1;transform:translateY(0)}}
@keyframes mfb-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.45;transform:scale(.8)}}
@keyframes mfb-pop{0%{opacity:0;transform:scale(.94)}100%{opacity:1;transform:scale(1)}}
.mfb-head{display:flex;align-items:center;justify-content:space-between;gap:12px}
.mfb-mark{display:inline-flex;align-items:baseline;font-weight:800;font-size:19px;letter-spacing:-.04em}
.mfb-badge{display:inline-flex;align-items:center;gap:7px;font-size:11px;text-transform:uppercase;
  letter-spacing:.16em;color:${C.faint};font-weight:600}
.mfb-badge i{width:7px;height:7px;border-radius:99px;background:${C.ember};animation:mfb-pulse 1.8s ease-in-out infinite}
.mfb-hero{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:13px;padding:6px 0 14px}
.mfb-h1{font-size:clamp(34px,5.4vw,62px);font-weight:700;letter-spacing:-.038em;line-height:1.02;margin:0}
.mfb-lead{max-width:46ch;color:${C.muted};font-size:15px;line-height:1.55;margin:0}
.mfb-form{display:flex;gap:10px;width:100%;max-width:460px;margin-top:4px}
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
  padding:20px 24px;max-width:460px;animation:mfb-pop .5s cubic-bezier(.2,.7,.3,1) both}
.mfb-cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
.mfb-card{background:#fff;border-radius:18px;border:1px solid ${C.line};padding:16px;text-align:left;
  transition:transform .22s,border-color .22s,box-shadow .22s}
.mfb-card:hover{transform:translateY(-4px);border-color:rgba(226,81,28,.4);box-shadow:0 14px 30px rgba(23,21,15,.06)}
.mfb-tile{width:42px;height:42px;border-radius:13px;display:flex;align-items:center;justify-content:center;padding:5px}
.mfb-ct{font-size:14.5px;font-weight:700;letter-spacing:-.02em;margin:11px 0 3px}
.mfb-cd{font-size:13px;color:${C.muted};line-height:1.5;margin:0}
.mfb-demo{margin-top:12px;border-radius:12px;padding:11px 12px}
.mfb-bar{height:4px;border-radius:99px;background:rgba(23,21,15,.08);overflow:hidden;margin:8px 0 7px}
.mfb-bar>span{display:block;height:100%;border-radius:99px;background:${C.ember};width:0;transition:width 1.4s ease}
.mfb-chip{font-size:11.5px;font-weight:600;border-radius:99px;padding:5px 11px;display:inline-block}
.mfb-foot{display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:11px;
  text-transform:uppercase;letter-spacing:.14em;color:#B5AEA3;padding-top:18px}
.mfb-foot a{color:inherit;text-decoration:none;text-transform:none;letter-spacing:0;font-size:12px}
@media (max-width:760px){
  .mfb-cards{grid-template-columns:1fr}
  .mfb-form{flex-direction:column}
  .mfb-btn{width:100%}
  .mfb-root{padding-bottom:28px}
}
@media (prefers-reduced-motion:reduce){
  .mfb-rise,.mfb-done{animation:none!important;opacity:1!important;transform:none!important}
  .mfb-badge i{animation:none}
  .mfb-bar>span{transition:none}
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
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setProgress(92), 700);
    return () => {
      clearTimeout(t);
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
              Private Beta · Welle 1
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
              style={{ width: "clamp(180px,25vw,268px)", height: "clamp(180px,25vw,268px)" }}
            />
          </Rise>

          <Rise delay={0.18}>
            <h1 className="mfb-h1">
              Beta-Zugang für die ersten{" "}
              <span style={{ color: C.ember }}>500 Gründer</span>.
            </h1>
          </Rise>

          <Rise delay={0.28} style={{ display: "flex", justifyContent: "center" }}>
            <p className="mfb-lead">
              matchfoundr bringt Gründer, Experten und Kapital zusammen. Wir öffnen in Wellen — trag dich ein und du
              bist in der ersten dabei.
            </p>
          </Rise>

          {done ? (
            <Rise delay={0} style={{ display: "flex", justifyContent: "center" }}>
              <div className="mfb-done">
                <p style={{ margin: 0, fontWeight: 700, fontSize: 16, letterSpacing: "-.02em" }}>
                  Du bist auf der Liste.
                </p>
                <p style={{ margin: "6px 0 0", fontSize: 13.5, color: C.muted, lineHeight: 1.55 }}>
                  Wir melden uns, sobald Welle 1 öffnet. Bis dahin sortiert der Co-Pilot schon mal passende Founder für
                  dich vor.
                </p>
              </div>
            </Rise>
          ) : (
            <>
              <Rise delay={0.38} style={{ display: "flex", justifyContent: "center", width: "100%" }}>
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
                    Platz sichern
                  </button>
                </form>
              </Rise>
              <Rise delay={0.48}>
                <p className="mfb-fine">
                  <strong style={{ color: C.muted }}>Kein Spam.</strong> Eine Mail, wenn dein Zugang bereit ist.
                </p>
              </Rise>
            </>
          )}
        </section>

        <Rise delay={0.58}>
          <div className="mfb-cards">
            <article className="mfb-card">
              <div className="mfb-tile" style={{ background: "#FCE6DA" }}>
                <Mascot
                  cycle={["idle", "wink", "swirl"]}
                  ink={C.ember}
                  paper="#FCE6DA"
                  style={{ width: "100%", height: "100%" }}
                />
              </div>
              <h2 className="mfb-ct">Co-Founder-Matching</h2>
              <p className="mfb-cd">Vorschläge nach Rolle, Branche und Tempo. Nicht nach Zufall.</p>
              <div className="mfb-demo" style={{ background: "#F7F3EC" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 99,
                      background: "#fff",
                      display: "grid",
                      placeItems: "center",
                      fontSize: 10.5,
                      fontWeight: 700,
                      color: C.muted,
                    }}
                  >
                    LK
                  </span>
                  <span style={{ fontSize: 12.5, color: C.muted }}>
                    <strong style={{ color: C.ink }}>Lena K.</strong> · CTO-Profil
                  </span>
                  <span style={{ marginLeft: "auto", fontSize: 12.5, fontWeight: 700, color: C.ember }}>92 %</span>
                </div>
                <div className="mfb-bar">
                  <span style={{ width: `${progress}%` }} />
                </div>
                <div style={{ fontSize: 11.5, color: C.faint }}>Tech · Berlin · Vollzeit ab Q4</div>
              </div>
            </article>

            <article className="mfb-card">
              <div className="mfb-tile" style={{ background: "#EEF1FB" }}>
                <Mascot
                  cycle={["thinking", "idle"]}
                  ink={C.indigo}
                  paper="#EEF1FB"
                  style={{ width: "100%", height: "100%" }}
                />
              </div>
              <h2 className="mfb-ct">Dein Co-Pilot</h2>
              <p className="mfb-cd">Fragt nach, sortiert vor und schreibt die erste Nachricht mit.</p>
              <div className="mfb-demo" style={{ background: "#EEF1FB" }}>
                <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: "#273F96" }}>
                  Lena sucht genau deinen Stack. Soll ich die erste Nachricht entwerfen?
                </p>
                <div style={{ display: "flex", gap: 7, marginTop: 9 }}>
                  <span className="mfb-chip" style={{ background: C.indigo, color: "#fff" }}>
                    Ja, entwerfen
                  </span>
                  <span className="mfb-chip" style={{ background: "#fff", color: C.indigo }}>
                    Später
                  </span>
                </div>
              </div>
            </article>

            <article className="mfb-card">
              <div className="mfb-tile" style={{ background: "#DBF1E1" }}>
                <Mascot
                  cycle={["comet", "idle"]}
                  ink="#13957A"
                  paper="#DBF1E1"
                  style={{ width: "100%", height: "100%" }}
                />
              </div>
              <h2 className="mfb-ct">Acht Service-Welten</h2>
              <p className="mfb-cd">Geprüfte Partner, direkt aus dem Profil beauftragt.</p>
              <div
                className="mfb-demo"
                style={{
                  background: "#F7F3EC",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "7px 10px",
                }}
              >
                {WORLDS.map(([name, color]) => (
                  <span key={name} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: C.muted }}>
                    <i style={{ width: 7, height: 7, borderRadius: 99, background: color, display: "inline-block" }} />
                    {name}
                  </span>
                ))}
              </div>
            </article>
          </div>
        </Rise>

        <Rise delay={0.78}>
          <footer className="mfb-foot">
            <span>matchfoundr</span>
            <a href="mailto:hallo@matchfoundr.de">Fragen? hallo@matchfoundr.de</a>
          </footer>
        </Rise>
      </div>
    </div>
  );
}
