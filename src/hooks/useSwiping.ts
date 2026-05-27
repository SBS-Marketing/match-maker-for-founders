import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Tables } from "@/integrations/supabase/types";
import { edgeFunctionHeaders, edgeFunctionUrl } from "@/lib/edge-functions";

// ─────────────────────────────────────────────────────────────
// matchfoundr · Swipe Hook
// Frontend-Interface für die Swipe-API
// ─────────────────────────────────────────────────────────────

export type SwipeDirection = "like" | "pass";

export type SwipeHistoryItem = Tables<"swipes"> & {
  target?: Tables<"profiles"> | null;
};

export type SwipeResult = {
  success: boolean;
  mutual_match: boolean;
  match_id?: string;
  conversation_id?: string;
  direction: SwipeDirection;
};

export type SwipeState = {
  history: SwipeHistoryItem[];
  loading: boolean;
  swiping: boolean;
  error: string | null;
  lastResult: SwipeResult | null;
};

export function useSwiping() {
  const { user, session } = useAuth();
  const [state, setState] = useState<SwipeState>({
    history: [],
    loading: false,
    swiping: false,
    error: null,
    lastResult: null,
  });

  /** Führt einen Swipe durch (like oder pass) */
  const swipe = useCallback(
    async (targetId: string, direction: SwipeDirection): Promise<SwipeResult | null> => {
      if (!user || !session) {
        setState((s) => ({ ...s, error: "Nicht angemeldet" }));
        return null;
      }
      setState((s) => ({ ...s, swiping: true, error: null }));
      try {
        const res = await fetch(edgeFunctionUrl("swipe"), {
          method: "POST",
          headers: edgeFunctionHeaders(session.access_token),
          body: JSON.stringify({ target_id: targetId, direction }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Unbekannter Fehler" }));
          throw new Error(err.error);
        }
        const result: SwipeResult = await res.json();
        setState((s) => ({ ...s, lastResult: result }));
        return result;
      } catch (err: unknown) {
        setState((s) => ({
          ...s,
          error: err instanceof Error ? err.message : "Swipe fehlgeschlagen",
        }));
        return null;
      } finally {
        setState((s) => ({ ...s, swiping: false }));
      }
    },
    [user, session],
  );

  /** Lädt die Swipe-Historie des Users */
  const loadHistory = useCallback(async () => {
    if (!user || !session) {
      setState((s) => ({ ...s, error: "Nicht angemeldet" }));
      return;
    }
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await fetch(edgeFunctionUrl("swipe", "history"), {
        headers: edgeFunctionHeaders(session.access_token),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unbekannter Fehler" }));
        throw new Error(err.error);
      }
      const data = await res.json();
      setState((s) => ({ ...s, history: data.swipes ?? [] }));
    } catch (err: unknown) {
      setState((s) => ({
        ...s,
        error: err instanceof Error ? err.message : "Fehler beim Laden",
      }));
    } finally {
      setState((s) => ({ ...s, loading: false }));
    }
  }, [user, session]);

  /** Direkter Supabase-Insert als Fallback (schneller, ohne Edge Function) */
  const swipeDirect = useCallback(
    async (targetId: string, direction: SwipeDirection): Promise<boolean> => {
      if (!user) return false;
      const { error } = await supabase.from("swipes").upsert(
        {
          swiper_id: user.id,
          target_id: targetId,
          direction,
        },
        { onConflict: "swiper_id,target_id" },
      );
      if (error) {
        setState((s) => ({ ...s, error: error.message }));
        return false;
      }
      return true;
    },
    [user],
  );

  return {
    ...state,
    swipe,
    swipeDirect,
    loadHistory,
  };
}
