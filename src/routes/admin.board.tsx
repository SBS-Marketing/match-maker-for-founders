// ─────────────────────────────────────────────────────────────
// Admin → Team-Board: Kanban auf admin_tasks mit Drag & Drop.
// Die Spalten entsprechen exakt der Check-Constraint auf
// admin_tasks.board_column ('inbox','doing','review','done').
// ─────────────────────────────────────────────────────────────

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Inbox, Plus, Trash2, Wand2 } from "lucide-react";
import {
  AdminAvatar,
  AdminBadge,
  AdminBtn,
  AdminCard,
  AdminEmpty,
  AdminLoading,
  AdminPills,
} from "@/components/admin/ui";
import { useAdminRoles, useBoardTasks, type BoardTask } from "@/hooks/admin/useAdminData";
import { useSectionActions } from "@/components/admin/context";
import { downloadCsv, dueLabelDE, isDueSoon } from "@/lib/admin-format";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/admin/board")({
  head: () => ({ meta: [{ title: "Team-Board — Admin · matchfoundr" }] }),
  component: AdminBoard,
});

// Muss deckungsgleich mit admin_tasks_board_column_check bleiben.
const COLUMNS = [
  { key: "inbox", label: "Eingang" },
  { key: "doing", label: "In Arbeit" },
  { key: "review", label: "Review" },
  { key: "done", label: "Erledigt" },
] as const;

const HUES: Record<string, string> = {
  ember: "var(--a-ember)",
  indigo: "var(--a-indigo)",
  green: "var(--a-green)",
  amber: "var(--a-amber)",
  red: "var(--a-red)",
};

function hueColor(hue: string): string {
  return HUES[hue] ?? "var(--a-smoke)";
}

type Draft = {
  id?: string;
  title: string;
  board_column: string;
  tag: string;
  hue: string;
  assignee_id: string;
  assignee_name: string;
  due_at: string;
};

const EMPTY_DRAFT: Draft = {
  title: "",
  board_column: "inbox",
  tag: "",
  hue: "ember",
  assignee_id: "",
  assignee_name: "",
  due_at: "",
};

type SeedRow = {
  title: string;
  source: string;
  tag: string;
  hue: string;
};

function firstName(row: { display_name: string | null; email: string | null }): string {
  const base = row.display_name?.trim() || row.email?.trim() || "Admin";
  return base.split(/[\s@]/)[0] || base;
}

