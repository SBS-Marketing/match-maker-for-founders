// ─────────────────────────────────────────────────────────────
// Admin → Nutzer & Profile: Profilliste (admin_list_users) und
// Warteliste. Rollen und KI-Kontingente sind direkt bedienbar.
// ─────────────────────────────────────────────────────────────

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bot, Check, List, ShieldCheck, Upload, Users } from "lucide-react";
import {
  AdminAvatar,
  AdminBadge,
  AdminBar,
  AdminBtn,
  AdminCard,
  AdminEmpty,
  AdminKpi,
  AdminLoading,
  AdminPills,
  AdminRow,
  AdminTable,
} from "@/components/admin/ui";
import {
  useAdminUsers,
  useProfileFields,
  useWaitlist,
  type AdminUser,
  type ProfileFields,
  type WaitlistRow,
} from "@/hooks/admin/useAdminData";
import { useSectionActions } from "@/components/admin/context";
import { profileCompleteness } from "@/lib/admin-profile";
import {
  dateTimeDE,
  downloadCsv,
  formatDateDE,
  formatTokens,
  relativeDE,
} from "@/lib/admin-format";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/admin/nutzer")({
  head: () => ({ meta: [{ title: "Nutzer & Profile — Admin · matchfoundr" }] }),
  component: AdminNutzer,
});

const TABS = [
  { value: "profile", label: "Profile" },
  { value: "waitlist", label: "Warteliste" },
] as const;
type Tab = (typeof TABS)[number]["value"];

const ROLE_FILTERS = [
  { value: "all", label: "Alle" },
  { value: "admin", label: "admin" },
  { value: "user", label: "user" },
] as const;
type RoleFilter = (typeof ROLE_FILTERS)[number]["value"];

type SortKey = "none" | "completeness" | "tokens";

const USER_COLS = "1.6fr 1fr 0.9fr 1fr 1.1fr 1.2fr 0.7fr";
const WAIT_COLS = "1.6fr 0.9fr 0.9fr 0.8fr 0.8fr";

