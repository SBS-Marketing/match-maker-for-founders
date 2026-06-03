import { ReactNode, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";

export function AuthGate({ children }: { children: ReactNode }) {
  const { user, loading, enterDemo } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading || user) return;

    const isTeamInvite =
      typeof window !== "undefined" &&
      window.location.pathname === "/team" &&
      new URLSearchParams(window.location.search).has("invite");

    if (isTeamInvite) {
      enterDemo();
      return;
    }

    navigate({ to: "/auth" });
  }, [user, loading, navigate, enterDemo]);

  if (loading || !user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">
        Lade…
      </div>
    );
  }
  return <>{children}</>;
}
