// ═══════════════════════════════════════════════════════════════════════════
// Issue #30: Waitlist Hook — Einschreibung + Bestätigungsflow
// ═══════════════════════════════════════════════════════════════════════════
import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { edgeFunctionHeaders, edgeFunctionUrl } from "@/lib/edge-functions";

export type WaitlistStatus = "idle" | "loading" | "success" | "error" | "already_confirmed";

export interface WaitlistState {
  status: WaitlistStatus;
  message: string;
  emailSent: boolean;
}

export function useWaitlist() {
  const [state, setState] = useState<WaitlistState>({
    status: "idle",
    message: "",
    emailSent: false,
  });

  const join = useCallback(async (args: { email: string; name?: string; confirmUrl?: string }) => {
    setState({ status: "loading", message: "", emailSent: false });
    try {
      const email = args.email.trim().toLowerCase();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error("Bitte gib eine gültige E-Mail-Adresse ein.");
      }

      if (import.meta.env.VITE_SUPABASE_URL) {
        const session = await supabase.auth.getSession();
        const headers = edgeFunctionHeaders(session.data.session?.access_token);

        const res = await fetch(edgeFunctionUrl("resend-confirm"), {
          method: "POST",
          headers,
          body: JSON.stringify({
            email,
            name: args.name || "",
            confirmUrl: args.confirmUrl,
          }),
        });
        const data = await res.json().catch(() => ({ error: "Unbekannter Fehler" }));

        if (!res.ok) {
          throw new Error(data.error || `Fehler ${res.status}`);
        }

        setState({
          status: data.alreadyConfirmed ? "already_confirmed" : "success",
          message: data.alreadyConfirmed
            ? "Du bist bereits auf der Waitlist bestätigt!"
            : "Check dein Postfach — wir haben dir einen Bestätigungslink geschickt.",
          emailSent: !!data.emailSent,
        });
        return data;
      }

      const { data: waitlistId, error } = await supabase.rpc("join_waitlist", {
        p_email: email,
        p_name: args.name || "",
        p_metadata: {},
      });
      if (error) throw error;

      setState({
        status: "success",
        message: "Du stehst auf der Waitlist! Wir melden uns, sobald ein Platz frei wird.",
        emailSent: false,
      });
      return { ok: true, waitlistId };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unbekannter Fehler";
      setState({ status: "error", message: msg, emailSent: false });
      return { ok: false, error: msg };
    }
  }, []);

  const confirm = useCallback(async (token: string) => {
    setState({ status: "loading", message: "", emailSent: false });
    try {
      const { data, error } = await supabase.rpc("confirm_waitlist_entry", {
        p_token: token,
      });
      if (error) throw error;

      if (data) {
        setState({
          status: "success",
          message: "E-Mail bestätigt! Du bist jetzt offiziell auf der Waitlist.",
          emailSent: false,
        });
      } else {
        setState({
          status: "error",
          message: "Token ungültig oder bereits verwendet.",
          emailSent: false,
        });
      }
      return data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unbekannter Fehler";
      setState({ status: "error", message: msg, emailSent: false });
      return false;
    }
  }, []);

  return { state, join, confirm };
}
