import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Building2,
  Copy,
  ExternalLink,
  Eye,
  GripVertical,
  Image as ImageIcon,
  Loader2,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import { AuthGate } from "@/components/AuthGate";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { logActivity } from "@/lib/activity";
import { uploadImage } from "@/lib/upload";
import { readPlanContext, type PlanContext } from "@/lib/plan-draft";
import {
  blockLabel,
  emptyBlock,
  readComposition,
  videoEmbedSrc,
  writeComposition,
  type BlockType,
  type CompanyBlock,
  type CompanyComposition,
} from "@/lib/company-blocks";
import { CompanyBlocksView, VideoFrame } from "@/components/CompanyBlocksView";

export const Route = createFileRoute("/firma")({
  head: () => ({ meta: [{ title: "Firmenprofil — matchfoundr" }] }),
  component: () => (
    <AuthGate>
      <CompanyPage />
    </AuthGate>
  ),
});

const BLOCK_TYPES: BlockType[] = [
  "hero",
  "about",
  "text",
  "metrics",
  "highlights",
  "image",
  "video",
  "team",
  "cta",
];

function companySlug(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/ä/g, "ae")
      .replace(/ö/g, "oe")
      .replace(/ü/g, "ue")
      .replace(/ß/g, "ss")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "startup"
  );
}

