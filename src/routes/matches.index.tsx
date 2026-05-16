import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AuthGate } from "@/components/AuthGate";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/matches/")({
  component: () => (
    <AuthGate>
      <Matches />
    </AuthGate>
  ),
});

type Row = {
  id: string;
  other: {
    id: string;
    display_name: string | null;
    photo_url: string | null;
    role: string | null;
  };
};

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
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, display_name, photo_url, role")
        .in("id", otherIds);
      const byId = new Map((profs ?? []).map((p) => [p.id, p]));
      setRows(
        matches.map((m) => {
          const otherId = m.user_a === user.id ? m.user_b : m.user_a;
          const p =
            byId.get(otherId) ??
            ({ id: otherId, display_name: "Ohne Namen", photo_url: null, role: null } as any);
          return { id: m.id, other: p };
        }),
      );
    })();
  }, [user]);

  if (rows === null)
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-[var(--smoke)]">
        Lade…
      </div>
    );

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 md:px-8">
      <div className="eyebrow mb-3">Inbox</div>
      <h1 className="text-4xl font-semibold tracking-tight">
        Deine <span className="font-serif italic font-normal">Matches</span>
      </h1>
      <p className="mt-2 text-[15px] text-[var(--smoke)]">
        Gegenseitig interessiert. Jetzt schreibt ihr — kein Smalltalk-Theater.
      </p>

      {rows.length === 0 ? (
        <div className="glass-pane mt-8 p-8 text-center">
          <p className="text-[14px] text-[var(--smoke)]">
            Noch keine Matches. Geh entdecken — Match kommt von beiden Seiten.
          </p>
          <Link to="/discover">
            <Button className="shadow-ember mt-5 h-11 gap-2 rounded-xl bg-[var(--ember)] px-6 text-[var(--cream)] hover:bg-[var(--ember-deep)]">
              Founder entdecken
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-3">
          {rows.map((r) => (
            <Link key={r.id} to="/matches/$id" params={{ id: r.id }}>
              <div className="glass-pane flex items-center gap-4 p-5 transition hover:scale-[1.005]">
                <Avatar className="h-12 w-12">
                  {r.other.photo_url && <AvatarImage src={r.other.photo_url} />}
                  <AvatarFallback className="bg-[var(--ember)]/15 text-[var(--ember-deep)]">
                    {(r.other.display_name ?? "?").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="text-[15px] font-semibold tracking-[-0.01em]">
                    {r.other.display_name ?? "Ohne Namen"}
                  </div>
                  <div className="mt-0.5 text-[12px] text-[var(--smoke)]">
                    {r.other.role ?? "Co-Founder"}
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-[var(--smoke)]" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
