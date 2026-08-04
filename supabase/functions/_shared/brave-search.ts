export type BraveSearchResult = {
  title: string;
  url: string;
  snippet?: string;
};

type SearchOptions = {
  count?: number;
  timeoutMs?: number;
};

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export async function searchBrave(
  query: string,
  options: SearchOptions = {},
): Promise<BraveSearchResult[]> {
  const apiKey = Deno.env.get("BRAVE_SEARCH_API_KEY")?.trim();
  if (!apiKey || !query.trim()) return [];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 4_000);

  try {
    const url = new URL("https://api.search.brave.com/res/v1/web/search");
    url.searchParams.set("q", query.trim().slice(0, 500));
    url.searchParams.set("count", String(Math.min(Math.max(options.count ?? 6, 1), 20)));
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "X-Subscription-Token": apiKey,
      },
    });

    if (!response.ok) {
      console.error(`brave search failed (${response.status}): ${response.statusText}`);
      return [];
    }

    const payload = (await response.json()) as {
      web?: { results?: unknown };
      infobox?: { results?: unknown };
    };

    const results: BraveSearchResult[] = [];

    // Infobox zuerst: dort stehen bei Organisationen Adresse und Telefon —
    // genau die Angaben, nach denen gefragt wird.
    const infoboxes = Array.isArray((payload.infobox as Record<string, unknown>)?.results)
      ? ((payload.infobox as Record<string, unknown>).results as unknown[])
      : [];
    for (const value of infoboxes) {
      if (!value || typeof value !== "object") continue;
      const box = value as Record<string, unknown>;
      const title = asNonEmptyString(box.title);
      const boxURL = asNonEmptyString(box.website_url) ?? asNonEmptyString(box.url);
      if (!title || !boxURL || !/^https?:\/\//i.test(boxURL)) continue;
      const location = (box.location ?? {}) as Record<string, unknown>;
      const address = asNonEmptyString(
        ((location.postal_address ?? {}) as Record<string, unknown>).displayAddress,
      );
      const phone = asNonEmptyString(
        ((location.contact ?? {}) as Record<string, unknown>).telephone,
      );
      const details = [address, phone && `Telefon ${phone}`].filter(Boolean).join(" · ");
      if (!details) continue;
      results.push({ title, url: boxURL, snippet: details });
    }

    if (!Array.isArray(payload.web?.results)) return results;

    for (const value of payload.web.results as unknown[]) {
      if (!value || typeof value !== "object") continue;
      const row = value as Record<string, unknown>;
      const title = asNonEmptyString(row.title);
      const resultURL = asNonEmptyString(row.url);
      if (!title || !resultURL || !/^https?:\/\//i.test(resultURL)) continue;

      // extra_snippets enthält oft die konkrete Angabe (z. B. "Ansprechpartnerin:
      // Birgit Hemsing"), die in der kurzen description fehlt.
      const extras = Array.isArray(row.extra_snippets)
        ? (row.extra_snippets as unknown[])
            .map(asNonEmptyString)
            .filter((item): item is string => Boolean(item))
            .slice(0, 3)
        : [];
      const snippet = [asNonEmptyString(row.description), ...extras]
        .filter(Boolean)
        .join(" — ")
        .slice(0, 900);
      results.push({ title, url: resultURL, snippet: snippet || undefined });

      // Cluster sind Unterseiten derselben Domain — dort liegen die
      // Ansprechpartner-Seiten, die als eigener Treffer nie auftauchen.
      const cluster = Array.isArray(row.cluster) ? (row.cluster as unknown[]) : [];
      for (const sub of cluster.slice(0, 4)) {
        if (!sub || typeof sub !== "object") continue;
        const subRow = sub as Record<string, unknown>;
        const subTitle = asNonEmptyString(subRow.title);
        const subURL = asNonEmptyString(subRow.url);
        if (!subTitle || !subURL || !/^https?:\/\//i.test(subURL)) continue;
        results.push({
          title: subTitle,
          url: subURL,
          snippet: asNonEmptyString(subRow.description),
        });
      }
    }

    return results;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`brave search failed: ${message}`);
    return [];
  } finally {
    clearTimeout(timeout);
  }
}