function CompanyPage() {
  const { user, session, isDemo } = useAuth();
  const planContext = useMemo(() => readPlanContext(), []);
  const [composition, setComposition] = useState<CompanyComposition>(() =>
    readComposition(planContext),
  );
  const [mode, setMode] = useState<"preview" | "edit">("edit");
  const [publishedSlug, setPublishedSlug] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [cloudLoaded, setCloudLoaded] = useState(false);
  const canUseCloud = Boolean(session && user && !isDemo);

  useEffect(() => {
    writeComposition(composition);
  }, [composition]);

  // Cloud-Load: gespeicherte Komposition des Nutzers übernehmen.
  useEffect(() => {
    if (!canUseCloud || !user) return;
    let cancelled = false;
    supabase
      .from("company_profiles")
      .select("slug, composition, published")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        if (data?.composition && typeof data.composition === "object") {
          const remote = data.composition as unknown as CompanyComposition;
          if (Array.isArray(remote.blocks) && remote.blocks.length > 0) {
            setComposition(remote);
          }
        }
        if (data?.published) setPublishedSlug(data.slug);
        setCloudLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [canUseCloud, user]);

  // Cloud-Save: debounced nach jeder Änderung (erst nach dem Initial-Load).
  useEffect(() => {
    if (!canUseCloud || !user || !cloudLoaded) return;
    const timer = window.setTimeout(() => {
      supabase
        .from("company_profiles")
        .upsert(
          {
            user_id: user.id,
            slug: publishedSlug ?? companySlug(composition.name),
            name: composition.name,
            composition: JSON.parse(JSON.stringify(composition)),
          },
          { onConflict: "user_id" },
        )
        .then(({ error }) => {
          if (error) console.error("company save failed", error);
        });
    }, 900);
    return () => window.clearTimeout(timer);
  }, [canUseCloud, user, cloudLoaded, composition, publishedSlug]);

  async function publish() {
    setPublishing(true);
    try {
      if (!canUseCloud || !user) {
        // Demo: lokale Vorschau-URL teilen.
        await navigator.clipboard.writeText(`${window.location.origin}/s/preview`);
        await logActivity(
          { session, user, isDemo },
          "profile_published",
          `Firmenprofil von „${composition.name}" veröffentlicht`,
        );
        toast.success("Vorschau-Link kopiert — melde dich an, um echt zu veröffentlichen.");
        setPublishedSlug("preview");
        return;
      }
      let slug = publishedSlug ?? companySlug(composition.name);
      let { error } = await supabase.from("company_profiles").upsert(
        {
          user_id: user.id,
          slug,
          name: composition.name,
          composition: JSON.parse(JSON.stringify(composition)),
          published: true,
        },
        { onConflict: "user_id" },
      );
      if (error && error.code === "23505") {
        // Slug bereits vergeben → Suffix anhängen und erneut versuchen.
        slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
        ({ error } = await supabase.from("company_profiles").upsert(
          {
            user_id: user.id,
            slug,
            name: composition.name,
            composition: JSON.parse(JSON.stringify(composition)),
            published: true,
          },
          { onConflict: "user_id" },
        ));
      }
      if (error) throw error;
      setPublishedSlug(slug);
      await navigator.clipboard.writeText(`${window.location.origin}/s/${slug}`);
      await logActivity(
        { session, user, isDemo },
        "profile_published",
        `Firmenprofil von „${composition.name}" veröffentlicht`,
        { slug },
      );
      toast.success("Veröffentlicht — öffentlicher Link kopiert!");
    } catch (err) {
      console.error(err);
      toast.error("Veröffentlichen fehlgeschlagen");
    } finally {
      setPublishing(false);
    }
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setComposition((c) => {
      const oldIdx = c.blocks.findIndex((b) => b.id === active.id);
      const newIdx = c.blocks.findIndex((b) => b.id === over.id);
      if (oldIdx < 0 || newIdx < 0) return c;
      return {
        ...c,
        blocks: arrayMove(c.blocks, oldIdx, newIdx),
        updatedAt: new Date().toISOString(),
      };
    });
  }

  function patchBlock(id: string, patch: Partial<CompanyBlock>) {
    setComposition((c) => ({
      ...c,
      blocks: c.blocks.map((b) => (b.id === id ? ({ ...b, ...patch } as CompanyBlock) : b)),
      updatedAt: new Date().toISOString(),
    }));
  }

  function addBlock(type: BlockType) {
    setComposition((c) => ({
      ...c,
      blocks: [...c.blocks, emptyBlock(type)],
      updatedAt: new Date().toISOString(),
    }));
    toast.success(`Block „${blockLabel(type)}" hinzugefügt`);
  }

  function removeBlock(id: string) {
    setComposition((c) => ({
      ...c,
      blocks: c.blocks.filter((b) => b.id !== id),
      updatedAt: new Date().toISOString(),
    }));
  }

  async function copyLink() {
    const url = publishedSlug
      ? `${window.location.origin}/s/${publishedSlug}`
      : `${window.location.origin}/firma`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success(publishedSlug ? "Öffentlicher Link kopiert" : "Profil-Link kopiert");
    } catch {
      toast.error("Link konnte nicht kopiert werden");
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pt-5 pb-24 sm:px-6 sm:pt-8">
      <Header
        composition={composition}
        mode={mode}
        publishedSlug={publishedSlug}
        publishing={publishing}
        onPublish={publish}
        onModeChange={setMode}
        onCopyLink={copyLink}
        onPatchMeta={(patch) =>
          setComposition((c) => ({ ...c, ...patch, updatedAt: new Date().toISOString() }))
        }
      />

      {mode === "edit" ? (
        <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_280px]">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext
              items={composition.blocks.map((b) => b.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {composition.blocks.map((block) => (
                  <SortableBlock
                    key={block.id}
                    block={block}
                    planContext={planContext}
                    onPatch={(patch) => patchBlock(block.id, patch)}
                    onRemove={() => removeBlock(block.id)}
                  />
                ))}
                {composition.blocks.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-[var(--ruled)] bg-[var(--surface-soft)] p-10 text-center text-[13.5px] text-[var(--smoke)]">
                    Noch keine Blöcke. Wähle rechts einen Block-Typ.
                  </div>
                )}
              </div>
            </SortableContext>
          </DndContext>

          <aside className="space-y-3 xl:sticky xl:top-20 xl:self-start">
            <div className="rounded-2xl border border-[var(--ruled)] bg-[var(--surface)] p-4">
              <div className="eyebrow">Block hinzufügen</div>
              <div className="mt-3 grid grid-cols-2 gap-2 xl:grid-cols-1">
                {BLOCK_TYPES.map((type) => (
                  <button
                    key={type}
                    onClick={() => addBlock(type)}
                    className="inline-flex items-center justify-between gap-2 rounded-xl border border-[var(--ruled)] bg-[var(--surface-soft)] px-3 py-2.5 text-left text-[13px] font-medium text-[var(--ink)] transition hover:bg-[var(--ember-tint)] hover:text-[var(--ember-deep)]"
                  >
                    <span className="truncate">{blockLabel(type)}</span>
                    <Plus className="h-3.5 w-3.5 shrink-0" />
                  </button>
                ))}
              </div>
              <p className="mt-3 text-[11.5px] leading-relaxed text-[var(--smoke)]">
                Halte den Griff links eines Blocks gedrückt, um ihn neu zu sortieren.
              </p>
            </div>
          </aside>
        </div>
      ) : (
        <div className="mt-6">
          <CompanyPreview composition={composition} onCopyLink={copyLink} />
        </div>
      )}
    </div>
  );
}

function Header({
  composition,
  mode,
  publishedSlug,
  publishing,
  onPublish,
  onModeChange,
  onCopyLink,
  onPatchMeta,
}: {
  composition: CompanyComposition;
  mode: "preview" | "edit";
  publishedSlug: string | null;
  publishing: boolean;
  onPublish: () => void;
  onModeChange: (mode: "preview" | "edit") => void;
  onCopyLink: () => void;
  onPatchMeta: (patch: Partial<CompanyComposition>) => void;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-[var(--ink)]">Deine Seite</h1>
        {mode === "edit" && (
          <div className="mt-3 flex flex-wrap gap-2">
            <MetaField
              label="Name"
              value={composition.name}
              onChange={(v) => onPatchMeta({ name: v })}
            />
            <MetaField
              label="Kategorie"
              value={composition.category}
              onChange={(v) => onPatchMeta({ category: v })}
            />
            <MetaField
              label="Phase"
              value={composition.stage}
              onChange={(v) => onPatchMeta({ stage: v })}
            />
            <MetaField
              label="Ort"
              value={composition.city}
              onChange={(v) => onPatchMeta({ city: v })}
            />
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={onPublish}
          disabled={publishing}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--ember)] px-4 text-[13px] font-semibold text-white shadow-ember hover:bg-[var(--ember-deep)] disabled:opacity-60"
        >
          {publishing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <ExternalLink className="h-3.5 w-3.5" />
          )}
          {publishedSlug ? "Update veröffentlichen" : "Veröffentlichen"}
        </button>
        {publishedSlug && (
          <a
            href={`/s/${publishedSlug}`}
            target="_blank"
            rel="noopener"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--ruled)] bg-[var(--surface)] px-3.5 text-[13px] font-semibold text-[var(--ember-deep)] hover:bg-[var(--ember-tint)]"
          >
            <Eye className="h-3.5 w-3.5" /> Öffentlich ansehen
          </a>
        )}
        <button
          onClick={onCopyLink}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--ruled)] bg-[var(--surface)] px-3.5 text-[13px] font-semibold text-[var(--ink)] hover:bg-[var(--surface-soft)]"
        >
          <Copy className="h-3.5 w-3.5" /> Link kopieren
        </button>
        <div className="inline-flex h-10 items-center rounded-xl border border-[var(--ruled)] bg-[var(--surface)] p-1">
          <ToggleBtn active={mode === "edit"} onClick={() => onModeChange("edit")}>
            <Pencil className="h-3.5 w-3.5" /> Bearbeiten
          </ToggleBtn>
          <ToggleBtn active={mode === "preview"} onClick={() => onModeChange("preview")}>
            <Eye className="h-3.5 w-3.5" /> Vorschau
          </ToggleBtn>
        </div>
      </div>
    </div>
  );
}

function ToggleBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "inline-flex h-full items-center gap-1.5 rounded-lg px-3 text-[12.5px] font-semibold transition",
        active
          ? "bg-[var(--ember-tint)] text-[var(--ember-deep)]"
          : "text-[var(--smoke)] hover:text-[var(--ink)]",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function MetaField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="inline-flex items-center gap-2 rounded-full border border-[var(--ruled)] bg-[var(--surface)] px-3 py-1.5 text-[12px]">
      <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--smoke)]">
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-28 bg-transparent text-[12.5px] font-medium text-[var(--ink)] outline-none"
      />
    </label>
  );
}

// ─── Sortable Block wrapper ───────────────────────────────────

function SortableBlock({
  block,
  planContext,
  onPatch,
  onRemove,
}: {
  block: CompanyBlock;
  planContext: PlanContext | null;
  onPatch: (patch: Partial<CompanyBlock>) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.55 : 1,
  } as React.CSSProperties;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group rounded-2xl border border-[var(--ruled)] bg-[var(--surface)] shadow-[0_1px_2px_rgba(23,21,15,0.04),0_10px_26px_-18px_rgba(23,21,15,0.18)]"
    >
      <div className="flex items-center justify-between gap-2 border-b border-[var(--ruled-soft)] px-3 py-2">
        <div className="flex items-center gap-2">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab rounded-md p-1 text-[var(--faint)] hover:bg-[var(--surface-soft)] hover:text-[var(--ink)] active:cursor-grabbing"
            aria-label="Block verschieben"
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[var(--smoke)]">
            {blockLabel(block.type)}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <CopilotFillButton block={block} planContext={planContext} onPatch={onPatch} />
          <button
            onClick={onRemove}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--faint)] hover:bg-red-50 hover:text-red-600"
            aria-label="Block entfernen"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className="p-4 sm:p-5">
        <BlockEditor block={block} onPatch={onPatch} />
      </div>
    </div>
  );
}

