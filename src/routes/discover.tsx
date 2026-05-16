import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AuthGate } from "@/components/AuthGate";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, X, MapPin } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/discover")({
  component: () => (
    <AuthGate>
      <Discover />
    </AuthGate>
  ),
});

type Profile = {
  id: string;
  display_name: string | null;
  photo_url: string | null;
  location: string | null;
  role: string | null;
  industry: string | null;
  stage: string | null;
  commitment: string | null;
  skills: string[] | null;
  vision: string | null;
  looking_for: string | null;
  onboarded_at: string | null;
};

const roleLabel: Record<string, string> = { tech: "Tech", business: "Business", product: "Product", design: "Design", other: "Andere" };
const stageLabel: Record<string, string> = { idea: "Idee", mvp: "MVP", revenue: "Umsatz", scaling: "Skalierung" };
const commitLabel: Record<string, string> = { full_time: "Vollzeit", part_time: "Teilzeit", exploring: "Sondiert" };

function Discover() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [queue, setQueue] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [meOnboarded, setMeOnboarded] = useState<boolean | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Check own onboarding
    const { data: me } = await supabase.from("profiles").select("onboarded_at").eq("id", user.id).maybeSingle();
    if (!me?.onboarded_at) {
      setMeOnboarded(false);
      setLoading(false);
      return;
    }
    setMeOnboarded(true);

    const { data: swiped } = await supabase.from("swipes").select("target_id").eq("swiper_id", user.id);
    const excluded = new Set<string>([user.id, ...(swiped ?? []).map((s) => s.target_id)]);

    const { data: profs, error } = await supabase
      .from("profiles")
      .select("*")
      .not("onboarded_at", "is", null)
      .limit(50);
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    setQueue((profs ?? []).filter((p) => !excluded.has(p.id)));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const swipe = async (direction: "like" | "pass") => {
    if (!user || queue.length === 0) return;
    const target = queue[0];
    setQueue((q) => q.slice(1));
    const { error } = await supabase.from("swipes").insert({ swiper_id: user.id, target_id: target.id, direction });
    if (error) return toast.error(error.message);
    if (direction === "like") {
      // check if match created
      const ua = user.id < target.id ? user.id : target.id;
      const ub = user.id < target.id ? target.id : user.id;
      const { data: m } = await supabase.from("matches").select("id").eq("user_a", ua).eq("user_b", ub).maybeSingle();
      if (m) toast.success("Es ist ein Match! 🎉");
    }
  };

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">Lade Profile…</div>;
  }

  if (meOnboarded === false) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h2 className="text-2xl font-semibold tracking-tight">Erst dein Profil</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Vervollständige dein Founder-Profil, bevor du andere Founder triffst.
        </p>
        <Button className="mt-6" onClick={() => navigate({ to: "/onboarding" })}>Zum Profil</Button>
      </div>
    );
  }

  if (queue.length === 0) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h2 className="text-2xl font-semibold tracking-tight">Keine neuen Profile</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Du hast alle aktuellen Founder gesehen. Schau später wieder vorbei.
        </p>
        <Link to="/matches"><Button variant="outline" className="mt-6">Zu deinen Matches</Button></Link>
      </div>
    );
  }

  const p = queue[0];
  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <Card className="overflow-hidden p-6">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            {p.photo_url && <AvatarImage src={p.photo_url} />}
            <AvatarFallback>{(p.display_name ?? "?").slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-xl font-semibold tracking-tight">{p.display_name}</h2>
            {p.location && (
              <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" /> {p.location}
              </p>
            )}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {p.role && <Badge variant="secondary">{roleLabel[p.role]}</Badge>}
          {p.stage && <Badge variant="secondary">{stageLabel[p.stage]}</Badge>}
          {p.commitment && <Badge variant="secondary">{commitLabel[p.commitment]}</Badge>}
          {p.industry && <Badge variant="outline">{p.industry}</Badge>}
        </div>

        {p.skills && p.skills.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {p.skills.map((s) => (
              <span key={s} className="rounded-md border border-border px-2 py-0.5 text-xs text-muted-foreground">{s}</span>
            ))}
          </div>
        )}

        {p.vision && (
          <div className="mt-6">
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground">Vision</h3>
            <p className="mt-2 text-sm">{p.vision}</p>
          </div>
        )}
        {p.looking_for && (
          <div className="mt-5">
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground">Sucht</h3>
            <p className="mt-2 text-sm">{p.looking_for}</p>
          </div>
        )}
      </Card>

      <div className="mt-6 flex items-center justify-center gap-4">
        <Button variant="outline" size="lg" className="gap-2" onClick={() => swipe("pass")}>
          <X className="h-4 w-4" /> Weiter
        </Button>
        <Button size="lg" className="gap-2" onClick={() => swipe("like")}>
          <Heart className="h-4 w-4" /> Interessiert
        </Button>
      </div>
    </div>
  );
}
