import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AuthGate } from "@/components/AuthGate";
import { CopilotMark, AITag, ThinkingTrace } from "@/components/Copilot";
import { ArrowRight, Send, Save, Pencil, FileText, Globe, Database, X } from "lucide-react";
import { toast } from "sonner";
import { readPlanContext } from "@/lib/plan-draft";
import {
  askCopilot,
  makeMsgId,
  quickPromptsFor,
  readCopilotMemory,
  readSharedChat,
  removeCopilotFact,
  writeSharedChat,
  type CopilotNav,
} from "@/lib/copilot-client";

export const Route = createFileRoute("/co-pilot")({
  head: () => ({
    meta: [
      { title: "Co-Pilot — matchfoundr" },
      { name: "description", content: "Die KI, die deinen Founder-Plan baut." },
    ],
  }),
  component: () => (
    <AuthGate>
      <CoPilotPage />
    </AuthGate>
  ),
});

type Source = { typ?: string; type?: string; titel?: string; title?: string; url?: string };
type Msg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[] | null;
  navigation?: CopilotNav[];
  created_at: string;
};
type Ctx = {
  role?: string | null;
  idea?: string | null;
  stage?: string | null;
  city?: string | null;
  goal?: string | null;
  risk?: string | null;
};

const DEFAULT_QA = [
  "Was ist mein wichtigster nächster Schritt?",
  "Welche Förderung passt für mich?",
  "Erstelle mir einen 3-Spur-Plan",
  "Mein Co-Founder springt ab — was jetzt?",
];