function CopilotFillButton({
  block,
  planContext,
  onPatch,
}: {
  block: CompanyBlock;
  planContext: PlanContext | null;
  onPatch: (patch: Partial<CompanyBlock>) => void;
}) {
  const { user, session, isDemo } = useAuth();
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      const prompt = promptForBlock(block, planContext);
      if (!session || !user || isDemo) {
        applyLocalDraft(block, planContext, onPatch);
        toast.success("Block mit Vorlage gefüllt");
        return;
      }
      const { data, error } = await supabase.functions.invoke("copilot", {
        body: { task: "chat", message: prompt, extra: { onboarding: planContext } },
      });
      if (error) throw error;
      const answer = typeof data?.answer === "string" ? data.answer.trim() : "";
      if (!answer) {
        applyLocalDraft(block, planContext, onPatch);
        toast.success("Block mit Vorlage gefüllt");
        return;
      }
      applyCopilotAnswer(block, answer, onPatch);
      toast.success("Co-Pilot hat den Block ausgefüllt");
    } catch (err) {
      console.error(err);
      applyLocalDraft(block, planContext, onPatch);
      toast.warning("Co-Pilot offline — Vorlage eingesetzt");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={run}
      disabled={busy}
      className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-[11.5px] font-semibold text-[var(--ember-deep)] hover:bg-[var(--ember-tint)] disabled:opacity-60"
    >
      {busy ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Sparkles className="h-3.5 w-3.5" />
      )}
      Co-Pilot
    </button>
  );
}

function promptForBlock(block: CompanyBlock, planContext: PlanContext | null): string {
  const idea = planContext?.context.idea || "unser Vorhaben";
  const stage = planContext?.context.stage || "frühe Phase";
  const goal = planContext?.context.goal || "die nächsten Schritte";
  const base = `Schreibe Inhalt für den Firmenprofil-Block „${blockLabel(block.type)}". Kontext: Vorhaben „${idea}", Phase „${stage}", Ziel „${goal}". Auf Deutsch, direkt, ohne Floskeln.`;
  switch (block.type) {
    case "hero":
      return `${base} Liefere genau in 3 Zeilen: Zeile 1 = ein scharfer Claim (max 9 Wörter), Zeile 2 = Untertitel mit Phase und Stadt, Zeile 3 = 2 Sätze Hero-Body.`;
    case "about":
      return `${base} Schreibe einen About-Absatz mit max 4 Sätzen.`;
    case "text":
      return `${base} Schreibe einen kompakten Abschnitt mit 2–4 Sätzen.`;
    case "metrics":
      return `${base} Schlage 3 messbare Status-Metriken in der Form "Wert · Label" vor (je eine pro Zeile).`;
    case "highlights":
      return `${base} Liste 3 konkrete Highlights, je eine Zeile, ohne Aufzählungszeichen.`;
    case "team":
      return `${base} Schlage 1-3 Rollen vor, je eine Zeile in der Form "Name — Rolle".`;
    case "cta":
      return `${base} Liefere genau in 2 Zeilen: Zeile 1 = Headline, Zeile 2 = ein Satz Body.`;
    default:
      return base;
  }
}

function applyCopilotAnswer(
  block: CompanyBlock,
  answer: string,
  onPatch: (patch: Partial<CompanyBlock>) => void,
) {
  const lines = answer
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  switch (block.type) {
    case "hero":
      onPatch({
        title: lines[0] || block.title,
        subtitle: lines[1] || block.subtitle,
        body: lines.slice(2).join(" ") || answer,
      });
      return;
    case "about":
    case "text":
      onPatch({ body: answer });
      return;
    case "metrics": {
      const items = lines.slice(0, 4).map((l) => {
        const [v, ...rest] = l.split(/[·:\-—]/);
        return { value: (v || "").trim() || "—", label: rest.join(" ").trim() || l };
      });
      if (items.length) onPatch({ items });
      return;
    }
    case "highlights":
      onPatch({ items: lines.slice(0, 6) });
      return;
    case "team": {
      const members = lines.slice(0, 4).map((l) => {
        const [name, ...rest] = l.split(/[—\-·]/);
        return { name: (name || "").trim(), role: rest.join(" ").trim() };
      });
      if (members.length) onPatch({ members });
      return;
    }
    case "cta":
      onPatch({ headline: lines[0] || block.headline, body: lines[1] || block.body });
      return;
  }
}

