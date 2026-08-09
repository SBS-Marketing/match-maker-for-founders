// ─────────────────────────────────────────────────────────────
// Admin-Shell: Sidebar + Topbar + Command-Palette („Warm Signal“).
// Zugang nur mit user_roles-Eintrag 'admin' — RLS sichert die
// Daten serverseitig, der Client blendet nur die UI aus.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  ArrowLeft,
  Bell,
  Bot,
  BookOpen,
  CalendarDays,
  CircleHelp,
  Coins,
  Database,
  Kanban,
  LayoutGrid,
  LogOut,
  Menu,
  PanelLeft,
  Plus,
  Search,
  ShieldAlert,
  ShieldCheck,
  Store,
  SunMedium,
  Upload,
  Users,
  type LucideIcon,
} from "lucide-react";
import { AuthGate } from "@/components/AuthGate";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { usePendingCounts, useAdminSearchIndex } from "@/hooks/admin/useAdminData";
import { AdminShellContext, type SectionActions } from "@/components/admin/context";
import { AdminAvatar, AdminBadge, AdminBtn } from "@/components/admin/ui";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — matchfoundr" }] }),
  component: () => (
    <AuthGate>
      <AdminGate>
        <AdminShell />
      </AdminGate>
    </AuthGate>
  ),
});

function AdminGate({ children }: { children: ReactNode }) {
  const { isAdmin, checking } = useIsAdmin();

  if (checking) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-[var(--smoke)]">
        Prüfe Berechtigung…
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-3 px-6 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--ruled)] bg-[var(--surface)]">
          <ShieldAlert className="h-5 w-5 text-[var(--ember)]" />
        </span>
        <h1 className="text-lg font-bold text-[var(--ink)]">Kein Zugriff</h1>
        <p className="text-[13px] leading-relaxed text-[var(--smoke)]">
          Dieser Bereich ist dem matchfoundr-Team vorbehalten. Falls du Admin sein solltest, fehlt
          deinem Account die Rolle — sie wird direkt in Supabase vergeben.
        </p>
        <Link
          to="/heute"
          className="mt-2 rounded-xl bg-[var(--ink)] px-4 py-2 text-[13px] font-semibold text-white"
        >
          Zurück zur App
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}

// ── Navigation ───────────────────────────────────────────────

type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  badge?: "partner" | "events" | "guides";
};

const NAV: { group: string; items: NavItem[] }[] = [
  {
    group: "Überblick",
    items: [
      { to: "/admin", label: "Übersicht", icon: LayoutGrid, exact: true },
      { to: "/admin/ki", label: "KI-Verbrauch", icon: Coins },
      { to: "/admin/copilot", label: "Co-Pilot-Technik", icon: Bot },
    ],
  },
  {
    group: "Community",
    items: [
      { to: "/admin/nutzer", label: "Nutzer & Profile", icon: Users },
      { to: "/admin/events", label: "Events", icon: CalendarDays, badge: "events" },
    ],
  },
  { group: "Team", items: [{ to: "/admin/board", label: "Team-Board", icon: Kanban }] },
  {
    group: "Inhalte",
    items: [
      { to: "/admin/guides", label: "Guides", icon: BookOpen, badge: "guides" },
      { to: "/admin/partner", label: "Partner-Angebote", icon: Store, badge: "partner" },
    ],
  },
  {
    group: "System",
    items: [{ to: "/admin/system", label: "Datenquellen & Zugriff", icon: Database }],
  },
];

const ALL_ITEMS = NAV.flatMap((g) => g.items);

function activeItem(pathname: string): NavItem {
  const match = ALL_ITEMS.filter((i) => (i.exact ? pathname === i.to : pathname.startsWith(i.to)))
    .sort((a, b) => b.to.length - a.to.length)
    .at(0);
  return match ?? { to: "/admin", label: "Admin", icon: LayoutGrid };
}

// ── Shell ────────────────────────────────────────────────────

function AdminShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { isPreview } = useIsAdmin();
  const { user, signOut } = useAuth();
  const { data: pending } = usePendingCounts();
  const [actions, setActionsState] = useState<SectionActions>({});
  const [collapsed, setCollapsed] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const setActions = useCallback((next: SectionActions) => setActionsState(next), []);
  const shellValue = useMemo(() => ({ pending, setActions }), [pending, setActions]);

  useEffect(() => {
    setCollapsed(localStorage.getItem("mf_admin_sidebar") === "collapsed");
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      localStorage.setItem("mf_admin_sidebar", prev ? "open" : "collapsed");
      return !prev;
    });
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable === true);
      if (event.key === "/" && !typing) {
        event.preventDefault();
        setPaletteOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const { data: profile } = useQuery({
    queryKey: ["admin", "me", user?.id],
    enabled: Boolean(user?.id),
    staleTime: 300_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const active = activeItem(pathname);
  const openTodos =
    (pending?.partnerReview ?? 0) + (pending?.eventDrafts ?? 0) + (pending?.guideDrafts ?? 0);
  const adminName = isPreview ? "Demo-Admin" : (profile?.display_name ?? user?.email ?? "Admin");

  async function handleSignOut() {
    await signOut();
    void navigate({ to: "/auth" });
  }

  const sidebar = (
    <AdminSidebar
      pathname={pathname}
      pending={pending}
      collapsed={collapsed}
      onToggle={toggleCollapsed}
      onSearch={() => setPaletteOpen(true)}
      adminName={adminName}
      onNavigate={() => setDrawer(false)}
      onSignOut={handleSignOut}
    />
  );

  return (
    <AdminShellContext.Provider value={shellValue}>
      <div className="admin-shell flex">
        <aside
          className="admin-glass sticky top-0 hidden h-screen shrink-0 lg:flex"
          style={{
            width: collapsed ? 64 : 252,
            background: "var(--a-surface)",
            borderRight: "1px solid var(--a-border-soft)",
            transition: "width 160ms ease",
          }}
        >
          {sidebar}
        </aside>

        <Sheet open={drawer} onOpenChange={setDrawer}>
          <SheetContent side="left" className="admin-tokens w-[252px] p-0">
            <div className="h-full" style={{ background: "var(--a-canvas)" }}>
              {sidebar}
            </div>
          </SheetContent>
        </Sheet>

        <div className="min-w-0 flex-1">
          <header
            className="admin-glass sticky top-0 z-20 flex flex-wrap items-center justify-between gap-2"
            style={{
              padding: "13px 22px",
              borderBottom: "1px solid var(--a-border-soft)",
              background: "var(--a-surface)",
            }}
          >
            <div className="flex min-w-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setDrawer(true)}
                className="lg:hidden"
                aria-label="Menü öffnen"
                style={{ color: "var(--a-smoke)" }}
              >
                <Menu size={18} strokeWidth={1.75} />
              </button>
              <active.icon size={17} strokeWidth={1.75} style={{ color: "var(--a-ember)" }} />
              <h1
                className="truncate"
                style={{ fontSize: 17, fontWeight: 650, letterSpacing: "-0.025em" }}
              >
                {active.label}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <AdminBadge variant="indigo">Rolle: admin</AdminBadge>
              {actions.onExport && (
                <AdminBtn variant="quiet" icon={Upload} onClick={actions.onExport}>
                  Export
                </AdminBtn>
              )}
              {actions.onNew && (
                <AdminBtn variant="ember" icon={Plus} onClick={actions.onNew}>
                  {actions.newLabel ?? "Neu"}
                </AdminBtn>
              )}
              <span
                className="relative flex items-center justify-center"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  border: "1px solid var(--a-border-soft)",
                  color: "var(--a-smoke)",
                }}
              >
                <Bell size={15} strokeWidth={1.75} />
                {openTodos > 0 && (
                  <span
                    style={{
                      position: "absolute",
                      top: 6,
                      right: 6,
                      width: 6,
                      height: 6,
                      borderRadius: 99,
                      background: "var(--a-ember)",
                    }}
                  />
                )}
              </span>
            </div>
          </header>

          {isPreview && (
            <div
              className="mx-4 mt-4 rounded-xl px-3.5 py-2.5 sm:mx-6"
              style={{
                border: "1px dashed var(--a-ember)",
                background: "var(--a-ember-tint)",
                fontSize: 12.5,
                fontWeight: 600,
                color: "var(--a-ember-deep)",
              }}
            >
              Demo-Vorschau: Du siehst Beispieldaten. Echte Zahlen erscheinen mit einem eingeloggten
              Admin-Account (Rolle „admin“ in Supabase).
            </div>
          )}

          <main className="px-4 py-5 sm:px-6">
            <Outlet />
          </main>
        </div>
      </div>

      <AdminPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        onPick={(to) => {
          setPaletteOpen(false);
          void navigate({ to });
        }}
      />
    </AdminShellContext.Provider>
  );
}

