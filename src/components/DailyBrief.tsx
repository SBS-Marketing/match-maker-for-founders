import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { readPlanContext } from "@/lib/plan-draft";
import { AITag, CopilotMark } from "@/components/Copilot";
import {
  buildLocalDailyBrief,
  parseCopilotBrief,
  readCachedBrief,
  writeCachedBrief,
  type DailyBriefData,
  type LocalBriefInput,
} from "@/lib/daily-brief";

export function DailyBrief({ input, dateKey }: { input: LocalBriefInput; dateKey: string }) {
  const { user, session, isDemo } = useAuth();
  // Memo keyt auf den JSON-Inhalt, nicht auf die Objekt-Identität des Inputs.
  const signature = JSON.stringify(input);
  const local = useMemo(
    () => buildLocalDailyBrief(JSON.parse(signature) as LocalBriefInput),
    [signature],
  );
  const [copilot, setCopilot] = useState<DailyBriefData | null>(() => {
    const cached = readCachedBrief(dateKey);
    return cached?.source === "copilot" ? cached : null;
  });
  const [loading, setLoading] = useState(false);

  const fetchCopilot = useCallback(
    async (force: boolean) => {
      if (!session || !user || isDemo) return;
      if (!force) {
        const cached = readCachedBrief(dateKey);
        if (cached?.source === "copilot") {
          setCopilot(cached);
          return;
        }
      }
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("copilot", {
          body: { task: "daily_brief", extra: { onboarding: readPlanContext() } },
        });
        if (error) throw error;
        const parsed = parseCopilotBrief(data);
        if (parsed) {
          setCopilot(parsed);
          writeCachedBrief(dateKey, parsed);
        }
      } catch (err) {
        console.error("daily_brief failed", err);
      } finally {
        setLoading(false);
      }
    },
    [session, user, isDemo, dateKey],
  );

  useEffect(() => {
    fetchCopilot(false);
  }, [fetchCopilot]);

  const brief = copilot ?? local;
  const canRefresh = Boolean(session && user && !isDemo);

  return (
    <div className="mt-5 rounded-[18px] border border-[var(--ruled)] bg-[var(--surface)] p-5 shadow-warm sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <CopilotMark size={14} color="var(--ember)" />
          <AITag>Co-Pilot · Tageszusammenfassung</AITag>
          {brief.source === "local" && (
            <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-[var(--faint)]">
              offline
            </span>
          )}
        </div>
        {canRefresh && (
          <button
            onClick={() => fetchCopilot(true)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--ruled)] bg-[var(--surface-soft)] px-3 py-1.5 text-[11.5px] font-semibold text-[var(--smoke)] hover:text-[var(--ink)] disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Aktualisieren
          </button>
        )}
      </div>

      <p className="mt-3 max-w-2xl text-[19px] font-semibold leading-snug text-[var(--ink)]">
        {brief.highlight}
      </p>
      {brief.body && (
        <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-[var(--smoke)]">
          {brief.body}
        </p>
      )}

      {brief.actions.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-2">
          {brief.actions.map((action) => (
            <li
              key={action}
              className="inline-flex items-center gap-1.5 rounded-full bg-[var(--ember-tint)] px-3 py-1.5 text-[12px] font-medium text-[var(--ember-deep)]"
            >
              <Sparkles className="h-3 w-3" />
              {action}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
