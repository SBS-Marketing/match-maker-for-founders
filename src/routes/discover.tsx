import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AuthGate } from "@/components/AuthGate";
import { Button } from "@/components/ui/button";
import {
  Heart,
  X,
  MapPin,
  SlidersHorizontal,
  ChevronDown,
  MessageCircle,
  Layers,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { SparkView } from "@/components/matchfoundr/SparkView";
import { useSparkProfiles } from "@/hooks/useSparkProfiles";

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
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
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

type ViewMode = "spark" | "grid";

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

const roleLabel: Record<string, string> = {
  tech: "Tech",
  business: "Business",
  product: "Product",
  design: "Design",
  other: "Andere",
};
const stageLabel: Record<string, string> = {
  idea: "Idee",
  mvp: "MVP",
  revenue: "Umsatz",
  scaling: "Skalierung",
};
const commitLabel: Record<string, string> = {
  full_time: "Vollzeit",
  part_time: "Teilzeit",
  exploring: "Sondiert",
};

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

const DEMO_PROFILES: Profile[] = [
  {
    id: "demo-anna",
    display_name: "Anna Wojcik",
    photo_url: null,
    location: "Berlin",
    path: "joiner",
    role: "tech",
    industry: "tech",
    stage: "mvp",
    commitment: "part_time",
    skills: ["Backend", "AI", "APIs", "Infra"],
    vision: "Ich baue gern robuste MVPs und suche ein Founder-Team mit klarem B2B-Problem.",
    looking_for: "Produktstarke Founder mit erstem Kundenkontakt.",
    onboarded_at: new Date(0).toISOString(),
  },
  {
    id: "demo-lena",
    display_name: "Dr. Lena Heller",
    photo_url: null,
    location: "München",
    path: "founder",
    role: "business",
    industry: "legal",
    stage: "revenue",
    commitment: "full_time",
    skills: ["Legal", "GmbH", "ESOP", "Verträge"],
    vision:
      "Startup-Juristin mit Fokus auf Gründerverträge, Beteiligung und frühe Finanzierungsrunden.",
    looking_for: "Founder, die ihre Struktur sauber aufsetzen wollen.",
    onboarded_at: new Date(0).toISOString(),
  },
  {
    id: "demo-felix",
    display_name: "Felix Krämer",
    photo_url: null,
    location: "Hamburg",
    path: "joiner",
    role: "product",
    industry: "tech",
    stage: "idea",
    commitment: "exploring",
    skills: ["Product", "Discovery", "GTM", "B2B SaaS"],
    vision: "Operator mit zwei Exits, stark in Positionierung und ersten 20 Kunden.",
    looking_for: "Teams vor oder kurz nach MVP.",
    onboarded_at: new Date(0).toISOString(),
  },
];

function Discover() {
  const { user, isDemo } = useAuth();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>("spark");
  const [queue, setQueue] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [meOnboarded, setMeOnboarded] = useState<boolean | null>(null);
  const [fPath, setFPath] = useState<FilterValue>("all");
  const [fRole, setFRole] = useState<FilterValue>("all");
  const [fStage, setFStage] = useState<FilterValue>("all");
  const [fCommit, setFCommit] = useState<FilterValue>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Spark view hook
  const {
    profiles: sparkProfiles,
    loading: sparkLoading,
    handleSwipe: handleSparkSwipe,
    removeProfile: removeSparkProfile,
  } = useSparkProfiles();

  const filtered = queue.filter(
    (p) =>
      (fPath === "all" || p.path === fPath) &&
      (fRole === "all" || p.role === fRole) &&
      (fStage === "all" || p.stage === fStage) &&
      (fCommit === "all" || p.commitment === fCommit),
  );
  const activeCount = [fPath, fRole, fStage, fCommit].filter((v) => v !== "all").length;
  const resetFilters = () => {
    setFPath("all");
    setFRole("all");
    setFStage("all");
    setFCommit("all");
  };

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    if (isDemo) {
      setQueue(DEMO_PROFILES);
      setMeOnboarded(true);
      setLoading(false);
      return;
    }

    // Check own onboarding
    const { data: me } = await supabase
      .from("profiles")
      .select("onboarded_at")
      .eq("id", user.id)
      .maybeSingle();
    if (!me?.onboarded_at) {
      setMeOnboarded(false);
      setLoading(false);
      return;
    }
    setMeOnboarded(true);

    const { data: swiped } = await supabase
      .from("swipes")
      .select("target_id")
      .eq("swiper_id", user.id);
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
  }, [user, isDemo]);

  useEffect(() => {
    load();
  }, [load]);

  const swipe = async (targetId: string, direction: "like" | "pass") => {
    if (!user) return;
    if (isDemo) {
      setQueue((q) => q.filter((x) => x.id !== targetId));
      removeSparkProfile(targetId);
      if (direction === "like") toast.success("Demo-Like gespeichert");
      return;
    }
    const { error } = await supabase
      .from("swipes")
      .insert({ swiper_id: user.id, target_id: targetId, direction });
    if (error) return toast.error(error.message);
    setQueue((q) => q.filter((x) => x.id !== targetId));
    removeSparkProfile(targetId);
    if (direction === "like") {
      const ua = user.id < targetId ? user.id : targetId;
      const ub = user.id < targetId ? targetId : user.id;
      const { data: m } = await supabase
        .from("matches")
        .select("id")
        .eq("user_a", ua)
        .eq("user_b", ub)
        .maybeSingle();
      if (m) toast.success("Es ist ein Match! 🎉");
      else toast.success("Like gesendet");
    }
  };

  const message = async (targetId: string) => {
    if (!user) return;
    if (isDemo) {
      setQueue((q) => q.filter((x) => x.id !== targetId));
      toast.info("Demo: Chat wird nach echtem Match freigeschaltet.");
      return;
    }
    // Sending a like; if reciprocal -> match created, navigate to chat
    const { error } = await supabase
      .from("swipes")
      .insert({ swiper_id: user.id, target_id: targetId, direction: "like" });
    if (error && !error.message.includes("duplicate")) return toast.error(error.message);
    setQueue((q) => q.filter((x) => x.id !== targetId));
    removeSparkProfile(targetId);
    const ua = user.id < targetId ? user.id : targetId;
    const ub = user.id < targetId ? targetId : user.id;
    const { data: m } = await supabase
      .from("matches")
      .select("id")
      .eq("user_a", ua)
      .eq("user_b", ub)
      .maybeSingle();
    if (m) {
      navigate({ to: "/matches/$id", params: { id: m.id } });
    } else {
      toast.info("Like gesendet. Du kannst schreiben, sobald es ein Match ist.");
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center text-sm text-[var(--smoke)]">
        Lade Profile…
      </div>
    );
  }

  if (meOnboarded === false) {
    return (
      <div className="mx-auto max-w-md px-4 py-20">
        <div className="glass-pane p-10 text-center">
          <div className="eyebrow">Profil unvollständig</div>
          <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight">
            Erst dein{" "}
            <span className="font-serif italic font-normal text-[var(--ember)]">Profil</span>
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

  const handleSyncedSparkSwipe = async (profileId: string, direction: "like" | "pass" | "save") => {
    const ok = await handleSparkSwipe(profileId, direction);
    if (ok) setQueue((q) => q.filter((x) => x.id !== profileId));
    return ok;
  };

  if (queue.length === 0 && !sparkLoading && sparkProfiles.length === 0) {
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
            <Button variant="ghost" className="mt-7 rounded-xl">
              Zu deinen Matches
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const filterBar = (
    <div className="glass-pane mt-8 p-4 sm:p-5">
      <button
        onClick={() => setFiltersOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 text-left"
        aria-expanded={filtersOpen}
      >
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-[var(--ember-deep)]" />
          <span className="eyebrow">Filter{activeCount > 0 ? ` · ${activeCount} aktiv` : ""}</span>
        </div>
        <div className="flex items-center gap-3">
          {activeCount > 0 && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                resetFilters();
              }}
              className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--ember-deep)] hover:underline"
              role="button"
            >
              Reset
            </span>
          )}
          <ChevronDown
            className={`h-4 w-4 text-[var(--smoke)] transition-transform ${filtersOpen ? "rotate-180" : ""}`}
          />
        </div>
      </button>
      {filtersOpen && (
        <div className="mt-4 space-y-3">
          <FilterRow label="Pfad" options={PATH_OPTIONS} value={fPath} onChange={setFPath} />
          <FilterRow label="Rolle" options={ROLE_OPTIONS} value={fRole} onChange={setFRole} />
          <FilterRow label="Stage" options={STAGE_OPTIONS} value={fStage} onChange={setFStage} />
          <FilterRow
            label="Commit"
            options={COMMIT_OPTIONS}
            value={fCommit}
            onChange={setFCommit}
          />
        </div>
      )}
    </div>
  );

  if (viewMode === "grid" && filtered.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 pt-10 pb-24 sm:px-6">
        <div className="eyebrow">Entdecken</div>
        <h1 className="mt-4 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
          Keine <span className="font-serif italic font-normal">Treffer</span>.
        </h1>
        {filterBar}
        <div className="glass-pane mt-6 p-10 text-center">
          <p className="text-[14px] text-[var(--smoke)]">
            Keine Profile passen zu deinen aktuellen Filtern. Lockere sie oder setze sie zurück.
          </p>
          <Button variant="ghost" className="mt-5 rounded-xl" onClick={resetFilters}>
            Filter zurücksetzen
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pt-10 pb-24 sm:px-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="eyebrow">
            Entdecken · {viewMode === "spark" ? sparkProfiles.length : filtered.length} Founder
          </div>
          <h1 className="mt-4 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
            Menschen für <span className="font-serif italic font-normal">dich</span>.
          </h1>
        </div>
        {/* View Toggle */}
        <div
          className="flex items-center gap-1 rounded-xl p-1"
          style={{
            background: "rgba(251,250,247,0.6)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(21,20,15,0.08)",
          }}
        >
          <button
            onClick={() => setViewMode("spark")}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-medium transition"
            style={{
              background: viewMode === "spark" ? "var(--ember)" : "transparent",
              color: viewMode === "spark" ? "var(--cream)" : "var(--smoke)",
            }}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Spark
          </button>
          <button
            onClick={() => setViewMode("grid")}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-medium transition"
            style={{
              background: viewMode === "grid" ? "var(--ember)" : "transparent",
              color: viewMode === "grid" ? "var(--cream)" : "var(--smoke)",
            }}
          >
            <Layers className="h-3.5 w-3.5" />
            Grid
          </button>
        </div>
      </div>

      {viewMode === "spark" ? (
        <SparkView
          profiles={sparkProfiles}
          onSwipe={handleSyncedSparkSwipe}
          loading={sparkLoading}
        />
      ) : (
        <>
          {filterBar}

          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => {
              const name = p.display_name ?? "?";
              return (
                <article key={p.id} className="glass-pane flex flex-col p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-11 w-11 items-center justify-center rounded-full overflow-hidden font-mono text-[13px] font-semibold"
                        style={{
                          background: colorFor(name),
                          color: "var(--cream)",
                          boxShadow: "inset 0 0 0 1.5px rgba(255,255,255,0.2)",
                        }}
                      >
                        {p.photo_url ? (
                          <img
                            src={p.photo_url}
                            alt={name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          initials(name)
                        )}
                      </div>
                      <div>
                        <div className="text-[15px] font-semibold leading-tight text-[var(--ink)]">
                          {name}
                        </div>
                        {p.location && (
                          <div className="mt-0.5 flex items-center gap-1 text-[12px] text-[var(--smoke)]">
                            <MapPin className="h-3 w-3" /> {p.location}
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => swipe(p.id, "pass")}
                      aria-label="Überspringen"
                      className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--smoke)] transition hover:bg-[rgba(21,20,15,0.06)] hover:text-[var(--ink)]"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {p.role && <Chip>{roleLabel[p.role]}</Chip>}
                    {p.stage && <Chip>{stageLabel[p.stage]}</Chip>}
                    {p.commitment && <Chip>{commitLabel[p.commitment]}</Chip>}
                  </div>

                  {p.vision && (
                    <p className="mt-4 text-[13px] leading-relaxed text-[var(--ink-soft)] line-clamp-4">
                      „{p.vision}"
                    </p>
                  )}
                  {!p.vision && p.looking_for && (
                    <p className="mt-4 text-[13px] leading-relaxed text-[var(--ink-soft)] line-clamp-4">
                      {p.looking_for}
                    </p>
                  )}

                  {p.skills && p.skills.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {p.skills.slice(0, 4).map((s) => (
                        <Chip key={s} muted>
                          {s}
                        </Chip>
                      ))}
                    </div>
                  )}

                  <div className="mt-auto flex items-center gap-2 border-t border-[rgba(21,20,15,0.08)] pt-4">
                    <Button
                      size="sm"
                      onClick={() => swipe(p.id, "like")}
                      className="shadow-ember h-9 flex-1 gap-1.5 rounded-full bg-[var(--ember)] text-[13px] text-[var(--cream)] hover:bg-[var(--ember-deep)]"
                    >
                      <Heart className="h-3.5 w-3.5" /> Interessiert
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => message(p.id)}
                      className="glass-pill h-9 gap-1.5 px-3 text-[13px] text-[var(--ink)]"
                    >
                      <MessageCircle className="h-3.5 w-3.5" /> Schreiben
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}
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

function FilterRow({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--smoke)] sm:w-16 sm:shrink-0">
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={o.value}
              onClick={() => onChange(o.value)}
              className="rounded-full px-3 py-1 text-[12px] transition"
              style={
                active
                  ? {
                      background: "var(--ember)",
                      color: "var(--cream)",
                      border: "1px solid rgba(226,81,28,0.4)",
                      boxShadow: "0 6px 16px -8px rgba(178,59,14,0.45)",
                    }
                  : {
                      background: "rgba(255,255,255,0.55)",
                      color: "var(--ink-soft)",
                      border: "1px solid var(--ruled)",
                    }
              }
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
