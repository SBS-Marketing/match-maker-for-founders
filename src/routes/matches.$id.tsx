import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AuthGate } from "@/components/AuthGate";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Paperclip, Smile, Send, MoreHorizontal, Zap } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/matches/$id")({
  component: () => (
    <AuthGate>
      <Chat />
    </AuthGate>
  ),
});

type Msg = { id: string; sender_id: string; body: string; created_at: string };
type LastMessageRow = { match_id: string; body: string; created_at: string };
type Thread = {
  match_id: string;
  other_id: string;
  other_name: string | null;
  other_photo: string | null;
  other_role: string | null;
  last: string | null;
  last_at: string | null;
  unread: boolean;
};

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - d);
  const m = Math.floor(diff / 60000);
  if (m < 1) return "jetzt";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function Chat() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [other, setOther] = useState<{
    display_name: string | null;
    photo_url: string | null;
    role: string | null;
    location: string | null;
    industry: string | null;
    looking_for: string | null;
  } | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  // Load threads (sidebar)
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: matches } = await supabase
        .from("matches")
        .select("id, user_a, user_b, created_at")
        .order("created_at", { ascending: false });
      if (!matches || matches.length === 0) return setThreads([]);
      const otherIds = matches.map((m) => (m.user_a === user.id ? m.user_b : m.user_a));
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, display_name, photo_url, role")
        .in("id", otherIds);
      const byId = new Map((profs ?? []).map((p) => [p.id, p]));
      // last messages
      const matchIds = matches.map((m) => m.id);
      const { data: lastMsgs } = await supabase
        .from("messages")
        .select("match_id, body, created_at")
        .in("match_id", matchIds)
        .order("created_at", { ascending: false });
      const lastByMatch = new Map<string, { body: string; created_at: string }>();
      (lastMsgs ?? []).forEach((m: LastMessageRow) => {
        if (!lastByMatch.has(m.match_id))
          lastByMatch.set(m.match_id, { body: m.body, created_at: m.created_at });
      });
      setThreads(
        matches.map((m) => {
          const oid = m.user_a === user.id ? m.user_b : m.user_a;
          const p = byId.get(oid) ?? { id: oid, display_name: null, photo_url: null, role: null };
          const last = lastByMatch.get(m.id) ?? null;
          return {
            match_id: m.id,
            other_id: oid,
            other_name: p.display_name,
            other_photo: p.photo_url,
            other_role: p.role,
            last: last?.body ?? null,
            last_at: last?.created_at ?? m.created_at,
            unread: false,
          };
        }),
      );
    })();
  }, [user]);

  // Load current thread
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: match } = await supabase
        .from("matches")
        .select("user_a, user_b")
        .eq("id", id)
        .maybeSingle();
      if (!match) return;
      const otherId = match.user_a === user.id ? match.user_b : match.user_a;
      const { data: p } = await supabase
        .from("profiles")
        .select("display_name, photo_url, role, location, industry, looking_for")
        .eq("id", otherId)
        .maybeSingle();
      setOther(p ?? null);

      const { data: history } = await supabase
        .from("messages")
        .select("*")
        .eq("match_id", id)
        .order("created_at", { ascending: true });
      setMsgs(history ?? []);
    })();

    const ch = supabase
      .channel(`messages:${id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `match_id=eq.${id}` },
        (payload) => setMsgs((m) => [...m, payload.new as Msg]),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [id, user]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = text.trim();
    if (!body || !user) return;
    if (body.length > 2000) return toast.error("Nachricht zu lang");
    setText("");
    const { error } = await supabase
      .from("messages")
      .insert({ match_id: id, sender_id: user.id, body });
    if (error) toast.error(error.message);
  };

  const filteredThreads = threads.filter((t) =>
    search
      ? (t.other_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (t.last ?? "").toLowerCase().includes(search.toLowerCase())
      : true,
  );

  return (
    <div className="mx-auto max-w-7xl px-3 py-4 md:px-8 md:py-6">
      <div className="eyebrow mb-3 flex items-center gap-2.5 px-2 md:mb-4">
        <Link to="/matches" className="hover:text-[var(--ink)]">
          Matches
        </Link>
        <span>/</span>
        <span style={{ color: "var(--ink)" }}>{other?.display_name ?? "…"}</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[300px_1fr_280px]">
        {/* Threads */}
        <div className="glass-pane hidden max-h-[calc(100vh-160px)] flex-col overflow-hidden p-0 lg:flex">
          <div className="p-5 pb-3.5">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[17px] font-semibold">Konversationen</span>
              <span className="font-mono text-[11px] text-[var(--smoke)]">
                {threads.length} aktiv
              </span>
            </div>
            <div className="glass-pill flex items-center gap-2 px-3 py-2">
              <Search className="h-3.5 w-3.5 text-[var(--smoke)]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nachrichten suchen"
                className="flex-1 bg-transparent text-[13px] text-[var(--ink)] outline-none placeholder:text-[var(--smoke)]"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredThreads.length === 0 && (
              <div className="px-5 py-6 text-center text-[12px] text-[var(--smoke)]">
                Keine Konversationen.
              </div>
            )}
            {filteredThreads.map((th) => {
              const active = th.match_id === id;
              return (
                <button
                  key={th.match_id}
                  onClick={() => navigate({ to: "/matches/$id", params: { id: th.match_id } })}
                  className="grid w-full grid-cols-[36px_1fr_auto] items-center gap-3 px-5 py-3 text-left transition"
                  style={{
                    background: active ? "rgba(226,81,28,0.10)" : "transparent",
                    borderLeft: active ? `3px solid var(--ember)` : "3px solid transparent",
                    borderBottom: "1px solid rgba(21,20,15,0.05)",
                  }}
                >
                  <Avatar className="h-9 w-9">
                    {th.other_photo && <AvatarImage src={th.other_photo} />}
                    <AvatarFallback className="bg-[var(--ember)]/15 text-[11px] text-[var(--ember-deep)]">
                      {(th.other_name ?? "?").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-[14px] font-medium tracking-[-0.01em]">
                        {th.other_name ?? "Ohne Namen"}
                      </span>
                    </div>
                    <div className="mt-0.5 truncate text-[12px] text-[var(--smoke)]">
                      {th.last ?? "Sag Hallo."}
                    </div>
                  </div>
                  <span className="font-mono text-[10px] text-[var(--smoke)]">
                    {timeAgo(th.last_at)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Conversation */}
        <div className="glass-pane flex h-[calc(100dvh-11rem)] min-h-[520px] flex-col overflow-hidden p-0 lg:max-h-[calc(100vh-160px)]">
          {/* Header */}
          <div
            className="flex items-center gap-3 border-b px-4 py-3 md:gap-3.5 md:px-5 md:py-4"
            style={{ borderColor: "rgba(21,20,15,0.07)" }}
          >
            <Avatar className="h-10 w-10">
              {other?.photo_url && <AvatarImage src={other.photo_url} />}
              <AvatarFallback className="bg-[var(--ember)]/15 text-[var(--ember-deep)]">
                {(other?.display_name ?? "?").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="text-[15px] font-semibold tracking-[-0.015em]">
                {other?.display_name ?? "…"}
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-[12px] text-[var(--smoke)]">
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full"
                  style={{ background: "#3D9970" }}
                />
                Online · {other?.location ?? "—"}
              </div>
            </div>
            <span
              className="hidden rounded-full px-3 py-1 text-[11px] font-medium sm:inline-flex"
              style={{
                background: "rgba(226,81,28,0.12)",
                color: "var(--ember-deep)",
                border: "1px solid rgba(226,81,28,0.25)",
              }}
            >
              Tag 1 von 90
            </span>
            <MoreHorizontal className="h-4.5 w-4.5 text-[var(--smoke)]" />
          </div>

          {/* Messages */}
          <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4 md:px-6 md:py-5">
            <div className="eyebrow flex items-center gap-3" style={{ fontSize: 10 }}>
              <div className="h-px flex-1" style={{ background: "rgba(21,20,15,0.08)" }} />
              Heute
              <div className="h-px flex-1" style={{ background: "rgba(21,20,15,0.08)" }} />
            </div>
            {msgs.length === 0 && (
              <p className="py-10 text-center text-[13px] text-[var(--smoke)]">
                Sag Hallo. Es kostet nichts.
              </p>
            )}
            {msgs.map((m) => {
              const mine = m.sender_id === user?.id;
              return (
                <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className="max-w-[86%] px-4 py-3 text-[13.5px] leading-[1.5] sm:max-w-[72%]"
                    style={{
                      borderRadius: mine ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                      background: mine ? "var(--ink)" : "rgba(251,250,247,0.85)",
                      color: mine ? "var(--cream)" : "var(--ink)",
                      border: mine ? "none" : "1px solid rgba(21,20,15,0.08)",
                      backdropFilter: !mine ? "blur(12px)" : undefined,
                      boxShadow: mine
                        ? "0 6px 16px -8px rgba(21,20,15,0.3)"
                        : "0 4px 12px -6px rgba(21,20,15,0.08)",
                    }}
                  >
                    <div className="[text-wrap:pretty]">{m.body}</div>
                    <div
                      className="mt-1 font-mono text-[10px]"
                      style={{
                        color: mine ? "rgba(255,255,255,0.55)" : "var(--smoke)",
                        textAlign: mine ? "right" : "left",
                      }}
                    >
                      {new Date(m.created_at).toLocaleTimeString("de-DE", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={endRef} />
          </div>

          {/* Composer */}
          <div
            className="border-t px-3 py-3 md:px-5 md:py-3.5"
            style={{ borderColor: "rgba(21,20,15,0.07)" }}
          >
            <form onSubmit={send} className="glass-pane-soft flex items-center gap-2.5 px-3.5 py-3">
              <Paperclip className="hidden h-4 w-4 text-[var(--smoke)] sm:block" />
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Schreib eine Nachricht…"
                maxLength={2000}
                className="flex-1 bg-transparent text-[14px] text-[var(--ink)] outline-none placeholder:text-[var(--smoke)]"
              />
              <Smile className="hidden h-4 w-4 text-[var(--smoke)] sm:block" />
              <button
                type="submit"
                className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px]"
                style={{
                  background: "var(--ember)",
                  color: "var(--cream)",
                  boxShadow: "0 6px 14px -4px rgba(178,59,14,0.45)",
                }}
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        </div>

        {/* Side detail */}
        <div className="glass-pane hidden max-h-[calc(100vh-160px)] flex-col gap-5 overflow-hidden p-5 lg:flex">
          <div className="flex flex-col items-center gap-2 text-center">
            <Avatar className="h-[72px] w-[72px] ring-2 ring-[var(--ember)]/30">
              {other?.photo_url && <AvatarImage src={other.photo_url} />}
              <AvatarFallback className="bg-[var(--ember)] text-[var(--cream)]">
                {(other?.display_name ?? "?").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="text-[17px] font-semibold tracking-[-0.02em]">
              {other?.display_name ?? "…"}
            </div>
            <div className="text-[12px] text-[var(--smoke)]">
              {[other?.role, other?.location].filter(Boolean).join(" · ") || "—"}
            </div>
          </div>

          <div>
            <div className="eyebrow mb-2" style={{ fontSize: 10 }}>
              Vorgeschlagener Schritt
            </div>
            <div
              className="flex items-start gap-2.5 rounded-xl p-3"
              style={{
                background: "rgba(226,81,28,0.10)",
                border: "1px solid rgba(226,81,28,0.22)",
              }}
            >
              <Zap className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: "var(--ember-deep)" }} />
              <div>
                <div className="text-[13px] font-semibold" style={{ color: "var(--ember-deep)" }}>
                  Ersten Call vereinbaren
                </div>
                <div
                  className="mt-0.5 text-[11.5px] leading-[1.4]"
                  style={{ color: "var(--ember-deep)", opacity: 0.75 }}
                >
                  60 Min · Agenda-Template anbei.
                </div>
              </div>
            </div>
          </div>

          {other?.looking_for && (
            <div>
              <div className="eyebrow mb-2.5" style={{ fontSize: 10 }}>
                Sucht
              </div>
              <p className="text-[12.5px] leading-[1.55] text-[var(--ink)]">
                {other.looking_for.slice(0, 220)}
                {other.looking_for.length > 220 && "…"}
              </p>
            </div>
          )}

          <div
            className="mt-auto flex flex-col gap-1.5 border-t pt-3.5"
            style={{ borderColor: "rgba(21,20,15,0.08)" }}
          >
            <span className="eyebrow" style={{ fontSize: 10 }}>
              Entscheidungs-Fenster
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[28px] font-semibold tracking-[-0.03em]">90</span>
              <span className="text-[12px] text-[var(--smoke)]">Tage übrig von 90</span>
            </div>
            <div
              className="h-1.5 overflow-hidden rounded-full"
              style={{ background: "rgba(21,20,15,0.06)" }}
            >
              <div className="h-full" style={{ width: "2%", background: "var(--ember)" }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
