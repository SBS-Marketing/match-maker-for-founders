// ─────────────────────────────────────────────────────────────
// Admin → Team-Board: Kanban auf admin_tasks mit Drag & Drop.
// Die Spalten entsprechen exakt der Check-Constraint auf
// admin_tasks.board_column ('inbox','doing','review','done').
// ─────────────────────────────────────────────────────────────

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Clock, Github, Inbox, Plus, Trash2, Wand2 } from "lucide-react";
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
import { downloadCsv, dueLabelDE, isDueSoon, relativeDE } from "@/lib/admin-format";
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
import {
  ACCENT_DOTS,
  ACCENT_LABELS,
  TASK_ACCENTS,
  TASK_CATEGORIES,
  isTaskAccent,
  taskHue,
  type TaskAccent,
} from "@/lib/admin-task-categories";

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

type GithubLink = {
  repo: string | null;
  issue: number;
  url: string | null;
  state: string | null;
  synced_at: string | null;
};

type Draft = {
  id?: string;
  title: string;
  board_column: string;
  tag: string;
  hue: TaskAccent;
  /** Eigene Kategorie: Name und Farbe werden frei gewählt. */
  custom: boolean;
  assignee_id: string;
  assignee_name: string;
  due_at: string;
  github?: GithubLink | null;
};

