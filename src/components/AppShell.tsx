import { type ReactNode, useState } from "react";
import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  Building2,
  CalendarDays,
  Compass,
  FolderOpen,
  Home,
  Kanban,
  ListChecks,
  LogOut,
  MessageCircle,
  MoreHorizontal,
  Sparkles,
  Store,
  User,
  UsersRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { CopilotDock } from "@/components/CopilotDock";
import { PageOnboarding } from "@/components/onboarding/PageOnboarding";

type NavItem = { to: string; label: string; short: string; icon: LucideIcon };

const NAV: NavItem[] = [
  { to: "/heute", label: "Heute", short: "Heute", icon: Home },
  { to: "/discover", label: "Swipe", short: "Swipe", icon: Compass },
  { to: "/marketplace", label: "Marktplatz", short: "Markt", icon: Store },
  { to: "/co-pilot", label: "Co-Pilot", short: "Pilot", icon: Sparkles },
  { to: "/matches", label: "Matches", short: "Chats", icon: MessageCircle },
  { to: "/firma", label: "Firmenprofil", short: "Firma", icon: Building2 },
  { to: "/kalender", label: "Kalender", short: "Kal", icon: CalendarDays },
  { to: "/unterlagen", label: "Unterlagen", short: "Docs", icon: FolderOpen },
  { to: "/aufgaben", label: "Aufgaben", short: "Tasks", icon: ListChecks },
  { to: "/kanban", label: "Kanban", short: "Board", icon: Kanban },
  { to: "/team", label: "Team", short: "Team", icon: UsersRound },
];

const MOBILE_PRIMARY: NavItem[] = [
  { to: "/heute", label: "Heute", short: "Heute", icon: Home },
  { to: "/matches", label: "Chats", short: "Chats", icon: MessageCircle },
  { to: "/kalender", label: "Kalender", short: "Kal", icon: CalendarDays },
  { to: "/co-pilot", label: "Co-Pilot", short: "Pilot", icon: Sparkles },
];

const MOBILE_MORE: NavItem[] = NAV.filter(
  (item) => !MOBILE_PRIMARY.some((primary) => primary.to === item.to),
);

// Seitentitel für die Topbar aus dem Pfad ableiten.
const TITLES: { match: (p: string) => boolean; title: string }[] = [
  { match: (p) => p.startsWith("/heute"), title: "Heute" },
  { match: (p) => p.startsWith("/discover"), title: "Swipe" },
  { match: (p) => p.startsWith("/marketplace"), title: "Marktplatz" },
  { match: (p) => p.startsWith("/co-pilot"), title: "Co-Pilot" },
  { match: (p) => p.startsWith("/matches"), title: "Matches" },
  { match: (p) => p.startsWith("/firma"), title: "Firmenprofil" },
  { match: (p) => p.startsWith("/kalender"), title: "Kalender" },
  { match: (p) => p.startsWith("/unterlagen"), title: "Unterlagen" },
  { match: (p) => p.startsWith("/aufgaben"), title: "Aufgaben" },
  { match: (p) => p.startsWith("/kanban"), title: "Kanban" },
  { match: (p) => p.startsWith("/team"), title: "Team" },
  { match: (p) => p.startsWith("/profile"), title: "Profil" },
  { match: (p) => p.startsWith("/plan"), title: "Plan" },
  { match: (p) => p.startsWith("/foerderung"), title: "Förderung" },
  { match: (p) => p.startsWith("/kapital"), title: "Kapital" },
  { match: (p) => p.startsWith("/recht"), title: "Recht" },
  { match: (p) => p.startsWith("/steuer"), title: "Steuer" },
  { match: (p) => p.startsWith("/mentoren"), title: "Mentoren" },
  { match: (p) => p.startsWith("/talent"), title: "Talent" },
  { match: (p) => p.startsWith("/growth"), title: "Growth" },
  { match: (p) => p.startsWith("/co-founder"), title: "Co-Founder" },
];

function titleFor(pathname: string): string {
  return TITLES.find((t) => t.match(pathname))?.title ?? "matchfoundr";
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const title = titleFor(pathname);
  const { user } = useAuth();

  return (
    <div className="flex min-h-screen">
      <Sidebar pathname={pathname} />
      <div className="relative flex min-h-screen min-w-0 flex-1 flex-col">
        <Topbar title={title} />
        <main className="relative z-10 flex-1 pb-24 lg:pb-10">{children}</main>
      </div>
      <MobileBottomNav pathname={pathname} />
      {user && <PageOnboarding pathname={pathname} />}
      <CopilotDock />
    </div>
  );
}