// ── Sidebar ──────────────────────────────────────────────────

function AdminSidebar({
  pathname,
  pending,
  collapsed,
  onToggle,
  onSearch,
  adminName,
  onNavigate,
  onSignOut,
}: {
  pathname: string;
  pending: { partnerReview: number; eventDrafts: number; guideDrafts: number } | undefined;
  collapsed: boolean;
  onToggle: () => void;
  onSearch: () => void;
  adminName: string;
  onNavigate: () => void;
  onSignOut: () => void;
}) {
  function badgeFor(item: NavItem): { count: number; ember: boolean } | null {
    if (!item.badge || !pending) return null;
    if (item.badge === "partner" && pending.partnerReview > 0)
      return { count: pending.partnerReview, ember: true };
    if (item.badge === "events" && pending.eventDrafts > 0)
      return { count: pending.eventDrafts, ember: false };
    if (item.badge === "guides" && pending.guideDrafts > 0)
      return { count: pending.guideDrafts, ember: false };
    return null;
  }

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto px-2.5 py-3.5">
      <div className="flex items-center gap-2 px-1.5">
        <span
          className="flex shrink-0 items-center justify-center"
          style={{ width: 32, height: 32, borderRadius: 10, background: "var(--a-ink)" }}
        >
          <ShieldCheck size={16} strokeWidth={1.75} color="#fff" />
        </span>
        {!collapsed && (
          <>
            <div className="min-w-0 flex-1">
              <p style={{ fontSize: 13.5, fontWeight: 700 }}>matchfoundr</p>
              <p style={{ fontSize: 11.5, color: "var(--a-faint)" }}>Admin · Team-Bereich</p>
            </div>
            <button type="button" onClick={onToggle} aria-label="Sidebar einklappen">
              <PanelLeft size={16} strokeWidth={1.75} color="var(--a-faint)" />
            </button>
          </>
        )}
      </div>

      {collapsed && (
        <button
          type="button"
          onClick={onToggle}
          aria-label="Sidebar ausklappen"
          className="mt-3 flex justify-center"
        >
          <PanelLeft size={16} strokeWidth={1.75} color="var(--a-faint)" />
        </button>
      )}

      <button
        type="button"
        onClick={onSearch}
        className="mt-3.5 flex w-full items-center gap-2 px-2.5 py-2"
        style={{
          borderRadius: 10,
          background: "var(--a-soft)",
          color: "var(--a-faint)",
          fontSize: 12.5,
        }}
      >
        <Search size={14} strokeWidth={1.75} />
        {!collapsed && (
          <>
            <span className="flex-1 text-left">Suchen</span>
            <kbd
              className="font-mono"
              style={{
                fontSize: 10.5,
                padding: "1px 5px",
                borderRadius: 5,
                border: "1px solid var(--a-border-soft)",
              }}
            >
              /
            </kbd>
          </>
        )}
      </button>

      <nav className="mt-4 flex-1 space-y-4">
        {NAV.map((group) => (
          <div key={group.group}>
            {!collapsed && (
              <p
                className="px-2.5 pb-1.5 uppercase"
                style={{ fontSize: 11, letterSpacing: "0.04em", color: "var(--a-faint)" }}
              >
                {group.group}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
                const badge = badgeFor(item);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={onNavigate}
                    title={item.label}
                    className="flex items-center gap-2.5 px-2.5 py-2"
                    style={{
                      borderRadius: 10,
                      background: active ? "var(--a-soft)" : "transparent",
                      color: active ? "var(--a-ink)" : "var(--a-smoke)",
                      fontSize: 13,
                      fontWeight: active ? 650 : 550,
                      justifyContent: collapsed ? "center" : "flex-start",
                    }}
                  >
                    <item.icon
                      size={16}
                      strokeWidth={1.75}
                      color={active ? "var(--a-ember)" : "var(--a-faint)"}
                    />
                    {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                    {!collapsed && badge && (
                      <span
                        className="admin-num"
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          borderRadius: 99,
                          padding: "1px 7px",
                          background: badge.ember ? "var(--a-ember)" : "var(--a-deep)",
                          color: badge.ember ? "#fff" : "var(--a-smoke)",
                        }}
                      >
                        {badge.count}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-4">
        <Link
          to="/heute"
          onClick={onNavigate}
          title="Zurück zur Plattform"
          className="flex items-center gap-2.5 px-2.5 py-2 transition-colors hover:bg-[var(--a-soft)]"
          style={{
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 550,
            color: "var(--a-smoke)",
            justifyContent: collapsed ? "center" : "flex-start",
          }}
        >
          <ArrowLeft size={16} strokeWidth={1.75} color="var(--a-faint)" />
          {!collapsed && <span className="truncate">Zurück zur Plattform</span>}
        </Link>
      </div>
      <div
        className="mt-3 space-y-0.5 pt-3"
        style={{ borderTop: "1px solid var(--a-border-soft)" }}
      >
        <SidebarLeaf icon={SunMedium} label="Darstellung" collapsed={collapsed} />
        <SidebarLeaf icon={CircleHelp} label="Hilfe & Support" collapsed={collapsed} />
      </div>
      <div
        className="mt-3 flex items-center gap-2 pt-3"
        style={{ borderTop: "1px solid var(--a-border-soft)" }}
      >
        <AdminAvatar name={adminName} size={30} accent="indigo" />
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="truncate" style={{ fontSize: 12.5, fontWeight: 650 }}>
              {adminName}
            </p>
            <p style={{ fontSize: 11, color: "var(--a-faint)" }}>Rolle: admin</p>
          </div>
        )}
        <button
          type="button"
          onClick={onSignOut}
          title="Abmelden"
          aria-label="Abmelden"
          className="flex items-center justify-center transition-colors hover:bg-[var(--a-soft)]"
          style={{ width: 30, height: 30, borderRadius: 9, color: "var(--a-red)" }}
        >
          <LogOut size={16} strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
}

function SidebarLeaf({
  icon: Icon,
  label,
  collapsed,
}: {
  icon: LucideIcon;
  label: string;
  collapsed: boolean;
}) {
  return (
    <div
      className="flex items-center gap-2.5 px-2.5 py-2"
      style={{
        fontSize: 12.5,
        color: "var(--a-smoke)",
        justifyContent: collapsed ? "center" : "flex-start",
      }}
    >
      <Icon size={15} strokeWidth={1.75} color="var(--a-faint)" />
      {!collapsed && label}
    </div>
  );
}

// ── Command-Palette ──────────────────────────────────────────

function AdminPalette({
  open,
  onOpenChange,
  onPick,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  onPick: (to: string) => void;
}) {
  const { data } = useAdminSearchIndex(open);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} contentClassName="admin-tokens">
      <CommandInput placeholder="Sektion, Nutzer, Event, Guide oder Angebot…" />
      <CommandList>
        <CommandEmpty>Nichts gefunden.</CommandEmpty>
        <CommandGroup heading="Sektionen">
          {ALL_ITEMS.map((item) => (
            <CommandItem key={item.to} value={item.label} onSelect={() => onPick(item.to)}>
              <item.icon size={15} strokeWidth={1.75} />
              {item.label}
            </CommandItem>
          ))}
        </CommandGroup>
        {data && data.users.length > 0 && (
          <CommandGroup heading="Nutzer">
            {data.users.map((u) => (
              <CommandItem
                key={u.id}
                value={`nutzer ${u.display_name ?? u.id}`}
                onSelect={() => onPick("/admin/nutzer")}
              >
                <Users size={15} strokeWidth={1.75} />
                {u.display_name ?? "Unbenanntes Profil"}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {data && data.events.length > 0 && (
          <CommandGroup heading="Events">
            {data.events.map((e) => (
              <CommandItem
                key={e.id}
                value={`event ${e.title}`}
                onSelect={() => onPick("/admin/events")}
              >
                <CalendarDays size={15} strokeWidth={1.75} />
                {e.title}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {data && data.guides.length > 0 && (
          <CommandGroup heading="Guides">
            {data.guides.map((g) => (
              <CommandItem
                key={g.id}
                value={`guide ${g.title}`}
                onSelect={() => onPick("/admin/guides")}
              >
                <BookOpen size={15} strokeWidth={1.75} />
                {g.title}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {data && data.offers.length > 0 && (
          <CommandGroup heading="Angebote">
            {data.offers.map((o) => (
              <CommandItem
                key={o.slug}
                value={`angebot ${o.name}`}
                onSelect={() => onPick("/admin/partner")}
              >
                <Store size={15} strokeWidth={1.75} />
                {o.name}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
