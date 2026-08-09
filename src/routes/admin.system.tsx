// ─────────────────────────────────────────────────────────────
// Admin → Datenquellen & Zugriff: Status der JSON-Kataloge,
// Konnektor-Nutzung und Admin-Rollen.
// ─────────────────────────────────────────────────────────────

import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Database, Plug, RefreshCw, ShieldCheck, Trash2 } from "lucide-react";
import {
  AdminAvatar,
  AdminBadge,
  AdminBtn,
  AdminCard,
  AdminCardHead,
  AdminEmpty,
  AdminLoading,
  AdminRow,
  AdminTable,
} from "@/components/admin/ui";
import { useAdminRoles, useConnectorStats } from "@/hooks/admin/useAdminData";
import { useSectionActions } from "@/components/admin/context";
import { dateTimeDE, formatDateDE } from "@/lib/admin-format";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/system")({
  head: () => ({ meta: [{ title: "Datenquellen & Zugriff — Admin · matchfoundr" }] }),
  component: AdminSystem,
});

const SOURCES = [
  { key: "deals", label: "Deals", file: "/deals.json" },
  { key: "grants", label: "Förderungen", file: "/grants.json" },
  { key: "partners", label: "Partner", file: "/partners.json" },
] as const;

type SourceInfo = {
  ok: boolean;
  generatedAt: string | null;
  count: number;
};

const SOURCE_COLS = "1fr 1fr 0.8fr 0.8fr";
const CONNECTOR_COLS = "1.2fr 1.2fr 0.7fr 0.8fr";
const ROLE_COLS = "1.4fr 1.4fr 0.7fr 0.9fr 0.6fr";

