// ─────────────────────────────────────────────────────────────
// Admin-Bereich: /admin (Insights) · /admin/events · /admin/guides
// Zugang nur mit user_roles-Eintrag 'admin' — RLS sichert die
// Daten serverseitig, der Client blendet nur die UI aus.
// ─────────────────────────────────────────────────────────────

import { type ReactNode } from "react";
import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { BarChart3, BookOpen, CalendarDays, ShieldAlert, ShieldCheck, Store } from "lucide-react";
import { AuthGate } from "@/components/AuthGate";
import { useIsAdmin } from "@/hooks/useIsAdmin";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — matchfoundr" }] }),
  component: () => (
    <AuthGate>
      <AdminGate>
        <AdminLayout />
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

const ADMIN_TABS = [
  { to: "/admin", label: "Insights", icon: BarChart3, exact: true },
  { to: "/admin/events", label: "Events", icon: CalendarDays, exact: false },
  { to: "/admin/guides", label: "Guides", icon: BookOpen, exact: false },
  { to: "/admin/partner", label: "Partner", icon: Store, exact: false },
] as const;

function AdminLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { isPreview } = useIsAdmin();

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--ink)]">
            <ShieldCheck className="h-4.5 w-4.5 text-white" />
          </span>
          <div>
            <h1 className="text-[17px] font-bold leading-tight text-[var(--ink)]">Admin</h1>
            <p className="text-[12px] text-[var(--smoke)]">Insights, Events & Redaktion</p>
          </div>
        </div>
        <nav className="flex flex-wrap gap-1.5">
          {ADMIN_TABS.map((tab) => {
            const active = tab.exact ? pathname === tab.to : pathname.startsWith(tab.to);
            return (
              <Link
                key={tab.to}
                to={tab.to}
                className={
                  active
                    ? "flex items-center gap-1.5 rounded-xl bg-[var(--ink)] px-3.5 py-2 text-[13px] font-semibold text-white"
                    : "flex items-center gap-1.5 rounded-xl border border-[var(--ruled)] bg-[var(--surface)] px-3.5 py-2 text-[13px] font-semibold text-[var(--smoke)] transition hover:text-[var(--ink)]"
                }
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </header>

      {isPreview && (
        <div className="mb-4 rounded-xl border border-dashed border-[var(--ember)] bg-[var(--ember-tint)] px-3.5 py-2.5 text-[12.5px] font-semibold text-[var(--ember-deep)]">
          Demo-Vorschau: Du siehst Beispieldaten. Echte Zahlen erscheinen mit einem eingeloggten
          Admin-Account (Rolle „admin“ in Supabase).
        </div>
      )}

      <Outlet />
    </div>
  );
}