function applyLocalDraft(
  block: CompanyBlock,
  planContext: PlanContext | null,
  onPatch: (patch: Partial<CompanyBlock>) => void,
) {
  const idea = planContext?.context.idea || "unser Vorhaben";
  const stage = planContext?.context.stage || "frühe Phase";
  switch (block.type) {
    case "hero":
      onPatch({
        title: idea,
        subtitle: `${stage} · Berlin`,
        body: `Wir bauen ${idea} und suchen die richtigen Partner für den nächsten Schritt.`,
      });
      return;
    case "about":
    case "text":
      onPatch({
        body: `${idea} adressiert ein klares Problem für eine eng definierte Zielgruppe und liefert eine messbare Verbesserung im Alltag.`,
      });
      return;
    case "highlights":
      onPatch({
        items: ["Erste Validierungs-Signale", "Klarer ICP", "Förderfähiger Innovationskern"],
      });
      return;
    case "cta":
      onPatch({ headline: "Lass uns sprechen.", body: "Wir suchen Pilot-Founder und Advisor." });
      return;
  }
}

// ─── Block editors ────────────────────────────────────────────

function BlockEditor({
  block,
  onPatch,
}: {
  block: CompanyBlock;
  onPatch: (patch: Partial<CompanyBlock>) => void;
}) {
  switch (block.type) {
    case "hero":
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <TextInput
            label="Eyebrow"
            value={block.eyebrow}
            onChange={(v) => onPatch({ eyebrow: v })}
          />
          <TextInput
            label="Untertitel"
            value={block.subtitle}
            onChange={(v) => onPatch({ subtitle: v })}
          />
          <ImageUploadInput
            label="Bild (optional)"
            value={block.imageUrl || ""}
            onChange={(v) => onPatch({ imageUrl: v })}
            className="sm:col-span-2"
          />
          <TextInput
            label="Titel"
            value={block.title}
            onChange={(v) => onPatch({ title: v })}
            className="sm:col-span-2"
          />
          <TextArea
            label="Body"
            value={block.body}
            onChange={(v) => onPatch({ body: v })}
            rows={3}
            className="sm:col-span-2"
          />
          <TextInput
            label="CTA-Label"
            value={block.ctaLabel || ""}
            onChange={(v) => onPatch({ ctaLabel: v })}
          />
          <TextInput
            label="CTA-Link"
            value={block.ctaHref || ""}
            onChange={(v) => onPatch({ ctaHref: v })}
          />
        </div>
      );
    case "about":
    case "text":
      return (
        <div className="space-y-3">
          <TextInput
            label="Titel"
            value={block.title || ""}
            onChange={(v) => onPatch({ title: v })}
          />
          <TextArea
            label="Inhalt"
            value={block.body}
            onChange={(v) => onPatch({ body: v })}
            rows={5}
          />
        </div>
      );
    case "metrics":
      return (
        <div className="space-y-3">
          <TextInput
            label="Titel"
            value={block.title || ""}
            onChange={(v) => onPatch({ title: v })}
          />
          <div className="grid gap-3 sm:grid-cols-3">
            {block.items.map((item, idx) => (
              <div
                key={idx}
                className="space-y-2 rounded-xl border border-[var(--ruled)] bg-[var(--surface-soft)] p-3"
              >
                <TextInput
                  label={`Wert ${idx + 1}`}
                  value={item.value}
                  onChange={(v) =>
                    onPatch({
                      items: block.items.map((m, i) => (i === idx ? { ...m, value: v } : m)),
                    })
                  }
                />
                <TextInput
                  label="Label"
                  value={item.label}
                  onChange={(v) =>
                    onPatch({
                      items: block.items.map((m, i) => (i === idx ? { ...m, label: v } : m)),
                    })
                  }
                />
              </div>
            ))}
          </div>
          <ListAddRemove
            onAdd={() => onPatch({ items: [...block.items, { value: "", label: "" }] })}
            onRemove={
              block.items.length > 1
                ? () => onPatch({ items: block.items.slice(0, -1) })
                : undefined
            }
          />
        </div>
      );
    case "highlights":
      return (
        <div className="space-y-3">
          <TextInput
            label="Titel"
            value={block.title || ""}
            onChange={(v) => onPatch({ title: v })}
          />
          {block.items.map((it, idx) => (
            <TextInput
              key={idx}
              label={`Highlight ${idx + 1}`}
              value={it}
              onChange={(v) => onPatch({ items: block.items.map((m, i) => (i === idx ? v : m)) })}
            />
          ))}
          <ListAddRemove
            onAdd={() => onPatch({ items: [...block.items, ""] })}
            onRemove={
              block.items.length > 1
                ? () => onPatch({ items: block.items.slice(0, -1) })
                : undefined
            }
          />
        </div>
      );
    case "image":
      return (
        <div className="space-y-3">
          <ImageUploadInput label="Bild" value={block.url} onChange={(v) => onPatch({ url: v })} />
          <TextInput
            label="Bildunterschrift (optional)"
            value={block.caption || ""}
            onChange={(v) => onPatch({ caption: v })}
          />
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--smoke)]">
              Format
            </span>
            {(["16/9", "4/3", "1/1"] as const).map((a) => (
              <button
                key={a}
                onClick={() => onPatch({ aspect: a })}
                className={[
                  "rounded-full border px-3 py-1 text-[12px] font-semibold",
                  block.aspect === a
                    ? "border-[var(--ember)] bg-[var(--ember-tint)] text-[var(--ember-deep)]"
                    : "border-[var(--ruled)] text-[var(--smoke)] hover:text-[var(--ink)]",
                ].join(" ")}
              >
                {a}
              </button>
            ))}
          </div>
          {block.url && (
            <div className="overflow-hidden rounded-xl border border-[var(--ruled)]">
              <img src={block.url} alt={block.caption || ""} className="w-full" />
            </div>
          )}
        </div>
      );
    case "video":
      return (
        <div className="space-y-3">
          <TextInput
            label="Video-URL (YouTube, Vimeo oder .mp4)"
            value={block.url}
            onChange={(v) => onPatch({ url: v })}
          />
          <TextInput
            label="Untertitel (optional)"
            value={block.caption || ""}
            onChange={(v) => onPatch({ caption: v })}
          />
          {videoEmbedSrc(block.url) && <VideoFrame url={block.url} />}
        </div>
      );
    case "team":
      return (
        <div className="space-y-3">
          <TextInput
            label="Titel"
            value={block.title || ""}
            onChange={(v) => onPatch({ title: v })}
          />
          <div className="space-y-3">
            {block.members.map((member, idx) => (
              <div
                key={idx}
                className="grid gap-3 rounded-xl border border-[var(--ruled)] bg-[var(--surface-soft)] p-3 sm:grid-cols-2"
              >
                <TextInput
                  label={`Name ${idx + 1}`}
                  value={member.name}
                  onChange={(v) =>
                    onPatch({
                      members: block.members.map((m, i) => (i === idx ? { ...m, name: v } : m)),
                    })
                  }
                />
                <TextInput
                  label="Rolle"
                  value={member.role}
                  onChange={(v) =>
                    onPatch({
                      members: block.members.map((m, i) => (i === idx ? { ...m, role: v } : m)),
                    })
                  }
                />
                <ImageUploadInput
                  label="Avatar (optional)"
                  value={member.avatarUrl || ""}
                  onChange={(v) =>
                    onPatch({
                      members: block.members.map((m, i) =>
                        i === idx ? { ...m, avatarUrl: v } : m,
                      ),
                    })
                  }
                />
                <TextInput
                  label="LinkedIn (optional)"
                  value={member.linkedin || ""}
                  onChange={(v) =>
                    onPatch({
                      members: block.members.map((m, i) => (i === idx ? { ...m, linkedin: v } : m)),
                    })
                  }
                />
              </div>
            ))}
          </div>
          <ListAddRemove
            onAdd={() => onPatch({ members: [...block.members, { name: "", role: "" }] })}
            onRemove={
              block.members.length > 1
                ? () => onPatch({ members: block.members.slice(0, -1) })
                : undefined
            }
          />
        </div>
      );
    case "cta":
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <TextInput
            label="Headline"
            value={block.headline}
            onChange={(v) => onPatch({ headline: v })}
            className="sm:col-span-2"
          />
          <TextArea
            label="Body"
            value={block.body || ""}
            onChange={(v) => onPatch({ body: v })}
            rows={2}
            className="sm:col-span-2"
          />
          <TextInput
            label="Button-Label"
            value={block.label}
            onChange={(v) => onPatch({ label: v })}
          />
          <TextInput label="Link" value={block.href} onChange={(v) => onPatch({ href: v })} />
        </div>
      );
  }
}

