import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, Download, Loader2, Printer, Save, Sparkles } from "lucide-react";
import { toast } from "sonner";
import type { Grant } from "@/data/grants";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { readPlanContext, type PlanContext } from "@/lib/plan-draft";
import {
  buildDraftMarkdown,
  buildGrantApplicationPackage,
  buildGrantFormDraft,
  computeFormFillPct,
  downloadGrantFormDraft,
  listOpenItems,
  mergeGrantFormDraft,
  printGrantForm,
  readGrantFormDraft,
  writeGrantFormDraft,
  type GrantFormDraft,
} from "@/lib/grant-application";
import { Button } from "@/components/ui/button";

function isExistGrant(grant: Grant): boolean {
  return `${grant.slug} ${grant.name}`.toLowerCase().includes("exist");
}

function documentTypeFor(grant: Grant): "exist_antrag" | "profit_antrag" | "custom" {
  if (isExistGrant(grant)) return "exist_antrag";
  if (`${grant.slug} ${grant.name}`.toLowerCase().includes("profit")) return "profit_antrag";
  return "custom";
}

export function GrantApplicationForm({
  grant,
  planContext,
}: {
  grant: Grant;
  planContext: PlanContext | null;
}) {
  const { user, session, isDemo } = useAuth();
  const seedDraft = useMemo(
    () => buildGrantFormDraft(buildGrantApplicationPackage(grant, planContext)),
    [grant, planContext],
  );

  const [draft, setDraft] = useState<GrantFormDraft>(() =>
    mergeGrantFormDraft(seedDraft, readGrantFormDraft(grant.slug)),
  );
  const [filling, setFilling] = useState(false);
  const [saving, setSaving] = useState(false);
  const didMount = useRef(false);

  // Wenn sich der Kontext (Onboarding) ändert, neue Felder übernehmen, Eingaben behalten.
  useEffect(() => {
    setDraft((current) => mergeGrantFormDraft(seedDraft, current));
  }, [seedDraft]);

  // Auto-Save in localStorage bei jeder Änderung (außer initialem Render).
  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return;
    }
    writeGrantFormDraft(draft);
  }, [draft]);

  const fillPct = computeFormFillPct(draft);
  const openItems = listOpenItems(draft);

  function setField(key: string, value: string) {
    setDraft((d) => ({
      ...d,
      updatedAt: new Date().toISOString(),
      fields: d.fields.map((f) => (f.key === key ? { ...f, value } : f)),
    }));
  }

  function setSection(id: string, body: string) {
    setDraft((d) => ({
      ...d,
      updatedAt: new Date().toISOString(),
      sections: d.sections.map((s) => (s.id === id ? { ...s, body } : s)),
    }));
  }

  async function fillWithCopilot() {
    setFilling(true);
    try {
      // 1. Leere strukturierte Abschnitte lokal mit Vorlagentext seeden.
      const template = buildGrantFormDraft(buildGrantApplicationPackage(grant, planContext));
      setDraft((d) => ({
        ...d,
        updatedAt: new Date().toISOString(),
        fields: d.fields.map((f) => {
          if (f.locked || f.value.trim()) return f;
          const t = template.fields.find((tf) => tf.key === f.key);
          return t && t.value.trim() ? { ...f, value: t.value } : f;
        }),
        sections: d.sections.map((s) => {
          if (s.body.trim()) return s;
          const t = template.sections.find((ts) => ts.id === s.id);
          return t ? { ...s, body: t.body } : s;
        }),
      }));

      // 2. Für EXIST + eingeloggte Nutzer: KI-Volltext-Entwurf vom Backend holen.
      const canUseBackend = Boolean(session && user && !isDemo && isExistGrant(grant));
      if (canUseBackend) {
        const { data, error } = await supabase.functions.invoke("copilot", {
          body: {
            task: "document_exist",
            message: `Erstelle einen EXIST-Antragsentwurf für ${grant.name}`,
            extra: { grant, onboarding: planContext ?? readPlanContext() },
          },
        });
        if (error) throw error;
        const content = (data?.document as { content?: string } | undefined)?.content?.trim();
        if (content) {
          setDraft((d) => {
            const exists = d.sections.some((s) => s.id === "copilot-fulltext");
            const aiSection = {
              id: "copilot-fulltext",
              title: "Co-Pilot Volltext-Entwurf (bearbeitbar)",
              body: content,
            };
            return {
              ...d,
              updatedAt: new Date().toISOString(),
              sections: exists
                ? d.sections.map((s) => (s.id === "copilot-fulltext" ? aiSection : s))
                : [aiSection, ...d.sections],
            };
          });
          toast.success("Co-Pilot hat den EXIST-Entwurf eingearbeitet");
        } else {
          toast.success("Vorlage eingesetzt — Co-Pilot lieferte keinen Zusatztext");
        }
      } else {
        toast.success("Formular mit Vorlage vorausgefüllt");
      }
    } catch (err) {
      console.error(err);
      toast.warning("Backend nicht erreichbar — lokale Vorlage eingesetzt");
    } finally {
      setFilling(false);
    }
  }

  async function copyMarkdown() {
    try {
      await navigator.clipboard.writeText(buildDraftMarkdown(draft));
      toast.success("Antrag kopiert");
    } catch {
      toast.error("Kopieren nicht möglich");
    }
  }

  async function saveToCloud() {
    if (!session || !user || isDemo) {
      toast.success("Lokal gespeichert (zum Cloud-Speichern einloggen)");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("copilot_documents").insert({
        user_id: user.id,
        type: documentTypeFor(grant),
        title: draft.title,
        content: buildDraftMarkdown(draft),
        draft_content: JSON.stringify(draft),
        fill_pct: fillPct,
        status: fillPct >= 90 ? "ready" : "draft",
        metadata: { grant_slug: grant.slug, open_items: openItems },
      });
      if (error) throw error;
      toast.success("Antrag in deinem Konto gespeichert");
    } catch (err) {
      console.error(err);
      toast.error("Cloud-Speichern fehlgeschlagen — lokal gesichert");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="glass-pane p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="eyebrow">Antrag ausfüllen</div>
          <div className="mt-1 text-[20px] font-semibold tracking-tight">{draft.title}</div>
          <p className="mt-1 max-w-xl text-[13px] text-[var(--smoke)]">
            Jedes Feld ist editierbar. Co-Pilot füllt Vorschläge vor — überschreib sie mit deinen
            echten Angaben und exportiere am Ende als PDF.
          </p>
        </div>
        <div className="text-right">
          <div className="text-[34px] font-semibold leading-none tracking-tight text-[var(--ember-deep)]">
            {fillPct}%
          </div>
          <div className="text-[11px] text-[var(--smoke)]">ausgefüllt</div>
        </div>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[rgba(21,20,15,0.08)]">
        <div
          className="h-full rounded-full bg-[var(--ember)] transition-all"
          style={{ width: `${fillPct}%` }}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          onClick={fillWithCopilot}
          disabled={filling}
          className="h-10 gap-2 rounded-lg bg-[var(--ember)] text-white hover:bg-[var(--ember-deep)]"
        >
          {filling ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {filling ? "Co-Pilot füllt aus…" : "Mit Co-Pilot ausfüllen"}
        </Button>
        <Button
          onClick={saveToCloud}
          disabled={saving}
          variant="ghost"
          className="glass-pill h-10 gap-2 rounded-lg px-4"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Speichern
        </Button>
        <Button
          onClick={() => printGrantForm(draft)}
          variant="ghost"
          className="glass-pill h-10 gap-2 rounded-lg px-4"
        >
          <Printer className="h-4 w-4" /> Als PDF
        </Button>
        <Button
          onClick={() => downloadGrantFormDraft(draft)}
          variant="ghost"
          className="glass-pill h-10 gap-2 rounded-lg px-4"
        >
          <Download className="h-4 w-4" /> .md
        </Button>
        <Button
          onClick={copyMarkdown}
          variant="ghost"
          className="glass-pill h-10 gap-2 rounded-lg px-4"
        >
          <Copy className="h-4 w-4" /> Kopieren
        </Button>
      </div>

      {/* Felder */}
      <div className="mt-6">
        <div className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[var(--smoke)]">
          Formularfelder
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {draft.fields.map((field) => (
            <label key={field.key} className="block">
              <span className="flex items-center justify-between text-[11px] font-semibold text-[var(--ink)]">
                {field.label}
                {field.locked && (
                  <span className="font-mono text-[9.5px] font-normal uppercase tracking-[0.1em] text-[var(--smoke)]">
                    fix
                  </span>
                )}
              </span>
              <input
                value={field.value}
                disabled={field.locked}
                onChange={(e) => setField(field.key, e.target.value)}
                placeholder="—"
                className="mt-1 w-full rounded-lg border border-[var(--ruled)] bg-white px-3 py-2 text-[13px] text-[var(--ink)] outline-none focus:border-[var(--ember)] disabled:bg-[var(--paper)] disabled:text-[var(--smoke)]"
              />
            </label>
          ))}
        </div>
      </div>

      {/* Abschnitte */}
      <div className="mt-6 space-y-4">
        <div className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[var(--smoke)]">
          Antragstext
        </div>
        {draft.sections.map((section) => (
          <label key={section.id} className="block">
            <span className="text-[13px] font-semibold text-[var(--ink)]">{section.title}</span>
            <textarea
              value={section.body}
              onChange={(e) => setSection(section.id, e.target.value)}
              rows={Math.min(12, Math.max(4, Math.ceil((section.body.length || 80) / 90) + 2))}
              placeholder="Hier ausfüllen…"
              className="mt-1.5 w-full resize-y rounded-lg border border-[var(--ruled)] bg-white px-3 py-2 text-[13px] leading-relaxed text-[var(--ink)] outline-none focus:border-[var(--ember)]"
            />
          </label>
        ))}
      </div>

      {/* Offene Punkte */}
      <div className="mt-5 rounded-lg bg-[var(--paper)] p-4">
        <div className="text-[12px] font-semibold text-[var(--ink)]">
          Noch offen ({openItems.length})
        </div>
        {openItems.length > 0 ? (
          <ul className="mt-2 flex flex-wrap gap-2">
            {openItems.map((item) => (
              <li
                key={item}
                className="rounded-full bg-[var(--ember-tint)] px-2.5 py-1 text-[11px] font-medium text-[var(--ember-deep)]"
              >
                {item}
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-2 flex items-center gap-2 text-[12.5px] text-[var(--ink-soft)]">
            <Check className="h-3.5 w-3.5 text-[var(--ember-deep)]" /> Alle Pflichtfelder
            ausgefüllt. Vor Einreichung gegen die offizielle Programmseite prüfen.
          </div>
        )}
      </div>
    </div>
  );
}
