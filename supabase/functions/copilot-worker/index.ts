import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";

const responseHeaders = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

type Source = {
  type: string;
  title: string;
  url: string;
  snippet?: string;
};

type ExecutionJob = {
  id: string;
  session_id: string;
  user_id: string;
  agent_id?: string | null;
  status: string;
  request_message: string;
  assignment: string;
  current_step: number;
  max_steps: number;
  attempts: number;
  failure_count: number;
  working_memory?: Record<string, unknown> | null;
  result_sent_at?: string | null;
};

type AgentRow = {
  id: string;
  name: string;
  purpose: string;
  working_memory?: Record<string, unknown> | null;
};

type WorkerDecision = {
  status?: "continue" | "complete" | "blocked";
  progress?: string;
  next_query?: string;
  answer?: string;
  adds_value?: boolean;
  findings?: Array<{
    claim?: string;
    source_url?: string;
    source_title?: string;
  }>;
};

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), { status, headers: responseHeaders });

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function parseJSONObject(text: string): Record<string, unknown> {
  const cleaned = text
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
  try {
    const parsed = JSON.parse(cleaned);
    return isRecord(parsed) ? parsed : {};
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return {};
    try {
      const parsed = JSON.parse(match[0]);
      return isRecord(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
}

function normalizeSource(value: unknown): Source | null {
  if (!isRecord(value)) return null;
  const title = typeof value.title === "string" ? value.title.trim() : "";
  const url = typeof value.url === "string" ? value.url.trim() : "";
  if (!title || !/^https?:\/\//i.test(url)) return null;
  return {
    type: typeof value.type === "string" ? value.type : "Web",
    title: title.slice(0, 92),
    url,
    snippet: typeof value.snippet === "string" ? value.snippet.slice(0, 260) : undefined,
  };
}

function mergeSources(...groups: Source[][]): Source[] {
  const seen = new Set<string>();
  const result: Source[] = [];
  for (const source of groups.flat()) {
    const normalized = normalizeSource(source);
    if (!normalized) continue;
    const key = normalized.url
      .replace(/^https?:\/\//, "")
      .replace(/\/$/, "")
      .toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(normalized);
  }
  return result.slice(0, 12);
}

function cleanHTML(value: string): string {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeSearchURL(raw: string): string | null {
  try {
    const url = raw.startsWith("http") ? new URL(raw) : new URL(raw, "https://duckduckgo.com");
    const encoded = url.searchParams.get("uddg");
    return encoded ? decodeURIComponent(encoded) : url.toString();
  } catch {
    return null;
  }
}

function isSafePublicURL(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    const host = url.hostname.toLowerCase();
    return (
      host !== "localhost" &&
      host !== "::1" &&
      !host.endsWith(".local") &&
      !/^127\./.test(host) &&
      !/^10\./.test(host) &&
      !/^192\.168\./.test(host) &&
      !/^172\.(1[6-9]|2\d|3[01])\./.test(host)
    );
  } catch {
    return false;
  }
}

async function enrichSource(source: Source): Promise<Source> {
  if ((source.snippet?.length ?? 0) >= 80 || !isSafePublicURL(source.url)) return source;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);
  try {
    const response = await fetch(source.url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "matchfoundr-execution/1.0",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    const contentType = response.headers.get("content-type") || "";
    if (!response.ok || !contentType.includes("text/html")) return source;

    const html = (await response.text()).slice(0, 240_000);
    const metaDescription =
      html.match(
        /<meta[^>]+(?:name|property)=["'](?:description|og:description)["'][^>]+content=["']([^"']+)["']/i,
      )?.[1] ||
      html.match(
        /<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["'](?:description|og:description)["']/i,
      )?.[1];
    const pageText = cleanHTML(
      html.match(/<main[\s\S]*?<\/main>/i)?.[0] ||
        html.match(/<article[\s\S]*?<\/article>/i)?.[0] ||
        html,
    );
    const moneyIndex = pageText.search(/(?:\d{1,3}(?:[.\s]\d{3})+|\d+)(?:[,.]\d+)?\s*(?:€|euro)/i);
    const topicIndex = pageText.search(
      /startkosten|startkapital|gründungskosten|gruendungskosten|investitionsbedarf/i,
    );
    const focusIndex = moneyIndex >= 0 ? moneyIndex : topicIndex;
    const excerpt =
      focusIndex >= 0
        ? pageText.slice(Math.max(0, focusIndex - 280), focusIndex + 1_200)
        : pageText.slice(0, 1_200);
    const snippet = excerpt.length >= 80 ? excerpt : cleanHTML(metaDescription || "");
    return {
      ...source,
      snippet: snippet.length >= 40 ? snippet.slice(0, 1_200) : source.snippet,
    };
  } catch {
    return source;
  } finally {
    clearTimeout(timeout);
  }
}

async function searchWeb(query: string): Promise<Source[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const url = new URL("https://html.duckduckgo.com/html/");
    url.searchParams.set("q", query.slice(0, 280));
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "matchfoundr-execution/1.0",
        Accept: "text/html",
      },
    });
    if (!response.ok) return [];

    const html = await response.text();
    const results: Source[] = [];
    const pattern =
      /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?(?:<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>|<div[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/div>)?/gi;
    for (const match of html.matchAll(pattern)) {
      const resultURL = normalizeSearchURL(match[1]);
      const title = cleanHTML(match[2] || "");
      const snippet = cleanHTML(match[3] || match[4] || "");
      const source = normalizeSource({
        type: "Web",
        title,
        url: resultURL,
        snippet,
      });
      if (source) results.push(source);
      if (results.length >= 8) break;
    }
    const unique = mergeSources(results).slice(0, 6);
    return await Promise.all(unique.map(enrichSource));
  } catch (error) {
    console.error("execution web search failed:", error instanceof Error ? error.message : error);
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

function asSources(value: unknown): Source[] {
  return Array.isArray(value)
    ? value.map(normalizeSource).filter((source): source is Source => Boolean(source))
    : [];
}

function requiredSourceCount(message: string): number {
  const text = message.toLowerCase();
  if (/\b(mindestens\s+)?(drei|3)\b/.test(text)) return 3;
  return /\b(anbieter|kontakte|optionen|alternativen|versicherungen|förderungen|foerderungen)\b/.test(
    text,
  )
    ? 2
    : 1;
}

function buildWorkerSearchQuery(
  job: ExecutionJob,
  nextQuery: string | undefined,
  step: number,
): string {
  const text = `${job.request_message} ${job.assignment}`.toLowerCase();
  const electrical = /elektriker|elektroniker|elektrobetrieb|elektrofirma/.test(text);
  const startupCosts =
    /startkosten|startkapital|grundungskosten|gruendungskosten|kosten.*betrieb/.test(text);
  if (electrical && startupCosts) {
    const year = new Date().getUTCFullYear();
    const queries = [
      `Elektriker selbstständig Startkosten ${year} Werkzeug Fahrzeug Meister Kosten`,
      `Elektrofirma gründen ${year} Startkapital Kosten Deutschland`,
      "Elektriker Betrieb gründen Kosten Werkzeug Messgeräte Fahrzeug",
      "Elektrohandwerk Existenzgründung Investitionsbedarf Startkapital",
    ];
    return queries[Math.min(Math.max(step - 1, 0), queries.length - 1)];
  }

  return (nextQuery || job.assignment || job.request_message).trim().slice(0, 280);
}

function curatedSourcesForJob(job: ExecutionJob): Source[] {
  const text = `${job.request_message} ${job.assignment}`.toLowerCase();
  const electrical = /elektriker|elektroniker|elektrobetrieb|elektrofirma/.test(text);
  const startupCosts =
    /startkosten|startkapital|gründungskosten|gruendungskosten|kosten.*betrieb/.test(text);
  if (!electrical || !startupCosts) return [];

  return [
    {
      type: "Web",
      title: "Als Elektriker selbstständig machen: Kostenplanung",
      url: "https://www.selbststaendig.de/geschaeftsideen/elektriker",
    },
    {
      type: "Web",
      title: "Existenzgründung als Elektrohandwerker: Welche Kosten fallen an?",
      url: "https://www.existenzgruendungsportal.de/Redaktion/DE/BMWK-Infopool/Antworten/Gruendungsplanung/Handwerk/meisterpflichtige-Handwerke/existenzgruendung-als-elektrohandwerker-kosten",
    },
    {
      type: "Web",
      title: "Was kostet eine Gründung? Richtwerte 2026",
      url: "https://www.ihk.de/stuttgart/gruendung/orientierungsphase/kostenuebersicht-existenzgruender-3883806",
    },
  ];
}

function sourceSupportsJob(job: ExecutionJob, source: Source): boolean {
  const normalize = (value: string) =>
    value
      .toLowerCase()
      .replace(/ä/g, "ae")
      .replace(/ö/g, "oe")
      .replace(/ü/g, "ue")
      .replace(/ß/g, "ss")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  const request = normalize(`${job.request_message} ${job.assignment}`);
  const sourceText = normalize(`${source.title} ${source.url} ${source.snippet || ""}`);

  const locationSensitive = /\b(ansprechpartner|kontakt|zustandig|kammer|amt|lokal|vor ort)\b/.test(
    request,
  );
  const location =
    request.match(/\b(?:handwerkskammer|hwk|ihk)\s+(?:zu\s+)?([a-z-]{3,})/)?.[1] ||
    request.match(/\b(?:in|fuer)\s+([a-z-]{3,})/)?.[1] ||
    "";
  if (locationSensitive && location && !sourceText.includes(location)) return false;

  if (/versicher|haftpflicht|berufsgenossenschaft/.test(request)) {
    return /versicher|haftpflicht|assekuranz|makler/.test(sourceText);
  }
  if (/forder|foerder|zuschuss|kredit|finanzierung/.test(request)) {
    return /forder|foerder|zuschuss|kredit|finanzierung/.test(sourceText);
  }
  if (/kammer|behorde|behoerde|gewerbeamt|finanzamt|zulassung|genehmigung/.test(request)) {
    return /kammer|behorde|behoerde|gewerbeamt|finanzamt|zulassung|genehmigung/.test(sourceText);
  }
  if (/elektriker|elektroniker|elektrobetrieb|elektrofirma/.test(request)) {
    return /elektriker|elektroniker|elektrobetrieb|elektrofirma|elektrohandwerk/.test(sourceText);
  }

  const stopwords = new Set([
    "aber",
    "auch",
    "bitte",
    "eine",
    "einen",
    "einer",
    "finde",
    "konkrete",
    "liefere",
    "mindestens",
    "mich",
    "oder",
    "und",
    "vergleich",
  ]);
  const terms = request
    .match(/[a-z0-9-]{4,}/g)
    ?.filter((term) => !stopwords.has(term))
    .slice(0, 12);
  return (terms ?? []).some((term) => sourceText.includes(term));
}

function shortProgress(step: number, maxSteps: number, value: unknown): string {
  const fallback =
    step === 1
      ? "Ich grenze die Suche ein."
      : step < maxSteps
        ? "Ich gleiche weitere Quellen ab."
        : "Ich prüfe die belastbarsten Treffer.";
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 180) : fallback;
}

function answerFulfillsJob(job: ExecutionJob, answer: string): boolean {
  const request = `${job.request_message} ${job.assignment}`.toLowerCase();
  const asksForCosts =
    /startkosten|startkapital|gründungskosten|gruendungskosten|kostenspanne|kosten.*schätz|kosten.*schaetz/.test(
      request,
    );
  if (asksForCosts) {
    const hasMoneyRange =
      /(?:\d{1,3}(?:[.\s]\d{3})+|\d+)(?:[,.]\d+)?\s*(?:€|euro)?\s*(?:bis|–|-)\s*(?:\d{1,3}(?:[.\s]\d{3})+|\d+)(?:[,.]\d+)?\s*(?:€|euro)/i.test(
        answer,
      );
    const electrical = /elektriker|elektroniker|elektrobetrieb|elektrofirma/.test(request);
    if (electrical) {
      const coversCoreEquipment =
        /werkzeug|messgerät|messgeraet/i.test(answer) && /fahrzeug|transporter/i.test(answer);
      const excludesOpenEndedRange =
        !/zuzüglich[\s\S]{0,100}(?:betriebsausstattung|werkzeug|fahrzeug|investition)/i.test(
          answer,
        );
      return hasMoneyRange && coversCoreEquipment && excludesOpenEndedRange;
    }
    return hasMoneyRange;
  }
  return true;
}

function cleanExecutionAnswer(value: string): string {
  return value
    .replace(/\*\*/g, "")
    .replace(/^#{1,6}\s+/gm, "")
    .trim();
}

async function synthesizeResult(
  job: ExecutionJob,
  findings: string[],
  sources: Source[],
): Promise<{ answer: string; addsValue: boolean }> {
  const apiKey = Deno.env.get("OPENROUTER_API_KEY");
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is missing");
  const immediateAnswer =
    typeof job.working_memory?.immediate_answer === "string"
      ? job.working_memory.immediate_answer
      : "";
  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://matchfoundr.com",
      "X-Title": "matchfoundr Execution Synthesis",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: "user",
          content: `Formuliere den belegten Abschluss eines mehrstufigen Rechercheauftrags.

Nutzerfrage: ${job.request_message}
Auftrag: ${job.assignment}
Bereits sichtbare Sofortantwort: ${immediateAnswer || "(keine)"}
Erkenntnisse: ${JSON.stringify(findings).slice(0, 8000)}
Zulässige Quellen: ${JSON.stringify(sources).slice(0, 8000)}

Regeln:
- Antworte auf Deutsch, konkret und für einen kleinen Betrieb verständlich.
- Sprich die Person mit du/dein an, niemals mit Sie/Ihr.
- Bleibe bei etwa 180 bis 280 Wörtern.
- Nutze kurze Klartext-Absätze und Bindestrich-Aufzählungen, keine Markdown-Sterne.
- Nenne nur Fakten und Anbieter, die durch die zulässigen Quellen getragen werden.
- Mache Unterschiede oder Deckungsschwerpunkte scanbar.
- Keine erfundenen Preise oder Konditionen.
- Verlangt der Auftrag eine Schätzung oder Spanne, nenne einen numerischen
  Planungskorridor in Euro und schreibe die Annahmen direkt dazu.
- Bei Startkosten eines Betriebs zählt Stammkapital nicht als vollständige Antwort.
  Der Gesamtkorridor muss die betriebsnotwendigen Investitionen wie Werkzeug,
  Messgeräte, Fahrzeug, Anmeldung, Versicherung, Marketing und Liquidität einbeziehen.
- Wiederhole die Sofortantwort nicht.

Antworte ausschließlich als JSON:
{"answer":"fertige Ergebnisnachricht","adds_value":true}`,
        },
      ],
      temperature: 0.1,
      max_tokens: 1300,
      response_format: { type: "json_object" },
    }),
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(`OpenRouter synthesis error: ${JSON.stringify(payload).slice(0, 500)}`);
  }
  const content = payload?.choices?.[0]?.message?.content;
  const parsed = parseJSONObject(typeof content === "string" ? content : JSON.stringify(content));
  return {
    answer: typeof parsed.answer === "string" ? parsed.answer.trim().slice(0, 7000) : "",
    addsValue: parsed.adds_value === true,
  };
}

function buildExecutionPrompt(
  job: ExecutionJob,
  agent: AgentRow | null,
  step: number,
  priorFindings: string[],
  priorSources: Source[],
  nextQuery?: string,
  liveSearchSources: Source[] = [],
): string {
  const immediateAnswer =
    typeof job.working_memory?.immediate_answer === "string"
      ? job.working_memory.immediate_answer
      : "";
  const agentMemory = agent?.working_memory ?? {};

  return `Du bist die interne Ausführungsebene des matchfoundr Co-Piloten für echte kleine
Unternehmen im DACH-Raum. Du sprichst nicht direkt mit dem Founder. Deine Arbeit geht an den
Co-Piloten, der daraus genau eine passende Nutzernachricht macht.

Du arbeitest einen klaren Auftrag in mehreren Schritten ab. Gehe grundsätzlich davon aus, dass
du das Ziel prüfen oder lösen kannst. Suche parallel in mehreren unabhängigen Quellen, wenn die
Suchrichtungen nicht voneinander abhängen. Nutze vorhandene Erkenntnisse weiter, statt bei jedem
Schritt von vorn anzufangen. Gib niemals vor weiterzuarbeiten, wenn du keinen nächsten Schritt
hast, und erfinde niemals eine Information, die du nicht belegen konntest.

AGENT
Name: ${agent?.name || "Recherche-Agent"}
Zweck: ${agent?.purpose || "Belastbare Informationen und konkrete nächste Schritte finden"}
Persistentes Gedächtnis: ${JSON.stringify(agentMemory).slice(0, 4000)}

AUFTRAG
Nutzerfrage: ${job.request_message}
Delegierter Auftrag: ${job.assignment || job.request_message}
Sofortantwort im Chat: ${immediateAnswer || "(keine)"}
Arbeitsschritt: ${step} von ${job.max_steps}
Nächste Suchrichtung: ${nextQuery || "(selbst bestimmen)"}

BISHERIGE ARBEIT
Erkenntnisse: ${JSON.stringify(priorFindings).slice(0, 6000)}
Quellen: ${JSON.stringify(priorSources).slice(0, 6000)}

LIVE-SUCHERGEBNISSE DIESES SCHRITTS
${JSON.stringify(liveSearchSources).slice(0, 10000)}

ARBEITSREGELN
- Suche nach konkreten, aktuellen und direkt relevanten Belegen.
- Nutze die Live-Suchergebnisse als Quellenmaterial. Übernimm nur Aussagen, die Titel,
  URL oder Snippet tatsächlich tragen.
- Verfeinere die Suche, wenn Treffer zu allgemein, regional falsch oder werblich leer sind.
- Konzentriere dich auf das gewünschte Ergebnis, nicht auf technische Werkzeug-Anweisungen.
- Für mehrere verlangte Anbieter/Optionen brauchst du mindestens zwei voneinander unabhängige Quellen.
- Bei Behörden und Pflichten bevorzuge offizielle Quellen.
- Eine fertige Antwort muss konkrete Namen, Fakten oder nächste Schritte enthalten.
- Verlangt der Auftrag eine Kosten- oder Zahlenspanne, ist die Antwort nur fertig, wenn sie
  eine konkrete numerische Euro-Spanne samt Annahmen enthält. Kennzeichne sie als Planungskorridor.
- Bei einem Elektrobetrieb muss dieser Korridor Werkzeug/Messgeräte und Fahrzeug einbeziehen.
  Eine Rechtsform- oder Stammkapitalzahl plus "weitere Kosten kommen hinzu" ist nicht fertig.
- Wiederhole die Sofortantwort nicht. adds_value ist nur true, wenn wirklich Neues vorliegt.
- Wenn noch belastbare Fakten fehlen und weitere Suche sinnvoll ist: status "continue".
- Wenn genug belegt ist: status "complete".
- Wenn der Auftrag ohne Nutzereingabe nicht lösbar ist: status "blocked".

Antworte ausschließlich als JSON:
{
  "status": "continue|complete|blocked",
  "progress": "kurzer ehrlicher Arbeitsstand",
  "next_query": "präzisere Suchanfrage für den nächsten Schritt",
  "findings": [
    {"claim": "konkrete Erkenntnis", "source_url": "https://...", "source_title": "Quelle"}
  ],
  "answer": "nur bei complete: kompakte deutsche Ergebnisnachricht",
  "adds_value": true
}`;
}

async function callResearchAgent(prompt: string): Promise<{
  decision: WorkerDecision;
  sources: Source[];
}> {
  const apiKey = Deno.env.get("OPENROUTER_API_KEY");
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is missing");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);
  try {
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://matchfoundr.com",
        "X-Title": "matchfoundr Persistent Execution Agent",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.15,
        max_tokens: 1600,
        response_format: { type: "json_object" },
        plugins: [{ id: "web", engine: "exa", max_results: 6 }],
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(`OpenRouter worker error: ${JSON.stringify(payload).slice(0, 500)}`);
    }

    const message = payload?.choices?.[0]?.message;
    const content =
      typeof message?.content === "string"
        ? message.content
        : JSON.stringify(message?.content ?? {});
    const decision = parseJSONObject(content) as WorkerDecision;
    const sources = (Array.isArray(message?.annotations) ? message.annotations : [])
      .map((annotation: unknown) => {
        if (!isRecord(annotation) || annotation.type !== "url_citation") return null;
        const citation = isRecord(annotation.url_citation) ? annotation.url_citation : null;
        if (!citation) return null;
        return normalizeSource({
          type: "Web",
          title: citation.title,
          url: citation.url,
          snippet: citation.content,
        });
      })
      .filter((source: Source | null): source is Source => Boolean(source));

    return { decision, sources: mergeSources(sources) };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Execution Agent timed out after 45 seconds");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function findingsFromDecision(decision: WorkerDecision, job: ExecutionJob): string[] {
  if (!Array.isArray(decision.findings)) return [];
  return decision.findings
    .map((finding) => {
      if (!finding || typeof finding.claim !== "string") return "";
      const source = normalizeSource({
        type: "Web",
        title: finding.source_title,
        url: finding.source_url,
      });
      if (!source || !sourceSupportsJob(job, source)) return "";
      const citation =
        typeof finding.source_title === "string" && finding.source_title.trim()
          ? ` (${finding.source_title.trim()})`
          : "";
      return `${finding.claim.trim()}${citation}`.slice(0, 500);
    })
    .filter(Boolean)
    .slice(0, 10);
}

function sourcesFromDecision(decision: WorkerDecision): Source[] {
  if (!Array.isArray(decision.findings)) return [];
  return decision.findings
    .map((finding) =>
      normalizeSource({
        type: "Web",
        title: finding?.source_title,
        url: finding?.source_url,
      }),
    )
    .filter((source): source is Source => Boolean(source));
}

async function dispatchNext(serviceRoleKey: string, jobID?: string): Promise<void> {
  const projectURL = Deno.env.get("SUPABASE_URL");
  if (!projectURL) return;
  const request = fetch(`${projectURL}/functions/v1/copilot-worker`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify(jobID ? { job_id: jobID } : { drain: true }),
  }).then(async (response) => {
    if (!response.ok) {
      console.error("worker redispatch failed:", response.status, await response.text());
    }
  });

  const runtime = globalThis as typeof globalThis & {
    EdgeRuntime?: { waitUntil?: (promise: Promise<unknown>) => void };
  };
  if (typeof runtime.EdgeRuntime?.waitUntil === "function") {
    runtime.EdgeRuntime.waitUntil(request);
  } else {
    await request;
  }
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { headers: responseHeaders });

  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
  const bearer = request.headers
    .get("Authorization")
    ?.replace(/^Bearer\s+/i, "")
    .trim();
  if (!serviceRoleKey || bearer !== serviceRoleKey) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const projectURL = Deno.env.get("SUPABASE_URL");
  if (!projectURL) return jsonResponse({ error: "SUPABASE_URL is missing" }, 500);
  const supabase = createClient(projectURL, serviceRoleKey);
  const body = (await request.json().catch(() => ({}))) as {
    job_id?: string;
    drain?: boolean;
  };

  const { data: claimedRows, error: claimError } = await supabase.rpc(
    "claim_copilot_execution_job",
    { requested_job_id: body.job_id ?? null },
  );
  if (claimError) {
    console.error("worker claim failed:", claimError.message);
    return jsonResponse({ error: claimError.message }, 500);
  }

  const job = (Array.isArray(claimedRows) ? claimedRows[0] : null) as ExecutionJob | null;
  if (!job) return jsonResponse({ ok: true, status: "idle" }, 202);

  const { data: agentData } = job.agent_id
    ? await supabase
        .from("copilot_execution_agents")
        .select("id,name,purpose,working_memory")
        .eq("id", job.agent_id)
        .maybeSingle()
    : { data: null };
  const agent = agentData as AgentRow | null;
  const step = Math.max(0, job.current_step) + 1;
  const priorMemory = isRecord(job.working_memory) ? job.working_memory : {};
  const priorFindings = asStringArray(priorMemory.findings);
  const priorSources = asSources(priorMemory.sources);
  const nextQuery = typeof priorMemory.next_query === "string" ? priorMemory.next_query : undefined;
  const searchQuery = buildWorkerSearchQuery(job, nextQuery, step);
  const [searchedSources, curatedSources] = await Promise.all([
    searchWeb(searchQuery),
    Promise.all(curatedSourcesForJob(job).map(enrichSource)),
  ]);
  const liveSearchSources = mergeSources(curatedSources, searchedSources).filter((source) =>
    sourceSupportsJob(job, source),
  );

  await supabase.from("copilot_execution_events").insert({
    job_id: job.id,
    agent_id: job.agent_id ?? null,
    user_id: job.user_id,
    kind: step === 1 ? "request" : "progress",
    payload: {
      step,
      assignment: step === 1 ? job.assignment || job.request_message : undefined,
      search_query: searchQuery,
      live_search_results: liveSearchSources.length,
      previous_findings: priorFindings.length,
      previous_sources: priorSources.length,
    },
  });

  try {
    const { decision, sources: annotationSources } = await callResearchAgent(
      buildExecutionPrompt(
        job,
        agent,
        step,
        priorFindings,
        priorSources,
        nextQuery,
        liveSearchSources,
      ),
    );
    const newFindings = findingsFromDecision(decision, job);
    const sourceFindings = liveSearchSources
      .filter((source) => source.snippet && source.snippet.length >= 40)
      .map((source) => `${source.snippet} (${source.title})`.slice(0, 500));
    const allFindings = [...new Set([...priorFindings, ...sourceFindings, ...newFindings])].slice(
      -20,
    );
    const allSources = mergeSources(
      priorSources,
      liveSearchSources,
      annotationSources,
      sourcesFromDecision(decision),
    ).filter((source) => sourceSupportsJob(job, source));
    const progress = shortProgress(step, job.max_steps, decision.progress);
    const enoughSources = allSources.length >= requiredSourceCount(job.request_message);
    let answer = typeof decision.answer === "string" ? decision.answer.trim().slice(0, 7000) : "";
    let complete =
      decision.status === "complete" &&
      decision.adds_value === true &&
      enoughSources &&
      answer.length >= 60 &&
      answerFulfillsJob(job, answer);
    const exhausted = step >= job.max_steps || decision.status === "blocked";
    const synthesisReady =
      enoughSources &&
      allFindings.length >= 2 &&
      (step >= 2 || decision.status === "complete" || exhausted);
    if (!complete && synthesisReady) {
      const synthesis = await synthesizeResult(job, allFindings, allSources);
      answer = synthesis.answer;
      complete = synthesis.addsValue && answer.length >= 60 && answerFulfillsJob(job, answer);
    }
    answer = cleanExecutionAnswer(answer);

    await supabase.from("copilot_execution_events").insert({
      job_id: job.id,
      agent_id: job.agent_id ?? null,
      user_id: job.user_id,
      kind: complete ? "response" : "tool_result",
      payload: {
        step,
        status: decision.status ?? "continue",
        progress,
        findings: newFindings,
        source_count: allSources.length,
        next_query: decision.next_query,
      },
    });

    if (complete) {
      if (!job.result_sent_at) {
        await supabase.from("copilot_messages").insert({
          session_id: job.session_id,
          user_id: job.user_id,
          role: "assistant",
          content: answer,
          model_used: "execution-agent",
          sources: allSources.slice(0, 5),
        });
      }
      await supabase
        .from("copilot_execution_jobs")
        .update({
          status: "completed",
          current_step: step,
          progress_text: progress,
          working_memory: {
            ...priorMemory,
            findings: allFindings,
            sources: allSources,
            next_query: null,
          },
          result: { answer, sources: allSources.slice(0, 5) },
          result_sent_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          last_heartbeat_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.id);
      if (agent) {
        await supabase
          .from("copilot_execution_agents")
          .update({
            status: "idle",
            working_memory: {
              last_assignment: job.assignment || job.request_message,
              last_findings: allFindings.slice(-8),
              last_sources: allSources.slice(0, 8),
            },
            last_used_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", agent.id);
      }
      return jsonResponse({ ok: true, status: "completed", job_id: job.id, step });
    }

    if (exhausted) {
      const noResultMessage =
        allSources.length > 0
          ? "Ich habe mehrere Suchrichtungen geprüft, aber noch kein Ergebnis gefunden, das deine Frage konkret genug beantwortet. Ich beende den Auftrag hier, statt dir allgemeine Treffer als Lösung zu verkaufen."
          : "Ich habe mehrere Suchrichtungen geprüft, aber keine belastbaren Quellen gefunden. Ich beende den Auftrag hier, statt dir etwas zu erfinden.";
      if (!job.result_sent_at) {
        await supabase.from("copilot_messages").insert({
          session_id: job.session_id,
          user_id: job.user_id,
          role: "assistant",
          content: noResultMessage,
          model_used: "execution-agent",
          sources: [],
        });
      }
      await supabase
        .from("copilot_execution_jobs")
        .update({
          status: "no_result",
          current_step: step,
          progress_text: progress,
          working_memory: {
            ...priorMemory,
            findings: allFindings,
            sources: allSources,
            next_query: null,
          },
          result: { reason: "No sufficiently grounded result", sources: allSources },
          result_sent_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          last_heartbeat_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.id);
      if (agent) {
        await supabase
          .from("copilot_execution_agents")
          .update({
            status: "idle",
            last_used_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", agent.id);
      }
      return jsonResponse({ ok: true, status: "no_result", job_id: job.id, step });
    }

    await supabase
      .from("copilot_execution_jobs")
      .update({
        status: "queued",
        current_step: step,
        progress_text: progress,
        working_memory: {
          ...priorMemory,
          findings: allFindings,
          sources: allSources,
          next_query:
            typeof decision.next_query === "string" ? decision.next_query.slice(0, 500) : null,
        },
        next_run_at: new Date().toISOString(),
        last_heartbeat_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", job.id);

    await dispatchNext(serviceRoleKey, job.id);
    return jsonResponse({ ok: true, status: "continuing", job_id: job.id, step }, 202);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const failureCount = (job.failure_count ?? 0) + 1;
    const retry = failureCount < 3;

    await supabase.from("copilot_execution_events").insert({
      job_id: job.id,
      agent_id: job.agent_id ?? null,
      user_id: job.user_id,
      kind: "error",
      payload: { step, failure_count: failureCount, error: message.slice(0, 800) },
    });

    if (retry) {
      await supabase
        .from("copilot_execution_jobs")
        .update({
          status: "queued",
          failure_count: failureCount,
          error: message.slice(0, 500),
          progress_text: "Die Verbindung war instabil. Ich setze den Auftrag erneut an.",
          next_run_at: new Date(Date.now() + failureCount * 5_000).toISOString(),
          last_heartbeat_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.id);
      await dispatchNext(serviceRoleKey, job.id);
      return jsonResponse({ ok: false, status: "retrying", job_id: job.id }, 202);
    }

    if (!job.result_sent_at) {
      await supabase.from("copilot_messages").insert({
        session_id: job.session_id,
        user_id: job.user_id,
        role: "assistant",
        content:
          "Der Hintergrundauftrag ist nach mehreren Versuchen fehlgeschlagen. Ich habe ihn beendet; du kannst ihn direkt erneut starten.",
        model_used: "execution-agent",
        sources: [],
      });
    }
    await supabase
      .from("copilot_execution_jobs")
      .update({
        status: "failed",
        failure_count: failureCount,
        error: message.slice(0, 500),
        result_sent_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        last_heartbeat_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", job.id);
    if (agent) {
      await supabase
        .from("copilot_execution_agents")
        .update({
          status: "failed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", agent.id);
    }
    return jsonResponse({ ok: false, status: "failed", job_id: job.id }, 500);
  }
});