function ListAddRemove({ onAdd, onRemove }: { onAdd: () => void; onRemove?: () => void }) {
  return (
    <div className="flex gap-2">
      <button
        onClick={onAdd}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--ruled)] bg-[var(--surface-soft)] px-3 text-[12px] font-semibold text-[var(--ink)] hover:bg-[var(--ember-tint)] hover:text-[var(--ember-deep)]"
      >
        <Plus className="h-3 w-3" /> Eintrag
      </button>
      {onRemove && (
        <button
          onClick={onRemove}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--ruled)] bg-[var(--surface-soft)] px-3 text-[12px] font-semibold text-[var(--smoke)] hover:bg-red-50 hover:text-red-600"
        >
          <Trash2 className="h-3 w-3" /> Letzten entfernen
        </button>
      )}
    </div>
  );
}

// URL-Feld mit Datei-Upload (Storage bzw. DataURL im Demo).
function ImageUploadInput({
  label,
  value,
  onChange,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  const { user, session, isDemo } = useAuth();
  const [uploading, setUploading] = useState(false);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(file, { session, user, isDemo });
      onChange(url);
      toast.success("Bild hochgeladen");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload fehlgeschlagen");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className={`block ${className || ""}`}>
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--smoke)]">
        {label}
      </span>
      <div className="mt-1.5 flex gap-2">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://… oder hochladen →"
          className="min-w-0 flex-1 rounded-xl border border-[var(--ruled)] bg-[var(--surface)] px-3 py-2 text-[13px] text-[var(--ink)] outline-none focus:border-[var(--ember)]"
        />
        <label className="inline-flex h-[38px] shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border border-[var(--ruled)] bg-[var(--surface-soft)] px-3 text-[12px] font-semibold text-[var(--ink)] hover:bg-[var(--ember-tint)] hover:text-[var(--ember-deep)]">
          {uploading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <ImageIcon className="h-3.5 w-3.5" />
          )}
          Upload
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
        </label>
      </div>
    </div>
  );
}

