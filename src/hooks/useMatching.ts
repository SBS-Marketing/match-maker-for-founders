import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Tables } from "@/integrations/supabase/types";
import { edgeFunctionHeaders, edgeFunctionUrl } from "@/lib/edge-functions";

// ─────────────────────────────────────────────────────────────
// matchfoundr · Matching Hook
// Frontend-Interface für den Matching-Algorithmus
// ─────────────────────────────────────────────────────────────

export type MatchRecommendation = Tables<"match_results"> & {
  target?: Tables<"profiles"> | null;
};

export type MatchingState = {
  recommendations: MatchRecommendation[];
  loading: boolean;
  computing: boolean;
  error: string | null;
};

export function useMatching() {
  const { user, session } = useAuth();
  const [state, setState] = useState<MatchingState>({
    recommendations: [],
    loading: false,
    computing: false,
    error: null,
  });

  /** Lädt die berechneten Match-Empfehlungen vom Edge Function */
  const loadRecommendations = useCallback(
    async (limit = 20) => {
      if (!user || !session) {
        setState((s) => ({ ...s, error: "Nicht angemeldet" }));
        return;
      }
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const res = await fetch(edgeFunctionUrl("matching", `recommendations?limit=${limit}`), {
          headers: edgeFunctionHeaders(session.access_token),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Unbekannter Fehler" }));
          throw new Error(err.error);
        }
        const data = await res.json();
        setState((s) => ({ ...s, recommendations: data.recommendations ?? [] }));
      } catch (err: unknown) {
        setState((s) => ({
          ...s,
          error: err instanceof Error ? err.message : "Fehler beim Laden",
        }));
      } finally {
        setState((s) => ({ ...s, loading: false }));
      }
    },
    [user, session],
  );

  /** Triggert Neuberechnung der Matches via Edge Function */
  const computeMatches = useCallback(async () => {
    if (!user || !session) {
      setState((s) => ({ ...s, error: "Nicht angemeldet" }));
      return;
    }
    setState((s) => ({ ...s, computing: true, error: null }));
    try {
      const res = await fetch(edgeFunctionUrl("matching", "compute"), {
        method: "POST",
        headers: edgeFunctionHeaders(session.access_token),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unbekannter Fehler" }));
        throw new Error(err.error);
      }
      const data = await res.json();
      // Nach Berechnung direkt neu laden
      await loadRecommendations();
      return data.count as number;
    } catch (err: unknown) {
      setState((s) => ({
        ...s,
        error: err instanceof Error ? err.message : "Fehler bei Berechnung",
      }));
    } finally {
      setState((s) => ({ ...s, computing: false }));
    }
  }, [user, session, loadRecommendations]);

  /** Versteckt einen Match aus den Empfehlungen */
  const hideMatch = useCallback(
    async (targetId: string) => {
      if (!user) return;
      const { error } = await supabase
        .from("match_results")
        .update({ is_hidden: true })
        .eq("user_id", user.id)
        .eq("target_id", targetId);

      if (error) {
        setState((s) => ({ ...s, error: error.message }));
        return;
      }
      setState((s) => ({
        ...s,
        recommendations: s.recommendations.filter((r) => r.target_id !== targetId),
      }));
    },
    [user],
  );

  return {
    ...state,
    loadRecommendations,
    computeMatches,
    hideMatch,
  };
}