function Sidebar({ pathname }: { pathname: string }) {
  const { user, signOut } = useAuth();
  const router = useRouter();

  return (
    <aside className="sticky top-0 z-30 hidden h-screen shrink-0 flex-col border-r border-[var(--ruled-soft)] bg-[var(--surface)] text-[var(--ink)] lg:flex lg:w-[68px] xl:w-[228px]">
      {/* Brand */}
      <Link
        to="/heute"
        className="flex h-16 items-center gap-2.5 px-4 xl:px-5"
        aria-label="matchfoundr"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center">
          <svg width="26" height="19" viewBox="0 0 140 100" fill="none" aria-hidden="true">
            <path
              d="M8 14 L62 50 L8 86"
              stroke="var(--ink)"
              strokeWidth="14"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M132 14 L78 50 L132 86"
              stroke="var(--ember)"
              strokeWidth="14"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="70" cy="50" r="6" fill="var(--ink)" />
          </svg>
        </span>
        <span className="hidden whitespace-nowrap text-[17px] font-bold tracking-[-0.03em] xl:inline">
          matchfoundr<span className="text-[var(--ember)]">.</span>
        </span>
      </Link>

      {/* Primary nav */}
      <nav className="mt-2 flex flex-1 flex-col gap-1 px-2 xl:px-3">
        {NAV.map((item) => (
          <SidebarLink key={item.to} item={item} active={pathname.startsWith(item.to)} />
        ))}
      </nav>

      {/* Footer: profile / auth */}
      <div className="border-t border-[var(--ruled-soft)] px-2 py-3 xl:px-3">
        {user ? (
          <>
            <Link
              to="/profile"
              className={navClass(pathname.startsWith("/profile"))}
              aria-label="Profil"
            >
              <User className="h-[18px] w-[18px] shrink-0" />
              <span className="hidden truncate xl:inline">Profil</span>
            </Link>
            <button
              onClick={async () => {
                await signOut();
                router.navigate({ to: "/" });
              }}
              className={`${navClass(false)} w-full text-left`}
              aria-label="Abmelden"
            >
              <LogOut className="h-[18px] w-[18px] shrink-0" />
              <span className="hidden truncate xl:inline">Abmelden</span>
            </button>
          </>
        ) : (
          <Link
            to="/auth"
            className="flex items-center justify-center gap-2 rounded-[13px] bg-[var(--ember)] px-3 py-2.5 text-[13px] font-semibold text-white shadow-ember transition hover:bg-[var(--ember-deep)]"
          >
            <User className="h-[18px] w-[18px] shrink-0 xl:hidden" />
            <span className="hidden xl:inline">Anmelden</span>
          </Link>
        )}
      </div>
    </aside>
  );
}

function navClass(active: boolean): string {
  return [
    "flex items-center gap-3 rounded-[13px] px-3 py-2.5 text-[13.5px] font-semibold transition",
    "justify-center xl:justify-start",
    active
      ? "bg-[var(--ember-tint)] text-[var(--ember-deep)]"
      : "text-[var(--smoke)] hover:bg-[var(--surface-soft)] hover:text-[var(--ink)]",
  ].join(" ");
}

function SidebarLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link to={item.to} className={navClass(active)} title={item.label}>
      <Icon className="h-[18px] w-[18px] shrink-0" />
      <span className="hidden truncate xl:inline">{item.label}</span>
    </Link>
  );
}

