import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AuthGate } from "@/components/AuthGate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/matches/$id")({
  component: () => (
    <AuthGate>
      <Chat />
    </AuthGate>
  ),
});

type Msg = { id: string; sender_id: string; body: string; created_at: string };

function Chat() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const [other, setOther] = useState<{ display_name: string | null; photo_url: string | null } | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: match } = await supabase.from("matches").select("user_a, user_b").eq("id", id).maybeSingle();
      if (!match) return;
      const otherId = match.user_a === user.id ? match.user_b : match.user_a;
      const { data: p } = await supabase.from("profiles").select("display_name, photo_url").eq("id", otherId).maybeSingle();
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
        (payload) => {
          setMsgs((m) => [...m, payload.new as Msg]);
        },
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
    const { error } = await supabase.from("messages").insert({ match_id: id, sender_id: user.id, body });
    if (error) toast.error(error.message);
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-56px)] max-w-2xl flex-col px-4">
      <div className="flex items-center gap-3 border-b border-border py-3">
        <Link to="/matches"><Button size="icon" variant="ghost"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <Avatar className="h-9 w-9">
          {other?.photo_url && <AvatarImage src={other.photo_url} />}
          <AvatarFallback>{(other?.display_name ?? "?").slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="font-medium">{other?.display_name ?? "…"}</div>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto py-4">
        {msgs.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">Sag Hallo. Es kostet nichts.</p>
        )}
        {msgs.map((m) => {
          const mine = m.sender_id === user?.id;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${
                  mine ? "bg-primary text-primary-foreground" : "bg-card border border-border"
                }`}
              >
                {m.body}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <form onSubmit={send} className="flex gap-2 border-t border-border py-3">
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Nachricht…" maxLength={2000} />
        <Button type="submit">Senden</Button>
      </form>
    </div>
  );
}
