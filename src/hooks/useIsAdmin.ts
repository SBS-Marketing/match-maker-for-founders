// ─────────────────────────────────────────────────────────────
// Admin-Check: eine Zeile in user_roles mit role 'admin'.
// Der Client-Check steuert nur die UI — die echte Absicherung
// passiert serverseitig über RLS (has_role in den Policies).
// Demo-Modus: Vorschau mit Beispieldaten, echte Daten bleiben
// durch RLS unerreichbar.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type AdminState = {
  /** Darf den Admin-Bereich sehen (echt oder Demo-Vorschau). */
  isAdmin: boolean;
  /** Demo-Modus: UI-Vorschau mit Beispieldaten statt echter DB. */
  isPreview: boolean;
  checking: boolean;
};

export function useIsAdmin(): AdminState {
  const { user, session, isDemo, loading } = useAuth();
  const [state, setState] = useState<AdminState>({
    isAdmin: false,
    isPreview: false,
    checking: true,
  });

  useEffect(() => {
    if (loading) return;
    if (isDemo) {
      setState({ isAdmin: true, isPreview: true, checking: false });
      return;
    }
    if (!user || !session) {
      setState({ isAdmin: false, isPreview: false, checking: false });
      return;
    }
    let cancelled = false;
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .limit(1)
      .then(({ data }) => {
        if (cancelled) return;
        setState({
          isAdmin: Boolean(data && data.length > 0),
          isPreview: false,
          checking: false,
        });
      });
    return () => {
      cancelled = true;
    };
  }, [user, session, isDemo, loading]);

  return state;
}
