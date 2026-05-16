import { createFileRoute, useNavigate } from "@tanstack/react-router";
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

export const Route = createFileRoute("/auth")({ component: AuthPage });

const emailSchema = z.string().trim().email("Bitte gültige E-Mail eingeben").max(255);
const passwordSchema = z.string().min(8, "Mindestens 8 Zeichen").max(72);

function AuthPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate({ to: "/discover" });
  }, [user, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const eR = emailSchema.safeParse(email);
    const pR = passwordSchema.safeParse(password);
    if (!eR.success) return toast.error(eR.error.issues[0].message);
    if (!pR.success) return toast.error(pR.error.issues[0].message);

    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: eR.data,
          password: pR.data,
          options: { emailRedirectTo: `${window.location.origin}/onboarding` },
        });
        if (error) throw error;
        toast.success("Konto erstellt. Los geht's.");
        navigate({ to: "/onboarding" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: eR.data, password: pR.data });
        if (error) throw error;
        navigate({ to: "/discover" });
      }
    } catch (err: any) {
      toast.error(err.message ?? "Etwas ist schiefgelaufen");
    } finally {
      setLoading(false);
    }
  };

  const oauth = async (provider: "google" | "apple") => {
    const { lovable } = await import("@/integrations/lovable/index");
    const result = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: `${window.location.origin}/onboarding`,
    });
    if (result.error) {
      toast.error(result.error.message ?? "Login fehlgeschlagen");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/onboarding" });
  };

  return (
    <div className="mx-auto flex max-w-md flex-col gap-8 px-4 py-20">
      <div className="flex flex-col items-center gap-6 text-center">
        <Lockup layout="stacked" size={28} />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {mode === "signup" ? "Founder-Profil erstellen" : "Willkommen zurück"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "signup"
              ? "Beginne mit deinem matchfoundr-Konto."
              : "Melde dich an, um weiterzumachen."}
          </p>
        </div>
      </div>

      <Card className="p-6">
        <Button variant="outline" className="w-full gap-2" onClick={() => oauth("google")}>
          <GoogleIcon className="h-4 w-4" />
          Mit Google fortfahren
        </Button>
        <Button variant="outline" className="mt-2 w-full gap-2" onClick={() => oauth("apple")}>
          <AppleIcon className="h-4 w-4" />
          Mit Apple fortfahren
        </Button>
        <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" /> oder <div className="h-px flex-1 bg-border" />
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">E-Mail</Label>
            <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Passwort</Label>
            <Input id="password" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Bitte warten…" : mode === "signup" ? "Konto erstellen" : "Anmelden"}
          </Button>
        </form>
      </Card>

      <div className="text-center text-sm text-muted-foreground">
        {mode === "signup" ? "Schon ein Konto?" : "Noch kein Konto?"}{" "}
        <button
          type="button"
          className="text-foreground underline-offset-4 hover:underline"
          onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
        >
          {mode === "signup" ? "Anmelden" : "Konto erstellen"}
        </button>
      </div>
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8a12 12 0 1 1 7.9-21l5.7-5.7A20 20 0 1 0 44 24c0-1.2-.1-2.4-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8A12 12 0 0 1 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7A20 20 0 0 0 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2A12 12 0 0 1 12.7 28.5l-6.5 5A20 20 0 0 0 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2C40.9 36.2 44 30.6 44 24c0-1.2-.1-2.4-.4-3.5z"/>
    </svg>
  );
}

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.365 1.43c0 1.14-.466 2.235-1.227 3.034-.82.86-2.155 1.524-3.241 1.437-.137-1.122.43-2.288 1.146-3.034.81-.84 2.224-1.479 3.322-1.437zM20.5 17.34c-.56 1.299-.83 1.88-1.555 3.027-1.009 1.6-2.432 3.59-4.193 3.607-1.565.013-1.968-1.018-4.092-1.006-2.124.012-2.568 1.024-4.134 1.012-1.762-.017-3.11-1.812-4.119-3.41C-.346 17.022-.642 11.79 1.42 9.001c1.466-1.99 3.781-3.155 5.956-3.155 2.216 0 3.61 1.213 5.443 1.213 1.778 0 2.86-1.215 5.422-1.215 1.935 0 3.985 1.054 5.444 2.875-4.787 2.622-4.01 9.461-3.185 8.62z"/>
    </svg>
  );
}