function AdminSystem() {
  const connectors = useConnectorStats();
  const roles = useAdminRoles();
  const queryClient = useQueryClient();

  const sources = useQueries({
    queries: SOURCES.map((s) => ({
      queryKey: ["admin", "source", s.key],
      staleTime: 60_000,
      queryFn: async (): Promise<SourceInfo> => {
        const res = await fetch(s.file, { cache: "no-store" });
        if (!res.ok) return { ok: false, generatedAt: null, count: 0 };
        const json = (await res.json()) as Record<string, unknown>;
        const items = Array.isArray(json.items)
          ? json.items
          : Array.isArray(json.deals)
            ? json.deals
            : Array.isArray(json.partners)
              ? json.partners
              : Array.isArray(json.grants)
                ? json.grants
                : [];
        const generatedAt =
          typeof json.generated_at === "string" ? json.generated_at : null;
        return { ok: true, generatedAt, count: items.length };
      },
    })),
  });

  useSectionActions(
    {
      onExport: () => {
        void queryClient.invalidateQueries({ queryKey: ["admin"] });
        toast.success("Daten neu geladen.");
      },
    },
    [],
  );

  const adminRoles = useMemo(
    () => (roles.data ?? []).filter((r) => r.role === "admin"),
    [roles.data],
  );

  async function revoke(userId: string) {
    const { error } = await supabase.rpc("admin_revoke_role", {
      p_user_id: userId,
      p_role: "admin",
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Admin-Rolle entzogen.");
    void queryClient.invalidateQueries({ queryKey: ["admin", "roles"] });
  }

  return (
    <div className="flex flex-col gap-4">
      <AdminCard>
        <AdminCardHead
          icon={Database}
          accent="indigo"
          title="Datenquellen"
          sub="Statische Kataloge aus dem Scraper-Workflow"
          right={
            <AdminBtn
              icon={RefreshCw}
              onClick={() => {
                void queryClient.invalidateQueries({ queryKey: ["admin", "source"] });
              }}
            >
              Prüfen
            </AdminBtn>
          }
        />
        <AdminTable cols={SOURCE_COLS} head={["Quelle", "Zuletzt erzeugt", "Einträge", "Status"]}>
          {SOURCES.map((s, i) => {
            const q = sources[i];
            const info = q?.data;
            return (
              <AdminRow
                key={s.key}
                cols={SOURCE_COLS}
                cells={[
                  <span key="n" style={{ fontWeight: 600 }}>
                    {s.label}
                    <span className="ml-1.5 font-mono" style={{ fontSize: 11, color: "var(--a-faint)" }}>
                      {s.file}
                    </span>
                  </span>,
                  <span key="d" style={{ color: "var(--a-smoke)" }}>
                    {q?.isLoading
                      ? "prüfe…"
                      : info?.generatedAt
                        ? `${formatDateDE(info.generatedAt)} · ${dateTimeDE(info.generatedAt)}`
                        : "unbekannt"}
                  </span>,
                  <span key="c" className="admin-num">
                    {info?.count ?? 0}
                  </span>,
                  q?.isLoading ? (
                    <AdminBadge key="s">prüfe…</AdminBadge>
                  ) : info?.ok ? (
                    <AdminBadge key="s" variant="green">
                      erreichbar
                    </AdminBadge>
                  ) : (
                    <AdminBadge key="s" variant="red">
                      fehlt
                    </AdminBadge>
                  ),
                ]}
              />
            );
          })}
        </AdminTable>
      </AdminCard>

      <AdminCard>
        <AdminCardHead
          icon={Plug}
          accent="ember"
          title="Konnektoren"
          sub="Verknüpfte Konten und MCP-Zugriffe je Datenquelle"
        />
        {connectors.isLoading ? (
          <AdminLoading />
        ) : connectors.isError ? (
          <AdminEmpty label={`Fehler: ${(connectors.error as Error).message}`} />
        ) : (connectors.data ?? []).length === 0 ? (
          <AdminEmpty label="Noch keine Konnektoren verbunden" />
        ) : (
          <AdminTable
            cols={CONNECTOR_COLS}
            head={["Konnektor", "Tabelle", "Nutzer", "Status"]}
          >
            {(connectors.data ?? []).map((c) => (
              <AdminRow
                key={`${c.name}-${c.source_table}`}
                cols={CONNECTOR_COLS}
                cells={[
                  <span key="n" style={{ fontWeight: 600 }}>
                    {c.name}
                  </span>,
                  <span key="t" className="font-mono" style={{ fontSize: 12, color: "var(--a-smoke)" }}>
                    {c.source_table}
                  </span>,
                  <span key="u" className="admin-num">
                    {c.users}
                  </span>,
                  <AdminBadge key="s" variant={c.state === "active" ? "green" : "soft"}>
                    {c.state}
                  </AdminBadge>,
                ]}
              />
            ))}
          </AdminTable>
        )}
      </AdminCard>

      <AdminCard>
        <AdminCardHead
          icon={ShieldCheck}
          accent="green"
          title="Admin-Zugriff"
          sub="Wer den Admin-Bereich sehen und Daten ändern darf"
        />
        {roles.isLoading ? (
          <AdminLoading />
        ) : roles.isError ? (
          <AdminEmpty label={`Fehler: ${(roles.error as Error).message}`} />
        ) : adminRoles.length === 0 ? (
          <AdminEmpty label="Keine Admin-Rollen vergeben" />
        ) : (
          <AdminTable cols={ROLE_COLS} head={["Person", "E-Mail", "Rolle", "Seit", "Aktion"]}>
            {adminRoles.map((r) => (
              <AdminRow
                key={r.user_id}
                cols={ROLE_COLS}
                cells={[
                  <span key="p" className="flex min-w-0 items-center gap-2">
                    <AdminAvatar name={r.display_name ?? r.email} size={26} />
                    <span className="truncate" style={{ fontWeight: 600 }}>
                      {r.display_name ?? "Ohne Namen"}
                    </span>
                  </span>,
                  <span key="e" className="truncate font-mono" style={{ fontSize: 12 }}>
                    {r.email ?? "—"}
                  </span>,
                  <AdminBadge key="r" variant="ember">
                    {r.role}
                  </AdminBadge>,
                  <span key="s" style={{ color: "var(--a-smoke)" }}>
                    {formatDateDE(r.since)}
                  </span>,
                  <AdminBtn key="a" icon={Trash2} variant="quiet" onClick={() => revoke(r.user_id)}>
                    Entziehen
                  </AdminBtn>,
                ]}
              />
            ))}
          </AdminTable>
        )}
      </AdminCard>
    </div>
  );
}