function AdminBoard() {
  const tasks = useBoardTasks();
  const roles = useAdminRoles();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);
  const [person, setPerson] = useState<string>("all");
  const [seeding, setSeeding] = useState(false);

  const rows = useMemo(() => tasks.data ?? [], [tasks.data]);

  const admins = useMemo(() => (roles.data ?? []).filter((r) => r.role === "admin"), [roles.data]);

  const personOptions = useMemo(
    () => [
      { value: "all", label: "Alle" },
      ...admins.map((a) => ({ value: a.user_id, label: firstName(a) })),
    ],
    [admins],
  );

  const visible = useMemo(() => {
    if (person === "all") return rows;
    const admin = admins.find((a) => a.user_id === person);
    if (!admin) return rows;
    const name = admin.display_name?.trim() || admin.email?.trim() || "";
    return rows.filter((t) => t.assignee_id === person || (name && t.assignee_name === name));
  }, [rows, person, admins]);

  const grouped = useMemo(() => {
    const map = new Map<string, BoardTask[]>();
    for (const col of COLUMNS) map.set(col.key, []);
    for (const task of visible) {
      const key = map.has(task.board_column) ? task.board_column : "inbox";
      map.get(key)!.push(task);
    }
    for (const list of map.values()) list.sort((a, b) => a.position - b.position);
    return map;
  }, [visible]);

  useSectionActions(
    {
      newLabel: "Aufgabe",
      onNew: () => setDraft({ ...EMPTY_DRAFT }),
      onExport: () =>
        downloadCsv(
          "team-board.csv",
          ["Titel", "Spalte", "Tag", "Verantwortlich", "Fällig"],
          rows.map((t) => [t.title, t.board_column, t.tag, t.assignee_name, t.due_at]),
        ),
    },
    [rows],
  );

  async function moveTo(taskId: string, column: string) {
    const task = rows.find((t) => t.id === taskId);
    if (!task || task.board_column === column) return;
    const position = (grouped.get(column)?.length ?? 0) + 1;
    queryClient.setQueryData<BoardTask[]>(
      ["admin", "board-tasks", false],
      (prev) =>
        prev?.map((t) => (t.id === taskId ? { ...t, board_column: column, position } : t)) ?? prev,
    );
    const { error } = await supabase
      .from("admin_tasks")
      .update({ board_column: column, position })
      .eq("id", taskId);
    if (error) toast.error(error.message);
    void queryClient.invalidateQueries({ queryKey: ["admin", "board-tasks"] });
  }

  async function save(next: Draft) {
    if (!next.title.trim()) {
      toast.error("Bitte einen Titel eingeben.");
      return;
    }
    const payload = {
      title: next.title.trim(),
      board_column: next.board_column,
      tag: next.tag.trim() || null,
      hue: next.hue,
      assignee_id: next.assignee_id || null,
      assignee_name: next.assignee_name.trim() || null,
      due_at: next.due_at || null,
      due_label: dueLabelDE(next.due_at || null),
    };
    const { error } = next.id
      ? await supabase.from("admin_tasks").update(payload).eq("id", next.id)
      : await supabase.from("admin_tasks").insert({
          ...payload,
          position: (grouped.get(next.board_column)?.length ?? 0) + 1,
          created_by: user?.id ?? null,
        });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(next.id ? "Aufgabe aktualisiert." : "Aufgabe angelegt.");
    setDraft(null);
    void queryClient.invalidateQueries({ queryKey: ["admin", "board-tasks"] });
  }

  async function remove(id: string) {
    const { error } = await supabase.from("admin_tasks").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Aufgabe gelöscht.");
    setDraft(null);
    void queryClient.invalidateQueries({ queryKey: ["admin", "board-tasks"] });
  }

  /** Offene Vorgänge aus den anderen Sektionen als Inbox-Karten übernehmen. */
  async function seedFromBacklog() {
    setSeeding(true);
    try {
      const [offers, events, guides, applications] = await Promise.all([
        supabase.from("partner_offers").select("name,firm").eq("review_status", "review"),
        supabase.from("community_events").select("title").eq("is_published", false),
        supabase.from("guides").select("title").eq("published", false),
        supabase.from("partner_applications").select("company").eq("status", "neu"),
      ]);
      const firstError = offers.error ?? events.error ?? guides.error ?? applications.error ?? null;
      if (firstError) {
        toast.error(`Übernehmen fehlgeschlagen: ${firstError.message}`);
        return;
      }

      const candidates: SeedRow[] = [
        ...(offers.data ?? []).map((o) => ({
          title: `Angebot freigeben: ${o.name}${o.firm ? ` (${o.firm})` : ""}`,
          source: "partner_offers",
          tag: "Freigabe",
          hue: "amber",
        })),
        ...(events.data ?? []).map((e) => ({
          title: `Event veröffentlichen: ${e.title}`,
          source: "community_events",
          tag: "Event",
          hue: "indigo",
        })),
        ...(guides.data ?? []).map((g) => ({
          title: `Guide fertigstellen: ${g.title}`,
          source: "guides",
          tag: "Inhalt",
          hue: "ember",
        })),
        ...(applications.data ?? []).map((a) => ({
          title: `Bewerbung prüfen: ${a.company}`,
          source: "partner_applications",
          tag: "Partner",
          hue: "green",
        })),
      ];

      // Nichts doppelt anlegen: gegen vorhandene source+title-Kombis abgleichen.
      const existing = new Set(rows.map((t) => `${t.source ?? ""}::${t.title}`));
      const fresh = candidates.filter((c) => !existing.has(`${c.source}::${c.title}`));
      if (fresh.length === 0) {
        toast.info("Aktuell nichts Offenes zum Übernehmen.");
        return;
      }

      const base = (grouped.get("inbox")?.length ?? 0) + 1;
      const { error } = await supabase.from("admin_tasks").insert(
        fresh.map((c, i) => ({
          ...c,
          board_column: "inbox",
          position: base + i,
          created_by: user?.id ?? null,
        })),
      );
      if (error) {
        toast.error(`Anlegen fehlgeschlagen: ${error.message}`);
        return;
      }
      toast.success(fresh.length === 1 ? "1 Karte angelegt." : `${fresh.length} Karten angelegt.`);
      void queryClient.invalidateQueries({ queryKey: ["admin", "board-tasks"] });
    } finally {
      setSeeding(false);
    }
  }

  if (tasks.isLoading) return <AdminLoading />;
  if (tasks.isError) return <AdminEmpty label={`Fehler: ${(tasks.error as Error).message}`} />;

  if (rows.length === 0) {
    return (
      <>
        <AdminCard>
          <div className="flex flex-col items-center gap-3 py-14 text-center">
            <span
              className="flex h-11 w-11 items-center justify-center rounded-2xl"
              style={{ background: "var(--a-soft)", color: "var(--a-smoke)" }}
            >
              <Inbox size={18} strokeWidth={1.75} />
            </span>
            <p style={{ fontSize: 15, fontWeight: 650 }}>Noch keine Aufgaben</p>
            <p style={{ fontSize: 13, color: "var(--a-smoke)", maxWidth: 420 }}>
              Leg die erste Karte an oder zieh die aktuell offenen Freigaben aus Events, Guides und
              Partner-Angeboten automatisch ins Board.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <AdminBtn icon={Plus} variant="ember" onClick={() => setDraft({ ...EMPTY_DRAFT })}>
                Erste Aufgabe anlegen
              </AdminBtn>
              <AdminBtn icon={Wand2} disabled={seeding} onClick={() => void seedFromBacklog()}>
                {seeding ? "Übernimmt…" : "Offene Freigaben übernehmen"}
              </AdminBtn>
            </div>
          </div>
        </AdminCard>
        <TaskDialog
          draft={draft}
          admins={admins}
          onChange={setDraft}
          onClose={() => setDraft(null)}
          onSave={save}
          onDelete={remove}
        />
      </>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <AdminPills options={personOptions} value={person} onChange={setPerson} />
        <span style={{ fontSize: 12.5, color: "var(--a-smoke)" }}>
          {visible.length === 1 ? "1 Aufgabe sichtbar" : `${visible.length} Aufgaben sichtbar`}
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map((col) => {
          const list = grouped.get(col.key) ?? [];
          const active = overCol === col.key;
          return (
            <div
              key={col.key}
              onDragOver={(e) => {
                e.preventDefault();
                setOverCol(col.key);
              }}
              onDragLeave={() => setOverCol((c) => (c === col.key ? null : c))}
              onDrop={(e) => {
                e.preventDefault();
                setOverCol(null);
                if (dragId) void moveTo(dragId, col.key);
                setDragId(null);
              }}
            >
              <AdminCard
                padding={12}
                style={
                  active
                    ? { borderColor: "var(--a-ember)", background: "var(--a-ember-tint)" }
                    : undefined
                }
              >
                <div className="mb-2.5 flex items-center justify-between gap-2">
                  <span style={{ fontSize: 13.5, fontWeight: 650 }}>{col.label}</span>
                  <div className="flex items-center gap-1.5">
                    <AdminBadge>{list.length}</AdminBadge>
                    <AdminBtn
                      icon={Plus}
                      title="Aufgabe hinzufügen"
                      onClick={() => setDraft({ ...EMPTY_DRAFT, board_column: col.key })}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {list.length === 0 ? (
                    <p
                      className="py-6 text-center"
                      style={{ fontSize: 12.5, color: "var(--a-faint)" }}
                    >
                      Nichts hier
                    </p>
                  ) : (
                    list.map((task) => (
                      <button
                        key={task.id}
                        type="button"
                        draggable
                        onDragStart={() => setDragId(task.id)}
                        onDragEnd={() => setDragId(null)}
                        onClick={() =>
                          setDraft({
                            id: task.id,
                            title: task.title,
                            board_column: task.board_column,
                            tag: task.tag ?? "",
                            hue: task.hue,
                            assignee_id: task.assignee_id ?? "",
                            assignee_name: task.assignee_name ?? "",
                            due_at: task.due_at ?? "",
                          })
                        }
                        className="w-full text-left transition"
                        style={{
                          background: "var(--a-surface-solid)",
                          border: "1px solid var(--a-border-soft)",
                          borderLeft: `3px solid ${hueColor(task.hue)}`,
                          borderRadius: 11,
                          padding: "10px 11px",
                          opacity: dragId === task.id ? 0.45 : 1,
                          cursor: "grab",
                        }}
                      >
                        <p style={{ fontSize: 13, fontWeight: 600 }}>{task.title}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          {task.tag && <AdminBadge>{task.tag}</AdminBadge>}
                          {task.source && <AdminBadge variant="indigo">{task.source}</AdminBadge>}
                          {task.due_at && (
                            <AdminBadge variant={isDueSoon(task.due_at) ? "red" : "soft"}>
                              {dueLabelDE(task.due_at)}
                            </AdminBadge>
                          )}
                          {task.assignee_name && (
                            <span className="ml-auto">
                              <AdminAvatar name={task.assignee_name} size={22} />
                            </span>
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </AdminCard>
            </div>
          );
        })}
      </div>

      <TaskDialog
        draft={draft}
        admins={admins}
        onChange={setDraft}
        onClose={() => setDraft(null)}
        onSave={save}
        onDelete={remove}
      />
    </div>
  );
}

type AdminOption = { user_id: string; display_name: string | null; email: string | null };

function TaskDialog({
  draft,
  admins,
  onChange,
  onClose,
  onSave,
  onDelete,
}: {
  draft: Draft | null;
  admins: AdminOption[];
  onChange: (next: Draft) => void;
  onClose: () => void;
  onSave: (next: Draft) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <Dialog open={Boolean(draft)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="admin-shell sm:max-w-md">
        {draft && (
          <>
            <DialogHeader>
              <DialogTitle>{draft.id ? "Aufgabe bearbeiten" : "Neue Aufgabe"}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-3">
              <FormField label="Titel">
                <Input
                  value={draft.title}
                  onChange={(e) => onChange({ ...draft, title: e.target.value })}
                  className="h-9 text-[13px]"
                />
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Spalte">
                  <select
                    value={draft.board_column}
                    onChange={(e) => onChange({ ...draft, board_column: e.target.value })}
                    className="h-9 w-full rounded-md border px-2 text-[13px]"
                    style={{ borderColor: "var(--a-border)", background: "var(--a-surface-solid)" }}
                  >
                    {COLUMNS.map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Farbe">
                  <select
                    value={draft.hue}
                    onChange={(e) => onChange({ ...draft, hue: e.target.value })}
                    className="h-9 w-full rounded-md border px-2 text-[13px]"
                    style={{ borderColor: "var(--a-border)", background: "var(--a-surface-solid)" }}
                  >
                    {Object.keys(HUES).map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Tag">
                  <Input
                    value={draft.tag}
                    onChange={(e) => onChange({ ...draft, tag: e.target.value })}
                    className="h-9 text-[13px]"
                  />
                </FormField>
                <FormField label="Fällig">
                  <Input
                    type="date"
                    value={draft.due_at}
                    onChange={(e) => onChange({ ...draft, due_at: e.target.value })}
                    className="h-9 text-[13px]"
                  />
                </FormField>
              </div>
              <FormField label="Verantwortlich">
                <select
                  value={draft.assignee_id}
                  onChange={(e) => {
                    const match = admins.find((a) => a.user_id === e.target.value);
                    onChange({
                      ...draft,
                      assignee_id: match?.user_id ?? "",
                      assignee_name: match
                        ? match.display_name?.trim() || match.email?.trim() || "Admin"
                        : "",
                    });
                  }}
                  className="h-9 w-full rounded-md border px-2 text-[13px]"
                  style={{ borderColor: "var(--a-border)", background: "var(--a-surface-solid)" }}
                >
                  <option value="">Niemand</option>
                  {admins.map((a) => (
                    <option key={a.user_id} value={a.user_id}>
                      {a.display_name?.trim() || a.email?.trim() || a.user_id.slice(0, 8)}
                    </option>
                  ))}
                </select>
                {admins.length === 0 && (
                  <span style={{ fontSize: 11.5, color: "var(--a-faint)" }}>
                    Keine Admins gefunden — Rollen unter „Datenquellen & Zugriff“ vergeben.
                  </span>
                )}
              </FormField>
            </div>
            <DialogFooter className="gap-2">
              {draft.id && (
                <AdminBtn variant="quiet" icon={Trash2} onClick={() => onDelete(draft.id!)}>
                  Löschen
                </AdminBtn>
              )}
              <AdminBtn variant="ember" onClick={() => onSave(draft)}>
                Speichern
              </AdminBtn>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-[12px]">{label}</Label>
      {children}
    </div>
  );
}
