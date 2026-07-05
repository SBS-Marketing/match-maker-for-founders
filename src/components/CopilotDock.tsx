import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { ArrowRight, ArrowUpRight, Send, X } from "lucide-react";
import { CopilotMark, ThinkingTrace } from "@/components/Copilot";
import { useAuth } from "@/hooks/useAuth";
import { readPlanContext } from "@/lib/plan-draft";
import {
  askCopilot,
  makeMsgId,
  onSharedChatChange,
  quickPromptsFor,
  readCopilotMemory,
  readSharedChat,
  writeSharedChat,
  type CopilotMsg,
} from "@/lib/copilot-client";

// Seitentitel für den Kontext-Chip im Drawer.
function surfaceLabel(pathname: string): string {
  if (pathname.startsWith("/guides")) return "Guides";
  if (pathname.startsWith("/foerderung")) return "Förderung";
  if (pathname.startsWith("/firma")) return "Firmenprofil";
  if (pathname.startsWith("/discover")) return "Swipe";
  if (pathname.startsWith("/matches")) return "Matches";
  if (pathname.startsWith("/marketplace")) return "Marktplatz";
  if (pathname.startsWith("/kapital")) return "Kapital";
  if (pathname.startsWith("/recht")) return "Recht";
  if (pathname.startsWith("/steuer")) return "Steuer";
  if (pathname.startsWith("/mentoren")) return "Mentoren";
  if (pathname.startsWith("/talent")) return "Talent";
  if (pathname.startsWith("/growth")) return "Growth";
  if (pathname.startsWith("/team")) return "Team";
  if (pathname.startsWith("/aufgaben")) return "Aufgaben";
  if (pathname.startsWith("/kanban")) return "Kanban";
  if (pathname.startsWith("/kalender")) return "Kalender";
  if (pathname.startsWith("/unterlagen")) return "Unterlagen";
  if (pathname.startsWith("/plan")) return "Plan";
  if (pathname.startsWith("/heute")) return "Heute";
  if (pathname.startsWith("/profile")) return "Profil";
  return "Plattform";
}

