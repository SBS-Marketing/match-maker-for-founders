import { Link, useRouter } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Lockup } from "@/components/Logo";

export function AppNav() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  return (
    <header className="sticky top-4 z-40 px-4 sm:top-6 sm:px-6">
      <div className="glass-pill mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-3 pr-2 sm:px-5">
        <Link to="/" aria-label="matchfoundr — Home" className="shrink-0 pl-1">
          <Lockup size={20} />
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {user ? (
            <>
              <NavLink to="/discover">Entdecken</NavLink>
              <NavLink to="/matches">Matches</NavLink>
              <NavLink to="/profile">Profil</NavLink>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full"
                onClick={async () => {
                  await signOut();
                  router.navigate({ to: "/" });
                }}
              >
                Logout
              </Button>
            </>
          ) : (
            <>
              <NavLink to="/entdecken">Entdecken</NavLink>
              <Link to="/auth">
                <Button
                  size="sm"
                  className="shadow-ember rounded-full bg-[var(--ember)] px-4 text-[var(--cream)] hover:bg-[var(--ember-deep)]"
                >
                  Anmelden
                </Button>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="hidden rounded-full px-3 py-1.5 text-[13px] text-[var(--smoke)] transition-colors hover:text-[var(--ink)] sm:inline-block"
      activeProps={{ className: "text-[var(--ink)] font-medium" }}
    >
      {children}
    </Link>
  );
}
