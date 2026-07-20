import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Beta namespace — typed wrapper so TS sees the three methods we use.
type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<{ data: any; error: any }>;
  approveAuthorization: (id: string) => Promise<{ data: any; error: any }>;
  denyAuthorization: (id: string) => Promise<{ data: any; error: any }>;
};
const oauth = () => (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      const next = location.pathname + location.searchStr;
      throw redirect({ to: "/auth", search: { next } });
    }
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauth().getAuthorizationDetails(authorizationId);
    if (error) throw error;
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="mx-auto max-w-md p-8 text-sm text-muted-foreground">
      Diese Autorisierung konnte nicht geladen werden: {String((error as Error)?.message ?? error)}
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData() as any;
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const { data, error } = approve
      ? await oauth().approveAuthorization(authorization_id)
      : await oauth().denyAuthorization(authorization_id);
    if (error) {
      setBusy(false);
      setError(error.message ?? "Fehler beim Bestätigen");
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("Keine Redirect-URL vom Authorization-Server erhalten.");
      return;
    }
    window.location.href = target;
  }

  const clientName = details?.client?.name ?? details?.client?.client_name ?? "Externe App";

  return (
    <main
      className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 p-6"
      style={{ background: "var(--ink)", color: "var(--cream)" }}
    >
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/50">
          matchfoundr · Zugriff erlauben
        </div>
        <h1 className="mt-3 text-xl font-semibold tracking-tight">
          {clientName} mit matchfoundr verbinden
        </h1>
        <p className="mt-3 text-sm text-white/70">
          {clientName} kann die aktivierten Tools dieser App aufrufen, während du eingeloggt bist —
          zum Beispiel dein Profil, Partner-Angebote, Events und deine Aufgaben lesen und neue
          Aufgaben anlegen.
        </p>
        <p className="mt-3 text-xs text-white/50">
          Berechtigungen und Datenschutz-Regeln dieser App bleiben aktiv.
        </p>
        {error && (
          <p role="alert" className="mt-3 text-xs text-red-400">
            {error}
          </p>
        )}
        <div className="mt-6 flex gap-2">
          <button
            disabled={busy}
            onClick={() => decide(true)}
            className="flex-1 rounded-lg px-4 py-2 text-sm font-semibold text-[var(--cream)] disabled:opacity-50"
            style={{ background: "var(--ember)" }}
          >
            Erlauben
          </button>
          <button
            disabled={busy}
            onClick={() => decide(false)}
            className="flex-1 rounded-lg border border-white/15 px-4 py-2 text-sm text-white/80 hover:bg-white/5 disabled:opacity-50"
          >
            Ablehnen
          </button>
        </div>
      </div>
    </main>
  );
}