function AdminNutzer() {
  const users = useAdminUsers();
  const fields = useProfileFields();
  const waitlist = useWaitlist();
  const [tab, setTab] = useState<Tab>("profile");
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [sort, setSort] = useState<SortKey>("none");
  const [openUser, setOpenUser] = useState<AdminUser | null>(null);
  const [roleDialog, setRoleDialog] = useState(false);

  const fieldMap = useMemo(() => {
    const map = new Map<string, ProfileFields>();
    for (const f of fields.data ?? []) map.set(f.id, f);
    return map;
  }, [fields.data]);

  const rows = useMemo(() => users.data ?? [], [users.data]);
  const waitRows = useMemo(() => waitlist.data ?? [], [waitlist.data]);

  const visibleUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = rows.filter((u) => {
      if (roleFilter !== "all" && (u.role ?? "user") !== roleFilter) return false;
      if (!q) return true;
      return [u.display_name, u.email, u.industry, u.location]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
    if (sort === "completeness") {
      return [...list].sort(
        (a, b) =>
          profileCompleteness(fieldMap.get(b.user_id)) -
          profileCompleteness(fieldMap.get(a.user_id)),
      );
    }
    if (sort === "tokens") {
      return [...list].sort((a, b) => (b.tokens_used ?? 0) - (a.tokens_used ?? 0));
    }
    return list;
  }, [rows, query, roleFilter, sort, fieldMap]);

  const kpis = useMemo(() => {
    const since = Date.now() - 30 * 86_400_000;
    const recent = rows.filter(
      (u) => u.created_at && new Date(u.created_at).getTime() >= since,
    ).length;
    const onboarded = rows.filter((u) => u.is_onboarded).length;
    const withGrant = rows.filter((u) => (u.token_limit ?? 0) > 0);
    const atLimit = withGrant.filter((u) => (u.tokens_used ?? 0) >= (u.token_limit ?? 0)).length;
    const unconfirmed = waitRows.filter((w) => !w.confirmed_at).length;
    return {
      total: rows.length,
      recent,
      onboarded,
      onboardedPct: rows.length ? Math.round((onboarded / rows.length) * 100) : 0,
      waitlist: waitRows.length,
      unconfirmed,
      withGrant: withGrant.length,
      atLimit,
    };
  }, [rows, waitRows]);

  useSectionActions(
    {
      onExport: () => {
        if (tab === "profile") {
          downloadCsv(
            "nutzer.csv",
            ["Name", "E-Mail", "Branche", "Ort", "Rolle", "Vollständig %", "Genutzt", "Limit"],
            visibleUsers.map((u) => [
              u.display_name,
              u.email,
              u.industry,
              u.location,
              u.role,
              profileCompleteness(fieldMap.get(u.user_id)),
              u.tokens_used ?? 0,
              u.token_limit ?? 0,
            ]),
          );
        } else {
          downloadCsv(
            "warteliste.csv",
            ["E-Mail", "Quelle", "Eingetragen", "Status"],
            waitRows.map((w) => [
              w.email,
              metaSource(w.metadata),
              w.created_at,
              w.confirmed_at ? "bestätigt" : "neu",
            ]),
          );
        }
      },
    },
    [tab, visibleUsers, waitRows, fieldMap],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminKpi
          icon={Users}
          accent="green"
          label="Profile gesamt"
          value={String(kpis.total)}
          delta={{ dir: kpis.recent > 0 ? "up" : "flat", label: `+${kpis.recent}` }}
          compare="30 Tage"
        />
        <AdminKpi
          icon={Check}
          accent="indigo"
          label="Profil vollständig"
          value={`${kpis.onboardedPct}`}
          unit="%"
          compare={`${kpis.onboarded} von ${kpis.total}`}
        />
        <AdminKpi
          icon={List}
          accent="amber"
          label="Warteliste"
          value={String(kpis.waitlist)}
          compare={`unbestätigt: ${kpis.unconfirmed}`}
        />
        <AdminKpi
          icon={Bot}
          accent="ember"
          label="Mit KI-Kontingent"
          value={String(kpis.withGrant)}
          compare={`${kpis.atLimit} am Limit`}
        />
      </div>

      <AdminCard>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <AdminPills options={[...TABS]} value={tab} onChange={setTab} />
          <div className="flex items-center gap-2">
            <AdminBtn variant="ghost" icon={Upload} onClick={() => {}}>
              CSV
            </AdminBtn>
            <AdminBtn variant="primary" icon={ShieldCheck} onClick={() => setRoleDialog(true)}>
              Rolle vergeben
            </AdminBtn>
          </div>
        </div>

        {tab === "profile" ? (
          <>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Suche nach Name, E-Mail, Branche, Ort"
                className="h-9 max-w-xs text-[13px]"
              />
              <AdminPills options={[...ROLE_FILTERS]} value={roleFilter} onChange={setRoleFilter} />
            </div>
            {users.isLoading || fields.isLoading ? (
              <AdminLoading />
            ) : users.isError ? (
              <AdminEmpty label={`Fehler: ${(users.error as Error).message}`} />
            ) : visibleUsers.length === 0 ? (
              <AdminEmpty label="Keine Profile gefunden" />
            ) : (
              <AdminTable
                cols={USER_COLS}
                head={[
                  "Profil",
                  "Branche · Ort",
                  "Ort",
                  "Rolle",
                  <SortHead
                    key="c"
                    label="Profil vollständig"
                    active={sort === "completeness"}
                    onClick={() => setSort(sort === "completeness" ? "none" : "completeness")}
                  />,
                  <SortHead
                    key="t"
                    label="KI-Kontingent"
                    active={sort === "tokens"}
                    onClick={() => setSort(sort === "tokens" ? "none" : "tokens")}
                  />,
                  "Aktion",
                ]}
              >
                {visibleUsers.map((u) => (
                  <UserRow
                    key={u.user_id}
                    user={u}
                    completeness={profileCompleteness(fieldMap.get(u.user_id))}
                    onOpen={() => setOpenUser(u)}
                  />
                ))}
              </AdminTable>
            )}
          </>
        ) : waitlist.isLoading ? (
          <AdminLoading />
        ) : waitlist.isError ? (
          <AdminEmpty label={`Fehler: ${(waitlist.error as Error).message}`} />
        ) : waitRows.length === 0 ? (
          <AdminEmpty label="Noch niemand auf der Warteliste" />
        ) : (
          <AdminTable
            cols={WAIT_COLS}
            head={["E-Mail", "Quelle", "Eingetragen", "Status", "Aktion"]}
          >
            {waitRows.map((w) => (
              <WaitRow key={w.id} row={w} />
            ))}
          </AdminTable>
        )}
      </AdminCard>

      <UserSheet user={openUser} onClose={() => setOpenUser(null)} />
      <GrantRoleDialog open={roleDialog} onOpenChange={setRoleDialog} />
    </div>
  );
}

