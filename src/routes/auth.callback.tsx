import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/auth/callback")({ component: AuthCallbackPage });

function AuthCallbackPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Supabase holt sich den Code aus der URL und tauscht ihn gegen eine Session
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (data.session) {
          setStatus("success");
          toast.success("Erfolgreich angemeldet.");
          // Prüfe ob Profil vollständig ist, sonst zu Onboarding
          const { data: profile } = await supabase
            .from("profiles")
            .select("is_onboarded")
            .eq("id", data.session.user.id)
            .single();

          if (profile?.is_onboarded) {
            navigate({ to: "/heute" });
          } else {
            navigate({ to: "/onboarding" });
          }
        } else {
          // Keine Session → vielleicht Magic Link mit Hash
          const { data: hashData, error: hashError } = await supabase.auth.getUser();
          if (hashError || !hashData.user) {
            throw new Error("Authentifizierung fehlgeschlagen.");
          }
          setStatus("success");
          navigate({ to: "/heute" });
        }
      } catch (err: unknown) {
        setStatus("error");
        toast.error(err instanceof Error ? err.message : "Authentifizierung fehlgeschlagen.");
        setTimeout(() => navigate({ to: "/auth" }), 2000);
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="text-center">
        {status === "loading" && (
          <>
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-[var(--ember)] border-t-transparent" />
            <p className="text-sm text-[var(--smoke)]">Anmeldung wird verarbeitet…</p>
          </>
        )}
        {status === "success" && (
          <>
            <p className="text-lg font-medium text-[var(--ink)]">Erfolgreich angemeldet!</p>
            <p className="mt-2 text-sm text-[var(--smoke)]">Weiterleitung…</p>
          </>
        )}
        {status === "error" && (
          <>
            <p className="text-lg font-medium text-red-600">Anmeldung fehlgeschlagen</p>
            <p className="mt-2 text-sm text-[var(--smoke)]">Weiterleitung zur Login-Seite…</p>
          </>
        )}
      </div>
    </div>
  );
}