const EMPTY_DRAFT: Draft = {
  title: "",
  board_column: "inbox",
  tag: "",
  hue: "soft",
  custom: false,
  assignee_id: "",
  assignee_name: "",
  due_at: "",
  github: null,
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);
  const [person, setPerson] = useState<string>("all");
  const [seeding, setSeeding] = useState(false);

  const rows = useMemo(() => tasks.data ?? [], [tasks.data]);

  const admins = useMemo(() => (roles.data ?? []).filter((r) => r.role === "admin"), [roles.data]);

  /** Vorgaben plus alle Kategorien, die bereits in der Datenbank vorkommen. */
  const categoryOptions = useMemo(() => {
    const map = new Map<string, TaskAccent>();
    for (const c of TASK_CATEGORIES) map.set(c.label, c.hue);
    for (const task of rows) {
      const tag = task.tag?.trim();
      if (!tag || map.has(tag)) continue;
      map.set(tag, taskHue(task));
    }
    return [...map].map(([label, hue]) => ({ label, hue }));
  }, [rows]);

  const personOptions = useMemo(
    () => [
      { value: "all", label: "Alle" },
      { value: "github", label: "Nur GitHub" },
      ...admins.map((a) => ({ value: a.user_id, label: firstName(a) })),
    ],
    [admins],
  );

  const visible = useMemo(() => {
    if (person === "all") return rows;
    if (person === "github") return rows.filter((t) => t.github_issue_number !== null);
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
      onNew: () => {
        setDraft({ ...EMPTY_DRAFT });
        setDialogOpen(true);
      },
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
    setDialogOpen(false);
    void queryClient.invalidateQueries({ queryKey: ["admin", "board-tasks"] });
  }

  async function remove(id: string) {
    const { error } = await supabase.from("admin_tasks").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Aufgabe gelöscht.");
    setDialogOpen(false);
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

      const seed = (title: string, source: string, tag: string): SeedRow => ({
        title,
        source,
        tag,
        hue: taskHue({ tag }),
      });

      const candidates: SeedRow[] = [
        ...(offers.data ?? []).map((o) =>
          seed(
            `Angebot freigeben: ${o.name}${o.firm ? ` (${o.firm})` : ""}`,
            "partner_offers",
            "Freigabe",
          ),
        ),
        ...(events.data ?? []).map((e) =>
          seed(`Event veröffentlichen: ${e.title}`, "community_events", "Event"),
        ),
        ...(guides.data ?? []).map((g) =>
          seed(`Guide fertigstellen: ${g.title}`, "guides", "Inhalt"),
        ),
        ...(applications.data ?? []).map((a) =>
          seed(`Bewerbung prüfen: ${a.company}`, "partner_applications", "Partner"),
        ),
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
              <AdminBtn
                icon={Plus}
                variant="ember"
                onClick={() => {
                  setDraft({ ...EMPTY_DRAFT });
                  setDialogOpen(true);
                }}
              >
                Erste Aufgabe anlegen
              </AdminBtn>
              <AdminBtn icon={Wand2} disabled={seeding} onClick={() => void seedFromBacklog()}>
                {seeding ? "Übernimmt…" : "Offene Freigaben übernehmen"}
              </AdminBtn>
            </div>
            <p style={{ fontSize: 11.5, color: "var(--a-faint)", maxWidth: 420 }}>
              Verknüpfte GitHub-Issues (Label „board“) erscheinen hier automatisch, sobald der
              Webhook eingerichtet ist.
            </p>
          </div>
        </AdminCard>
        <TaskDialog
          draft={draft}
          open={dialogOpen}
          admins={admins}
          categories={categoryOptions}
          onChange={setDraft}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) setDraft(null);
          }}
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
              style={{
                background: active ? "rgba(226,81,28,0.07)" : "rgba(255,255,255,0.34)",
                border: `1px solid ${active ? "rgba(226,81,28,0.35)" : "var(--a-border)"}`,
                borderRadius: 16,
                padding: 10,
                minHeight: 320,
                backdropFilter: "blur(20px) saturate(1.5)",
                transition: "background 160ms ease, border-color 160ms ease",
              }}
            >
              <div
                className="flex items-center justify-between gap-2"
                style={{ padding: "4px 6px 10px" }}
              >
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--a-ink)" }}>
                  {col.label}
                </span>
                <div className="flex items-center gap-1">
                  <span
                    style={{
                      fontSize: 11.5,
                      fontWeight: 600,
                      color: "var(--a-smoke)",
                      background: "var(--a-deep)",
                      borderRadius: 99,
                      padding: "2px 8px",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {list.length}
                  </span>
                  <AdminBtn
                    icon={Plus}
                    variant="quiet"
                    title="Aufgabe hinzufügen"
                    onClick={() => {
                      setDraft({ ...EMPTY_DRAFT, board_column: col.key });
                      setDialogOpen(true);
                    }}
                  />
                </div>
              </div>
              <div className="flex flex-col" style={{ gap: 9 }}>
                {list.length === 0 ? (
                  <p
                    className="text-center"
                    style={{
                      border: "1px dashed var(--a-border-soft)",
                      borderRadius: 12,
                      padding: "18px 10px",
                      fontSize: 12,
                      color: "var(--a-faint)",
                    }}
                  >
                    Karte hierher ziehen
                  </p>
                ) : (
                  list.map((task) => {
                    const hue = taskHue(task);
                    const dragging = dragId === task.id;
                    const due = task.due_at ? isDueSoon(task.due_at) : false;
                    return (
                      <button
                        key={task.id}
                        type="button"
                        draggable
                        onDragStart={() => setDragId(task.id)}
                        onDragEnd={() => setDragId(null)}
                        onClick={() => {
                          setDraft({
                            id: task.id,
                            title: task.title,
                            board_column: task.board_column,
                            tag: task.tag ?? "",
                            hue,
                            custom: false,
                            assignee_id: task.assignee_id ?? "",
                            assignee_name: task.assignee_name ?? "",
                            due_at: task.due_at ?? "",
                            github:
                              task.github_issue_number !== null
                                ? {
                                    repo: task.github_repo,
                                    issue: task.github_issue_number,
                                    url: task.github_url,
                                    state: task.github_state,
                                    synced_at: task.github_synced_at,
                                  }
                                : null,
                          });
                          setDialogOpen(true);
                        }}
                        className="w-full text-left transition"
                        style={{
                          background: dragging ? "rgba(255,255,255,0.94)" : "var(--a-surface)",
                          backdropFilter: "blur(20px) saturate(1.5)",
                          border: "1px solid var(--a-border)",
                          outline: "1px solid var(--a-border-soft)",
                          outlineOffset: -1,
                          borderRadius: 13,
                          padding: "11px 12px",
                          boxShadow: "var(--a-shadow)",
                          opacity: dragging ? 0.55 : 1,
                          cursor: "grab",
                        }}
                      >
                        {(task.tag || task.github_issue_number !== null) && (
                          <div
                            className="flex flex-wrap items-center gap-2"
                            style={{ marginBottom: 7 }}
                          >
                            {task.tag && <AdminBadge variant={hue}>{task.tag}</AdminBadge>}
                            {task.github_issue_number !== null && (
                              <span className="flex items-center gap-1">
                                {task.github_state === "closed" && (
                                  <Check
                                    size={11}
                                    strokeWidth={2.5}
                                    style={{ color: "var(--a-green)" }}
                                    aria-label="Issue geschlossen"
                                  />
                                )}
                                <a
                                  href={task.github_url ?? undefined}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex items-center gap-1 font-mono hover:underline"
                                  style={{ fontSize: 10.5, color: "var(--a-smoke)" }}
                                >
                                  <Github size={12} strokeWidth={1.9} />#{task.github_issue_number}
                                </a>
                              </span>
                            )}
                          </div>
                        )}

                        <p
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            lineHeight: 1.35,
                            textWrap: "pretty",
                          }}
                        >
                          {task.title}
                        </p>
                        {task.source && (
                          <p
                            className="font-mono"
                            style={{
                              marginTop: 5,
                              fontSize: 10.5,
                              color: "var(--a-faint)",
                              overflowWrap: "anywhere",
                            }}
                          >
                            {task.source}
                          </p>
                        )}
                        {(task.assignee_name || task.due_at) && (
                          <div
                            className="flex items-center justify-between gap-2"
                            style={{ marginTop: 10 }}
                          >
                            {task.assignee_name ? (
                              <span className="flex min-w-0 items-center gap-1.5">
                                <AdminAvatar name={task.assignee_name} size={22} />
                                <span
                                  className="truncate"
                                  style={{ fontSize: 11.5, color: "var(--a-smoke)" }}
                                >
                                  {task.assignee_name.split(/[\s@]/)[0] || task.assignee_name}
                                </span>
                              </span>
                            ) : (
                              <span />
                            )}
                            {task.due_at && (
                              <span
                                className="flex items-center gap-1"
                                style={{
                                  fontSize: 11.5,
                                  fontWeight: 600,
                                  whiteSpace: "nowrap",
                                  color: due ? "var(--a-ember)" : "var(--a-faint)",
                                }}
                              >
                                <Clock size={12} strokeWidth={2} />
                                {dueLabelDE(task.due_at)}
                              </span>
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      <TaskDialog
        draft={draft}
        open={dialogOpen}
        admins={admins}
        categories={categoryOptions}
        onChange={setDraft}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setDraft(null);
        }}
        onSave={save}
        onDelete={remove}
      />
    </div>
  );
}

type AdminOption = { user_id: string; display_name: string | null; email: string | null };

const CUSTOM_OPTION = "__custom__";

function TaskDialog({
  draft,
  open,
  admins,
  categories,
  onChange,
  onOpenChange,
  onSave,
  onDelete,
}: {
  draft: Draft | null;
  open: boolean;
  admins: AdminOption[];
  categories: { label: string; hue: TaskAccent }[];
  onChange: (next: Draft) => void;
  onOpenChange: (open: boolean) => void;
  onSave: (next: Draft) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="admin-tokens sm:max-w-md">
        {draft && (
          <>
            <DialogHeader>
              <DialogTitle>{draft.id ? "Aufgabe bearbeiten" : "Neue Aufgabe"}</DialogTitle>
            </DialogHeader>
            <div className="admin-dialog-body flex flex-col gap-3 pr-1">
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
                <FormField label="Kategorie">
                  <select
                    value={draft.custom ? CUSTOM_OPTION : draft.tag}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === CUSTOM_OPTION) {
                        onChange({ ...draft, custom: true });
                        return;
                      }
                      onChange({
                        ...draft,
                        custom: false,
                        tag: value,
                        hue: taskHue({
                          tag: value,
                          hue: categories.find((c) => c.label === value)?.hue,
                        }),
                      });
                    }}
                    className="h-9 w-full rounded-md border px-2 text-[13px]"
                    style={{ borderColor: "var(--a-border)", background: "var(--a-surface-solid)" }}
                  >
                    <option value="">Keine Kategorie</option>
                    {categories.map((c) => (
                      <option key={c.label} value={c.label} style={{ color: ACCENT_DOTS[c.hue] }}>
                        ● {c.label}
                      </option>
                    ))}
                    <option value={CUSTOM_OPTION}>Eigene Kategorie…</option>
                  </select>
                </FormField>
              </div>
              {draft.custom && (
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Name">
                    <Input
                      value={draft.tag}
                      placeholder="z. B. QA"
                      onChange={(e) => onChange({ ...draft, tag: e.target.value })}
                      className="h-9 text-[13px]"
                    />
                  </FormField>
                  <FormField label="Farbe">
                    <select
                      value={draft.hue}
                      onChange={(e) =>
                        onChange({
                          ...draft,
                          hue: isTaskAccent(e.target.value) ? e.target.value : "soft",
                        })
                      }
                      className="h-9 w-full rounded-md border px-2 text-[13px]"
                      style={{
                        borderColor: "var(--a-border)",
                        background: "var(--a-surface-solid)",
                      }}
                    >
                      {TASK_ACCENTS.map((accent) => (
                        <option key={accent} value={accent} style={{ color: ACCENT_DOTS[accent] }}>
                          ● {ACCENT_LABELS[accent]}
                        </option>
                      ))}
                    </select>
                  </FormField>
                </div>
              )}
              <FormField label="Fällig">
                <Input
                  type="date"
                  value={draft.due_at}
                  onChange={(e) => onChange({ ...draft, due_at: e.target.value })}
                  className="h-9 text-[13px]"
                />
              </FormField>

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

              {draft.github && <GithubPanel link={draft.github} />}
            </div>

            <DialogFooter className="gap-2">
              {draft.id && (
                <AdminBtn
                  variant="quiet"
                  icon={Trash2}
                  onClick={() => {
                    if (draft.id) onDelete(draft.id);
                  }}
                >
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

/** Schreibgeschützte Übersicht der GitHub-Verknüpfung einer Karte. */
function GithubPanel({ link }: { link: GithubLink }) {
  const closed = link.state === "closed";
  return (
    <div style={{ background: "var(--a-soft)", borderRadius: 12, padding: 12 }}>
      <div
        className="flex items-center gap-1.5"
        style={{ fontSize: 12, fontWeight: 650, color: "var(--a-ink)" }}
      >
        <Github size={13} strokeWidth={1.9} />
        Verknüpft mit GitHub
      </div>
      <div className="flex flex-col gap-1.5" style={{ marginTop: 9 }}>
        <GithubRow label="Issue">
          <a
            href={link.url ?? undefined}
            target="_blank"
            rel="noreferrer"
            className="font-mono hover:underline"
            style={{ fontSize: 11.5, color: "var(--a-smoke)", overflowWrap: "anywhere" }}
          >
            {link.repo ? `${link.repo} #${link.issue}` : `#${link.issue}`}
          </a>
        </GithubRow>
        <GithubRow label="Status">
          <AdminBadge variant={closed ? "soft" : "green"}>
            {closed ? "geschlossen" : "offen"}
          </AdminBadge>
        </GithubRow>
        <GithubRow label="Zuletzt synchronisiert">
          <span style={{ fontSize: 11.5, color: "var(--a-smoke)" }}>
            {relativeDE(link.synced_at, "noch nie")}
          </span>
        </GithubRow>
      </div>
      <p style={{ marginTop: 9, fontSize: 11, color: "var(--a-faint)", lineHeight: 1.45 }}>
        Spalte und Titel werden automatisch zurück zu GitHub gemeldet. Andere Felder
        (Verantwortlich, Fällig, Kategorie) bleiben nur im Board.
      </p>
    </div>
  );
}

function GithubRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span style={{ fontSize: 11.5, color: "var(--a-faint)" }}>{label}</span>
      {children}
    </div>
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