function CoPilotPage() {
  const { user, session, isDemo } = useAuth();
  const router = useRouter();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionTitle, setSessionTitle] = useState("Neue Session");
  const [editingTitle, setEditingTitle] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [ctx, setCtx] = useState<Ctx | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [quickActions, setQuickActions] = useState<string[]>(DEFAULT_QA);
  const [editingCtx, setEditingCtx] = useState(false);
  const [ctxDraft, setCtxDraft] = useState("");
  const [memory, setMemory] = useState<string[]>(() => readCopilotMemory());
  const scrollRef = useRef<HTMLDivElement>(null);

  // bootstrap: session + context + messages
  useEffect(() => {
    if (!user) return;
    if (isDemo) {
      setSessionId("demo-session");
      setSessionTitle("Demo Session");
      const planCtx = readPlanContext();
      setCtx({
        role: planCtx?.context.role || "Founder mit Idee",
        idea:
          planCtx?.context.idea ||
          "Mobile-first Plattform fuer Co-Founder Matching und Startup-Ressourcen",
        stage: planCtx?.context.stage || "MVP",
        city: "Berlin",
        goal: planCtx?.context.goal || "Closed Beta mit 50 Gruendern starten",
        risk: planCtx?.context.risk || "Zu wenig aktive Profile auf beiden Seiten",
      });
      const shared = readSharedChat();
      setMessages(
        shared.length > 0
          ? (shared as Msg[])
          : [
              {
                id: "demo-welcome",
                role: "assistant",
                content:
                  "Ich bin dein Co-Pilot — ich kenne deinen Plan, merke mir was wichtig ist und bringe dich zum passenden Bereich der Plattform. Womit fangen wir an?",
                created_at: new Date().toISOString(),
              },
            ],
      );
      return;
    }
    (async () => {
      // session: latest or new
      const { data: sessions } = await supabase
        .from("copilot_sessions")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(1);
      let sid: string;
      let title = "Neue Session";
      if (sessions && sessions.length > 0) {
        sid = sessions[0].id;
        title = sessions[0].title;
      } else {
        const { data: created, error } = await supabase
          .from("copilot_sessions")
          .insert({ user_id: user.id, title: "Neue Session" })
          .select()
          .single();
        if (error || !created) {
          toast.error("Session konnte nicht erstellt werden");
          return;
        }
        sid = created.id;
      }
      setSessionId(sid);
      setSessionTitle(title);

      const { data: ctxRow } = await supabase
        .from("copilot_context")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (ctxRow) setCtx(ctxRow);

      const { data: msgs } = await supabase
        .from("copilot_messages")
        .select("*")
        .eq("session_id", sid)
        .order("created_at", { ascending: true });
      if (msgs) setMessages(msgs as Msg[]);
    })();
  }, [user, isDemo]);

  // autoscroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  const allSources = useMemo(() => {
    const seen = new Set<string>();
    const out: Source[] = [];
    for (const m of messages) {
      if (!m.sources) continue;
      for (const s of m.sources) {
        const k = (s.titel || s.title || "") + (s.url || "");
        if (!k || seen.has(k)) continue;
        seen.add(k);
        out.push(s);
      }
    }
    return out.slice(0, 12);
  }, [messages]);

  async function send(text?: string) {
    const body = (text ?? input).trim();
    if (!body || !sessionId || !user || sending) return;

    setSending(true);
    setInput("");

    const userMsg: Msg = {
      id: makeMsgId(),
      role: "user",
      content: body,
      created_at: new Date().toISOString(),
    };
    const baseMessages = [...messages, userMsg];
    setMessages(baseMessages);

    const canUseCloud = Boolean(session && !isDemo);

    if (canUseCloud) {
      // User-Message persistieren (Assistant persistiert die Edge Function)
      supabase
        .from("copilot_messages")
        .insert({ session_id: sessionId, user_id: user.id, role: "user", content: body })
        .then(() => undefined);

      // Erste Nachricht ohne Kontext → Kontext im Hintergrund parsen
      if (!ctx) {
        supabase.functions
          .invoke("copilot", {
            body: { task: "context_parse", session_id: sessionId, message: body },
          })
          .then(async () => {
            const { data: ctxRow } = await supabase
              .from("copilot_context")
              .select("*")
              .eq("user_id", user.id)
              .order("updated_at", { ascending: false })
              .limit(1)
              .maybeSingle();
            if (ctxRow) setCtx(ctxRow);
          })
          .catch(() => {});
      }
    }

    const result = await askCopilot({
      message: body,
      surface: "/co-pilot",
      history: baseMessages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        created_at: m.created_at,
      })),
      sessionId: canUseCloud ? sessionId : undefined,
      planContext: readPlanContext(),
      auth: { session, user, isDemo },
    });

    const assistantMsg: Msg = {
      id: makeMsgId(),
      role: "assistant",
      content: result.answer,
      navigation: result.navigation,
      created_at: new Date().toISOString(),
    };
    const next = [...baseMessages, assistantMsg];
    setMessages(next);
    if (result.quickActions.length) setQuickActions(result.quickActions.slice(0, 4));
    setMemory(readCopilotMemory());

    if (!canUseCloud) {
      // Demo/offline: Verlauf teilen (Dock + Seite nutzen denselben Speicher)
      writeSharedChat(
        next.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          navigation: m.navigation,
          created_at: m.created_at,
        })),
      );
    } else {
      if (result.source === "local") {
        toast.error("Cloud nicht erreichbar — lokaler Modus aktiv.");
      }
      supabase
        .from("copilot_sessions")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", sessionId)
        .then(() => undefined);

      // Kontext nach dem Memory-Merge der Edge Function aktualisieren
      supabase
        .from("copilot_context")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle()
        .then(({ data: ctxRow }) => {
          if (ctxRow) setCtx(ctxRow);
        });
    }

    setSending(false);
  }

  function forgetFact(fact: string) {
    setMemory(removeCopilotFact(fact));
    toast.success("Fakt vergessen");
  }

  async function saveSessionTitle() {
    if (!sessionId) return;
    await supabase.from("copilot_sessions").update({ title: sessionTitle }).eq("id", sessionId);
    setEditingTitle(false);
    toast.success("Session gespeichert");
  }

  async function reparseContext() {
    if (!sessionId || !ctxDraft.trim()) return;
    setEditingCtx(false);
    const { error } = await supabase.functions.invoke("copilot", {
      body: { task: "context_parse", session_id: sessionId, message: ctxDraft },
    });
    if (error) {
      toast.error("Konnte Kontext nicht aktualisieren");
      return;
    }
    const { data: ctxRow } = await supabase
      .from("copilot_context")
      .select("*")
      .eq("user_id", user!.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (ctxRow) setCtx(ctxRow);
    setCtxDraft("");
    toast.success("Kontext aktualisiert");
  }

  return (
    <div
      className="h-[calc(100svh-9.5rem)] w-full overflow-hidden sm:min-h-[calc(100vh-4rem)] sm:overflow-visible"
      style={{ background: "var(--indigo-grad)", color: "var(--surface)" }}
    >
      <div className="mx-auto h-full max-w-7xl px-3 py-3 sm:h-auto sm:px-6 sm:py-6">
        <div className="grid h-full gap-5 lg:grid-cols-[65fr_35fr]">
          {/* LEFT — Chat */}
          <div
            className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-white/10 sm:h-[82vh] sm:min-h-[520px]"
            style={{ background: "rgba(255,255,255,0.02)" }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3 sm:px-5 sm:py-4">
              <span
                className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ background: "rgba(255,255,255,0.14)" }}
              >
                <CopilotMark size={18} color="var(--cream)" spark="var(--cream)" />
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[15px] font-semibold tracking-tight">Co-Pilot</span>
                  <AITag tone="dark">online</AITag>
                </div>
                {editingTitle ? (
                  <input
                    autoFocus
                    value={sessionTitle}
                    onChange={(e) => setSessionTitle(e.target.value)}
                    onBlur={saveSessionTitle}
                    onKeyDown={(e) => e.key === "Enter" && saveSessionTitle()}
                    className="mt-0.5 w-full bg-transparent font-mono text-[10.5px] uppercase tracking-[0.12em] text-white/70 outline-none"
                  />
                ) : (
                  <button
                    onClick={() => setEditingTitle(true)}
                    className="mt-0.5 truncate text-left font-mono text-[10.5px] uppercase tracking-[0.12em] text-white/55 hover:text-white/80"
                  >
                    Session · {sessionTitle}
                  </button>
                )}
              </div>
              <button
                onClick={saveSessionTitle}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-white/85 hover:bg-white/10 sm:w-auto sm:px-3 sm:py-1.5 sm:text-[11.5px] sm:font-semibold"
                aria-label="Session speichern"
              >
                <Save className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Session speichern</span>
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
              {messages.length === 0 && !sending && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-[14px] text-white/70">
                  <div className="mb-1 text-[var(--cream)]">
                    „Erzähl mir kurz, was du gerade baust und wo du stehst — ich höre zu und mache
                    dir einen konkreten nächsten Schritt."
                  </div>
                  <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-white/40">
                    Co-Pilot · bereit
                  </div>
                </div>
              )}

              {messages.map((m) =>
                m.role === "user" ? (
                  <div key={m.id} className="ml-auto max-w-[88%] sm:max-w-[78%]">
                    <div
                      className="rounded-2xl rounded-br-sm px-4 py-3 text-[14px] leading-snug"
                      style={{ background: "var(--surface)", color: "var(--indigo-deep)" }}
                    >
                      {m.content}
                    </div>
                    <div className="mt-1 text-right font-mono text-[10px] text-white/40">
                      {formatTime(m.created_at)}
                    </div>
                  </div>
                ) : (
                  <div key={m.id} className="max-w-[96%] sm:max-w-[90%]">
                    <div className="rounded-2xl rounded-bl-sm border border-white/10 bg-white/5 px-4 py-3.5 text-[15px] leading-snug text-[var(--cream)] whitespace-pre-wrap">
                      {m.content}
                    </div>
                    {m.navigation && m.navigation.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {m.navigation.map((nav) => (
                          <button
                            key={nav.to + nav.label}
                            onClick={() => router.navigate({ to: nav.to })}
                            className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[12px] font-semibold text-[var(--indigo-deep)] hover:bg-white/90"
                          >
                            {nav.label} <ArrowRight className="h-3 w-3" />
                          </button>
                        ))}
                      </div>
                    )}
                    {m.sources && m.sources.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {m.sources.map((s, i) => (
                          <SourcePill key={i} source={s} />
                        ))}
                      </div>
                    )}
                    <div className="mt-1 font-mono text-[10px] text-white/40">
                      Co-Pilot · {formatTime(m.created_at)}
                    </div>
                  </div>
                ),
              )}

              {sending && (
                <div className="max-w-[60%]">
                  <ThinkingTrace tone="dark">
                    analysiere · rufe Quellen ab · formuliere Antwort
                  </ThinkingTrace>
                </div>
              )}
            </div>

            {/* Composer */}
            <div className="border-t border-white/10 p-4">
              <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
                {quickActions.slice(0, 4).map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    disabled={sending}
                    className="shrink-0 rounded-full border border-white/12 bg-white/5 px-3 py-1 text-[11.5px] text-white/75 hover:bg-white/10 disabled:opacity-50"
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
                className="flex items-end gap-2"
              >
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e: KeyboardEvent<HTMLTextAreaElement>) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  rows={1}
                  placeholder="Frag etwas — oder lass mich den Plan ausarbeiten…"
                  className="flex-1 resize-none rounded-xl border border-white/12 bg-white/5 px-4 py-3 text-[14px] text-[var(--cream)] placeholder:text-white/40 focus:border-white/25 focus:outline-none"
                  style={{ maxHeight: 160 }}
                />
                <button
                  type="submit"
                  disabled={sending || !input.trim()}
                  className="flex h-11 w-11 items-center justify-center rounded-xl text-[var(--cream)] disabled:opacity-50"
                  style={{ background: "var(--indigo-grad)", boxShadow: "var(--indigo-glow)" }}
                  aria-label="Senden"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          </div>

          {/* RIGHT — Context panel */}
          <div className="hidden flex-col gap-4 lg:flex">
            <div
              className="rounded-2xl border border-white/10 p-5"
              style={{ background: "rgba(255,255,255,0.03)" }}
            >
              <div className="flex items-center justify-between">
                <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/55">
                  So habe ich dich verstanden
                </div>
                <button
                  onClick={() => {
                    setEditingCtx((v) => !v);
                    setCtxDraft("");
                  }}
                  className="inline-flex items-center gap-1 text-[11px] text-white/60 hover:text-white/90"
                >
                  <Pencil className="h-3 w-3" /> Etwas korrigieren
                </button>
              </div>

              {editingCtx ? (
                <div className="mt-4 space-y-2">
                  <textarea
                    autoFocus
                    value={ctxDraft}
                    onChange={(e) => setCtxDraft(e.target.value)}
                    rows={5}
                    placeholder="Beschreibe kurz dich, deine Idee, Stand, Stadt, Ziel, Risiko…"
                    className="w-full resize-none rounded-lg border border-white/15 bg-white/5 p-3 text-[13px] text-white/85 placeholder:text-white/40 focus:outline-none"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setEditingCtx(false)}
                      className="rounded-lg px-3 py-1.5 text-[11.5px] text-white/60 hover:text-white/90"
                    >
                      Abbrechen
                    </button>
                    <button
                      onClick={reparseContext}
                      className="rounded-lg px-3 py-1.5 text-[11.5px] font-semibold text-[var(--cream)]"
                      style={{ background: "var(--indigo)" }}
                    >
                      Speichern
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  <Field label="Du" value={ctx?.role} />
                  <Field label="Idee" value={ctx?.idea} />
                  <Field label="Stand" value={ctx?.stage} />
                  <Field label="Stadt" value={ctx?.city} />
                  <Field label="Ziel" value={ctx?.goal} />
                  <Field label="Risiko" value={ctx?.risk} />
                </div>
              )}
            </div>

            <div
              className="rounded-2xl border border-white/10 p-5"
              style={{ background: "rgba(255,255,255,0.03)" }}
            >
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/55">
                Was ich mir gemerkt habe
              </div>
              {memory.length === 0 ? (
                <p className="mt-3 text-[12px] leading-relaxed text-white/40">
                  Noch nichts — erzähl mir Entscheidungen, Zahlen oder Deadlines, ich merke sie mir
                  und nutze sie in jedem Gespräch.
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {memory.map((fact) => (
                    <li
                      key={fact}
                      className="group flex items-start justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[12.5px] leading-snug text-white/80"
                    >
                      <span className="min-w-0">{fact}</span>
                      <button
                        onClick={() => forgetFact(fact)}
                        aria-label="Fakt vergessen"
                        className="mt-0.5 shrink-0 text-white/30 transition hover:text-white/80"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div
              className="rounded-2xl border border-white/10 p-5"
              style={{ background: "rgba(255,255,255,0.03)" }}
            >
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/55">
                Quellen, auf die ich mich stütze
              </div>
              <ul className="mt-4 space-y-2">
                {allSources.length === 0 && (
                  <li className="text-[12px] text-white/40">Noch keine Quellen — frag etwas.</li>
                )}
                {allSources.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-[12.5px] text-white/75">
                    <SourceIcon source={s} />
                    <span className="min-w-0 truncate">{s.titel || s.title || s.url}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <div className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-white/40">
        {label}
      </div>
      <div className="mt-0.5 text-[13.5px] leading-snug text-white/85">
        {value || <span className="text-white/35">— noch unbekannt —</span>}
      </div>
    </div>
  );
}

function SourcePill({ source }: { source: Source }) {
  const typ = (source.typ || source.type || "Intern").toString();
  const label = sourceLabel(source);
  return (
    <span
      className="inline-flex max-w-[230px] items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-white/70"
      title={source.url}
    >
      <SourceIcon source={source} />
      <span className="min-w-0 truncate">
        {typ} · {label}
      </span>
    </span>
  );
}

function sourceLabel(source: Source) {
  const title = (source.titel || source.title || "").trim();
  if (title && !looksLikeUrl(title)) return shorten(title, 34);

  const rawUrl = (source.url || title).trim();
  const compact = compactUrlLabel(rawUrl);
  return compact || shorten(title || "Quelle", 34);
}

function compactUrlLabel(raw: string) {
  if (!raw) return "";
  try {
    const parsed = new URL(raw.includes("://") ? raw : `https://${raw}`);
    const host = parsed.hostname.replace(/^www\./, "");
    const segments = parsed.pathname.split("/").filter(Boolean);
    if (segments.length === 0) return shorten(host, 30);
    return `${shorten(host, 22)}/.../${shorten(segments[segments.length - 1], 14)}`;
  } catch {
    return "";
  }
}

function looksLikeUrl(value: string) {
  const lower = value.toLowerCase();
  return (
    lower.startsWith("http://") ||
    lower.startsWith("https://") ||
    lower.startsWith("www.") ||
    lower.includes(".de/") ||
    lower.includes(".com/") ||
    lower.includes(".org/") ||
    lower.includes(".net/")
  );
}

function shorten(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;
}

function SourceIcon({ source }: { source: Source }) {
  const typ = (source.typ || source.type || "").toLowerCase();
  if (typ.includes("pdf")) return <FileText className="h-3 w-3 text-[var(--ember-light)]" />;
  if (typ.includes("web")) return <Globe className="h-3 w-3 text-[var(--ember-light)]" />;
  return <Database className="h-3 w-3 text-[var(--ember-light)]" />;
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}
