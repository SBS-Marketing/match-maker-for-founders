import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Lockup } from "@/components/Logo";

export const Route = createFileRoute("/auth/waitlist-confirm")({
  component: WaitlistConfirmPage,
});

function WaitlistConfirmPage() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Bestaetigung wird verarbeitet...");

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) {
      setStatus("error");
      setMessage("Der Bestaetigungslink ist unvollstaendig.");
      return;
    }

    let cancelled = false;
    async function confirm() {
      const { data, error } = await supabase.rpc("confirm_waitlist_entry", { p_token: token });
      if (cancelled) return;

      if (error || !data) {
        setStatus("error");
        setMessage(error?.message || "Der Link ist ungueltig oder wurde bereits verwendet.");
        return;
      }

      setStatus("success");
      setMessage("E-Mail bestaetigt. Du bist offiziell auf der Waitlist.");
    }

    confirm();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-8 px-4 py-20 text-center">
      <div className="flex flex-col items-center gap-6">
        <Lockup layout="stacked" size={28} />
        <div
          className="flex h-14 w-14 items-center justify-center rounded-2xl"
          style={{
            background: status === "error" ? "rgba(220,38,38,0.1)" : "rgba(226,81,28,0.12)",
            color: status === "error" ? "rgb(220,38,38)" : "var(--ember)",
          }}
        >
          {status === "loading" ? (
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : status === "success" ? (
            <CheckCircle2 className="h-7 w-7" />
          ) : (
            <XCircle className="h-7 w-7" />
          )}
        </div>
      </div>

      <div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Waitlist{" "}
          <span className="font-serif italic font-normal text-[var(--ember)]">Bestaetigung</span>.
        </h1>
        <p className="mt-3 text-sm text-[var(--smoke)]">{message}</p>
      </div>

      <Button
        asChild
        className="shadow-ember h-11 rounded-xl bg-[var(--ember)] text-[var(--cream)] hover:bg-[var(--ember-deep)]"
      >
        <Link to={status === "success" ? "/auth" : "/"}>
          {status === "success" ? "Zur Anmeldung" : "Zur Startseite"}
        </Link>
      </Button>
    </div>
  );
}
