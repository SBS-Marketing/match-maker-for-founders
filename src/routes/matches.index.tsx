import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AuthGate } from "@/components/AuthGate";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const Route = createFileRoute("/matches/")({
  component: () => (
    <AuthGate>
      <Matches />
    </AuthGate>
  ),
});

type Row = { id: string; other: { id: string; display_name: string | null; photo_url: string | null; role: string | null } };

function Matches() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: matches } = await supabase
        .from("matches")
        .select("id, user_a, user_b, created_at")
        .order("created_at", { ascending: false });
      if (!matches) return setRows([]);
      const otherIds = matches.map((m) => (m.user_a === user.id ? m.user_b : m.user_a));
      if (otherIds.length === 0) return setRows([]);
      const { data: profs } = await supabase.from("profiles").select("id, display_name, photo_url, role").in("id", otherIds);
      const byId = new Map((profs ?? []).map((p) => [p.id, p]));
      setRows(
        matches.map((m) => {
          const otherId = m.user_a === user.id ? m.user_b : m.user_a;
          const p = byId.get(otherId) ?? { id: otherId, display_name: "Unknown", photo_url: null, role: null };
          return { id: m.id, other: p };
        }),
      );
    })();
  }, [user]);

  if (rows === null) return <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">Lade…</div>;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Deine Matches</h1>
      {rows.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">
          Noch keine Matches. Entdecke weitere Founder, um deinen ersten Match zu bekommen.
        </p>
      ) : (
        <div className="mt-6 space-y-2">
          {rows.map((r) => (
            <Link key={r.id} to="/matches/$id" params={{ id: r.id }}>
              <Card className="flex items-center gap-4 p-4 transition-colors hover:bg-accent">
                <Avatar className="h-12 w-12">
                  {r.other.photo_url && <AvatarImage src={r.other.photo_url} />}
                  <AvatarFallback>{(r.other.display_name ?? "?").slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">{r.other.display_name}</div>
                  <div className="text-xs text-muted-foreground">{r.other.role ?? ""}</div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