// ── Bausteine ────────────────────────────────────────────────

function SortHead({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ color: active ? "var(--a-ember)" : "inherit", fontWeight: 600 }}
    >
      {label} {active ? "↓" : ""}
    </button>
  );
}

function metaSource(metadata: unknown): string {
  if (metadata && typeof metadata === "object" && "source" in metadata) {
    const value = (metadata as Record<string, unknown>).source;
    if (typeof value === "string" && value.trim()) return value;
  }
  return "—";
}

function UserRow({
  user,
  completeness,
  onOpen,
}: {
  user: AdminUser;
  completeness: number;
  onOpen: () => void;
}) {
  const limit = user.token_limit ?? 0;
  const used = user.tokens_used ?? 0;
  const pct = limit > 0 ? Math.round((used / limit) * 100) : 0;
  return (
    <AdminRow
      cols={USER_COLS}
      cells={[
        <div key="p" className="flex min-w-0 items-center gap-2">
          <AdminAvatar name={user.display_name ?? user.email} />
          <div className="min-w-0">
            <p className="truncate" style={{ fontWeight: 600 }}>
              {user.display_name ?? user.email ?? "Ohne Namen"}
            </p>
            <p className="truncate" style={{ fontSize: 11.5, color: "var(--a-faint)" }}>
              zuletzt aktiv {relativeDE(user.last_sign_in)}
            </p>
          </div>
        </div>,
        <span key="i" className="truncate" style={{ color: "var(--a-smoke)" }}>
          {[user.industry, user.location].filter(Boolean).join(" · ") || "—"}
        </span>,
        <span key="o" className="truncate" style={{ color: "var(--a-smoke)" }}>
          {user.location ?? "—"}
        </span>,
        <span key="r" className="flex flex-wrap items-center gap-1">
          <AdminBadge mono>{user.founder_type ?? "—"}</AdminBadge>
          {user.role === "admin" && <AdminBadge variant="ember">admin</AdminBadge>}
        </span>,
        <div key="c">
          <AdminBar
            value={completeness}
            color={completeness >= 80 ? "var(--a-green)" : "var(--a-amber)"}
          />
          <span style={{ fontSize: 11.5, color: "var(--a-faint)" }}>{completeness} %</span>
        </div>,
        limit > 0 ? (
          <div key="t">
            <AdminBar
              value={pct}
              color={pct >= 100 ? "var(--a-red)" : "var(--a-ember)"}
            />
            <span style={{ fontSize: 11.5, color: "var(--a-faint)" }}>
              {formatTokens(used)} / {formatTokens(limit)}
            </span>
          </div>
        ) : (
          <AdminBadge key="t">kein Limit</AdminBadge>
        ),
        <AdminBtn key="a" onClick={onOpen}>
          Öffnen
        </AdminBtn>,
      ]}
    />
  );
}

function WaitRow({ row }: { row: WaitlistRow }) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(row.status);

  async function invite() {
    setBusy(true);
    const { error } = await supabase
      .from("waitlist")
      .update({ status: "invited" })
      .eq("id", row.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setStatus("invited");
    toast.success("Als eingeladen markiert. Versand läuft noch manuell.");
    void queryClient.invalidateQueries({ queryKey: ["admin", "waitlist"] });
  }

  return (
    <AdminRow
      cols={WAIT_COLS}
      cells={[
        <span key="e" className="truncate font-mono" style={{ fontSize: 12 }}>
          {row.email}
        </span>,
        <span key="q" style={{ color: "var(--a-smoke)" }}>
          {metaSource(row.metadata)}
        </span>,
        <span key="d" style={{ color: "var(--a-smoke)" }}>
          {dateTimeDE(row.created_at)}
        </span>,
        row.confirmed_at ? (
          <AdminBadge key="s" variant="green">
            bestätigt
          </AdminBadge>
        ) : (
          <AdminBadge key="s" variant="amber">
            neu
          </AdminBadge>
        ),
        <AdminBtn key="a" onClick={invite} disabled={busy || status === "invited"}>
          {status === "invited" ? "eingeladen" : "Einladen"}
        </AdminBtn>,
      ]}
    />
  );
}

