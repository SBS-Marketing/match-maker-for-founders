import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AuthGate } from "@/components/AuthGate";
import { Button } from "@/components/ui/button";
import { Heart, X, MapPin } from "lucide-react";
import { toast } from "sonner";

const AVATAR_COLORS = [
  "var(--ember)",
  "var(--ember-deep)",
  "var(--ink-soft)",
  "var(--smoke)",
  "var(--ember-light)",
  "#8B5A3C",
  "#3D5A4A",
  "#5A4A2A",
];

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}
function colorFor(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[h];
}

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
  path: string | null;
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

type FilterValue = string;
const PATH_OPTIONS: { value: FilterValue; label: string }[] = [
  { value: "all", label: "Alle" },
  { value: "founder", label: "Founder" },
  { value: "joiner", label: "Joiner" },
];
const ROLE_OPTIONS: { value: FilterValue; label: string }[] = [
  { value: "all", label: "Alle Rollen" },
  { value: "tech", label: "Tech" },
  { value: "business", label: "Business" },
  { value: "product", label: "Product" },
  { value: "design", label: "Design" },
];
const STAGE_OPTIONS: { value: FilterValue; label: string }[] = [
  { value: "all", label: "Jede Stage" },
  { value: "idea", label: "Idee" },
  { value: "mvp", label: "MVP" },
  { value: "revenue", label: "Umsatz" },
  { value: "scaling", label: "Skalierung" },
];
const COMMIT_OPTIONS: { value: FilterValue; label: string }[] = [
  { value: "all", label: "Beliebig" },
  { value: "full_time", label: "Vollzeit" },
  { value: "part_time", label: "Teilzeit" },
  { value: "exploring", label: "Sondiert" },
];

function Discover() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [queue, setQueue] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [meOnboarded, setMeOnboarded] = useState<boolean | null>(null);
  const [fPath, setFPath] = useState<FilterValue>("all");
  const [fRole, setFRole] = useState<FilterValue>("all");
  const [fStage, setFStage] = useState<FilterValue>("all");
  const [fCommit, setFCommit] = useState<FilterValue>("all");

  const filtered = queue.filter((p) =>
    (fPath === "all" || p.path === fPath) &&
    (fRole === "all" || p.role === fRole) &&
    (fStage === "all" || p.stage === fStage) &&
    (fCommit === "all" || p.commitment === fCommit)
  );
  const activeCount = [fPath, fRole, fStage, fCommit].filter((v) => v !== "all").length;
  const resetFilters = () => { setFPath("all"); setFRole("all"); setFStage("all"); setFCommit("all"); };

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
    return <div className="mx-auto max-w-xl px-4 py-20 text-center text-sm text-[var(--smoke)]">Lade Profile…</div>;
  }

  if (meOnboarded === false) {
    return (
      <div className="mx-auto max-w-md px-4 py-20">
        <div className="glass-pane p-10 text-center">
          <div className="eyebrow">Profil unvollständig</div>
          <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight">
            Erst dein <span className="font-serif italic font-normal text-[var(--ember)]">Profil</span>
          </h2>
          <p className="mt-4 text-[14px] text-[var(--smoke)]">
            Vervollständige dein Founder-Profil, bevor du andere Founder triffst.
          </p>
          <Button
            className="shadow-ember mt-7 h-11 rounded-xl bg-[var(--ember)] px-5 text-[var(--cream)] hover:bg-[var(--ember-deep)]"
            onClick={() => navigate({ to: "/onboarding" })}
          >
            Zum Profil
          </Button>
        </div>
      </div>
    );
  }

  if (queue.length === 0) {
    return (
      <div className="mx-auto max-w-md px-4 py-20">
        <div className="glass-pane p-10 text-center">
          <div className="eyebrow">Alles gesehen</div>
          <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight">
            Keine neuen <span className="font-serif italic font-normal">Profile</span>
          </h2>
          <p className="mt-4 text-[14px] text-[var(--smoke)]">
            Du hast alle aktuellen Founder gesehen. Schau später wieder vorbei.
          </p>
          <Link to="/matches">
            <Button variant="ghost" className="mt-7 rounded-xl">Zu deinen Matches</Button>
          </Link>
        </div>
      </div>
    );
  }

  const p = queue[0];
  const name = p.display_name ?? "?";
  return (
    <div className="mx-auto max-w-2xl px-4 pt-10 pb-24 sm:px-6">
      <div className="eyebrow">Entdecken · {queue.length} im Stack</div>
      <h1 className="mt-4 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
        Heute für <span className="font-serif italic font-normal">dich</span>.
      </h1>

      <article className="glass-pane mt-10 p-8">
        <div className="flex items-center gap-4">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-full font-mono text-[15px] font-semibold overflow-hidden"
            style={{
              background: colorFor(name),
              color: "var(--cream)",
              boxShadow: "inset 0 0 0 1.5px rgba(255,255,255,0.2)",
            }}
          >
            {p.photo_url ? (
              <img src={p.photo_url} alt={name} className="h-full w-full object-cover" />
            ) : (
              initials(name)
            )}
          </div>
          <div>
            <h2 className="text-[18px] font-semibold leading-tight text-[var(--ink)]">{name}</h2>
            {p.location && (
              <p className="mt-1 flex items-center gap-1 text-[12px] text-[var(--smoke)]">
                <MapPin className="h-3.5 w-3.5" /> {p.location}
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-1.5">
          {p.role && <Chip>{roleLabel[p.role]}</Chip>}
          {p.stage && <Chip>{stageLabel[p.stage]}</Chip>}
          {p.commitment && <Chip>{commitLabel[p.commitment]}</Chip>}
          {p.industry && <Chip>{p.industry}</Chip>}
        </div>

        {p.skills && p.skills.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {p.skills.map((s) => (
              <Chip key={s} muted>{s}</Chip>
            ))}
          </div>
        )}

        {p.vision && (
          <div className="mt-7">
            <div className="eyebrow">Vision</div>
            <p className="mt-2 text-[14px] leading-relaxed text-[var(--ink-soft)]">„{p.vision}"</p>
          </div>
        )}
        {p.looking_for && (
          <div className="mt-5">
            <div className="eyebrow">Sucht</div>
            <p className="mt-2 text-[14px] leading-relaxed text-[var(--ink-soft)]">{p.looking_for}</p>
          </div>
        )}
      </article>

      <div className="mt-6 flex items-center justify-center gap-3">
        <Button
          size="lg"
          variant="ghost"
          className="glass-pill h-12 gap-2 px-5 text-[var(--ink)]"
          onClick={() => swipe("pass")}
        >
          <X className="h-4 w-4" /> Weiter
        </Button>
        <Button
          size="lg"
          className="shadow-ember h-12 gap-2 rounded-full bg-[var(--ember)] px-6 text-[var(--cream)] hover:bg-[var(--ember-deep)]"
          onClick={() => swipe("like")}
        >
          <Heart className="h-4 w-4" /> Interessiert
        </Button>
      </div>
    </div>
  );
}

function Chip({ children, muted = false }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <span
      className="rounded-full px-2.5 py-1 text-[11px]"
      style={{
        background: muted ? "rgba(255,255,255,0.5)" : "var(--ember-tint)",
        border: muted ? "1px solid var(--ruled)" : "1px solid rgba(226,81,28,0.25)",
        color: muted ? "var(--smoke)" : "var(--ember-deep)",
      }}
    >
      {children}
    </span>
  );
}
