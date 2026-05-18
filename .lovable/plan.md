# Co-Pilot Chat (/co-pilot) — Implementierungsplan

## Ziel
`src/routes/co-pilot.tsx` von Mock-Daten auf einen funktionsfähigen, auth-geschützten Chat umstellen, der mit der bereits deployten Edge Function `copilot` spricht und Session/Kontext/Messages in Supabase persistiert.

## UI (matchfoundr Brand)

Layout zwei Spalten (65% / 35%, auf mobil gestapelt). Tokens aus `styles.css`: `--ink #15140f`, `--ember #E2511C`, `--cream #FBFAF7`, Font Geist.

**Linke Spalte — Chat**
- Header-Bar: `CopilotMark` Badge + Titel "Co-Pilot" + `AITag` "ONLINE" + Session-Titel (editable inline) + "Session speichern" Button (rechts).
- Scroll-Bereich mit Messages:
  - User → rechts, cream Bubble auf ink Background.
  - Assistant → links, dunkle Bubble mit ember Akzent, serif italic für die Antwort.
  - Unter Assistant-Bubble: Quellen-Pills (PDF / Web / Intern) gerendert aus `sources[]`.
  - Thinking-Trace während Streaming (Reuse `ThinkingTrace`).
- Composer unten: Textarea mit Placeholder „Frag etwas — oder lass mich den Plan ausarbeiten…", Senden-Button (ember).
- Quick-Action Chips unter dem Composer, dynamisch aus letzter Assistant-Response `quick_actions[]`.

**Rechte Spalte — Kontext-Panel**
- `glass-pane-ink` Card:
  - Eyebrow „SO HABE ICH DICH VERSTANDEN"
  - Felder DU / IDEE / STAND / STADT / ZIEL / RISIKO (aus `copilot_context`)
  - Button „Etwas korrigieren" → öffnet Inline-Edit Dialog (Phase 2 als simples Dialog mit Textarea, schickt `context_parse`).
- Zweite Card: „QUELLEN, AUF DIE ICH MICH STÜTZE" — aggregiert distinct `sources` aus allen Messages der Session.

## Datenfluss

1. **Auth Gate**: Komponente in `<AuthGate>` einwickeln.
2. **Mount**:
   - `copilot_sessions` für `user_id` laden → letzte Session nehmen oder neue anlegen (`INSERT title:"Neue Session"`), `session_id` im State.
   - `copilot_context` für `user_id` laden (ORDER BY updated_at DESC LIMIT 1). Wenn leer → Panel zeigt Empty-State + CTA „Erzähl mir kurz von dir".
   - `copilot_messages` für `session_id` laden (ASC). Falls leer, Welcome-Message anzeigen.
3. **Senden**:
   - Optimistisch User-Message in State + INSERT in `copilot_messages` (`role:'user'`).
   - `supabase.functions.invoke('copilot', { body: { task: 'chat', session_id, message } })`.
   - Response `{ answer, sources, quick_actions }` → INSERT Assistant Message (`role:'assistant'`, `sources`, `model_used`).
   - State aktualisieren, scroll-to-bottom.
4. **Context Parse**: Wenn kein `copilot_context` existiert und User die erste lange Nachricht schickt, parallel `task:'context_parse'` aufrufen, Resultat upserten in `copilot_context`.
5. **Session speichern**: Button setzt `title` über Prompt/Input und UPDATE auf `copilot_sessions`.

## Technische Details

- TanStack Query Hooks:
  - `useSession()` → ensures session, returns `{ sessionId }`.
  - `useContext()` → SELECT copilot_context.
  - `useMessages(sessionId)` → SELECT + Realtime subscription auf `copilot_messages` filter `session_id`.
  - `useSendMessage()` → mutation: insert user msg → invoke edge fn → insert assistant msg → invalidate.
- Realtime: optional `supabase.channel('copilot:'+sessionId)` für `copilot_messages` INSERT.
- Edge Function Aufruf via Browser-Client (`supabase.functions.invoke`) — die Function ist bereits deployed; sie sollte mit JWT laufen (RLS-konformer Insert macht sie selbst oder Client). Erwartetes Body-Schema: `{ task, session_id, message, context? }`, Response: `{ answer, sources: [{type,title,url?}], quick_actions: string[] }`.
- Fehlerbehandlung: Toast bei Edge-Function-Fehler (429 → "Limit erreicht", 402 → "Credits aufgebraucht", sonst generisch).
- Auto-Scroll: ref + `useEffect` auf messages.length.
- Composer: Enter sendet, Shift+Enter neue Zeile.

## Dateien

- `src/routes/co-pilot.tsx` — komplett neu (ersetzt Mock).
- `src/hooks/useCopilot.ts` — Hooks (session/context/messages/send).
- `src/components/copilot/ChatMessage.tsx` — User & Assistant Bubble + SourcePills.
- `src/components/copilot/ContextPanel.tsx` — rechte Spalte.
- `src/components/copilot/Composer.tsx` — Input + Quick Actions.
- Wiederverwendet: `AuthGate`, `CopilotMark`, `AITag`, `ThinkingTrace`.

## Offene Punkte (frage nach Bestätigung)

1. **Quick Actions als Fallback**: Wenn die Edge Function keine `quick_actions` liefert, soll ich statische Defaults zeigen (wie die aktuellen `SUGGESTIONS`) oder leer?
2. **„Etwas korrigieren"**: Inline-Edit der einzelnen Felder (role/idea/…) oder freier Textbereich, der via `context_parse` neu geparst wird? Vorschlag: freier Text → reparse.
3. **Mehrere Sessions**: Soll es einen Session-Switcher (Dropdown/Sidebar) geben oder bleibt es bei „immer letzte/neueste Session"? Aktuell nicht im Brief, ich würde es für später lassen.