export function CopilotDock() {
  const { user, session, isDemo } = useAuth();
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<CopilotMsg[]>(() => readSharedChat());
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [prompts, setPrompts] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Verlauf zwischen Dock und Co-Pilot-Seite synchron halten.
  useEffect(() => onSharedChatChange(() => setMessages(readSharedChat())), []);

  useEffect(() => {
    setPrompts(quickPromptsFor(pathname));
  }, [pathname]);

  useEffect(() => {
    if (open) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages, sending, open]);

  const [memoryCount, setMemoryCount] = useState(() => readCopilotMemory().length);
  useEffect(() => {
    setMemoryCount(readCopilotMemory().length);
  }, [messages]);

  const send = useCallback(
    async (text?: string) => {
      const body = (text ?? input).trim();
      if (!body || sending) return;
      setInput("");
      setSending(true);

      const userMsg: CopilotMsg = {
        id: makeMsgId(),
        role: "user",
        content: body,
        created_at: new Date().toISOString(),
      };
      const base = [...readSharedChat(), userMsg];
      setMessages(base);
      writeSharedChat(base);

      const result = await askCopilot({
        message: body,
        surface: pathname,
        history: base,
        planContext: readPlanContext(),
        auth: { session, user, isDemo },
      });

      const assistantMsg: CopilotMsg = {
        id: makeMsgId(),
        role: "assistant",
        content: result.answer,
        navigation: result.navigation,
        created_at: new Date().toISOString(),
      };
      const next = [...base, assistantMsg];
      setMessages(next);
      writeSharedChat(next);
      if (result.quickActions.length) setPrompts(result.quickActions.slice(0, 3));
      setSending(false);
    },
    [input, sending, pathname, session, user, isDemo],
  );

  // Nicht auf der Co-Pilot-Seite (dort läuft das volle Erlebnis) und nur eingeloggt.
  if (!user || pathname.startsWith("/co-pilot")) return null;

  return (
    <>
      {/* Floating Button — Desktop; auf Mobile gibt es den Pilot-Tab */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Co-Pilot öffnen"
          className="fixed bottom-6 right-6 z-40 hidden h-13 items-center gap-2.5 rounded-full py-3 pl-4 pr-5 text-[13.5px] font-semibold text-white transition hover:scale-[1.03] lg:flex"
          style={{ background: "var(--indigo-grad)", boxShadow: "var(--indigo-glow)" }}
        >
          <CopilotMark size={17} color="white" spark="white" />
          Co-Pilot
        </button>
      )}

      {/* Drawer */}
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <button
            aria-label="Co-Pilot schließen"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-[rgba(23,21,15,0.25)] backdrop-blur-[2px]"
          />

          <div className="relative flex h-full w-full max-w-[420px] flex-col bg-[var(--surface)] shadow-[-12px_0_48px_-12px_rgba(23,21,15,0.25)]">
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-[var(--ruled-soft)] px-4 py-3.5">
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
                style={{ background: "var(--indigo-grad)" }}
              >
                <CopilotMark size={17} color="white" spark="white" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[14.5px] font-semibold tracking-tight text-[var(--ink)]">
                  Co-Pilot
                </div>
                <div className="truncate text-[11.5px] text-[var(--smoke)]">
                  Sieht gerade: <span className="font-semibold">{surfaceLabel(pathname)}</span>
                  {memoryCount > 0 && <> · merkt sich {memoryCount} Fakten</>}
                </div>
              </div>
              <Link
                to="/co-pilot"
                onClick={() => setOpen(false)}
                className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[11.5px] font-semibold text-[var(--indigo-ink)] hover:bg-[var(--indigo-tint)]"
              >
                Vollbild <ArrowUpRight className="h-3 w-3" />
              </Link>
              <button
                onClick={() => setOpen(false)}
                aria-label="Schließen"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--smoke)] hover:bg-[var(--surface-soft)] hover:text-[var(--ink)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
              {messages.length === 0 && !sending && (
                <div className="rounded-2xl border border-[var(--ruled)] bg-[var(--surface-soft)] p-4 text-[13.5px] leading-relaxed text-[var(--smoke)]">
                  Ich sehe, du bist gerade im Bereich{" "}
                  <span className="font-semibold text-[var(--ink)]">{surfaceLabel(pathname)}</span>.
                  Frag mich etwas dazu — oder nimm einen der Vorschläge unten. Ich merke mir, was
                  wichtig ist.
                </div>
              )}

              {messages.map((m) =>
                m.role === "user" ? (
                  <div key={m.id} className="ml-auto max-w-[85%]">
                    <div
                      className="rounded-2xl rounded-br-sm px-3.5 py-2.5 text-[13.5px] leading-snug text-white"
                      style={{ background: "var(--indigo-grad)" }}
                    >
                      {m.content}
                    </div>
                  </div>
                ) : (
                  <div key={m.id} className="max-w-[94%]">
                    <div className="whitespace-pre-wrap rounded-2xl rounded-bl-sm border border-[var(--ruled)] bg-[var(--surface)] px-3.5 py-3 text-[13.5px] leading-relaxed text-[var(--ink-soft)] shadow-warm">
                      {m.content}
                    </div>
                    {m.navigation && m.navigation.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {m.navigation.map((nav) => (
                          <button
                            key={nav.to + nav.label}
                            onClick={() => {
                              setOpen(false);
                              router.navigate({ to: nav.to });
                            }}
                            className="inline-flex items-center gap-1.5 rounded-full bg-[var(--indigo-tint)] px-3 py-1.5 text-[12px] font-semibold text-[var(--indigo-ink)] hover:brightness-95"
                          >
                            {nav.label} <ArrowRight className="h-3 w-3" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ),
              )}

              {sending && (
                <div className="max-w-[70%]">
                  <ThinkingTrace>denkt nach · prüft deinen Stand</ThinkingTrace>
                </div>
              )}
            </div>

            {/* Composer */}
            <div className="border-t border-[var(--ruled-soft)] p-3.5">
              <div className="mb-2.5 flex gap-1.5 overflow-x-auto pb-0.5">
                {prompts.slice(0, 3).map((p) => (
                  <button
                    key={p}
                    onClick={() => send(p)}
                    disabled={sending}
                    className="shrink-0 rounded-full border border-[var(--ruled)] bg-[var(--surface-soft)] px-3 py-1.5 text-[11.5px] font-medium text-[var(--smoke)] hover:text-[var(--ink)] disabled:opacity-50"
                  >
                    {p}
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
                  placeholder={`Frag mich zu ${surfaceLabel(pathname)} — oder zu allem anderen…`}
                  className="max-h-32 flex-1 resize-none rounded-xl border border-[var(--ruled)] bg-[var(--surface)] px-3.5 py-2.5 text-[13.5px] text-[var(--ink)] placeholder:text-[var(--faint)] focus:border-[var(--indigo)] focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={sending || !input.trim()}
                  aria-label="Senden"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white disabled:opacity-50"
                  style={{ background: "var(--indigo-grad)", boxShadow: "var(--indigo-glow)" }}
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
