import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Lockup } from "@/components/Logo";

export const Route = createFileRoute("/auth")({ component: AuthShell });

function safeNext(next: string | undefined | null): string | null {
  if (!next) return null;
  if (!next.startsWith("/") || next.startsWith("//")) return null;
  return next;
}

const emailSchema = z.string().trim().email("Bitte gültige E-Mail eingeben").max(255);
const passwordSchema = z.string().min(8, "Mindestens 8 Zeichen").max(72);

function AuthShell() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  if (pathname !== "/auth") return <Outlet />;
  return <AuthPage />;
}

function AuthPage() {
  const { user, enterDemo } = useAuth();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const next = safeNext(search.next);
  const [mode, setMode] = useState<"signin" | "signup" | "magic">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      if (next) window.location.replace(next);
      else navigate({ to: "/heute" });
    }
  }, [user, navigate, next]);

  const postAuthRedirect = next ?? `${window.location.origin}/auth/callback`;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const eR = emailSchema.safeParse(email);
    const pR = passwordSchema.safeParse(password);
    if (!eR.success) return toast.error(eR.error.issues[0].message);
    if (mode !== "magic" && !pR.success) return toast.error(pR.error.issues[0].message);

    setLoading(true);
    try {
      if (mode === "signup") {
        if (!pR.success) return;
        const { error } = await supabase.auth.signUp({
          email: eR.data,
          password: password,
          options: {
            emailRedirectTo: next
              ? `${window.location.origin}${next}`
              : `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        toast.success("Konto erstellt. Bestätige deine E-Mail.");
      } else if (mode === "signin") {
        if (!pR.success) return;
        const { error } = await supabase.auth.signInWithPassword({
          email: eR.data,
          password: password,
        });
        if (error) throw error;
        navigate({ to: next ? next : "/heute" } as any);
      } else if (mode === "magic") {
        const { error } = await supabase.auth.signInWithOtp({
          email: eR.data,
          options: { emailRedirectTo: postAuthRedirect },
        });
        if (error) throw error;
        toast.success("Magic Link gesendet. Check dein Postfach.");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Etwas ist schiefgelaufen");
    } finally {
      setLoading(false);
    }
  };

  const oauth = async (provider: "google" | "apple") => {
    const { lovable } = await import("@/integrations/lovable/index");
    const result = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: next ? `${window.location.origin}${next}` : `${window.location.origin}/auth/callback`,
    });
    if (result.error) {
      toast.error(result.error.message ?? "Login fehlgeschlagen");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/heute" });
  };


  const skipAuth = () => {
    enterDemo();
    toast.success("Demo-Modus aktiviert");
    navigate({ to: "/heute" });
  };

  return (
    <div className="mx-auto flex max-w-md flex-col gap-8 px-4 py-20">
      <div className="flex flex-col items-center gap-6 text-center">
        <Lockup layout="stacked" size={28} />
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {mode === "signup" ? (
              <>
                Founder-Profil <span className="text-[var(--ember)]">erstellen</span>
              </>
            ) : mode === "signin" ? (
              <>
                Willkommen <span className="text-[var(--ember)]">zurück</span>
              </>
            ) : (
              <>
                Magic <span className="text-[var(--ember)]">Link</span>
              </>
            )}
          </h1>
          <p className="mt-3 text-sm text-[var(--smoke)]">
            {mode === "signup"
              ? "Beginne mit deinem matchfoundr-Konto."
              : mode === "signin"
                ? "Melde dich an, um weiterzumachen."
                : "Login ohne Passwort per E-Mail-Link."}
          </p>
        </div>
      </div>

      <div className="glass-pane p-7">
        <Button
          variant="outline"
          className="h-11 w-full gap-2 rounded-xl border-white/60 bg-white/40 backdrop-blur"
          onClick={() => oauth("google")}
        >
          <GoogleIcon className="h-4 w-4" />
          Mit Google fortfahren
        </Button>
        <Button
          variant="outline"
          className="mt-2 h-11 w-full gap-2 rounded-xl border-white/60 bg-white/40 backdrop-blur"
          onClick={() => oauth("apple")}
        >
          <AppleIcon className="h-4 w-4" />
          Mit Apple fortfahren
        </Button>
        <div className="my-5 flex items-center gap-3 text-[11px] font-mono uppercase tracking-[0.18em] text-[var(--smoke)]">
          <div className="h-px flex-1 bg-[var(--ruled)]" /> oder{" "}
          <div className="h-px flex-1 bg-[var(--ruled)]" />
        </div>
        <Button
          type="button"
          variant="ghost"
          className="mb-5 h-11 w-full rounded-xl border border-[var(--ruled)] bg-[var(--paper)]/70 text-[var(--ink)] hover:bg-[var(--paper)]"
          onClick={skipAuth}
        >
          Ohne Anmeldung testen
        </Button>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">E-Mail</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          {mode !== "magic" && (
            <div className="space-y-1.5">
              <Label htmlFor="password">Passwort</Label>
              <Input
                id="password"
                type="password"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          )}
          <Button
            type="submit"
            className="shadow-ember h-11 w-full rounded-xl bg-[var(--ember)] text-[var(--cream)] hover:bg-[var(--ember-deep)]"
            disabled={loading}
          >
            {loading
              ? "Bitte warten…"
              : mode === "signup"
                ? "Konto erstellen"
                : mode === "signin"
                  ? "Anmelden"
                  : "Magic Link senden"}
          </Button>
        </form>
        <div className="mt-4 flex flex-col gap-2 text-center text-sm">
          {mode !== "signin" && (
            <button
              type="button"
              className="text-muted-foreground underline-offset-4 hover:underline"
              onClick={() => setMode("signin")}
            >
              Schon ein Konto? Anmelden
            </button>
          )}
          {mode !== "signup" && (
            <button
              type="button"
              className="text-muted-foreground underline-offset-4 hover:underline"
              onClick={() => setMode("signup")}
            >
              Noch kein Konto? Registrieren
            </button>
          )}
          {mode !== "magic" && (
            <button
              type="button"
              className="text-muted-foreground underline-offset-4 hover:underline"
              onClick={() => setMode("magic")}
            >
              Magic Link Login
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8a12 12 0 1 1 7.9-21l5.7-5.7A20 20 0 1 0 44 24c0-1.2-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8A12 12 0 0 1 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7A20 20 0 0 0 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2A12 12 0 0 1 12.7 28.5l-6.5 5A20 20 0 0 0 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2C40.9 36.2 44 30.6 44 24c0-1.2-.1-2.4-.4-3.5z"
      />
    </svg>
  );
}

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 384 512" fill="currentColor" aria-hidden="true">
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zM256.6 105.5c30.3-36 27.6-68.8 26.7-80.5-26.8 1.5-57.8 18.2-75.5 38.8-19.5 22-31 49.2-28.5 79.9 29 2.2 55.5-12.7 77.3-38.2z" />
    </svg>
  );
}
