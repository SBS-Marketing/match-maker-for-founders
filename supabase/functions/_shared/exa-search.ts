export type ExaSearchType = "instant" | "fast" | "auto";

export type ExaSearchResult = {
  title: string;
  url: string;
  snippet?: string;
};

type ExaResultRow = {
  title?: unknown;
  url?: unknown;
  highlights?: unknown;
  summary?: unknown;
  text?: unknown;
};

type SearchOptions = {
  type?: ExaSearchType;
  numResults?: number;
  timeoutMs?: number;
};

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function resultTitle(row: ExaResultRow, url: string): string {
  const title = asNonEmptyString(row.title);
  if (title) return title;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function resultSnippet(row: ExaResultRow): string | undefined {
  const highlights = Array.isArray(row.highlights)
    ? row.highlights
        .map(asNonEmptyString)
        .filter((value): value is string => Boolean(value))
        .join(" … ")
    : "";
  return (
    asNonEmptyString(highlights) || asNonEmptyString(row.summary) || asNonEmptyString(row.text)
  );
}

export async function searchExa(
  query: string,
  options: SearchOptions = {},
): Promise<ExaSearchResult[]> {
  const apiKey = Deno.env.get("EXA_API_KEY")?.trim();
  if (!apiKey || !query.trim()) return [];

  const timeoutMs = options.timeoutMs ?? 5_000;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch("https://api.exa.ai/search", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query: query.trim().slice(0, 500),
        // "auto" ist laut Exa-Doku der empfohlene Standard (Smart, ~1s).
        // Vorher lief hier "fast" — die schwächste Stufe (Basic, ~450ms),
        // was bei Ansprechpartner-Fragen nur die Startseite zurückgab.
        type: options.type ?? "auto",
        numResults: Math.min(Math.max(options.numResults ?? 6, 1), 10),
        contents: { highlights: true },
      }),
    });

    if (!response.ok) {
      const detail = (await response.text()).replace(/\s+/g, " ").trim().slice(0, 240);
      console.error(`exa search failed (${response.status}): ${detail || response.statusText}`);
      return [];
    }

    const payload = (await response.json()) as { results?: unknown };
    if (!Array.isArray(payload.results)) return [];

    return payload.results.flatMap((value): ExaSearchResult[] => {
      if (!value || typeof value !== "object") return [];
      const row = value as ExaResultRow;
      const url = asNonEmptyString(row.url);
      if (!url || !/^https?:\/\//i.test(url)) return [];
      return [
        {
          title: resultTitle(row, url),
          url,
          snippet: resultSnippet(row),
        },
      ];
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`exa search failed: ${message}`);
    return [];
  } finally {
    clearTimeout(timeout);
  }
}
