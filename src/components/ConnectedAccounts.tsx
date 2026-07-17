// ─────────────────────────────────────────────────────────────
// Konten & Automationen — Gmail, Google Kalender, WhatsApp.
// Sind Konten verbunden, baut der Co-Pilot jeden Morgen um 8:00
// den Report: Tagesablauf, wichtige Mails, Antwort-Entwürfe
// (direkt als Gmail-Drafts), erkannte Termine in den Kalender.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { CalendarDays, Check, Loader2, Mail, MessageCircle, Plug, Sunrise } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type Provider = "gmail" | "google_calendar" | "whatsapp";

type Connection = {
  provider: string;
  status: string;
  account_label: string | null;
};

const PROVIDERS: { id: Provider; label: string; desc: string; icon: typeof Mail }[] = [
  {
    id: "gmail",
    label: "Gmail",
    desc: "Wichtige Mails im Morgenreport, Antworten als Entwurf.",
    icon: Mail,
  },
  {
    id: "google_calendar",
    label: "Google Kalender",
    desc: "Erkannte Termine landen automatisch im Kalender.",
    icon: CalendarDays,
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    desc: "Über eigenes open-wa Gateway — Nachrichten im Report.",
    icon: MessageCircle,
  },
];

export function ConnectedAccounts({ userId }: { userId: string }) {
  const { isDemo, session } = useAuth();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [busy, setBusy] = useState<Provider | null>(null);

  const load = () => {
    if (isDemo) return;
    supabase
      .from("connected_accounts")
      .select("provider,status,account_label")
      .eq("user_id", userId)
      .then(({ data }) => setConnections((data as Connection[]) ?? []));
  };

  useEffect(load, [userId, isDemo]);

  // Rückkehr aus dem OAuth-Flow (?connect=ok|error|invalid)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const outcome = params.get("connect");
    if (!outcome) return;
    if (outcome === "ok")
      toast.success("Konto verbunden — der Morgenreport nutzt es ab morgen früh.");
    else toast.error("Verknüpfung fehlgeschlagen — bitte erneut versuchen.");
    params.delete("connect");
    params.delete("provider");
    const rest = params.toString();
    window.history.replaceState({}, "", window.location.pathname + (rest ? `?${rest}` : ""));
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function connectionFor(provider: Provider): Connection | undefined {
    return connections.find((c) => c.provider === provider);
  }

  async function connect(provider: Provider) {
    if (isDemo || !session) {
      toast.info("Im Demo-Modus nicht möglich — melde dich mit deinem Konto an.");
      return;
    }
    setBusy(provider);
    try {
      if (provider === "whatsapp") {
        const { error } = await supabase.from("connected_accounts").insert({
          user_id: userId,
          provider: "whatsapp",
          status: "pending",
        });
        if (error && !error.message.includes("duplicate")) throw new Error(error.message);
        toast.success("WhatsApp vorgemerkt — Gateway-Setup steht in INTEGRATIONS.md.");
        load();
        return;
      }
      const { data, error } = await supabase.functions.invoke("connect-google", {
        body: { provider },
      });
      if (error || !data?.url) {
        const msg =
          (data as { message?: string } | null)?.message ||
          "Google-Verknüpfung ist noch nicht eingerichtet (GOOGLE_CLIENT_ID fehlt — siehe INTEGRATIONS.md).";
        toast.error(msg);
        return;
      }
      window.location.href = data.url as string;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Verbinden fehlgeschlagen.");
    } finally {
      setBusy(null);
    }
  }

  async function disconnect(provider: Provider) {
    setBusy(provider);
    try {
      if (provider === "whatsapp") {
        await supabase
          .from("connected_accounts")
          .delete()
          .eq("user_id", userId)
          .eq("provider", "whatsapp");
      } else {
        await supabase.functions.invoke("connect-google", {
          body: { provider, action: "disconnect" },
        });
      }
      toast.success("Verbindung getrennt.");
      load();
    } catch {
      toast.error("Trennen fehlgeschlagen.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-2.5">
      {PROVIDERS.map(({ id, label, desc, icon: Icon }) => {
        const conn = connectionFor(id);
        const connected = conn?.status === "connected";
        const pending = conn?.status === "pending";
        return (
          <div
            key={id}
            className="flex items-start justify-between gap-3 rounded-xl border border-[var(--ruled)] px-3 py-2.5"
          >
            <div className="flex min-w-0 items-start gap-2.5">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--canvas)] text-[var(--ink)]">
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-[13px] font-bold text-[var(--ink)]">
                  {label}
                  {connected && (
                    <span className="flex items-center gap-0.5 rounded-full bg-[var(--ember-tint)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--ember-deep)]">
                      <Check className="h-2.5 w-2.5" /> verbunden
                    </span>
                  )}
                  {pending && (
                    <span className="rounded-full bg-[var(--canvas)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--faint)]">
                      wartet auf Gateway
                    </span>
                  )}
                </p>
                <p className="text-[11.5px] leading-snug text-[var(--smoke)]">
                  {connected && conn?.account_label ? conn.account_label : desc}
                </p>
              </div>
            </div>
            <button
              onClick={() => (conn ? disconnect(id) : connect(id))}
              disabled={busy === id}
              className={
                conn
                  ? "shrink-0 rounded-lg border border-[var(--ruled)] px-2.5 py-1.5 text-[11.5px] font-semibold text-[var(--smoke)] hover:text-[var(--ink)]"
                  : "flex shrink-0 items-center gap-1 rounded-lg bg-[var(--ink)] px-2.5 py-1.5 text-[11.5px] font-semibold text-white disabled:opacity-50"
              }
            >
              {busy === id ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : conn ? (
                "Trennen"
              ) : (
                <>
                  <Plug className="h-3 w-3" /> Verbinden
                </>
              )}
            </button>
          </div>
        );
      })}

      <div className="flex items-start gap-2 rounded-xl bg-[var(--canvas)] px-3 py-2.5 text-[11.5px] leading-relaxed text-[var(--smoke)]">
        <Sunrise className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--ember)]" />
        <p>
          Mit verbundenen Konten erstellt der Co-Pilot <strong>jeden Morgen um 8:00</strong> deinen
          Report: Tagesablauf, wichtige Mails samt Antwort-Entwürfen (direkt als Gmail-Drafts) und
          erkannte Termine automatisch im Kalender. Du findest ihn auf „Heute“.
        </p>
      </div>
    </div>
  );
}
