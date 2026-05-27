import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { updatePasswordSchema } from "@/lib/auth-schemas";
import { useAuthActions } from "@/hooks/useAuthActions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lockup } from "@/components/Logo";

export const Route = createFileRoute("/auth/update-password")({
  component: UpdatePasswordPage,
});

function UpdatePasswordPage() {
  const navigate = useNavigate();
  const { updatePassword } = useAuthActions();
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = updatePasswordSchema.safeParse({ password, passwordConfirm });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || "Bitte pruefe dein Passwort.");
      return;
    }

    setLoading(true);
    const error = await updatePassword(parsed.data);
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Passwort aktualisiert.");
    navigate({ to: "/heute" });
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-8 px-4 py-20">
      <div className="flex flex-col items-center gap-6 text-center">
        <Lockup layout="stacked" size={28} />
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Neues{" "}
            <span className="font-serif italic font-normal text-[var(--ember)]">Passwort</span>.
          </h1>
          <p className="mt-3 text-sm text-[var(--smoke)]">
            Setze dein Passwort und spring direkt zur Daily Page.
          </p>
        </div>
      </div>

      <form onSubmit={submit} className="glass-pane space-y-4 p-7">
        <div className="space-y-1.5">
          <Label htmlFor="password">Neues Passwort</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="passwordConfirm">Passwort wiederholen</Label>
          <Input
            id="passwordConfirm"
            type="password"
            autoComplete="new-password"
            value={passwordConfirm}
            onChange={(event) => setPasswordConfirm(event.target.value)}
            required
          />
        </div>
        <Button
          type="submit"
          disabled={loading}
          className="shadow-ember h-11 w-full rounded-xl bg-[var(--ember)] text-[var(--cream)] hover:bg-[var(--ember-deep)]"
        >
          {loading ? "Speichern..." : "Passwort speichern"}
        </Button>
      </form>
    </div>
  );
}
