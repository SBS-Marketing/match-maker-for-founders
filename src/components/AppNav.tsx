import { Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Lockup } from "@/components/Logo";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Bell, Compass, Home, Menu, MessageCircle, Sparkles, Store, User } from "lucide-react";

const appLinks = [
  { to: "/heute", label: "Heute" },
  { to: "/discover", label: "Swipe" },
  { to: "/marketplace", label: "Marktplatz" },
  { to: "/co-pilot", label: "Co-Pilot" },
  { to: "/matches", label: "Matches" },
];

const mobileTabs = [
  { to: "/heute", label: "Heute", icon: Home },
  { to: "/discover", label: "Swipe", icon: Compass },
  { to: "/marketplace", label: "Markt", icon: Store },
  { to: "/co-pilot", label: "Pilot", icon: Sparkles },
  { to: "/matches", label: "Chats", icon: MessageCircle },
];

export function AppNav() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);

  return (
    <header className="sticky top-4 z-40 px-4 sm:top-6 sm:px-6">
      <div className="glass-pill mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-3 pr-2 sm:px-5">
        {/* Left: logo + nav */}
        <div className="flex items-center gap-2 sm:gap-4">
          <Link to="/" aria-label="matchfoundr — Home" className="shrink-0 pl-1">
            <Lockup size={20} />
          </Link>

          <nav className="hidden items-center gap-1 text-sm sm:flex">
            {user ? (
              appLinks.map((link) => (
                <NavLink key={link.to} to={link.to}>
                  {link.label}
                </NavLink>
              ))
            ) : (
              <>
                <HashLink href="/#find-a-match">Find a match</HashLink>
                <HashLink href="/#how-it-works">How it works</HashLink>
                <HashLink href="/#stories">Stories</HashLink>
                <HashLink href="/#pricing">Pricing</HashLink>
              </>
            )}
          </nav>
        </div>

        {/* Right: account */}
        <div className="flex items-center gap-1.5">
          {user ? (
            <>
              <Link
                to="/matches"
                aria-label="Benachrichtigungen"
                className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--ink)] transition hover:bg-white/40"
              >
                <Bell className="h-[18px] w-[18px]" />
              </Link>
              <Link
                to="/profile"
                aria-label="Profil"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--ink)] text-[var(--cream)] transition hover:bg-[var(--ink-soft)]"
              >
                <User className="h-[18px] w-[18px]" />
              </Link>
            </>
          ) : (
            <Link to="/auth" className="hidden sm:block">
              <Button
                size="sm"
                className="shadow-ember rounded-full bg-[var(--ember)] px-4 text-[var(--cream)] hover:bg-[var(--ember-deep)]"
              >
                Anmelden
              </Button>
            </Link>
          )}

          {/* Mobile burger */}
          <div className="sm:hidden">
            {!user && (
              <Link to="/auth" className="mr-1">
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
                      {appLinks.map((link) => (
                        <MobileLink key={link.to} to={link.to} onNavigate={close}>
                          {link.label}
                        </MobileLink>
                      ))}
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
      </div>
    </header>
  );
}

export function MobileBottomNav() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <nav aria-label="Mobile Hauptnavigation" className="fixed inset-x-3 bottom-3 z-50 sm:hidden">
      <div className="glass-pill mx-auto grid h-16 max-w-md grid-cols-5 items-center px-2">
        {mobileTabs.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="flex min-w-0 flex-col items-center justify-center gap-1 rounded-full px-1 py-2 text-[10px] font-medium leading-none text-[var(--smoke)] transition hover:text-[var(--ink)]"
            activeProps={{
              className: "bg-[var(--ink)] text-[var(--cream)] shadow-sm hover:text-[var(--cream)]",
            }}
          >
            <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
            <span className="max-w-full truncate">{label}</span>
          </Link>
        ))}
      </div>
    </nav>
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
