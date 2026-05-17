import { Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Lockup } from "@/components/Logo";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";

export function AppNav() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);

  return (
    <header className="sticky top-4 z-40 px-4 sm:top-6 sm:px-6">
      <div className="glass-pill mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-3 pr-2 sm:px-5">
        <Link to="/" aria-label="matchfoundr — Home" className="shrink-0 pl-1">
          <Lockup size={20} />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 text-sm sm:flex">
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
              <HashLink href="/#find-a-match">Find a match</HashLink>
              <HashLink href="/#how-it-works">How it works</HashLink>
              <HashLink href="/#stories">Stories</HashLink>
              <HashLink href="/#pricing">Pricing</HashLink>
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

        {/* Mobile burger */}
        <div className="flex items-center gap-2 sm:hidden">
          {!user && (
            <Link to="/auth">
              <Button
                size="sm"
                className="shadow-ember rounded-full bg-[var(--ember)] px-4 text-[var(--cream)] hover:bg-[var(--ember-deep)]"
              >
                Anmelden
              </Button>
            </Link>
          )}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                aria-label="Menü öffnen"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-[78%] max-w-sm border-l border-white/10 bg-[var(--ink)] text-[var(--cream)]"
            >
              <div className="mt-8 flex flex-col gap-1 text-base">
                {user ? (
                  <>
                    <MobileLink to="/discover" onNavigate={close}>
                      Entdecken
                    </MobileLink>
                    <MobileLink to="/matches" onNavigate={close}>
                      Matches
                    </MobileLink>
                    <MobileLink to="/profile" onNavigate={close}>
                      Profil
                    </MobileLink>
                    <button
                      className="mt-4 rounded-xl px-4 py-3 text-left text-[var(--cream)]/70 transition hover:bg-white/5"
                      onClick={async () => {
                        close();
                        await signOut();
                        router.navigate({ to: "/" });
                      }}
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <MobileHashLink href="/#find-a-match" onNavigate={close}>
                      Find a match
                    </MobileHashLink>
                    <MobileHashLink href="/#how-it-works" onNavigate={close}>
                      How it works
                    </MobileHashLink>
                    <MobileHashLink href="/#stories" onNavigate={close}>
                      Stories
                    </MobileHashLink>
                    <MobileHashLink href="/#pricing" onNavigate={close}>
                      Pricing
                    </MobileHashLink>
                    <MobileLink to="/auth" onNavigate={close}>
                      Anmelden
                    </MobileLink>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="rounded-full px-3 py-1.5 text-[13px] text-[var(--smoke)] transition-colors hover:text-[var(--ink)]"
      activeProps={{ className: "text-[var(--ink)] font-medium" }}
    >
      {children}
    </Link>
  );
}

function MobileLink({
  to,
  children,
  onNavigate,
}: {
  to: string;
  children: React.ReactNode;
  onNavigate: () => void;
}) {
  return (
    <Link
      to={to}
      onClick={onNavigate}
      className="rounded-xl px-4 py-3 text-[var(--cream)] transition hover:bg-white/5"
      activeProps={{ className: "bg-white/10 font-medium" }}
    >
      {children}
    </Link>
  );
}

function HashLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="rounded-full px-3 py-1.5 text-[13px] text-[var(--smoke)] transition-colors hover:text-[var(--ink)]"
    >
      {children}
    </a>
  );
}

function MobileHashLink({
  href,
  children,
  onNavigate,
}: {
  href: string;
  children: React.ReactNode;
  onNavigate: () => void;
}) {
  return (
    <a
      href={href}
      onClick={onNavigate}
      className="rounded-xl px-4 py-3 text-[var(--cream)] transition hover:bg-white/5"
    >
      {children}
    </a>
  );
}
      to={to}
      onClick={onNavigate}
      className="rounded-xl px-4 py-3 text-[var(--cream)] transition hover:bg-white/5"
      activeProps={{ className: "bg-white/10 font-medium" }}
    >
      {children}
    </Link>
  );
}
