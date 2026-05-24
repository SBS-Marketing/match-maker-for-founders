// ═══════════════════════════════════════════════════════════════════════════
// matchfoundr · Issue #3 — Spark / Swipe-View (Card Stack mit Drag)
// Tinder-like Card Stack mit Framer Motion Pan-Gesture
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useEffect } from "react";
import { motion, useMotionValue, useTransform, PanInfo, AnimatePresence } from "framer-motion";
import { Heart, X, Star, MapPin, Briefcase, Zap, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface SwipeProfile {
  id: string;
  display_name: string | null;
  photo_url: string | null;
  bio: string | null;
  skills: string[] | null;
  industry: string | null;
  role: string | null;
  stage: string | null;
  location: string | null;
  city: string | null;
  lat: number | null;
  lng: number | null;
  looking_for: string | null;
  vision: string | null;
  commitment: string | null;
  years_experience: number | null;
  match_score?: number;
  match_explanation?: Record<string, unknown>;
}

interface SparkViewProps {
  profiles: SwipeProfile[];
  onSwipe: (profileId: string, direction: "like" | "pass" | "save") => void;
  onMatch?: (profile: SwipeProfile) => void;
  loading?: boolean;
}

// ─── Constants ─────────────────────────────────────────────────────────────

const SWIPE_THRESHOLD = 120;
const ROTATION_FACTOR = 12;

const CARD_COLORS = [
  "#E2511C", "#3D5A4A", "#8B5A3C", "#2A251F", "#6B635A",
  "#F0843A", "#5A4A2A", "#B23B0E", "#4A5A3D", "#5A3D5A",
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function initials(name: string | null): string {
  if (!name) return "?";
  return name.split(/\s+/).map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

function avatarColor(name: string | null): string {
  if (!name) return "#6B635A";
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return CARD_COLORS[h % CARD_COLORS.length];
}

function roleLabel(role: string | null): string {
  const map: Record<string, string> = {
    tech: "Technical Co-Founder",
    business: "Business Co-Founder",
    product: "Product Co-Founder",
    design: "Design Co-Founder",
    other: "Co-Founder",
  };
  return map[role ?? ""] ?? "Co-Founder";
}

function stageLabel(stage: string | null): string {
  const map: Record<string, string> = {
    idea: "Idee",
    prototype: "Prototyp",
    mvp: "MVP",
    revenue: "Umsatz",
    scaling: "Skalierung",
  };
  return map[stage ?? ""] ?? "—";
}

function commitLabel(commit: string | null): string {
  const map: Record<string, string> = {
    full_time: "Vollzeit",
    part_time: "Teilzeit",
    freelance: "Freelance",
    open: "Offen",
  };
  return map[commit ?? ""] ?? "—";
}

// ─── Fit Ring Component ────────────────────────────────────────────────────

function FitRing({ score, size = 72 }: { score?: number; size?: number }) {
  const pct = Math.min(100, Math.max(0, score ?? 0));
  const circumference = 2 * Math.PI * ((size - 8) / 2);
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2} cy={size / 2} r={(size - 8) / 2}
          fill="none" stroke="rgba(21,20,15,0.08)" strokeWidth={3}
        />
        <circle
          cx={size / 2} cy={size / 2} r={(size - 8) / 2}
          fill="none" stroke="var(--ember)" strokeWidth={3}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <span className="absolute text-[13px] font-bold" style={{ color: "var(--ember)" }}>
        {Math.round(pct)}
      </span>
    </div>
  );
}

// ─── KI Reasoning Sidebar ──────────────────────────────────────────────────

function ReasoningSidebar({ profile }: { profile: SwipeProfile }) {
  const exp = profile.match_explanation;
  if (!exp) return null;

  const reasons = [
    exp.skill_overlap && { icon: Zap, label: "Skill-Overlap", value: `${exp.skill_overlap}%` },
    exp.location && { icon: MapPin, label: "Standort", value: `${exp.location}%` },
    exp.embedding_similarity && { icon: Star, label: "KI-Similarity", value: `${exp.embedding_similarity}%` },
    exp.distance_km && { icon: MapPin, label: "Distanz", value: `${exp.distance_km} km` },
  ].filter(Boolean) as { icon: typeof Zap; label: string; value: string }[];

  const commonSkills = (exp.common_skills as string[]) ?? [];

  return (
    <div className="flex flex-col gap-4 rounded-2xl p-5" style={{
      background: "rgba(251,250,247,0.55)",
      backdropFilter: "blur(20px)",
      border: "1px solid rgba(255,255,255,0.6)",
    }}>
      <div className="flex items-center gap-2">
        <SparkleIcon className="h-4 w-4" style={{ color: "var(--ember)" }} />
        <span className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: "var(--smoke)" }}>
          KI-Matching
        </span>
      </div>

      <div className="flex items-center gap-4">
        <FitRing score={profile.match_score} size={64} />
        <div>
          <div className="text-[15px] font-semibold" style={{ color: "var(--ink)" }}>
            {profile.match_score ?? 0}% Match
          </div>
          <div className="text-[12px]" style={{ color: "var(--smoke)" }}>
            Basierend auf Skills, Standort & Semantik
          </div>
        </div>
      </div>

      {reasons.length > 0 && (
        <div className="flex flex-col gap-2">
          {reasons.map((r) => (
            <div key={r.label} className="flex items-center justify-between text-[13px]">
              <span className="flex items-center gap-2" style={{ color: "var(--smoke)" }}>
                <r.icon className="h-3.5 w-3.5" />
                {r.label}
              </span>
              <span className="font-semibold" style={{ color: "var(--ink)" }}>{r.value}</span>
            </div>
          ))}
        </div>
      )}

      {commonSkills.length > 0 && (
        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--smoke)" }}>
            Gemeinsame Skills
          </div>
          <div className="flex flex-wrap gap-1.5">
            {commonSkills.map((s) => (
              <span key={s} className="rounded-full px-2.5 py-1 text-[11px] font-medium" style={{
                background: "rgba(226,81,28,0.12)",
                color: "var(--ember-deep)",
                border: "1px solid rgba(226,81,28,0.2)",
              }}>
                {s}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SparkleIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6 7.7 7.7M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

// ─── Single Card ───────────────────────────────────────────────────────────

function SwipeCard({
  profile,
  onSwipe,
  isTop,
}: {
  profile: SwipeProfile;
  onSwipe: (direction: "like" | "pass" | "save") => void;
  isTop: boolean;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-300, 300], [-ROTATION_FACTOR, ROTATION_FACTOR]);
  const opacityLike = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1]);
  const opacityPass = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0]);
  const scale = useTransform(x, [-300, 0, 300], [0.95, 1, 0.95]);

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x > SWIPE_THRESHOLD) {
      onSwipe("like");
    } else if (info.offset.x < -SWIPE_THRESHOLD) {
      onSwipe("pass");
    }
  };

  const name = profile.display_name ?? "Unbekannt";
  const bg = avatarColor(name);

  return (
    <motion.div
      className="absolute inset-0 cursor-grab active:cursor-grabbing"
      style={{ x, y, rotate, scale, zIndex: isTop ? 10 : 1 }}
      drag={isTop ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.9}
      onDragEnd={handleDragEnd}
      initial={{ scale: 0.9, opacity: 0, y: 50 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ x: 0, opacity: 0, transition: { duration: 0.2 } }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
    >
      <div className="relative h-full w-full overflow-hidden rounded-3xl" style={{
        background: "var(--cream)",
        boxShadow: "0 25px 60px -20px rgba(21,20,15,0.25), 0 8px 20px -8px rgba(21,20,15,0.1)",
        border: "1px solid rgba(21,20,15,0.06)",
      }}>
        {/* Photo / Avatar Area */}
        <div className="relative h-[55%] w-full overflow-hidden" style={{ background: bg }}>
          {profile.photo_url ? (
            <img src={profile.photo_url} alt={name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <span className="text-6xl font-bold" style={{ color: "rgba(255,255,255,0.3)" }}>
                {initials(name)}
              </span>
            </div>
          )}
          {/* Gradient overlay */}
          <div className="absolute inset-x-0 bottom-0 h-32" style={{
            background: "linear-gradient(to top, rgba(21,20,15,0.7), transparent)",
          }} />
          {/* Name overlay */}
          <div className="absolute bottom-4 left-5 right-5">
            <div className="flex items-end justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">{name}</h2>
                <div className="mt-1 flex items-center gap-2 text-[13px] text-white/80">
                  {profile.city && <><MapPin className="h-3 w-3" /> {profile.city}</>}
                  {profile.role && <><Briefcase className="h-3 w-3" /> {roleLabel(profile.role)}</>}
                </div>
              </div>
              {profile.match_score !== undefined && (
                <div className="flex flex-col items-center">
                  <FitRing score={profile.match_score} size={56} />
                </div>
              )}
            </div>
          </div>
          {/* Swipe indicators */}
          {isTop && (
            <>
              <motion.div className="absolute left-5 top-5 rounded-xl border-4 border-green-500 px-4 py-2" style={{ opacity: opacityLike, rotate: -15 }}>
                <span className="text-2xl font-bold uppercase text-green-500">Like</span>
              </motion.div>
              <motion.div className="absolute right-5 top-5 rounded-xl border-4 border-red-500 px-4 py-2" style={{ opacity: opacityPass, rotate: 15 }}>
                <span className="text-2xl font-bold uppercase text-red-500">Nope</span>
              </motion.div>
            </>
          )}
        </div>

        {/* Info Area */}
        <div className="flex h-[45%] flex-col p-5">
          <div className="flex flex-wrap gap-2">
            {profile.stage && (
              <Chip>{stageLabel(profile.stage)}</Chip>
            )}
            {profile.commitment && (
              <Chip muted>{commitLabel(profile.commitment)}</Chip>
            )}
            {profile.industry && (
              <Chip muted>{profile.industry}</Chip>
            )}
            {profile.years_experience !== null && (
              <Chip muted>{profile.years_experience} Jahre Erfahrung</Chip>
            )}
          </div>

          {profile.vision && (
            <p className="mt-3 line-clamp-3 text-[14px] leading-relaxed" style={{ color: "var(--ink-soft)" }}>
              „{profile.vision}"
            </p>
          )}

          {profile.skills && profile.skills.length > 0 && (
            <div className="mt-auto flex flex-wrap gap-1.5 pt-3">
              {profile.skills.slice(0, 6).map((s) => (
                <span key={s} className="rounded-full px-2.5 py-1 text-[11px] font-medium" style={{
                  background: "rgba(21,20,15,0.06)",
                  color: "var(--smoke)",
                }}>
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function Chip({ children, muted = false }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <span className="rounded-full px-3 py-1 text-[12px] font-medium" style={{
      background: muted ? "rgba(21,20,15,0.06)" : "rgba(226,81,28,0.12)",
      color: muted ? "var(--smoke)" : "var(--ember-deep)",
    }}>
      {children}
    </span>
  );
}

// ─── Action Buttons ────────────────────────────────────────────────────────

function ActionButtons({
  onPass,
  onSave,
  onLike,
}: {
  onPass: () => void;
  onSave: () => void;
  onLike: () => void;
}) {
  return (
    <div className="flex items-center justify-center gap-4 py-4">
      <button
        onClick={onPass}
        className="flex h-14 w-14 items-center justify-center rounded-full transition-transform hover:scale-110 active:scale-95"
        style={{
          background: "#fff",
          boxShadow: "0 4px 16px rgba(239,68,68,0.2)",
          border: "2px solid rgba(239,68,68,0.3)",
        }}
        aria-label="Pass"
      >
        <X className="h-6 w-6 text-red-500" />
      </button>

      <button
        onClick={onSave}
        className="flex h-12 w-12 items-center justify-center rounded-full transition-transform hover:scale-110 active:scale-95"
        style={{
          background: "#fff",
          boxShadow: "0 4px 16px rgba(245,158,11,0.2)",
          border: "2px solid rgba(245,158,11,0.3)",
        }}
        aria-label="Save"
      >
        <Star className="h-5 w-5 text-amber-500" />
      </button>

      <button
        onClick={onLike}
        className="flex h-14 w-14 items-center justify-center rounded-full transition-transform hover:scale-110 active:scale-95"
        style={{
          background: "#fff",
          boxShadow: "0 4px 16px rgba(34,197,94,0.2)",
          border: "2px solid rgba(34,197,94,0.3)",
        }}
        aria-label="Like"
      >
        <Heart className="h-6 w-6 text-green-500" fill="currentColor" />
      </button>
    </div>
  );
}

// ─── Main SparkView Component ──────────────────────────────────────────────

export function SparkView({ profiles, onSwipe, onMatch, loading }: SparkViewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<"like" | "pass" | "save" | null>(null);

  const currentProfile = profiles[currentIndex];
  const nextProfile = profiles[currentIndex + 1];

  const handleSwipe = useCallback((dir: "like" | "pass" | "save") => {
    if (!currentProfile) return;
    setDirection(dir);
    onSwipe(currentProfile.id, dir);
    setCurrentIndex((i) => i + 1);

    if (dir === "like" && onMatch) {
      // Simulate match check — in real app, check API response
      setTimeout(() => onMatch(currentProfile), 300);
    }
  }, [currentProfile, onSwipe, onMatch]);

  if (loading) {
    return (
      <div className="flex h-[600px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-[var(--ember)] border-t-transparent" />
          <p className="text-sm" style={{ color: "var(--smoke)" }}>Lade Matches…</p>
        </div>
      </div>
    );
  }

  if (!currentProfile) {
    return (
      <div className="flex h-[600px] flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="text-5xl">🎉</div>
        <h3 className="text-2xl font-semibold" style={{ color: "var(--ink)" }}>
          Alles gesehen!
        </h3>
        <p className="max-w-sm text-[14px]" style={{ color: "var(--smoke)" }}>
          Du hast alle aktuellen Founder-Profile durchgeswiped. Komm später wieder — es gibt immer neue Matches.
        </p>
        <Button
          onClick={() => setCurrentIndex(0)}
          className="mt-2 h-11 gap-2 rounded-xl bg-[var(--ember)] text-[var(--cream)] hover:bg-[var(--ember-deep)]"
        >
          Nochmal von vorne <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-5xl gap-6 px-4 py-6">
      {/* Card Stack */}
      <div className="relative flex-1">
        <div className="relative mx-auto h-[580px] w-full max-w-md">
          <AnimatePresence mode="popLayout">
            {/* Next card (behind) */}
            {nextProfile && (
              <motion.div
                key={`next-${nextProfile.id}`}
                className="absolute inset-0 rounded-3xl"
                style={{
                  background: "var(--cream)",
                  transform: "scale(0.95) translateY(12px)",
                  opacity: 0.5,
                  boxShadow: "0 10px 30px -10px rgba(21,20,15,0.15)",
                  border: "1px solid rgba(21,20,15,0.06)",
                }}
              />
            )}
            {/* Current card */}
            <SwipeCard
              key={currentProfile.id}
              profile={currentProfile}
              onSwipe={handleSwipe}
              isTop={true}
            />
          </AnimatePresence>
        </div>

        {/* Action Buttons */}
        <ActionButtons
          onPass={() => handleSwipe("pass")}
          onSave={() => handleSwipe("save")}
          onLike={() => handleSwipe("like")}
        />
      </div>

      {/* KI Reasoning Sidebar (desktop) */}
      <div className="hidden w-80 lg:block">
        <div className="sticky top-24">
          <ReasoningSidebar profile={currentProfile} />

          {/* Quick Stats */}
          <div className="mt-4 rounded-2xl p-5" style={{
            background: "rgba(251,250,247,0.55)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.6)",
          }}>
            <div className="mb-3 text-[12px] font-semibold uppercase tracking-wider" style={{ color: "var(--smoke)" }}>
              Profil-Details
            </div>
            <div className="flex flex-col gap-2.5 text-[13px]">
              <DetailRow label="Branche" value={currentProfile.industry ?? "—"} />
              <DetailRow label="Rolle" value={roleLabel(currentProfile.role)} />
              <DetailRow label="Stage" value={stageLabel(currentProfile.stage)} />
              <DetailRow label="Verfügbarkeit" value={commitLabel(currentProfile.commitment)} />
              <DetailRow label="Erfahrung" value={currentProfile.years_experience ? `${currentProfile.years_experience} Jahre` : "—"} />
              {currentProfile.looking_for && (
                <div className="mt-1">
                  <div className="mb-1 text-[11px]" style={{ color: "var(--smoke)" }}>Sucht</div>
                  <div className="text-[13px] leading-relaxed" style={{ color: "var(--ink)" }}>
                    {currentProfile.looking_for}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span style={{ color: "var(--smoke)" }}>{label}</span>
      <span className="font-medium" style={{ color: "var(--ink)" }}>{value}</span>
    </div>
  );
}

// ─── Hook: useSparkProfiles ────────────────────────────────────────────────

export function useSparkProfiles() {
  const { user, isDemo } = useAuth();
  const [profiles, setProfiles] = useState<SwipeProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    if (isDemo) {
      // Demo profiles with match scores
      setProfiles([
        {
          id: "demo-anna",
          display_name: "Anna Wojcik",
          photo_url: null,
          bio: "Full-Stack Developer mit AI-Fokus",
          skills: ["React", "Node.js", "Python", "AI/ML", "PostgreSQL"],
          industry: "Tech",
          role: "tech",
          stage: "mvp",
          location: "Berlin",
          city: "Berlin",
          lat: 52.52, lng: 13.405,
          looking_for: "Business Co-Founder mit Sales-Erfahrung",
          vision: "Ich baue eine KI-gestützte Plattform für automatisierte Kundenbetreuung. MVP ist live, erste 50 Kunden.",
          commitment: "full_time",
          years_experience: 7,
          match_score: 87,
          match_explanation: {
            skill_overlap: 65,
            location: 95,
            embedding_similarity: 92,
            distance_km: 0,
            common_skills: ["React", "Node.js"],
          },
        },
        {
          id: "demo-lena",
          display_name: "Dr. Lena Heller",
          photo_url: null,
          bio: "Startup-Juristin & Legal Tech",
          skills: ["Vertragsrecht", "GmbH-Gründung", "ESOP", "IP", "Venture Capital"],
          industry: "Legal Tech",
          role: "business",
          stage: "revenue",
          location: "München",
          city: "München",
          lat: 48.135, lng: 11.582,
          looking_for: "Technical Co-Founder für Legal-Tech-Plattform",
          vision: "Legal Tech Plattform für automatisierte Vertragsprüfung. 200+ Kunden, 50k MRR. Skalierungsphase.",
          commitment: "full_time",
          years_experience: 9,
          match_score: 72,
          match_explanation: {
            skill_overlap: 45,
            location: 80,
            embedding_similarity: 78,
            distance_km: 504,
            common_skills: ["PostgreSQL"],
          },
        },
        {
          id: "demo-felix",
          display_name: "Felix Krämer",
          photo_url: null,
          bio: "Product Manager & Growth Hacker",
          skills: ["Product", "Growth", "GTM", "B2B SaaS", "Analytics"],
          industry: "SaaS",
          role: "product",
          stage: "idea",
          location: "Hamburg",
          city: "Hamburg",
          lat: 53.551, lng: 9.994,
          looking_for: "Technical Co-Founder für B2B SaaS",
          vision: "Operator mit zwei Exits, stark in Positionierung und ersten 20 Kunden. Suche Tech-Partner für neues Projekt.",
          commitment: "part_time",
          years_experience: 12,
          match_score: 91,
          match_explanation: {
            skill_overlap: 70,
            location: 85,
            embedding_similarity: 95,
            distance_km: 289,
            common_skills: ["B2B SaaS", "Analytics"],
          },
        },
      ]);
      setLoading(false);
      return;
    }

    // Real API call
    try {
      const { data, error } = await supabase.functions.invoke("matching/recommendations", {
        body: { limit: 20 },
      });
      if (error) throw error;
      setProfiles(data?.recommendations?.map((r: any) => ({
        ...r.target,
        match_score: r.combined_score,
        match_explanation: r.explanation,
      })) ?? []);
    } catch (e) {
      console.error("Failed to load recommendations:", e);
      toast.error("Konnte Matches nicht laden");
    } finally {
      setLoading(false);
    }
  }, [user, isDemo]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSwipe = useCallback(async (profileId: string, direction: "like" | "pass" | "save") => {
    if (isDemo) {
      toast.success(direction === "like" ? "Like gespeichert (Demo)" : direction === "save" ? "Gespeichert (Demo)" : "Übersprungen");
      return;
    }
    try {
      const { error } = await supabase.functions.invoke("swipe", {
        body: { target_id: profileId, direction: direction === "save" ? "like" : direction },
      });
      if (error) throw error;
      if (direction === "like") toast.success("Like gesendet! 💚");
    } catch (e) {
      toast.error("Swipe fehlgeschlagen");
    }
  }, [isDemo]);

  return { profiles, loading, handleSwipe, reload: load };
}

export default SparkView;
