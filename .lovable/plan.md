## Problem

`/plan` zeigt "Plan konnte nicht erstellt werden." weil der Client ein Array unter `data.slides` erwartet, die Edge Function aber ein Objekt `{raw: "...", antwort: "..."}` zurückgibt.

Ursache: `parseJSON()` in `supabase/functions/copilot/index.ts` versucht nur `\{[\s\S]*\}` zu matchen. Sonnet liefert die Slides aber als JSON-Array, eingehüllt in ```json … ``` Fences. Das Array-Format wird nie erkannt → Fallback `{raw, antwort}` → Client sieht kein Array → Fehler.

Zusatzproblem im aktuellen Log: Kimi (`plan_generate`) gibt einen leeren String zurück (`[KIMI plan_generate]` ohne Inhalt). Sonnet bekommt dann leere `planData` und der Plan ist generisch. Nicht blockierend, aber sichtbar.

## Fix

### 1. `supabase/functions/copilot/index.ts` — robustes JSON-Parsing

`parseJSON` so erweitern, dass es zuerst Code-Fences entfernt und sowohl Objekte als auch Arrays erkennt:

```ts
function stripFences(s: string): string {
  return s.replace(/^\s*```(?:json)?\s*/i, '').replace(/```\s*$/,'').trim()
}

function parseJSONLoose(text: string): unknown {
  if (!text || !text.trim()) return null
  const cleaned = stripFences(text)
  try { return JSON.parse(cleaned) } catch { /* fall through */ }
  // Try array first, then object
  const arr = cleaned.match(/\[[\s\S]*\]/)
  if (arr) { try { return JSON.parse(arr[0]) } catch { /* */ } }
  const obj = cleaned.match(/\{[\s\S]*\}/)
  if (obj) { try { return JSON.parse(obj[0]) } catch { /* */ } }
  return null
}
```

Bestehendes `parseJSON` (das immer ein Objekt liefert) bleibt für `context_parse`/`chat`-Pfade nutzbar; intern auf `parseJSONLoose` aufbauen und bei Array/Null ein Fallback-Objekt mit `raw`/`antwort` zurückgeben.

### 2. `plan_generate`-Branch — Slides garantiert als Array

```ts
const sonnetRaw = await callSonnet(sonnetPrompt)
const parsedSlides = parseJSONLoose(sonnetRaw)
const slides: unknown[] = Array.isArray(parsedSlides)
  ? parsedSlides
  : (parsedSlides && Array.isArray((parsedSlides as any).slides))
    ? (parsedSlides as any).slides
    : []
```

`result = { plan: planData, slides }` → Client bekommt jetzt immer ein Array (ggf. leer, dann zeigt der Client weiter die existierende Fehlermeldung).

### 3. Leere Kimi-Antwort abfangen

Wenn `kimiRaw` leer ist, Sonnet trotzdem mit minimalem Kontext aufrufen (statt mit `{}` Stringify einer leeren Struktur), damit die Slides nicht völlig generisch werden. Konkret: bei leerem `planData` einen Hinweisstring (`"Keine strukturierten Plan-Daten verfügbar — generiere generischen Startplan basierend auf Kontext: <ctx>"`) an Sonnet schicken.

## Keine Änderungen

- `src/routes/plan.tsx` bleibt unverändert — der Client erwartet bereits ein Array.
- Keine DB-/Migration-Änderungen.
- Keine UI-Anpassungen.

## Verifikation

1. Edge Function neu deployen.
2. `/plan` neu laden → Slides erscheinen.
3. Edge-Logs prüfen: `slides_count > 0` im `copilot_documents.metadata`.