function UserSheet({ user, onClose }: { user: AdminUser | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [limit, setLimit] = useState("");
  const [busy, setBusy] = useState(false);

  const current = user;

  async function saveGrant() {
    if (!current) return;
    const value = Number(limit);
    if (!Number.isFinite(value) || value < 0) {
      toast.error("Bitte eine gültige Zahl eingeben.");
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("ai_token_grants")
      .upsert({ user_id: current.user_id, token_limit: value }, { onConflict: "user_id" });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Kontingent gespeichert.");
    void queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    void queryClient.invalidateQueries({ queryKey: ["admin", "token-grants"] });
  }

  async function toggleAdmin() {
    if (!current) return;
    setBusy(true);
    const isAdmin = current.role === "admin";
    const { error } = isAdmin
      ? await supabase.rpc("admin_revoke_role", { p_user_id: current.user_id, p_role: "admin" })
      : await supabase.rpc("admin_grant_role", {
          p_email: current.email ?? "",
          p_role: "admin",
        });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(isAdmin ? "Admin-Rolle entzogen." : "Admin-Rolle vergeben.");
    void queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    void queryClient.invalidateQueries({ queryKey: ["admin", "roles"] });
    onClose();
  }

  return (
    <Sheet open={Boolean(user)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="admin-shell w-full overflow-y-auto sm:max-w-md">
        {current && (
          <>
            <SheetHeader>
              <SheetTitle>{current.display_name ?? current.email ?? "Profil"}</SheetTitle>
            </SheetHeader>
            <div className="mt-4 flex flex-col gap-3" style={{ fontSize: 13 }}>
              <Field label="E-Mail" value={current.email ?? "—"} />
              <Field label="Branche" value={current.industry ?? "—"} />
              <Field label="Ort" value={current.location ?? "—"} />
              <Field label="Typ" value={current.founder_type ?? "—"} />
              <Field label="Rolle" value={current.role ?? "user"} />
              <Field label="Onboarding" value={current.is_onboarded ? "abgeschlossen" : "offen"} />
              <Field label="Registriert" value={formatDateDE(current.created_at)} />
              <Field label="Letzte Anmeldung" value={relativeDE(current.last_sign_in)} />
              <Field
                label="KI-Kontingent"
                value={
                  (current.token_limit ?? 0) > 0
                    ? `${formatTokens(current.tokens_used ?? 0)} / ${formatTokens(current.token_limit ?? 0)}`
                    : "kein Limit"
                }
              />
              {current.grant_note && <Field label="Notiz" value={current.grant_note} />}

              <div className="mt-2 flex flex-col gap-2">
                <Label htmlFor="grant-limit" className="text-[12px]">
                  Kontingent setzen (Tokens)
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="grant-limit"
                    value={limit}
                    onChange={(e) => setLimit(e.target.value)}
                    inputMode="numeric"
                    placeholder={String(current.token_limit ?? 0)}
                    className="h-9 text-[13px]"
                  />
                  <AdminBtn variant="ember" onClick={saveGrant} disabled={busy}>
                    Speichern
                  </AdminBtn>
                </div>
                <AdminBtn variant="ghost" icon={ShieldCheck} onClick={toggleAdmin} disabled={busy}>
                  {current.role === "admin" ? "Admin-Rolle entziehen" : "Admin-Rolle geben"}
                </AdminBtn>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span style={{ color: "var(--a-faint)" }}>{label}</span>
      <span className="text-right" style={{ fontWeight: 600 }}>
        {value}
      </span>
    </div>
  );
}

function GrantRoleDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "user">("admin");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!email.trim()) {
      toast.error("Bitte eine E-Mail eingeben.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.rpc("admin_grant_role", {
      p_email: email.trim(),
      p_role: role,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Rolle vergeben.");
    setEmail("");
    onOpenChange(false);
    void queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    void queryClient.invalidateQueries({ queryKey: ["admin", "roles"] });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="admin-shell sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Rolle vergeben</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="role-email" className="text-[12px]">
              E-Mail
            </Label>
            <Input
              id="role-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="person@example.com"
              className="h-9 text-[13px]"
            />
          </div>
          <AdminPills
            options={[
              { value: "admin" as const, label: "admin" },
              { value: "user" as const, label: "user" },
            ]}
            value={role}
            onChange={setRole}
          />
          <p style={{ fontSize: 12, color: "var(--a-faint)" }}>
            Die Person muss bereits registriert sein — sonst meldet die Datenbank einen Fehler.
          </p>
        </div>
        <DialogFooter>
          <AdminBtn variant="ember" onClick={submit} disabled={busy}>
            Rolle vergeben
          </AdminBtn>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
