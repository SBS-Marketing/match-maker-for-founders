import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { edgeFunctionHeaders, edgeFunctionUrl } from "@/lib/edge-functions";
import type { SwipeProfile } from "@/components/matchfoundr/SparkView";

type SparkAction = "like" | "pass" | "save";

type SparkRecommendation = {
  combined_score?: number | null;
  explanation?: Record<string, unknown> | null;
  target?: Partial<SwipeProfile> | null;
};

type SwipeResult = {
  success?: boolean;
  mutual_match?: boolean;
  match_id?: string;
  conversation_id?: string;
};

const DEMO_PROFILES: SwipeProfile[] = [
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
    lat: 52.52,
    lng: 13.405,
    looking_for: "Business Co-Founder mit Sales-Erfahrung",
    vision:
      "Ich baue eine KI-gestützte Plattform für automatisierte Kundenbetreuung. MVP ist live, erste 50 Kunden.",
    commitment: "full_time",
    years_experience: 7,
    path: "joiner",
    onboarded_at: new Date(0).toISOString(),
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
    lat: 48.135,
    lng: 11.582,
    looking_for: "Technical Co-Founder für Legal-Tech-Plattform",
    vision:
      "Legal Tech Plattform für automatisierte Vertragsprüfung. 200+ Kunden, 50k MRR. Skalierungsphase.",
    commitment: "full_time",
    path: "founder",
    onboarded_at: new Date(0).toISOString(),
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
    lat: 53.551,
    lng: 9.994,
    looking_for: "Technical Co-Founder für B2B SaaS",
    vision:
      "Operator mit zwei Exits, stark in Positionierung und ersten 20 Kunden. Suche Tech-Partner für neues Projekt.",
    commitment: "part_time",
    path: "joiner",
    onboarded_at: new Date(0).toISOString(),
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
];

function savedProfilesKey(userId: string) {
  return `matchfoundr_saved_profiles_${userId}`;
}

function readSavedProfiles(userId: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(savedProfilesKey(userId));
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function saveProfileForLater(userId: string, profileId: string) {
  if (typeof window === "undefined") return;
  const saved = readSavedProfiles(userId);
  saved.add(profileId);
  localStorage.setItem(savedProfilesKey(userId), JSON.stringify([...saved]));
}

function recommendationToProfile(rec: SparkRecommendation): SwipeProfile | null {
  if (!rec.target?.id) return null;
  return {
    id: rec.target.id,
    display_name: rec.target.display_name ?? null,
    photo_url: rec.target.photo_url ?? null,
    bio: rec.target.bio ?? null,
    skills: rec.target.skills ?? null,
    industry: rec.target.industry ?? null,
    role: rec.target.role ?? null,
    stage: rec.target.stage ?? null,
    location: rec.target.location ?? rec.target.city ?? null,
    city: rec.target.city ?? rec.target.location ?? null,
    lat: rec.target.lat ?? null,
    lng: rec.target.lng ?? null,
    looking_for: rec.target.looking_for ?? null,
    vision: rec.target.vision ?? null,
    commitment: rec.target.commitment ?? null,
    years_experience: rec.target.years_experience ?? null,
    path: rec.target.path ?? null,
    onboarded_at: rec.target.onboarded_at ?? null,
    match_score: rec.combined_score ?? undefined,
    match_explanation: rec.explanation ?? undefined,
  };
}

export function useSparkProfiles() {
  const { user, session, isDemo } = useAuth();
  const [profiles, setProfiles] = useState<SwipeProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const removeProfile = useCallback((profileId: string) => {
    setProfiles((items) => items.filter((profile) => profile.id !== profileId));
  }, []);

  const fetchRecommendations = useCallback(
    async (limit = 20) => {
      if (!session) return [];
      const res = await fetch(edgeFunctionUrl("matching", `recommendations?limit=${limit}`), {
        headers: edgeFunctionHeaders(session.access_token),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unbekannter Fehler" }));
        throw new Error(err.error ?? "Konnte Matches nicht laden");
      }
      const data = (await res.json()) as { recommendations?: SparkRecommendation[] };
      return data.recommendations ?? [];
    },
    [session],
  );

  const load = useCallback(async () => {
    if (!user) {
      setProfiles([]);
      setLoading(false);
      return;
    }
    setLoading(true);

    if (isDemo) {
      setProfiles(DEMO_PROFILES);
      setLoading(false);
      return;
    }

    if (!session) {
      setProfiles([]);
      setLoading(false);
      return;
    }

    try {
      let recommendations = await fetchRecommendations();

      if (recommendations.length === 0) {
        const computeRes = await fetch(edgeFunctionUrl("matching", "compute"), {
          method: "POST",
          headers: edgeFunctionHeaders(session.access_token),
        });
        if (computeRes.ok) recommendations = await fetchRecommendations();
      }

      const saved = readSavedProfiles(user.id);
      setProfiles(
        recommendations
          .map(recommendationToProfile)
          .filter((profile): profile is SwipeProfile => Boolean(profile && !saved.has(profile.id))),
      );
    } catch (err) {
      console.error("Failed to load recommendations:", err);
      toast.error(err instanceof Error ? err.message : "Konnte Matches nicht laden");
    } finally {
      setLoading(false);
    }
  }, [fetchRecommendations, isDemo, session, user]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSwipe = useCallback(
    async (profileId: string, direction: SparkAction): Promise<boolean> => {
      if (!user) return false;

      if (direction === "save") {
        if (!isDemo) saveProfileForLater(user.id, profileId);
        removeProfile(profileId);
        toast.success(isDemo ? "Gespeichert (Demo)" : "Für später gespeichert");
        return true;
      }

      if (isDemo) {
        removeProfile(profileId);
        toast.success(direction === "like" ? "Like gespeichert (Demo)" : "Übersprungen");
        return true;
      }

      if (!session) {
        toast.error("Nicht angemeldet");
        return false;
      }

      try {
        const res = await fetch(edgeFunctionUrl("swipe"), {
          method: "POST",
          headers: edgeFunctionHeaders(session.access_token),
          body: JSON.stringify({ target_id: profileId, direction }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Swipe fehlgeschlagen" }));
          throw new Error(err.error);
        }
        const result = (await res.json()) as SwipeResult;
        removeProfile(profileId);
        if (result.mutual_match) toast.success("Es ist ein Match!");
        else if (direction === "like") toast.success("Like gesendet");
        return true;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Swipe fehlgeschlagen");
        return false;
      }
    },
    [isDemo, removeProfile, session, user],
  );

  return { profiles, loading, handleSwipe, reload: load, removeProfile };
}