function TextInput({
  label,
  value,
  onChange,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <label className={`block ${className || ""}`}>
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--smoke)]">
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full rounded-xl border border-[var(--ruled)] bg-[var(--surface)] px-3 py-2 text-[13px] text-[var(--ink)] outline-none focus:border-[var(--ember)]"
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  rows = 3,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  className?: string;
}) {
  return (
    <label className={`block ${className || ""}`}>
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--smoke)]">
        {label}
      </span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="mt-1.5 w-full resize-y rounded-xl border border-[var(--ruled)] bg-[var(--surface)] px-3 py-2 text-[13px] leading-relaxed text-[var(--ink)] outline-none focus:border-[var(--ember)]"
      />
    </label>
  );
}

// ─── Preview rendering ────────────────────────────────────────

function CompanyPreview({
  composition,
  onCopyLink,
}: {
  composition: CompanyComposition;
  onCopyLink: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-[22px] border border-[var(--ruled)] bg-[var(--surface)] shadow-[0_2px_6px_rgba(23,21,15,0.05),0_28px_56px_-28px_rgba(23,21,15,0.24)]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--ruled)] bg-[var(--surface-soft)] px-5 py-3 text-[12.5px]">
        <div className="flex items-center gap-2 font-semibold text-[var(--ink)]">
          <Building2 className="h-4 w-4 text-[var(--ember)]" />
          {composition.name} · {composition.category} · {composition.stage} · {composition.city}
        </div>
        <button
          onClick={onCopyLink}
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--ruled)] bg-[var(--surface)] px-3 py-1 text-[11.5px] font-semibold text-[var(--ink)] hover:bg-[var(--ember-tint)] hover:text-[var(--ember-deep)]"
        >
          <Copy className="h-3 w-3" /> Link
        </button>
      </div>

      <CompanyBlocksView composition={composition} />
    </div>
  );
}
