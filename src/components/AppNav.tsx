import { Link, useRouter } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

export function AppNav() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="font-semibold tracking-tight">
          matchfoundr
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {user ? (
            <>
              <Link to="/discover" className="rounded-md px-3 py-1.5 text-muted-foreground hover:text-foreground" activeProps={{ className: "text-foreground" }}>
                Entdecken
              </Link>
              <Link to="/matches" className="rounded-md px-3 py-1.5 text-muted-foreground hover:text-foreground" activeProps={{ className: "text-foreground" }}>
                Matches
              </Link>
              <Link to="/profile" className="rounded-md px-3 py-1.5 text-muted-foreground hover:text-foreground" activeProps={{ className: "text-foreground" }}>
                Profil
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  await signOut();
                  router.navigate({ to: "/" });
                }}
              >
                Logout
              </Button>
            </>
          ) : (
            <Link to="/auth">
              <Button size="sm">Anmelden</Button>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
