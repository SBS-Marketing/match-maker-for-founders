import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Mascot, type MascotHandle } from "@/components/Mascot";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/potentialanalyse")({
  head: () => ({
    meta: [
      { title: "Potentialanalyse für Gründer — matchfoundr" },
      {
        name: "description",
        content:
          "10 Fragen, ein Datenblatt: Die matchfoundr-KI analysiert dein Gründer-Potential und schickt dir die Auswertung per Mail.",
      },
      { property: "og:title", content: "Potentialanalyse für Gründer — matchfoundr" },
      {
        property: "og:description",
        content: "In 3 Minuten durch 10 Fragen. Dein persönliches Potential-Datenblatt kommt per Mail.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PotentialPage,
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
const STORE_KEY = "mf_potential_v1";

type Q = { id: string; label: string; text: string; options: string[] };

const QUESTIONS: Q[] = [
  {
    id: "stage",
    label: "Ausgangslage",
    text: "Wo stehst du gerade mit deinem Vorhaben?",
    options: ["Nur eine Idee", "Konzept steht", "Erster Prototyp", "Erste Kunden", "Schon am Wachsen"],
  },
  {
    id: "time",
    label: "Zeit",
    text: "Wie viel Zeit steckst du pro Woche rein?",
    options: ["Unter 5 Stunden", "5–15 Stunden", "15–30 Stunden", "Vollzeit"],
  },
  {
    id: "money",
    label: "Runway",
    text: "Wie lange könntest du ohne Gehalt durchhalten?",
    options: ["Gar nicht", "Bis 3 Monate", "3–12 Monate", "Über ein Jahr"],
  },
  {
    id: "team",
    label: "Team",
    text: "Wie sieht dein Team aus?",
    options: ["Ich allein", "Ich + Unterstützer", "Zwei Gründer", "Team ab drei Personen"],
  },
  {
    id: "strength",
    label: "Stärke",
    text: "Was ist deine klarste Stärke?",
    options: ["Produkt & Technik", "Vertrieb & Kunden", "Marketing & Marke", "Zahlen & Struktur", "Branche & Netzwerk"],
  },
  {
    id: "gap",
    label: "Lücke",
    text: "Was fehlt dir am meisten?",
    options: ["Technische Umsetzung", "Erste Kunden", "Kapital", "Struktur & Prozesse", "Ein Sparringspartner"],
  },
  {
    id: "customer",
    label: "Markt",
    text: "Wie gut kennst du deine Zielkunden?",
    options: ["Reine Annahme", "Ein paar Gespräche", "Viele Gespräche", "Ich komme aus der Branche"],
  },
  {
    id: "revenue",
    label: "Umsatz",
    text: "Wie steht es um Umsatz?",
    options: ["Noch keiner", "Erste Euros", "Regelmäßig, klein", "Planbar & wachsend"],
  },
  {
    id: "risk",
    label: "Risiko",
    text: "Wie gehst du mit Unsicherheit um?",
    options: ["Sie bremst mich", "Ich brauche Sicherheit", "Ich komme klar", "Sie treibt mich an"],
  },
  {
    id: "goal",
    label: "Ziel",
    text: "Was ist dein Ziel für die nächsten 12 Monate?",
    options: ["Idee validieren", "Erste Kunden gewinnen", "Co-Founder finden", "Förderung sichern", "Investoren gewinnen"],
  },
];

const CSS = `
.mfp-root{min-height:100vh;background:${C.canvas};color:${C.ink};font-family:"Geist",system-ui,-apple-system,sans-serif;
  display:flex;flex-direction:column;align-items:center;padding:22px 20px 18px;overflow-x:hidden}
.mfp-wrap{width:100%;max-width:720px;display:flex;flex-direction:column;flex:1}
.mfp-rise{opacity:0;transform:translateY(18px);animation:mfp-rise .7s cubic-bezier(.2,.7,.3,1) forwards}
@keyframes mfp-rise{to{opacity:1;transform:translateY(0)}}
@keyframes mfp-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.45;transform:scale(.8)}}
@keyframes mfp-pop{0%{opacity:0;transform:scale(.94)}100%{opacity:1;transform:scale(1)}}
@keyframes mfp-slide{0%{opacity:0;transform:translateY(14px)}100%{opacity:1;transform:translateY(0)}}
.mfp-head{display:flex;align-items:center;justify-content:space-between;gap:12px}
.mfp-mark{display:inline-flex;align-items:baseline;font-weight:800;font-size:19px;letter-spacing:-.04em}
.mfp-badge{display:inline-flex;align-items:center;gap:7px;font-size:11px;text-transform:uppercase;
  letter-spacing:.16em;color:${C.faint};font-weight:600}
.mfp-badge i{width:7px;height:7px;border-radius:99px;background:${C.indigo};animation:mfp-pulse 1.8s ease-in-out infinite}
.mfp-hero{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:18px;padding:28px 0}
.mfp-h1{font-size:clamp(30px,5.4vw,50px);font-weight:700;letter-spacing:-.04em;line-height:1.08;margin:0}
.mfp-h1 em{font-style:normal;color:${C.ember}}
.mfp-lead{max-width:44ch;color:${C.muted};font-size:16px;line-height:1.6;margin:0}
.mfp-points{display:flex;flex-wrap:wrap;justify-content:center;gap:10px;max-width:560px}
.mfp-point{display:inline-flex;align-items:center;gap:8px;font-size:13px;font-weight:600;color:${C.ink};
  background:#fff;border:1px solid ${C.line};border-radius:99px;padding:8px 14px;box-shadow:0 2px 10px rgba(23,21,15,.04)}
.mfp-point span{width:6px;height:6px;border-radius:99px;background:${C.indigo};flex-shrink:0}
.mfp-btn{height:52px;padding:0 24px;border:0;border-radius:14px;cursor:pointer;color:#fff;font-weight:650;font-size:15px;
  font-family:inherit;white-space:nowrap;background:linear-gradient(150deg,#F2622A,#E2511C 46%,#B83C10);
  box-shadow:0 8px 20px rgba(184,60,16,.22);transition:transform .18s,box-shadow .18s}
.mfp-btn:hover{transform:translateY(-2px);box-shadow:0 14px 26px rgba(184,60,16,.26)}
.mfp-btn[disabled]{opacity:.6;cursor:default;transform:none;box-shadow:none}
.mfp-ghost{height:44px;padding:0 16px;border-radius:12px;border:1px solid rgba(23,21,15,.1);background:transparent;
  color:${C.muted};font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;transition:color .15s,border-color .15s}
.mfp-ghost:hover{color:${C.ink};border-color:rgba(23,21,15,.22)}
.mfp-card{width:100%;background:#fff;border:1px solid ${C.line};border-radius:20px;padding:26px 24px;
  box-shadow:0 14px 40px rgba(23,21,15,.06)}
.mfp-prog{display:flex;align-items:center;gap:12px;margin-bottom:20px}
.mfp-prog__bar{flex:1;height:6px;border-radius:99px;background:rgba(23,21,15,.07);overflow:hidden}
.mfp-prog__fill{height:100%;border-radius:99px;background:linear-gradient(90deg,${C.ember},#F2622A);
  transition:width .45s cubic-bezier(.2,.7,.3,1)}
.mfp-prog__num{font-family:"Geist Mono",ui-monospace,monospace;font-size:12px;color:${C.faint};font-weight:600}
.mfp-step{animation:mfp-slide .38s cubic-bezier(.2,.7,.3,1) both}
.mfp-kicker{font-size:11px;text-transform:uppercase;letter-spacing:.16em;color:${C.indigo};font-weight:700;margin:0 0 8px}
.mfp-q{font-size:clamp(20px,3vw,26px);font-weight:700;letter-spacing:-.03em;line-height:1.25;margin:0 0 18px}
.mfp-opts{display:flex;flex-direction:column;gap:9px}
.mfp-opt{display:flex;align-items:center;gap:12px;width:100%;text-align:left;font-family:inherit;font-size:15px;
  font-weight:550;color:${C.ink};background:${C.canvas};border:1px solid ${C.line};border-radius:13px;
  padding:14px 16px;cursor:pointer;transition:transform .14s,border-color .16s,background .16s,box-shadow .16s}
.mfp-opt:hover{transform:translateX(3px);border-color:rgba(226,81,28,.35);background:#fff;box-shadow:0 6px 16px rgba(23,21,15,.05)}
.mfp-opt i{width:18px;height:18px;border-radius:99px;border:1.5px solid rgba(23,21,15,.16);flex-shrink:0;transition:all .16s}
.mfp-opt[data-on="1"]{border-color:${C.ember};background:#fff}
.mfp-opt[data-on="1"] i{border-color:${C.ember};background:${C.ember};box-shadow:inset 0 0 0 3px #fff}
.mfp-nav{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:20px}
.mfp-form{display:flex;flex-direction:column;gap:10px;width:100%;margin-top:4px}
.mfp-input{height:52px;border-radius:14px;border:1px solid rgba(23,21,15,.1);background:${C.canvas};
  padding:0 16px;font-size:15px;font-family:inherit;color:${C.ink};outline:none;transition:box-shadow .18s,border-color .18s;width:100%}
.mfp-input::placeholder{color:${C.faint}}
.mfp-input:focus{border-color:${C.ember};box-shadow:0 0 0 3px rgba(226,81,28,.16);background:#fff}
.mfp-fine{font-size:12.5px;color:${C.faint};margin:0;line-height:1.55}
.mfp-done{text-align:center;animation:mfp-pop .5s cubic-bezier(.2,.7,.3,1) both}
.mfp-foot{display:flex;flex-direction:column;align-items:center;gap:14px;font-size:12px;color:${C.muted};padding:28px 0 10px;border-top:1px solid ${C.line};margin-top:auto;width:100%}
.mfp-foot a{color:inherit;text-decoration:none;transition:color .15s}
.mfp-foot a:hover{color:${C.ink}}
.mfp-foot__links{display:flex;align-items:center;gap:16px;flex-wrap:wrap;justify-content:center}
.mfp-foot__links span{width:3px;height:3px;border-radius:99px;background:rgba(23,21,15,.18)}
@media (max-width:560px){
  .mfp-head{flex-direction:column;gap:8px}
  .mfp-hero{padding:18px 0 26px;gap:16px}
  .mfp-card{padding:20px 16px;border-radius:16px}
  .mfp-btn,.mfp-ghost{width:100%}
  .mfp-nav{flex-direction:column-reverse}
}
@media (prefers-reduced-motion:reduce){
  .mfp-rise,.mfp-step,.mfp-done{animation:none!important;opacity:1!important;transform:none!important}
  .mfp-badge i{animation:none}
}
`;

function Rise({ delay, children, style }: { delay: number; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div className="mfp-rise" style={{ animationDelay: `${delay}s`, ...style }}>
      {children}
    </div>
  );
}

type Phase = "intro" | "wizard" | "contact" | "done";

function PotentialPage() {
  const mascot = useRef<MascotHandle>(null);
  const [phase, setPhase] = useState<Phase>("intro");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timers = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  // Fortschritt wiederherstellen
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as { answers?: Record<string, string>; step?: number; name?: string };
      if (saved.answers && Object.keys(saved.answers).length) {
        setAnswers(saved.answers);
        setStep(Math.min(saved.step ?? 0, QUESTIONS.length - 1));
        setName(saved.name ?? "");
      }
    } catch {
      /* ignorieren */
    }
    return () => timers.current.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ answers, step, name }));
    } catch {
      /* ignorieren */
    }
  }, [answers, step, name]);

  const answered = Object.keys(answers).length;
  const progress = useMemo(
    () => Math.round(((phase === "contact" || phase === "done" ? QUESTIONS.length : step) / QUESTIONS.length) * 100),
    [phase, step],
  );

  const pick = useCallback(
    (q: Q, value: string) => {
      setAnswers((a) => ({ ...a, [q.id]: value }));
      mascot.current?.setState("notify");
      timers.current.push(
        setTimeout(() => {
          if (step + 1 < QUESTIONS.length) {
            setStep(step + 1);
            mascot.current?.setState("thinking");
          } else {
            setPhase("contact");
            mascot.current?.setState("wide");
          }
        }, 220),
      );
    },
    [step],
  );

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const value = email.trim().toLowerCase();
      if (!EMAIL_RE.test(value)) {
        setError("Bitte gib eine gültige E-Mail-Adresse ein.");
        mascot.current?.setState("alert");
        return;
      }
      setError(null);
      setBusy(true);
      const { error: rpcError } = await supabase.rpc("submit_potential_analysis", {
        p_email: value,
        p_name: name.trim().slice(0, 120),
        p_answers: answers,
      });
      setBusy(false);
      if (rpcError) {
        setError("Das hat gerade nicht geklappt. Versuch es bitte noch einmal.");
        mascot.current?.setState("alert");
        return;
      }
      try {
        localStorage.removeItem(STORE_KEY);
      } catch {
        /* ignorieren */
      }
      setPhase("done");
      mascot.current?.setState("burst");
      timers.current.push(setTimeout(() => mascot.current?.setState("wink"), 2200));
      timers.current.push(setTimeout(() => mascot.current?.playSequence(), 4200));
    },
    [answers, email, name],
  );

  const q = QUESTIONS[step];

  return (
    <div className="mfp-root">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="mfp-wrap">
        <Rise delay={0}>
          <header className="mfp-head">
            <span className="mfp-mark">
              matchfoundr
              <Mascot
                state="idle"
                follow
                ink={C.ember}
                paper={C.canvas}
                style={{ width: "0.42em", height: "0.42em", display: "inline-block", marginLeft: ".05em" }}
              />
            </span>
            <span className="mfp-badge">
              <i />
              KI-Potentialanalyse
            </span>
          </header>
        </Rise>

        <section className="mfp-hero">
          {phase === "intro" && (
            <>
              <Rise delay={0.08}>
                <Mascot
                  ref={mascot}
                  follow
                  intro
                  ink={C.ember}
                  paper={C.canvas}
                  notif={C.indigo}
                  cycle={["idle", "orbit", "idle", "wink", "comet", "idle", "thinking", "swirl"]}
                  style={{ width: "clamp(140px,18vw,186px)", height: "clamp(140px,18vw,186px)" }}
                />
              </Rise>

              <Rise delay={0.18}>
                <h1 className="mfp-h1">
                  10 Fragen.
                  <br />
                  <em>Dein Gründer-Datenblatt.</em>
                </h1>
              </Rise>

              <Rise delay={0.28} style={{ display: "flex", justifyContent: "center" }}>
                <p className="mfp-lead">
                  Unsere KI wertet deine Antworten aus und erstellt daraus ein persönliches Potential-Datenblatt: Stärken,
                  Lücken und die nächsten sinnvollen Schritte. Du bekommst es per Mail.
                </p>
              </Rise>

              <Rise delay={0.38}>
                <div className="mfp-points">
                  <span className="mfp-point"><span />3 Minuten</span>
                  <span className="mfp-point"><span />10 Fragen</span>
                  <span className="mfp-point"><span />Kostenlos</span>
                </div>
              </Rise>

              <Rise delay={0.48}>
                <button
                  className="mfp-btn"
                  type="button"
                  onClick={() => {
                    setPhase("wizard");
                    mascot.current?.setState("thinking");
                  }}
                >
                  {answered ? "Analyse fortsetzen" : "Analyse starten"}
                </button>
              </Rise>

              <Rise delay={0.56}>
                <p className="mfp-fine">Kein Account nötig. Deine Antworten nutzen wir nur für deine Auswertung.</p>
              </Rise>
            </>
          )}

          {phase === "wizard" && q && (
            <Rise delay={0} style={{ width: "100%" }}>
              <div className="mfp-card">
                <div className="mfp-prog">
                  <Mascot
                    ref={mascot}
                    follow
                    ink={C.ember}
                    paper="#fff"
                    notif={C.indigo}
                    state="thinking"
                    style={{ width: 34, height: 34, flexShrink: 0 }}
                  />
                  <div className="mfp-prog__bar">
                    <div className="mfp-prog__fill" style={{ width: `${Math.max(progress, 4)}%` }} />
                  </div>
                  <span className="mfp-prog__num">
                    {step + 1}/{QUESTIONS.length}
                  </span>
                </div>

                <div className="mfp-step" key={q.id} style={{ textAlign: "left" }}>
                  <p className="mfp-kicker">{q.label}</p>
                  <h2 className="mfp-q">{q.text}</h2>
                  <div className="mfp-opts">
                    {q.options.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        className="mfp-opt"
                        data-on={answers[q.id] === opt ? "1" : "0"}
                        onClick={() => pick(q, opt)}
                      >
                        <i />
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mfp-nav">
                  <button
                    className="mfp-ghost"
                    type="button"
                    onClick={() => (step === 0 ? setPhase("intro") : setStep(step - 1))}
                  >
                    Zurück
                  </button>
                  <button
                    className="mfp-btn"
                    type="button"
                    disabled={!answers[q.id]}
                    onClick={() =>
                      step + 1 < QUESTIONS.length ? setStep(step + 1) : setPhase("contact")
                    }
                  >
                    Weiter
                  </button>
                </div>
              </div>
            </Rise>
          )}

          {phase === "contact" && (
            <Rise delay={0} style={{ width: "100%" }}>
              <div className="mfp-card" style={{ textAlign: "left" }}>
                <div className="mfp-prog">
                  <Mascot
                    ref={mascot}
                    follow
                    ink={C.ember}
                    paper="#fff"
                    notif={C.indigo}
                    state="wide"
                    style={{ width: 34, height: 34, flexShrink: 0 }}
                  />
                  <div className="mfp-prog__bar">
                    <div className="mfp-prog__fill" style={{ width: "100%" }} />
                  </div>
                  <span className="mfp-prog__num">fertig</span>
                </div>

                <p className="mfp-kicker">Letzter Schritt</p>
                <h2 className="mfp-q">Wohin dürfen wir dein Datenblatt schicken?</h2>

                <form className="mfp-form" onSubmit={submit} noValidate>
                  <input
                    className="mfp-input"
                    type="text"
                    autoComplete="given-name"
                    aria-label="Dein Vorname"
                    placeholder="Dein Vorname (optional)"
                    maxLength={120}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                  <input
                    className="mfp-input"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    aria-label="E-Mail-Adresse"
                    placeholder="deine@mail.de"
                    maxLength={255}
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError(null);
                    }}
                    onFocus={() => mascot.current?.setState("wide")}
                  />
                  {error && (
                    <p className="mfp-fine" style={{ color: C.ember, fontWeight: 600 }}>
                      {error}
                    </p>
                  )}
                  <div className="mfp-nav" style={{ marginTop: 6 }}>
                    <button
                      className="mfp-ghost"
                      type="button"
                      onClick={() => {
                        setPhase("wizard");
                        setStep(QUESTIONS.length - 1);
                      }}
                    >
                      Zurück
                    </button>
                    <button className="mfp-btn" type="submit" disabled={busy}>
                      {busy ? "Wird gesendet …" : "Analyse anfordern"}
                    </button>
                  </div>
                  <p className="mfp-fine">
                    Kein Spam. Wir schicken dir dein Datenblatt und melden uns nur, wenn es für dich relevant ist.
                  </p>
                </form>
              </div>
            </Rise>
          )}

          {phase === "done" && (
            <>
              <Rise delay={0}>
                <Mascot
                  ref={mascot}
                  follow
                  ink={C.ember}
                  paper={C.canvas}
                  notif={C.indigo}
                  state="burst"
                  style={{ width: "clamp(130px,16vw,168px)", height: "clamp(130px,16vw,168px)" }}
                />
              </Rise>
              <Rise delay={0.1} style={{ display: "flex", justifyContent: "center", width: "100%" }}>
                <div className="mfp-card mfp-done" style={{ maxWidth: 460 }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 18, letterSpacing: "-.02em" }}>
                    Alles da. Die Analyse läuft.
                  </p>
                  <p style={{ margin: "8px 0 0", fontSize: 14, color: C.muted, lineHeight: 1.6 }}>
                    Dein persönliches Potential-Datenblatt landet in Kürze in deinem Postfach. Schau auch kurz im Spam
                    nach, falls es sich versteckt.
                  </p>
                  <a
                    href="/beta"
                    style={{
                      display: "inline-block",
                      marginTop: 16,
                      fontSize: 13.5,
                      fontWeight: 650,
                      color: C.ember,
                      textDecoration: "none",
                    }}
                  >
                    Beta-Zugang sichern →
                  </a>
                </div>
              </Rise>
            </>
          )}
        </section>

        <Rise delay={0.68}>
          <footer className="mfp-foot">
            <div className="mfp-foot__links">
              <a href="/impressum">Impressum</a>
              <span />
              <a href="/datenschutz">Datenschutz</a>
              <span />
              <a href="/agb">AGB</a>
            </div>
            <a href="mailto:hallo@matchfoundr.de">hallo@matchfoundr.de</a>
            <span>© {new Date().getFullYear()} matchfoundr</span>
          </footer>
        </Rise>
      </div>
    </div>
  );
}
