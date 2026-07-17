// ─────────────────────────────────────────────────────────────
// Morgenreport-Karte für „Heute“ — zeigt den 8-Uhr-Report des
// Co-Piloten (daily_reports): Fokus, Tagesablauf, wichtige Mails
// mit Entwürfen, erkannte Termine.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { CalendarPlus, ChevronDown, Mail, PenLine, Sunrise } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type Report = {
  fokus?: string;
  hinweis?: string;
  tagesablauf?: { zeit?: string; titel?: string }[];
  wichtige_mails?: { von?: string; betreff?: string; warum?: string }[];
  draft_vorschlaege?: {
    an?: string;
    betreff?: string;
    entwurf?: string;
    gmail_draft_id?: string;
  }[];
  erkannte_termine?: {
    titel?: string;
    datum?: string;
    zeit?: string | null;
    calendar_event_id?: string;
  }[];
  whatsapp?: { neue?: number; verbunden?: boolean };
};

export function MorningReport() {
  const { user, isDemo } = useAuth();
  const [report, setReport] = useState<Report | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!user || isDemo) return;
    const today = new Date().toISOString().slice(0, 10);
    supabase
      .from("daily_reports")
      .select("content")
      .eq("user_id", user.id)
      .eq("report_date", today)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.content && typeof data.content === "object") {
          setReport(data.content as Report);
        }
      });
  }, [user, isDemo]);

  if (!report) return null;

  const mails = report.wichtige_mails ?? [];
  const termine = report.erkannte_termine ?? [];
  const drafts = report.draft_vorschlaege ?? [];
  const ablauf = report.tagesablauf ?? [];

  return (
    <section className="rounded-[18px] border border-[var(--ruled)] bg-[var(--surface)] p-4">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--ember-tint)] text-[var(--ember-deep)]">
            <Sunrise className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[13.5px] font-bold text-[var(--ink)]">Dein Morgenreport</p>
            {report.fokus && (
              <p className="truncate text-[12.5px] text-[var(--smoke)]">{report.fokus}</p>
            )}
          </div>
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-[var(--faint)] transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      {expanded && (
        <div className="mt-4 space-y-4">
          {ablauf.length > 0 && (
            <div>
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-[var(--faint)]">
                Tagesablauf
              </p>
              <ul className="space-y-1">
                {ablauf.map((b, i) => (
                  <li key={i} className="flex gap-2.5 text-[13px] text-[var(--ink)]">
                    <span className="w-11 shrink-0 font-mono text-[11.5px] text-[var(--smoke)]">
                      {b.zeit}
                    </span>
                    {b.titel}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {mails.length > 0 && (
            <div>
              <p className="mb-1.5 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-[var(--faint)]">
                <Mail className="h-3 w-3" /> Wichtige Mails
              </p>
              <ul className="space-y-1.5">
                {mails.map((m, i) => (
                  <li key={i} className="rounded-lg bg-[var(--canvas)] px-2.5 py-2 text-[12.5px]">
                    <span className="font-semibold text-[var(--ink)]">{m.betreff}</span>
                    <span className="text-[var(--smoke)]"> — {m.von}</span>
                    {m.warum && (
                      <p className="mt-0.5 text-[11.5px] text-[var(--smoke)]">{m.warum}</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {drafts.length > 0 && (
            <div>
              <p className="mb-1.5 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-[var(--faint)]">
                <PenLine className="h-3 w-3" /> Antwort-Entwürfe
              </p>
              <ul className="space-y-1">
                {drafts.map((d, i) => (
                  <li key={i} className="text-[12.5px] text-[var(--ink)]">
                    <span className="font-semibold">{d.betreff}</span>
                    <span className="text-[var(--smoke)]"> an {d.an}</span>
                    {d.gmail_draft_id ? (
                      <span className="ml-1.5 rounded-full bg-[var(--ember-tint)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--ember-deep)]">
                        liegt in Gmail
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {termine.length > 0 && (
            <div>
              <p className="mb-1.5 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-[var(--faint)]">
                <CalendarPlus className="h-3 w-3" /> Erkannte Termine
              </p>
              <ul className="space-y-1">
                {termine.map((t, i) => (
                  <li key={i} className="text-[12.5px] text-[var(--ink)]">
                    {t.titel} — {t.datum}
                    {t.zeit ? `, ${t.zeit}` : ""}
                    {t.calendar_event_id ? (
                      <span className="ml-1.5 rounded-full bg-[var(--ember-tint)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--ember-deep)]">
                        im Kalender
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {report.hinweis && (
            <p className="rounded-lg bg-[var(--canvas)] px-2.5 py-2 text-[12px] text-[var(--smoke)]">
              {report.hinweis}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
