import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { GRANTS } from "@/data/grants";
import { SERVICE_BY_ID } from "@/data/services";
import { ServiceIcon } from "@/components/ServiceIcon";
import { CopilotMark, AITag } from "@/components/Copilot";
import { GrantApplicationForm } from "@/components/GrantApplicationForm";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { readPlanContext, type PlanContext } from "@/lib/plan-draft";
import {
  applyGrantCompletionAnswers,
  buildGrantApplicationPackage,
  downloadGrantApplicationPackage,
  getGrantCompletionQuestions,
  type GrantCompletionAnswer,
  type GrantApplicationPackage,
} from "@/lib/grant-application";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/foerderung/$slug")({
  loader: ({ params }) => {
    const grant = GRANTS.find((g) => g.slug === params.slug);
    if (!grant) throw notFound();
    return { grant };
  },
  head: ({ loaderData }) => ({ meta: [{ title: `${loaderData?.grant.name} — matchfoundr` }] }),
  component: GrantDetail,
});

function GrantDetail() {
  const { grant } = Route.useLoaderData();
  const s = SERVICE_BY_ID.funding;
  const { user, session, isDemo } = useAuth();
  const [applicationPackage, setApplicationPackage] = useState<GrantApplicationPackage | null>(
    null,
  );
  const [generating, setGenerating] = useState(false);
  const [planContext, setPlanContext] = useState<PlanContext | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpAnswers, setHelpAnswers] = useState<Record<string, string>>({});
  const [showForm, setShowForm] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  function openForm() {
    setShowForm(true);
    window.setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth" }), 60);
  }

  useEffect(() => {
    setPlanContext(readPlanContext());
  }, []);

  const localPackage = useMemo(
    () => buildGrantApplicationPackage(grant, planContext),
    [grant, planContext],
  );
  const previewPackage = applicationPackage ?? localPackage;
  const completionQuestions = useMemo(
    () => getGrantCompletionQuestions(previewPackage),
    [previewPackage],
  );
  const copilotFilledFields = useMemo(
    () =>
      (applicationPackage?.fields ?? [])
        .filter((field) => field.source === "Co-Pilot Nachfrage")
        .slice(-4),
    [applicationPackage],
  );

  async function generateApplicationPackage() {
    setGenerating(true);
    try {
      let next = localPackage;
      const canUseExistBackend = Boolean(
        session && user && !isDemo && `${grant.slug} ${grant.name}`.toLowerCase().includes("exist"),
      );

      if (canUseExistBackend) {
        const { data, error } = await supabase.functions.invoke("copilot", {
          body: {
            task: "document_exist",
            message: `Erstelle ein Antragspaket fuer ${grant.name}`,
            extra: {
              grant,
              onboarding: planContext ?? readPlanContext(),
            },
          },
        });
        if (error) throw error;
        const doc = data?.document as { content?: string | null } | undefined;
        next = buildGrantApplicationPackage(grant, planContext ?? readPlanContext(), {
          content: doc?.content ?? null,
          fillPct: typeof data?.fill_pct === "number" ? data.fill_pct : null,
          missingFields: Array.isArray(data?.missing_fields) ? data.missing_fields : null,
        });
        toast.success("EXIST-Entwurf mit Co-Pilot erstellt");
      } else {
        toast.success("Antragspaket lokal erstellt");
      }
      setApplicationPackage(next);
    } catch (error) {
      console.error(error);
      setApplicationPackage(localPackage);
      toast.warning("Backend nicht erreichbar - lokales Antragspaket erstellt");
    } finally {
      setGenerating(false);
    }
  }

  async function copyApplicationPackage() {
    try {
      await navigator.clipboard.writeText(previewPackage.markdown);
      toast.success("Antragspaket kopiert");
    } catch {
      toast.error("Kopieren nicht möglich");
    }
  }

  function applyHelpAnswers() {
    const answers: GrantCompletionAnswer[] = completionQuestions
      .map((question) => ({
        missingItem: question.missingItem,
        question: question.question,
        answer: helpAnswers[question.id] || "",
      }))
      .filter((answer) => answer.answer.trim().length > 0);

    if (answers.length === 0) {
      toast.error("Gib Co-Pilot kurz mindestens eine Antwort.");
      return;
    }

    const updated = applyGrantCompletionAnswers(previewPackage, answers);
    setApplicationPackage(updated);
    setHelpOpen(updated.missing.length > 0);
    setHelpAnswers({});
    toast.success(
      updated.missing.length > 0
        ? "Antworten eingearbeitet - nächste Fragen bereit"
        : "Co-Pilot hat alle aktuellen Lücken beantwortet",
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pt-8 pb-20 sm:px-6">
      <div className="flex items-center gap-2 text-[12px] text-[var(--smoke)]">
        <Link to="/marketplace" className="hover:underline">
          Marketplace
        </Link>
        <span>/</span>
        <Link to="/foerderung" className="inline-flex items-center gap-1.5 hover:underline">
          <span
            className="flex h-4 w-4 items-center justify-center rounded text-[var(--cream)]"
            style={{ background: s.hue }}
          >
            <ServiceIcon name={s.icon} size={9} stroke={2.4} />
          </span>
          Förderung
        </Link>
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{grant.name}</h1>
          <div className="mt-2 text-[14px] text-[var(--smoke)]">{grant.body}</div>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[13.5px]">
            <span>
              <b className="text-[var(--ember-deep)]">{grant.amount}</b> Volumen
            </span>
            <span>
              <b>{grant.duration}</b>
            </span>
            <span>
              Deadline: <b>{grant.deadline}</b>
            </span>
            {grant.region && (
              <span>
                Region: <b>{grant.region}</b>
              </span>
            )}
          </div>
          {(grant.category || grant.stage?.length) && (
            <div className="mt-4 flex flex-wrap gap-2">
              {grant.category && (
                <span className="rounded-full bg-[var(--paper)] px-3 py-1 text-[11px] font-medium text-[var(--ink-soft)]">
                  {grant.category}
                </span>
              )}
              {grant.stage?.slice(0, 4).map((stage) => (
                <span
                  key={stage}
                  className="rounded-full bg-[var(--ember-tint)] px-3 py-1 text-[11px] font-medium text-[var(--ember-deep)]"
                >
                  {stage}
                </span>
              ))}
            </div>
          )}
          <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-[var(--ink-soft)]">
            {grant.summary}
          </p>

          {/* Eligibility */}
          <div className="glass-pane-ink mt-6 p-5">
            <div className="mb-3 flex items-center gap-2">
              <CopilotMark size={14} color="var(--cream)" />
              <AITag tone="dark">Co-Pilot · Eligibility-Check</AITag>
            </div>
            <ul className="space-y-2.5">
              {grant.eligibility.map((e) => {
                const isOk = e.ok === true;
                const isWarn = e.ok === "warn";
                return (
                  <li
                    key={e.item}
                    className="flex items-start gap-2.5 text-[13.5px] leading-snug text-[var(--cream)]/90"
                  >
                    {isOk ? (
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ember-light)]" />
                    ) : isWarn ? (
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ember-light)]" />
                    ) : (
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />
                    )}
                    <span>
                      <span className="font-semibold text-[var(--cream)]">{e.item}</span>
                      {e.note && <span className="text-white/65"> — {e.note}</span>}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Timeline */}
          <div className="glass-pane mt-5 p-5">
            <div className="eyebrow">Timeline</div>
            <div className="mt-4 space-y-3">
              {grant.timeline.map((p, i) => (
                <div key={p.phase} className="grid grid-cols-[60px_1fr] gap-3">
                  <div>
                    <div className="font-mono text-[11px] font-semibold text-[var(--ember-deep)]">{`0${i + 1}`}</div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--smoke)]">
                      {p.weeks}
                    </div>
                  </div>
                  <div>
                    <div className="text-[14px] font-semibold tracking-tight">{p.phase}</div>
                    <div className="text-[12.5px] text-[var(--smoke)]">{p.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA + materials */}
        <div className="space-y-4">
          <div className="glass-pane-ember p-5">
            <div className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-white/75">
              Co-Pilot Assist
            </div>
            <div className="mt-3 text-[44px] font-semibold leading-none tracking-tight">
              {previewPackage.fillPct}%
            </div>
            <div className="text-[13px] text-white/85">deines Antragspakets ist vorbereitet</div>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-white"
                style={{ width: `${previewPackage.fillPct}%` }}
              />
            </div>
            <Button
              onClick={openForm}
              className="mt-5 h-11 w-full gap-2 rounded-xl bg-[var(--cream)] text-[var(--ink)] hover:bg-white"
            >
              <FileText className="h-4 w-4" />
              Antrag ausfüllen
            </Button>
            <Button
              onClick={generateApplicationPackage}
              disabled={generating}
              variant="ghost"
              className="mt-2 h-10 w-full gap-2 rounded-xl border border-white/20 bg-white/10 text-white hover:bg-white/15"
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {generating ? "erstelle Vorschau..." : "Schnell-Vorschau erstellen"}
            </Button>
            <Button
              asChild
              className="mt-2 h-10 w-full gap-2 rounded-xl border border-white/20 bg-white/10 text-white hover:bg-white/15"
            >
              <a href={grant.applyUrl || grant.sourceUrl || "#"} target="_blank" rel="noopener">
                Offizielles Formular öffnen <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
            {grant.sourceUrl && (
              <a
                href={grant.sourceUrl}
                target="_blank"
                rel="noopener"
                className="mt-3 inline-flex w-full items-center justify-center gap-1.5 text-[12px] font-semibold text-white/80 hover:text-white"
              >
                Offizielle Programmseite <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>

          <div className="glass-pane p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="eyebrow">Materialien</div>
              {applicationPackage && (
                <span className="rounded-full bg-[var(--ember-tint)] px-2.5 py-1 text-[10.5px] font-semibold text-[var(--ember-deep)]">
                  erstellt
                </span>
              )}
            </div>
            <ul className="mt-4 space-y-2.5">
              {previewPackage.materials.map((m) => (
                <li key={m.title} className="flex items-start gap-2 text-[13px]">
                  <span
                    className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border"
                    style={{
                      background: m.status === "ready" ? "var(--ember)" : "transparent",
                      borderColor: m.status === "ready" ? "var(--ember)" : "var(--ruled)",
                    }}
                  >
                    {m.status === "ready" && <Check className="h-3 w-3 text-[var(--cream)]" />}
                  </span>
                  <span
                    className={m.status === "ready" ? "text-[var(--smoke)]" : "text-[var(--ink)]"}
                  >
                    {m.title}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {applicationPackage && (
            <div className="glass-pane p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="eyebrow">Antragspaket</div>
                  <div className="mt-1 text-[17px] font-semibold tracking-tight">
                    {applicationPackage.title}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={copyApplicationPackage}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--ruled)] bg-[var(--paper)] text-[var(--ink)] hover:bg-white"
                    aria-label="Antragspaket kopieren"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => downloadGrantApplicationPackage(applicationPackage)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--ruled)] bg-[var(--paper)] text-[var(--ink)] hover:bg-white"
                    aria-label="Antragspaket herunterladen"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {applicationPackage.fields.slice(0, 5).map((field) => (
                  <div
                    key={field.label}
                    className="rounded-lg border border-[var(--ruled)] bg-white/60 p-3"
                  >
                    <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--smoke)]">
                      {field.label}
                    </div>
                    <div className="mt-1 text-[13px] font-medium leading-snug text-[var(--ink)]">
                      {field.value}
                    </div>
                  </div>
                ))}
              </div>

              {copilotFilledFields.length > 0 && (
                <div className="mt-4 border-t border-[var(--ruled)] pt-3">
                  <div className="text-[12px] font-semibold text-[var(--ink)]">
                    Von Co-Pilot eingearbeitet
                  </div>
                  <div className="mt-2 space-y-2">
                    {copilotFilledFields.map((field) => (
                      <div
                        key={`${field.label}-${field.value}`}
                        className="text-[12.5px] leading-snug"
                      >
                        <span className="font-semibold text-[var(--ink)]">{field.label}: </span>
                        <span className="text-[var(--ink-soft)]">{field.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-4 rounded-lg bg-[var(--paper)] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-[12px] font-semibold text-[var(--ink)]">
                    Noch offen ({applicationPackage.missing.length})
                  </div>
                  {completionQuestions.length > 0 && (
                    <button
                      onClick={() => setHelpOpen((value) => !value)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--ember)] px-3 py-1.5 text-[11.5px] font-semibold text-white hover:bg-[var(--ember-deep)]"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Hilf Co-Pilot
                    </button>
                  )}
                </div>
                {applicationPackage.missing.length > 0 ? (
                  <ul className="mt-2 space-y-1.5">
                    {applicationPackage.missing.slice(0, 5).map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-2 text-[12.5px] text-[var(--ink-soft)]"
                      >
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--ember-deep)]" />
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="mt-2 flex items-start gap-2 text-[12.5px] text-[var(--ink-soft)]">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--ember-deep)]" />
                    Die aktuellen Pflichtlücken sind beantwortet.
                  </div>
                )}
                {helpOpen && completionQuestions.length > 0 && (
                  <div className="mt-4 border-t border-[var(--ruled)] pt-3">
                    <div className="text-[12.5px] leading-snug text-[var(--ink-soft)]">
                      Co-Pilot fragt immer maximal zwei Punkte auf einmal. Nach dem Einarbeiten
                      kommen automatisch die nächsten Fragen, bis alles beantwortet ist.
                    </div>
                    <div className="mt-3 space-y-3">
                      {completionQuestions.map((question) => (
                        <label key={question.id} className="block">
                          <span className="block text-[12px] font-semibold leading-snug text-[var(--ink)]">
                            {question.question}
                          </span>
                          <span className="mt-0.5 block text-[11.5px] leading-snug text-[var(--smoke)]">
                            {question.hint}
                          </span>
                          <textarea
                            value={helpAnswers[question.id] || ""}
                            onChange={(event) =>
                              setHelpAnswers((current) => ({
                                ...current,
                                [question.id]: event.target.value,
                              }))
                            }
                            rows={3}
                            className="mt-2 w-full resize-none rounded-lg border border-[var(--ruled)] bg-white px-3 py-2 text-[13px] leading-snug text-[var(--ink)] outline-none focus:border-[var(--ember)]"
                            placeholder="Kurze Antwort reicht..."
                          />
                        </label>
                      ))}
                    </div>
                    <button
                      onClick={applyHelpAnswers}
                      className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-[var(--ember)] px-4 py-2 text-[13px] font-semibold text-[var(--cream)] hover:bg-[var(--ember-deep)]"
                    >
                      Antworten einarbeiten
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <div ref={formRef} className="mt-8 scroll-mt-8">
          <GrantApplicationForm grant={grant} planContext={planContext} />
        </div>
      )}
    </div>
  );
}
