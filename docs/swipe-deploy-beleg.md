# Swipe-Fix — Deploy-Beleg

**Zyklus 2 · Branch `loop/2-swipe-beleg` · Basis `aa2ee36` · Fix-Commit `b10d786`**
**Datum:** 2026-07-29 · **Projekt-Ref:** `rzmcoxnfcpqqyxgkafwk` (Live)
**Vorgehen:** ausschließlich lesende Queries gegen die Live-DB (`SELECT` auf Katalog + Zähl-Queries). Kein DDL, kein `apply_migration`, kein `db push`, kein Deploy.

---

## Verdikt

> ### Deploy ist sicher.
>
> Jedes Objekt, das die committete `swipe/index.ts` schreibt oder liest, existiert live in genau der Form, die der Code annimmt. Alle drei Fehlerpfade (fehlende RPC `perform_swipe`, fehlende Tabelle `mutual_matches`, fehlgeschlagener `matches`-Upsert) degradieren sauber und werfen nicht. Der Diff gegenüber der deployten v8 ist rein additiv: v8 liefert `match_id` heute immer leer, der Fix füllt es — es geht nichts verloren.

**Mit zwei Einschränkungen, die der User vor dem Abdrücken kennen sollte:**

1. **Der Deploy-Befehl kippt `verify_jwt` von `false` auf `true`** — siehe [§5](#5-deploy-mechanik-die-einzige-echte-falle). Nicht der Code, die Deploy-Mechanik. Mit `--no-verify-jwt` deployen.
2. **Der Deploy behebt nicht das, was er zu beheben scheint.** Der eigentliche Chat-Einstieg hängt am Frontend, nicht an der Function — siehe [§4](#4-der-befund-der-die-lage-dreht-der-trigger). Der Deploy schließt eine reale, aber schmale Restlücke.

---

## 1. `public.matches` — existiert, passt exakt

`SELECT` auf `information_schema.columns`:

| Spalte | Typ | Nullable | Default |
|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` |
| `user_a` | `uuid` | NO | – |
| `user_b` | `uuid` | NO | – |
| `created_at` | `timestamptz` | NO | `now()` |

Der Fix schreibt `{ user_a, user_b }` (Z. 129). Beide Spalten existieren, beide `NOT NULL`, beide werden gesetzt. `id` und `created_at` haben Defaults — der Upsert muss sie nicht liefern. **Kein fehlendes Feld, kein Typkonflikt.**

Constraints (`pg_constraint`):

| Name | Typ | Definition | Relevanz für den Fix |
|---|---|---|---|
| `matches_pkey` | PK | `PRIMARY KEY (id)` | liefert `.select("id")` |
| `matches_user_a_user_b_key` | UNIQUE | `UNIQUE (user_a, user_b)` | **`onConflict: "user_a,user_b"` löst hierauf auf** |
| `matches_check` | CHECK | `CHECK ((user_a < user_b))` | siehe unten |
| `matches_user_a_fkey` | FK | `→ auth.users(id) ON DELETE CASCADE` | erfüllt (Swiper + Target sind auth-User) |
| `matches_user_b_fkey` | FK | `→ auth.users(id) ON DELETE CASCADE` | erfüllt |

Passender Unique-Index vorhanden:
`CREATE UNIQUE INDEX matches_user_a_user_b_key ON public.matches USING btree (user_a, user_b)`

→ Der `onConflict`-String des Fixes trifft einen real existierenden Unique-Index. Ohne ihn hätte PostgREST mit `42P10` geantwortet.

### 1a. Die `CHECK (user_a < user_b)`-Frage

Der Fix sortiert in JavaScript (Z. 123–124):

```ts
const userA = user.id < body.target_id ? user.id : body.target_id;
```

Das ist **lexikografischer String-Vergleich**. Postgres vergleicht `uuid` dagegen bytewise. Sind die äquivalent? Empirisch geprüft über alle geordneten Paare der 7 Live-User:

```sql
with u as (select id from auth.users limit 200)
select count(*) as pairs,
       count(*) filter (where (a.id < b.id) = (a.id::text < b.id::text)) as agree_js_vs_pg,
       count(*) filter (where a.id::text <> lower(a.id::text)) as non_lowercase
from u a cross join u b where a.id <> b.id;
```

→ `pairs: 42, agree_js_vs_pg: 42, non_lowercase: 0`

**42 von 42 Paaren stimmen überein, alle UUIDs sind kanonisch klein geschrieben.** Das ist kein Zufall: in der kanonischen Kleinschreibung stehen die Bindestriche bei beiden UUIDs an denselben Positionen, und die ASCII-Ordnung der Hex-Ziffern (`0`–`9` = 48–57, dann `a`–`f` = 97–102) entspricht ihrer numerischen Ordnung. String-Vergleich ≡ Byte-Vergleich, solange beide Seiten lowercase sind. Supabase Auth liefert UUIDs immer lowercase.

*Restrisiko:* Ein Client, der `target_id` großgeschrieben schickt, könnte die Sortierung kippen → `23514 check_violation`. Das würde aber nur geloggt, nicht geworfen (siehe §3c). Kein Crash.

## 2. RLS — die Function darf schreiben

| Tabelle | `relrowsecurity` | `relforcerowsecurity` |
|---|---|---|
| `matches` | `true` | `false` |
| `swipes` | `true` | `false` |
| `messages` | `true` | `false` |

```sql
select rolname, rolbypassrls from pg_roles where rolname in ('service_role','authenticated','anon');
```
→ `service_role: rolbypassrls = true` · `authenticated: false` · `anon: false`

Die Function baut ihren Client mit `SUPABASE_SERVICE_ROLE_KEY` (Z. 39–42). `service_role` hat `BYPASSRLS`, und weil `relforcerowsecurity = false` ist, greift RLS für diese Rolle gar nicht. **Der `matches`-Upsert ist erlaubt.**

Das ist auch der einzige Weg: `public.matches` hat **keine INSERT- oder UPDATE-Policy** — nur

| Tabelle | Policy | CMD | Rolle | Bedingung |
|---|---|---|---|---|
| `matches` | Users view own matches | SELECT | `authenticated` | `auth.uid() = user_a OR auth.uid() = user_b` |
| `swipes` | Users create own swipes | INSERT | `authenticated` | `auth.uid() = swiper_id` |
| `swipes` | Users view own swipes | SELECT | `authenticated` | `auth.uid() = swiper_id` |
| `messages` | Match participants view messages | SELECT | `authenticated` | `EXISTS (matches m WHERE m.id = messages.match_id AND (m.user_a = auth.uid() OR m.user_b = auth.uid()))` |
| `messages` | Match participants send messages | INSERT | `authenticated` | `sender_id = auth.uid() AND EXISTS (…)` |

Ein normaler User kann also **nie** eine `matches`-Zeile schreiben. Genau deshalb muss die Edge Function (oder der Trigger, §4) es tun — das Design des Fixes ist an dieser Stelle richtig.

Table-Grants sind für `anon`/`authenticated`/`service_role` auf allen drei Tabellen voll (`SELECT,INSERT,UPDATE,DELETE,…`) — die Absicherung passiert vollständig über RLS, nicht über Grants. Für den Fix bedeutet das: kein `42501 permission denied`.

## 3. Fehlerpfade — nichts crasht

### 3a. `perform_swipe` fehlt (Z. 85–103)

```sql
select proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and (proname ilike '%swipe%' or proname ilike '%match%');
```
→ nur `public.handle_swipe()`. **`perform_swipe` existiert nicht.**

Verhalten: PostgREST antwortet auf einen unbekannten RPC mit `404 / PGRST202`. `supabase-js` gibt das als `{ data: null, error: {…} }` zurück — es *wirft nicht*. Also greift `if (rpcError)` und der Fallback läuft:

```ts
await supabaseAdmin.from("swipes").upsert({…}, { onConflict: "swiper_id,target_id" });
```

Der dafür nötige Index existiert:
`CREATE UNIQUE INDEX swipes_swiper_id_target_id_key ON public.swipes USING btree (swiper_id, target_id)`

→ **Sauberer Fallback. Kein Wurf.** (Identisch zum heute deployten v8 — dieser Pfad ist seit Monaten der Produktivpfad.)

### 3b. `mutual_matches` fehlt (Z. 142–152)

```sql
select relname, relkind from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and relname in ('mutual_matches','conversations',…);
```
→ **leeres Ergebnis.** Weder als Tabelle noch als View noch als Matview. Ebenso `conversations`.

Verhalten: Der Code destrukturiert an dieser Stelle **nur `{ data: match }`** und ignoriert den Fehler bewusst. PostgREST liefert `PGRST205` (table not found), `match` bleibt `null`, `if (match)` ist falsch, `conversation_id` bleibt `undefined`.

→ **Kein Wurf, kein 500.** Der Response enthält schlicht kein `conversation_id`. Das Frontend liest dieses Feld ohnehin nirgends (§4b).

### 3c. `matches`-Upsert schlägt fehl (Z. 127–139)

```ts
if (legacyMatchError) {
  console.error("matches upsert failed", legacyMatchError);
} else {
  result.match_id = legacyMatch.id;
}
```

Der Fix loggt statt zu werfen — mit korrektem Kommentar im Code: Der Swipe ist zu diesem Zeitpunkt bereits persistiert, ein Fehler hier kostet nur den Chat-Einstieg, nicht den Match. Abgedeckte Fälle: `23514` (Self-Swipe → `user_a = user_b` verletzt die CHECK), `22P02` (kein gültiges UUID), `PGRST116` (`.single()` auf 0 Zeilen).

→ **Der Fix erfüllt die Anforderung „crasht nicht, wenn ein Objekt fehlt".** Er ist der einzige Block im File, der überhaupt defensiv geschrieben ist.

*Detail zum Upsert-Rückgabewert:* `supabase-js` setzt `ignoreDuplicates` standardmäßig auf `false`, der Upsert wird also zu `ON CONFLICT … DO UPDATE`. Damit liefert `RETURNING` auch im Konfliktfall eine Zeile, und `.select("id").single()` bekommt die bestehende `id`. Bei `DO NOTHING` wäre `RETURNING` leer und `.single()` würde fehlschlagen — das ist hier nicht der Fall.

## 4. Der Befund, der die Lage dreht: der Trigger

Live existiert auf `swipes` ein Trigger, der in Zyklus 1 nicht auf dem Schirm war:

```
CREATE TRIGGER on_swipe_created AFTER INSERT ON public.swipes
FOR EACH ROW EXECUTE FUNCTION handle_swipe()
```

```sql
CREATE OR REPLACE FUNCTION public.handle_swipe()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE ua UUID; ub UUID;
BEGIN
  IF NEW.direction = 'like' THEN
    IF EXISTS (SELECT 1 FROM public.swipes
               WHERE swiper_id = NEW.target_id AND target_id = NEW.swiper_id
                 AND direction = 'like') THEN
      ua := LEAST(NEW.swiper_id, NEW.target_id);
      ub := GREATEST(NEW.swiper_id, NEW.target_id);
      INSERT INTO public.matches (user_a, user_b) VALUES (ua, ub) ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END $function$
```

**Die Datenbank legt `matches`-Zeilen bei Mutual Likes bereits selbst an.** Beleg aus den Live-Daten:

```sql
select m.id, m.user_a, m.user_b,
 (select count(*) from swipes s where s.swiper_id=m.user_a and s.target_id=m.user_b and s.direction='like') as a_likes_b,
 (select count(*) from swipes s where s.swiper_id=m.user_b and s.target_id=m.user_a and s.direction='like') as b_likes_a,
 (select count(*) from messages mm where mm.match_id=m.id) as msgs,
 (m.user_a < m.user_b) as pg_order_ok
from public.matches m;
```

| match_id | a_likes_b | b_likes_a | msgs | pg_order_ok |
|---|---|---|---|---|
| `d440576a-79bf-478a-b3f2-0f000cf9cd71` | 1 | 1 | 2 | `true` |

Bestand insgesamt: `swipes: 2 (davon 2 likes) · matches: 1 · messages: 2 · users: 7 · profiles: 7`.

Der einzige existierende Match ist exakt das Gegenstück zum einzigen Like-Paar, die Sortierung stimmt, und es hängen zwei Nachrichten dran. **Der Trigger funktioniert und der Chat läuft darüber.**

### 4a. Konsequenz für den Fix: idempotent, nicht doppelt

Der `matches`-Upsert des Fixes läuft *nach* dem Swipe-Insert, also nachdem der Trigger schon gefeuert hat. Er trifft damit auf `matches_user_a_user_b_key`, geht in `DO UPDATE` und gibt die **bestehende** `id` zurück. Der `UNIQUE`-Constraint verhindert eine zweite Zeile. Auch die JS-Sortierung und `LEAST/GREATEST` liefern dieselbe Reihenfolge (§1a). **Keine Duplikate, kein Konflikt mit dem Trigger.**

### 4b. Konsequenz fürs Frontend: der Deploy ist nicht der Hebel

`findChatMatchId()` in `src/routes/discover.tsx` (Z. 269–281) liest **nicht** `result.match_id`, sondern fragt selbst ab:

```ts
const { data } = await supabase.from("matches").select("id")
  .eq("user_a", ua).eq("user_b", ub).maybeSingle();
```

Und der Aufrufer (Z. 301, 326) nutzt vom Function-Response nur das Gate:

```ts
const chatMatchId = result?.mutual_match ? await findChatMatchId(targetId) : null;
```

`mutual_match` setzt **schon die deployte v8 korrekt** (es kommt aus der `reverseSwipe`-Abfrage auf `swipes`, Z. 113–121 — beide Objekte existieren live). Damit gilt:

> **Der Chat-Einstieg wird durch das Frontend-Deploy repariert, nicht durch das Function-Deploy.** `findChatMatchId()` findet die Zeile, die der Trigger ohnehin anlegt.

Der Zugriff ist live abgedeckt: `matches` existiert, die SELECT-Policy `auth.uid() = user_a OR auth.uid() = user_b` schließt den Swiper ein, `SELECT` ist an `authenticated` granted, und `.maybeSingle()` liefert bei 0 Zeilen `null` statt Fehler.

*Einschränkung:* `findChatMatchId()` kam mit `b10d786` und liegt damit auf `main` (`git merge-base --is-ancestor b10d786 main` → wahr). Ob es **live ausgeliefert** ist, lässt sich aus dem Repo nicht feststellen: der einzige CI-Workflow (`.github/workflows/deploy-tools.yml`) deployt nur das statische `public/`-Tools-Verzeichnis nach Netlify, nicht die React-App (die baut per Nitro/Cloudflare nach `.output`). **Der App-Deploy ist manuell — den Stand kennt nur der User.**

### 4c. Was der Function-Deploy dann noch bringt

Eine reale, aber schmale Lücke: Der Trigger ist `AFTER **INSERT**`. Der Fallback in der Function ist ein Upsert — bei einem erneuten Swipe auf dasselbe Ziel wird daraus `ON CONFLICT DO UPDATE`, und ein UPDATE feuert keinen INSERT-Trigger.

Szenario: A swiped B mit `pass`. B liked A. A ändert auf `like` → `UPDATE` auf `swipes` → **Trigger feuert nicht** → keine `matches`-Zeile → `findChatMatchId()` gibt `null` → der User sieht „Like gesendet" statt „Es ist ein Match!" und kommt nicht in den Chat.

Der explizite Upsert des Fixes schließt genau diesen Pfad. **Das ist der konkrete Gegenwert des Function-Deploys** — nicht der Haupt-Match-Flow, der läuft schon.

### 4d. `matches.$id.tsx` liest die richtige ID

`src/routes/matches.$id.tsx`:

- Z. 121–125: `supabase.from("matches").select("user_a, user_b").eq("id", id)` → der Routen-Parameter **ist** `matches.id`
- Z. 146–150: `supabase.from("messages").select("*").eq("match_id", id)` → `messages.match_id` ist live per FK an `matches(id)` gebunden:
  `messages_match_id_fkey: FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE`
- `discover.tsx` Z. 328: `navigate({ to: "/matches/$id", params: { id: chatMatchId } })` mit `chatMatchId` aus `matches.id`

→ **Ein einziger ID-Raum, durchgängig `public.matches.id`.** Der Fix gibt in `result.match_id` dieselbe ID zurück. Konsistent.

## 5. Deploy-Mechanik: die einzige echte Falle

Live-Zustand der Function:

| Feld | Wert |
|---|---|
| slug | `swipe` |
| version | **8** |
| status | `ACTIVE` |
| `verify_jwt` | **`false`** |

`supabase/config.toml` enthält Blöcke für `copilot`, `copilot-worker`, `connect-google`, `mcp-connect`, `mcp-act`, `migrate-helper` — **aber keinen `[functions.swipe]`-Block.** Ohne Eintrag greift der CLI-Default `verify_jwt = true`.

> Ein schlichtes `npx supabase functions deploy swipe --project-ref rzmcoxnfcpqqyxgkafwk` würde `verify_jwt` von `false` auf `true` kippen — eine Verhaltensänderung, die nicht im Code-Diff steht.

Wie schlimm? Wahrscheinlich unkritisch: `edgeFunctionHeaders()` (`src/lib/edge-functions.ts` Z. 14–27) schickt `apikey` **und** `Authorization: Bearer <access_token>`. Für eingeloggte User ist das ein gültiger JWT, das Gateway ließe ihn durch; OPTIONS-Preflights überspringt Supabase ohnehin. Und die Function lehnt Nicht-User-Token intern sowieso mit `401 Invalid token` ab (Z. 57–62) — der Gateway-Check wäre redundant, nicht schädlich.

Trotzdem: **unbeabsichtigte Änderung an Live-Konfiguration.** Zwei saubere Wege:

```bash
# Variante A — Flag beim Deploy
npx supabase functions deploy swipe --project-ref rzmcoxnfcpqqyxgkafwk --no-verify-jwt

# Variante B — vorher in supabase/config.toml ergänzen (dauerhaft, empfohlen)
# [functions.swipe]
# verify_jwt = false
```

*Nicht umgesetzt — Änderung an `config.toml` liegt außerhalb dieses Auftrags und der Deploy gehört dem User.*

## 6. Diff v8 → committet: was sich real ändert

Der deployte v8-Quelltext (via MCP ausgelesen) ist **zeichengleich** mit `supabase/functions/swipe/index.ts`, mit genau einem Unterschied im Mutual-Match-Block:

**v8 (live):**
```ts
if (reverseSwipe) {
  result.mutual_match = true;
  const { data: match } = await supabaseAdmin.from("mutual_matches")…
  if (match) {
    result.match_id = match.id;            // ← mutual_matches fehlt ⇒ nie erreicht
    result.conversation_id = match.conversation_id ?? undefined;
  }
}
```

**Committet (`b10d786`):**
```ts
if (reverseSwipe) {
  result.mutual_match = true;
  // + Upsert in public.matches, id in result.match_id  ← NEU
  const { data: match } = await supabaseAdmin.from("mutual_matches")…
  if (match) {
    result.conversation_id = match.conversation_id ?? undefined;
  }
}
```

| Feld im Response | v8 heute | nach Deploy |
|---|---|---|
| `success` | `true` | `true` (unverändert) |
| `mutual_match` | korrekt | korrekt (unverändert) |
| `direction` | korrekt | korrekt (unverändert) |
| `match_id` | **immer leer** (`mutual_matches` fehlt) | **gefüllt** aus `public.matches.id` |
| `conversation_id` | immer leer | immer leer (unverändert — `conversations` fehlt) |

**Rein additiv. Kein Feld verliert Inhalt, kein Statuscode ändert sich, der `GET /history`-Pfad ist unberührt.** Ein Rollback auf v8 wäre jederzeit möglich, weil der Fix keine Daten migriert — er schreibt nur Zeilen, die der Trigger ohnehin schreibt.

---

## 7. Migrations-Inventur

### 7a. Das Ledger ist praktisch leer

```sql
select version, name from supabase_migrations.schema_migrations order by version;
```

| version | name |
|---|---|
| `20260721220707` | `copilot_session_summary` |
| `20260726162418` | `copilot_messages_realtime` |

**2 Einträge gegen 52 Migrationsdateien im Repo.** Und selbst diese zwei matchen keine Repo-Datei per Version: das Repo hat `20260722100000_copilot_session_summary.sql` und `20260726120000_copilot_messages_realtime.sql` — gleiche Namen, andere Zeitstempel. Sie wurden über das Dashboard/MCP angewandt, nicht über `db push`.

> **Das Ledger taugt nicht als Wahrheitsquelle für dieses Projekt.** Die Inventur unten leitet den Zustand deshalb aus den real existierenden Objekten ab, nicht aus `schema_migrations`. Ein `supabase db push` gegen diese DB würde versuchen, 50 Dateien anzuwenden, die teils längst live sind — mit hoher Wahrscheinlichkeit ein Fehlschlag oder Schlimmeres. **Nicht tun, ohne vorher `db pull` / Repair zu klären.**

### 7b. Live-Bestand

**30 Tabellen in `public`:**
`activity_events, advisor_recommendations, ai_token_grants, ai_usage, community_event_registrations, community_events, company_profiles, connected_accounts, copilot_context, copilot_documents, copilot_execution_agents, copilot_execution_events, copilot_execution_jobs, copilot_messages, copilot_sessions, daily_reports, daily_tasks, deadlines, founder_assessment, founder_skills, guides, match_results, matches, messages, notification_prefs, partner_offers, profiles, swipes, user_roles, waitlist`

**7 Funktionen in `public`:**
`claim_copilot_execution_job, confirm_waitlist_entry, handle_new_user, handle_swipe, has_role, join_waitlist, set_updated_at`

**Realtime-Publication `supabase_realtime`:** nur `copilot_messages`
**Cron-Jobs:** nur `matchfoundr-copilot-worker`

### 7c. Datei-für-Datei

Legende: **✅ angewandt** (alle Objekte der Datei existieren live) · **❌ tot** (Objekte fehlen live) · **➖ additiv** (erzeugt keine Tabellen; Zustand auf Tabellenebene nicht bestimmbar, Objekte der Vorgänger sind live)

| # | Migration | Status | Beleg |
|---|---|---|---|
| 1 | `20260516210218_…d23dbce9` | ✅ | `matches, messages, profiles, swipes, user_roles` + `handle_swipe`, `has_role`, `handle_new_user`, `set_updated_at`, Trigger `on_swipe_created` — alle live. **Das ist der Stand, auf dem der Swipe-Flow heute läuft.** |
| 2 | `20260516210230_…227593b8` | ➖ | Re-Definition der Funktionen aus #1 |
| 3 | `20260516210240_…3dabeba5` | ➖ | keine Tabellen |
| 4 | `20260516220400_…6770e07d` | ➖ | keine Tabellen |
| 5 | `20260518120000_copilot_schema` | ✅ | `advisor_recommendations, copilot_context, copilot_documents, copilot_messages, copilot_sessions, deadlines` live |
| 6 | `20260518142343_…4642b05f` | ✅ | dieselben Tabellen wie #5 (Duplikat) |
| 7 | `20260519090947_…51e1f726` | ✅ | `founder_assessment, founder_skills` live |
| 8 | `20260519094147_…14b60251` | ➖ | keine Tabellen |
| 9 | `20260519120000_matching_schema` | ❌ | `match_results` live — aber **`mutual_matches`, `match_interactions`, `services`, `service_saves` fehlen.** Teilweise angewandt. **Ursache des Bugs.** |
| 10 | `20260525090000_daily_tasks` | ✅ | `daily_tasks` live |
| 11 | `20260525100000_complete_core_schema` | ❌ | **`conversations`, `profile_embeddings`, `projects` fehlen alle drei** |
| 12 | `20260525110000_swipe_api` | ❌ | **`perform_swipe` fehlt, `handle_swipe_mutual_match` fehlt, Trigger `trg_swipes_mutual_match` fehlt, Index `idx_swipes_reverse` fehlt.** **Direkte Ursache des Zyklus-1-Befunds.** |
| 13 | `20260525120000_chat_realtime` | ❌ | **`messages` ist nicht in `supabase_realtime`** (nur `copilot_messages`) → siehe [§8](#8-nebenbefunde) |
| 14 | `20260526000000_waitlist_and_resend` | ✅ | `waitlist` + `join_waitlist`, `confirm_waitlist_entry` live |
| 15 | `20260526000002_vault_secrets` | ❌ | **`app_secrets`, `secret_access_log` fehlen** |
| 16 | `20260529120000_notification_prefs` | ✅ | `notification_prefs` live |
| 17 | `20260529120100_daily_digest_cron` | ❌ | **kein Cron-Job außer `matchfoundr-copilot-worker`** |
| 18 | `20260603202653_…5ad2e861` | ✅ | `daily_tasks, match_results, waitlist` live |
| 19 | `20260612090000_community_and_persistence` | ❌ | `activity_events, company_profiles` live — **`community_questions`, `community_answers`, `partner_applications` fehlen.** Teilweise |
| 20 | `20260612150908_…2fcd1879` | ➖ | keine Tabellen |
| 21 | `20260612150926_…64979ee8` | ✅ | `notification_prefs` live |
| 22 | `20260612201557_…6dd461d4` | ✅ | `activity_events, company_profiles` live |
| 23 | `20260715120000_admin_and_content` | ✅ | `ai_usage, guides` live |
| 24 | `20260715220000_partner_offers_live` | ✅ | `partner_offers` live |
| 25 | `20260716090000_founder_radar_briefs` | ❌ | **`founder_radar_briefs` fehlt** — obwohl die Edge Function `founder-radar` deployed ist |
| 26 | `20260716202436_…f7d2ca74` | ➖ | keine Tabellen |
| 27 | `20260716220000_community_events_live` | ✅ | `community_events` live |
| 28 | `20260716232118_…219d0606` | ✅ | `community_event_registrations, community_events, guides` live |
| 29 | `20260716232133_…35e3ffb0` | ✅ | `ai_usage` live |
| 30 | `20260716232414_…f0e067d6` | ➖ | `has_role` live |
| 31 | `20260717090000_community_events_admin` | ✅ | `community_event_registrations` live |
| 32–34 | `20260717101154`, `20260717101648`, `20260717102551` | ➖/✅ | `partner_offers` live |
| 35 | `20260717113000_community_events_live_by_default` | ➖ | keine Tabellen |
| 36–38 | `20260717120000/130000/140000_partner_offers_*` | ➖ | keine Tabellen |
| 39 | `20260717153000_ai_token_grants` | ✅ | `ai_token_grants` live |
| 40 | `20260717212358_…59ed9f93` | ➖ | keine Tabellen |
| 41 | `20260718090000_connected_accounts` | ❌ | `connected_accounts, daily_reports` live — **`account_tokens`, `whatsapp_messages` fehlen.** Teilweise |
| 42 | `20260718091000_morning_report_cron` | ❌ | **kein entsprechender Cron-Job live** |
| 43 | `20260718113116_…d11f9aa4` | ✅ | `ai_token_grants, connected_accounts, daily_reports` live |
| 44 | `20260719171341_…9c313c28` | ➖ | keine Tabellen |
| 45 | `20260720115724_…ccd8653c` | ➖ | keine Tabellen |
| 46 | `20260722100000_copilot_session_summary` | ✅ | `copilot_sessions.summary` + `.summary_updated_at` live · **einziger Eintrag im Ledger** (als `20260721220707`) |
| 47 | `20260722113000_mcp_connectors` | ❌ | **`mcp_connections`, `mcp_oauth_tokens` fehlen** — obwohl `mcp-connect`/`mcp-act` deployed sind |
| 48 | `20260722132000_community_event_external_links` | ➖ | keine Tabellen |
| 49 | `20260723093000_mcp_action_logs` | ❌ | **`mcp_action_logs` fehlt** |
| 50 | `20260726120000_copilot_messages_realtime` | ✅ | `copilot_messages` in `supabase_realtime` · **Ledger-Eintrag** (als `20260726162418`) |
| 51 | `20260726173000_copilot_execution_jobs` | ✅ | `copilot_execution_jobs` + `claim_copilot_execution_job` live |
| 52 | `20260726193000_copilot_persistent_agents` | ✅ | `copilot_execution_agents, copilot_execution_events` live |

### 7d. Zusammenfassung der Drift

**Tot im Repo — 19 Tabellen sind deklariert, existieren aber nicht live:**

| Tabelle | aus Migration | Folge |
|---|---|---|
| `mutual_matches` | #9 | **Zyklus-1-Befund** — v8 liest ins Leere |
| `match_interactions` | #9 | – |
| `services`, `service_saves` | #9 | – |
| `conversations` | #11 | **`conversation_id` bleibt für immer leer** |
| `profile_embeddings` | #11 | kein Vektor-Matching |
| `projects` | #11 | – |
| `app_secrets`, `secret_access_log` | #15 | Vault-Pfad existiert nicht |
| `community_questions`, `community_answers` | #19 | – |
| `partner_applications` | #19 | – |
| `founder_radar_briefs` | #25 | Function `founder-radar` deployed, Tabelle fehlt |
| `account_tokens`, `whatsapp_messages` | #41 | Function `whatsapp-webhook` deployed, Tabelle fehlt |
| `mcp_connections`, `mcp_oauth_tokens` | #47 | Functions `mcp-connect`/`mcp-act` deployed, Tabellen fehlen |
| `mcp_action_logs` | #49 | – |

Dazu fehlen: RPC `perform_swipe`, Funktion `handle_swipe_mutual_match`, Trigger `trg_swipes_mutual_match`, Index `idx_swipes_reverse` (alle #12), die Realtime-Publication für `messages` (#13), zwei Cron-Jobs (#17, #42).

**Objekte ohne Migration: keine.** Alle 30 Live-Tabellen und alle 7 Live-Funktionen sind im Repo deklariert. Die Drift ist einseitig — das Repo läuft dem Live-Stand *voraus*, nicht hinterher. Für den Swipe-Fix ist das die gute Richtung: es fehlt nichts Unbekanntes, es wurde nur nie alles angewandt.

**Muster:** Die Edge Functions sind konsequent deployt, ihre Schema-Migrationen aber nicht. `founder-radar`, `whatsapp-webhook`, `mcp-connect`, `mcp-act` laufen live gegen Tabellen, die es nicht gibt. Der `swipe`-Bug ist kein Einzelfall, sondern die sichtbarste Instanz dieses Musters.

---

## 8. Nebenbefunde

Gefunden, **nicht** behoben (außerhalb des Auftrags):

1. **Realtime im Chat ist tot.** `src/routes/matches.$id.tsx` Z. 158–165 abonniert `postgres_changes` auf `public.messages`. `messages` steht nicht in der `supabase_realtime`-Publication (nur `copilot_messages`). Der Channel subscribed erfolgreich und liefert nie ein Event — **Nachrichten erscheinen beim Gegenüber erst nach Reload.** Ursache: Migration #13 nie angewandt. Kein Fehler in der Konsole, deshalb bisher unentdeckt. *Berührt den Swipe-Fix nicht, aber denselben Flow direkt dahinter.*
2. **`src/hooks/useSwiping.ts` ist toter Code.** Definiert `mutual_match`/`match_id`/`conversation_id`, wird nirgends importiert. `discover.tsx` hat mit `performSwipe` eine eigene Implementierung. Ein Kandidat zum Löschen — oder der Hook war der ursprünglich gedachte Konsument von `conversation_id`.
3. **`conversation_id` ist im gesamten Frontend unbenutzt.** Es kommt nur in den Typdefinitionen von `useSwiping.ts` und `useSparkProfiles.ts` vor. Da `conversations` live nicht existiert, ist das Feld im Response dauerhaft tot. Ehrlicher wäre, es aus `SwipeResult` zu entfernen — der Fix lässt es drin, was harmlos, aber irreführend ist.
4. **`supabase/config.toml` fehlt der `[functions.swipe]`-Block** — siehe §5.
5. **Das Lint-Gate ist rot — durch fremde Agenten-Worktrees, nicht durch Code im Branch.**

   `eslint.config.js` Z. 9 ignoriert `dist, .output, .vinxi, docs, public, data, ios, supabase/functions` — **aber nicht `.claude`**. Die Entwicklungsschleife legt Worktrees unter `.claude/worktrees/` an; das sind vollständige Kopien des Quellbaums. Aktuell: `copilot-beleg` und `zen-shirley-3c820e`, zusammen **412 lintbare Dateien gegen 184 in `src/`**.

   Gemessen auf diesem Stand:

   | Kommando | Ergebnis | Exit | Dauer |
   |---|---|---|---|
   | `npx eslint src` | 0 Errors, 10 Warnings | **0** | < 2 min |
   | `bun run lint` (= `eslint .`) | **1258 Errors, 21 Warnings** | **1** | ~14 min |

   **Der gesamte Fehlerbestand liegt außerhalb von `src/`.** Nachgewiesen per `lsof` auf den laufenden eslint-Prozess:
   ```
   /…/match-maker-for-founders/.claude/worktrees/zen-shirley-3c820e/src/lib/copilot-client.ts
   ```

   Pikant daran: diese Dateien sind **git-ausgeschlossen und ungetrackt** —
   ```
   $ git check-ignore -v .claude/worktrees/zen-shirley-3c820e
   .git/info/exclude:7:.claude/worktrees/   .claude/worktrees/zen-shirley-3c820e
   $ git ls-files .claude/worktrees   # leer
   ```
   eslint liest `.git/info/exclude` nicht und läuft trotzdem hinein. Das Gate bewertet also Dateien, die in keinem Commit dieses Branches stehen.

   Zwei Folgen, beide unangenehm: die Laufzeit wächst linear mit jedem Agenten-Worktree, und **ein Lint-Fehler im Worktree eines fremden Agenten lässt das Gate im Hauptbaum rot werden** — für Code, der im eigenen Diff gar nicht vorkommt. Ein `.claude` in der `ignores`-Liste behebt beides. *Erklärt vermutlich den Aufwand hinter `8948b3f`/`e80e276`/`aa2ee36` („Lint-Gate grün") in Zyklus 1 — und dass es nicht hielt.*

---

## 9. Was der User entscheiden muss

| Frage | Empfehlung |
|---|---|
| `swipe` v9 deployen? | **Ja, sicher** — aber mit `--no-verify-jwt` (§5). Additiv, rollback-fähig, schließt die `pass → like`-Lücke (§4c). |
| Frontend deployen? | **Das ist der eigentliche Hebel** für den Chat-Einstieg (§4b) — unabhängig vom Function-Deploy. Der Code liegt auf `main`, aber es gibt keinen CI-Job, der die React-App deployt. Falls seit `b10d786` kein App-Deploy lief, ist der Chat-Einstieg auch nach dem Function-Deploy noch kaputt. |
| Migration #12 (`swipe_api`) nachziehen? | **Nein, nicht nötig.** Der Trigger aus #1 erfüllt denselben Zweck. #12 würde eine zweite, konkurrierende Trigger-Kette einziehen. |
| Migration #9/#11 (`mutual_matches`, `conversations`) nachziehen? | **Nein, nicht für diesen Fix.** Der Code funktioniert ohne. Wäre eine eigene Entscheidung über das Datenmodell. |
| `supabase db push`? | **Nicht ohne Vorarbeit.** Das Ledger kennt 2 von 52 Dateien (§7a). Zuerst `db pull`/Repair, sonst kollidiert der Push mit dem Live-Stand. |
| Realtime für `messages`? | Eigenes Ticket (§8.1). Einzeiler, aber ein Schema-Write — gehört nicht in diesen Auftrag. |

---

*Erhoben read-only gegen `rzmcoxnfcpqqyxgkafwk` am 2026-07-29. Kein DDL, kein Deploy, keine Schema-Änderung ausgeführt.*
