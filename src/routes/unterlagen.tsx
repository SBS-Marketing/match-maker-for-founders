import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, FileText, FolderOpen, Wand2 } from "lucide-react";
import { AuthGate } from "@/components/AuthGate";
import { Button } from "@/components/ui/button";
import { GRANTS } from "@/data/grants";
import { readPlanContext } from "@/lib/plan-draft";

export const Route = createFileRoute("/unterlagen")({
  head: () => ({ meta: [{ title: "Unterlagen — matchfoundr" }] }),
  component: () => (
    <AuthGate>
      <DocumentsPage />
    </AuthGate>
  ),
});

type DocumentStatus = Record<string, boolean>;

const STORAGE_KEY = "mf_documents_status_v1";

function DocumentsPage() {
  const grant = GRANTS[0];
  const planContext = useMemo(() => readPlanContext(), []);
  const documents = useMemo(() => buildDocuments(), []);
  const [status, setStatus] = useState<DocumentStatus>(() => readStatus(documents));
  const [draft, setDraft] = useState(() => buildDraft(planContext?.context.idea, grant?.name));
  const [activePanel, setActivePanel] = useState<"checklist" | "draft">("checklist");
  const doneCount = documents.filter((doc) => status[doc.id]).length;
  const pct = Math.round((doneCount / documents.length) * 100);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(status));
  }, [status]);

  function toggle(id: string) {
    setStatus((current) => ({ ...current, [id]: !current[id] }));
  }

  function generateDraft() {
    setDraft(buildDraft(planContext?.context.idea, grant?.name, true));
    setStatus((current) => ({ ...current, idea: true, innovation: true }));
  }

  return (
    <div className="mx-auto flex h-[calc(100svh-10rem)] max-w-6xl flex-col overflow-hidden px-3 pt-3 sm:h-auto sm:px-6 sm:pt-8">
      <div className="flex shrink-0 flex-wrap items-end justify-between gap-3">
        <div>
          <div className="eyebrow">Antragspaket</div>
          <h1 className="mt-1 text-[24px] font-semibold leading-tight tracking-tight sm:mt-2 sm:text-4xl">
            Unterlagen, die wirklich noch offen sind.
          </h1>
          <p className="mt-2 hidden max-w-2xl text-[14px] leading-relaxed text-[var(--smoke)] sm:block">
            Ein kompakter Paketstatus für Anträge: fehlende Bausteine abhaken und Co-Pilot direkt Entwürfe erzeugen lassen.
          </p>
        </div>
        <Link to="/foerderung/$slug" params={{ slug: grant?.slug || "exist" }}>
          <Button variant="ghost" className="glass-pill rounded-full px-4 text-[13px]">
            Antrag öffnen
          </Button>
        </Link>
      </div>

      <section className="glass-pane-ink mt-3 shrink-0 p-3 sm:mt-5 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 sm:h-11 sm:w-11">
              <FolderOpen className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <div className="text-[15px] font-semibold text-[var(--cream)]">Paketstatus</div>
              <div className="truncate text-[12px] text-white/55">{grant?.name || "Förderprogramm"}</div>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-3xl font-semibold tracking-tight text-[var(--cream)]">{pct}%</div>
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/45">
              {doneCount}/{documents.length}
            </div>
          </div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-white" style={{ width: `${pct}%` }} />
        </div>
        <Button
          onClick={() => {
            generateDraft();
            setActivePanel("draft");
          }}
          className="mt-3 h-10 w-full gap-2 rounded-xl bg-[var(--cream)] text-[var(--ink)] hover:bg-white sm:hidden"
        >
          <Wand2 className="h-4 w-4" /> Co-Pilot Entwurf
        </Button>
      </section>

      <div className="mt-3 grid shrink-0 grid-cols-2 gap-1 rounded-[16px] border border-[var(--ruled)] bg-white/55 p-1 lg:hidden">
        <button
          type="button"
          onClick={() => setActivePanel("checklist")}
          className={[
            "h-9 rounded-[12px] text-[12px] font-semibold transition",
            activePanel === "checklist" ? "bg-[var(--ember)] text-white shadow-ember" : "text-[var(--smoke)]",
          ].join(" ")}
        >
          Checkliste
        </button>
        <button
          type="button"
          onClick={() => setActivePanel("draft")}
          className={[
            "h-9 rounded-[12px] text-[12px] font-semibold transition",
            activePanel === "draft" ? "bg-[var(--ember)] text-white shadow-ember" : "text-[var(--smoke)]",
          ].join(" ")}
        >
          Entwurf
        </button>
      </div>

      <div
        className={[
          "mt-3 min-h-0 flex-1 gap-4 lg:mt-5 lg:grid lg:grid-cols-[0.9fr_1.1fr]",
          activePanel === "checklist" ? "grid" : "hidden lg:grid",
        ].join(" ")}
      >
        <section className="glass-pane-ink hidden p-5 lg:block">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10">
              <FolderOpen className="h-5 w-5" />
            </span>
            <div>
              <div className="text-[15px] font-semibold text-[var(--cream)]">Paketstatus</div>
              <div className="text-[12px] text-white/55">{grant?.name || "Förderprogramm"}</div>
            </div>
          </div>
          <div className="mt-5">
            <div className="flex items-baseline justify-between">
              <span className="text-4xl font-semibold tracking-tight text-[var(--cream)]">
                {pct}%
              </span>
              <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-white/45">
                {doneCount}/{documents.length}
              </span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-white" style={{ width: `${pct}%` }} />
            </div>
          </div>
          <Button
            onClick={generateDraft}
            className="mt-5 h-10 w-full gap-2 rounded-xl bg-[var(--cream)] text-[var(--ink)] hover:bg-white"
          >
            <Wand2 className="h-4 w-4" /> Co-Pilot Entwurf erstellen
          </Button>
        </section>

        <section
          className={[
            "glass-pane min-h-0 flex-col p-3 sm:p-5 lg:flex",
            activePanel === "checklist" ? "flex" : "hidden lg:flex",
          ].join(" ")}
        >
          <div className="eyebrow shrink-0">Checkliste</div>
          <div className="mt-3 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1 sm:mt-4">
            {documents.map((doc) => (
              <button
                key={doc.id}
                onClick={() => toggle(doc.id)}
                className="grid grid-cols-[40px_1fr] gap-3 rounded-2xl border border-[var(--ruled)] bg-white/50 p-3 text-left transition hover:bg-white/70"
              >
                <span
                  className={[
                    "flex h-10 w-10 items-center justify-center rounded-xl",
                    status[doc.id]
                      ? "bg-[var(--ember)] text-white"
                      : "bg-[rgba(21,20,15,0.06)] text-[var(--smoke)]",
                  ].join(" ")}
                >
                  {status[doc.id] ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block text-[14px] font-semibold tracking-tight">
                    {doc.title}
                  </span>
                  <span className="mt-1 block text-[12px] leading-relaxed text-[var(--smoke)]">
                    {doc.note}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>
      </div>

      <section
        className={[
          "glass-pane mt-3 min-h-0 flex-1 flex-col p-3 sm:mt-5 sm:p-5 lg:flex-none",
          activePanel === "draft" ? "flex" : "hidden lg:flex",
        ].join(" ")}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <div className="eyebrow">Co-Pilot Entwurf</div>
            <p className="mt-1 text-[12.5px] text-[var(--smoke)]">
              Arbeitsversion für Ideenpapier und Innovationsbeschreibung.
            </p>
          </div>
          <Link to="/co-pilot" className="text-[13px] font-semibold">
            Weiter schreiben
          </Link>
        </div>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={10}
          className="min-h-0 flex-1 resize-none rounded-2xl border border-[var(--ruled)] bg-white/65 p-4 text-[13.5px] leading-relaxed outline-none focus:border-[var(--ember)] lg:min-h-[260px]"
        />
      </section>
    </div>
  );
}

function buildDocuments() {
  const grantDocs =
    GRANTS[0]?.materials.map((material, index) => ({
      id: `grant-${index}`,
      title: material.item,
      note: material.done
        ? "Aus Scraper/Profil bereits vorhanden."
        : "Noch prüfen oder vom Co-Pilot ausfüllen lassen.",
      done: material.done,
    })) ?? [];
  return [
    {
      id: "idea",
      title: "Ideenpapier",
      note: "Problem, Lösung, Markt und Team in einer sauberen Fassung.",
      done: true,
    },
    {
      id: "innovation",
      title: "Innovationsbeschreibung",
      note: "Technischer Kern und Abgrenzung zu Alternativen.",
      done: false,
    },
    {
      id: "financial",
      title: "Finanzplan",
      note: "12 Monate Kosten, Mittelverwendung und Meilensteine.",
      done: false,
    },
    ...grantDocs,
  ];
}

function readStatus(documents: ReturnType<typeof buildDocuments>): DocumentStatus {
  if (typeof window === "undefined") {
    return Object.fromEntries(documents.map((doc) => [doc.id, doc.done]));
  }
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") as DocumentStatus;
    return { ...Object.fromEntries(documents.map((doc) => [doc.id, doc.done])), ...stored };
  } catch {
    return Object.fromEntries(documents.map((doc) => [doc.id, doc.done]));
  }
}

function buildDraft(idea?: string, grantName?: string, polished = false) {
  const project = idea || "matchfoundr";
  const grant = grantName || "EXIST-Gründerstipendium";
  if (polished) {
    return `Projekt: ${project}\n\nKurzbeschreibung:\n${project} bündelt Co-Founder Matching, Förderlogik und kuratierte Startup-Partner in einer mobilen Arbeitsoberfläche. Gründer sollen nicht zwischen Tools, PDF-Listen und Beratungsangeboten springen, sondern täglich die nächste sinnvolle Aktion sehen.\n\nInnovationskern:\nDie Plattform verbindet Onboarding-Daten, Förderkriterien, Partner-Fit und Co-Pilot-generierte Unterlagen zu einem operativen Gründungsworkflow.\n\nNächster Antragsschritt:\nFür ${grant} fehlen vor allem belastbare Innovationsbeschreibung, Letter of Intent und ein finaler 12-Monats-Finanzplan.`;
  }
  return `Projekt: ${project}\n\nKurzbeschreibung:\n\nInnovationskern:\n\nNächster Antragsschritt für ${grant}:\n`;
}