function Topbar({ title }: { title: string }) {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-[var(--ruled-soft)] bg-[rgba(250,248,243,0.92)] px-4 backdrop-blur-xl sm:px-6">
      <div className="flex min-w-0 items-center gap-2.5">
        {/* Mobile brand (sidebar hidden) */}
        <Link to="/heute" className="flex items-center lg:hidden" aria-label="matchfoundr">
          <svg width="22" height="16" viewBox="0 0 140 100" fill="none" aria-hidden="true">
            <path
              d="M8 14 L62 50 L8 86"
              stroke="var(--ink)"
              strokeWidth="14"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M132 14 L78 50 L132 86"
              stroke="var(--ember)"
              strokeWidth="14"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="70" cy="50" r="6" fill="var(--ink)" />
          </svg>
        </Link>
        <h1 className="truncate text-[16px] font-semibold tracking-tight text-[var(--ink)]">
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-1.5">
        {user ? (
          <>
            <Link
              to="/matches"
              aria-label="Benachrichtigungen"
              className="flex h-9 w-9 items-center justify-center rounded-[13px] border border-[var(--ruled)] bg-[var(--surface)] text-[var(--smoke)] transition hover:text-[var(--ink)]"
            >
              <Bell className="h-[18px] w-[18px]" />
            </Link>
            <Link
              to="/profile"
              aria-label="Profil"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--ruled)] bg-[var(--surface)] text-[var(--ink)] transition hover:bg-[var(--surface-soft)]"
            >
              <User className="h-[18px] w-[18px]" />
            </Link>
          </>
        ) : (
          <Link to="/auth">
            <Button
              size="sm"
              className="shadow-ember rounded-[13px] bg-[var(--ember)] px-4 text-white hover:bg-[var(--ember-deep)]"
            >
              Anmelden
            </Button>
          </Link>
        )}
      </div>
    </header>
  );
}

export function MobileBottomNav({ pathname }: { pathname: string }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  if (!user) return null;

  const moreActive = MOBILE_MORE.some((item) => pathname.startsWith(item.to));

  return (
    <nav aria-label="Hauptnavigation" className="fixed inset-x-0 bottom-0 z-50 lg:hidden">
      {open && (
        <div className="mx-auto mb-2 max-w-[34rem] px-3">
          <div className="rounded-[18px] border border-[var(--ruled)] bg-[rgba(255,255,255,0.96)] p-2 shadow-warm-lg backdrop-blur-xl">
            <div className="mb-1 flex items-center justify-between px-2 py-1">
              <span className="text-[12px] font-semibold text-[var(--smoke)]">Mehr Bereiche</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--smoke)] hover:bg-[var(--surface-soft)] hover:text-[var(--ink)]"
                aria-label="Mehr-Menü schließen"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1">
              {MOBILE_MORE.map(({ to, label, icon: Icon }) => {
                const active = pathname.startsWith(to);
                return (
                  <Link
                    key={to}
                    to={to}
                    onClick={() => setOpen(false)}
                    className={[
                      "flex min-h-11 items-center gap-2 rounded-[13px] px-3 text-[13px] font-semibold transition",
                      active
                        ? "bg-[var(--ember-tint)] text-[var(--ember-deep)]"
                        : "text-[var(--smoke)] hover:bg-[var(--surface-soft)] hover:text-[var(--ink)]",
                    ].join(" ")}
                  >
                    <Icon className="h-[17px] w-[17px] shrink-0" aria-hidden="true" />
                    <span className="truncate">{label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
      <div className="mx-auto grid h-[74px] max-w-[34rem] grid-cols-5 items-start gap-1 border-t border-[var(--ruled-soft)] bg-[rgba(255,255,255,0.92)] px-2 pt-2 pb-[18px] shadow-warm backdrop-blur-xl">
        {MOBILE_PRIMARY.map(({ to, short, icon: Icon }) => {
          const active = pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              onClick={() => setOpen(false)}
              className={[
                "flex min-w-0 flex-col items-center justify-center gap-1 rounded-[13px] px-1 py-1.5 text-[10px] leading-none transition",
                active
                  ? "bg-[var(--ember-tint)] font-bold text-[var(--ember-deep)]"
                  : "font-medium text-[var(--faint)] hover:text-[var(--ink)]",
              ].join(" ")}
            >
              <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
              <span className="max-w-full truncate">{short}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className={[
            "flex min-w-0 flex-col items-center justify-center gap-1 rounded-[13px] px-1 py-1.5 text-[10px] leading-none transition",
            open || moreActive
              ? "bg-[var(--ember-tint)] font-bold text-[var(--ember-deep)]"
              : "font-medium text-[var(--faint)] hover:text-[var(--ink)]",
          ].join(" ")}
          aria-expanded={open}
          aria-label="Mehr Navigation öffnen"
        >
          <MoreHorizontal className="h-[18px] w-[18px]" aria-hidden="true" />
          <span>Mehr</span>
        </button>
      </div>
    </nav>
  );
}
