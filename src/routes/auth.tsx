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
