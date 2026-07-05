# matchfoundr · Integrations- & MCP-Fahrplan

Stand der Vorbereitung: Was schon läuft, was als Nächstes kommt, und die konkreten
Schritte für jede Integration. Sortiert nach Aufwand/Nutzen für den MVP.

## ✅ Läuft bereits

| Integration | Status | Wo im Code |
|---|---|---|
| **Supabase** (Auth, DB, RLS, Edge Functions) | produktiv | `src/integrations/supabase/`, `supabase/` |
| **Google OAuth** | eingebaut | `src/routes/auth.tsx` (`signInWithOAuth`) — im Supabase-Dashboard unter Auth → Providers → Google Client-ID/Secret hinterlegen |
| **Resend** (E-Mail) | Function fertig | `resend-confirm` (Waitlist), `daily-digest` (Tages-Mail) — braucht `RESEND_API_KEY` als Function-Secret |
| **Supabase Storage** (Profilbilder/Media) | Migration + Upload fertig | Bucket `media`, `src/lib/upload.ts` |
| **OpenRouter** (Kimi + Sonnet für Co-Pilot) | produktiv | `supabase/functions/copilot/` — `OPENROUTER_API_KEY` |

## 🔜 Sofort sinnvoll (MVP+) — konkrete Schritte

### LinkedIn OAuth (Profil-Import)
1. Supabase Dashboard → Auth → Providers → **LinkedIn (OIDC)** aktivieren.
2. LinkedIn Developer App anlegen (https://developer.linkedin.com), Redirect: `https://urjpyhyezrwhwgnkkxjv.supabase.co/auth/v1/callback`.
3. In `auth.tsx` einen dritten OAuth-Button ergänzen (`provider: "linkedin_oidc"`).
4. Nach Login: `user_metadata` (name, picture) in `profiles` übernehmen — Hook in `auth.callback.tsx`.

### Stripe (Premium 9 €/Monat)
Die Freemium-Gates sind fertig (`src/lib/premium.ts`, `PremiumSheet.tsx`) — Stripe ersetzt nur die lokale Trial-Freischaltung:
1. Stripe-Konto + Produkt „matchfoundr Premium" (9 €/Monat, 7 Tage Trial).
2. Edge Function `stripe-checkout` (Checkout-Session erstellen) + `stripe-webhook` (Subscription-Status → neue Spalte `profiles.premium_until`).
3. `isPremium()` in `premium.ts` um Server-Check erweitern (Spalte lesen, localStorage als Cache).
4. `PremiumSheet` CTA → Checkout-URL statt `activateTrial()`.

### Google Maps (Beratungsstellen nach PLZ)
1. Maps JavaScript API + Places API Key (auf Domain beschränken).
2. Datenquelle: statische Liste der IHK/HWK/Gründerzentren als `src/data/beratungsstellen.ts` (PLZ-Präfix → Einträge) — reicht ohne API für V1!
3. V2: Karte einbetten (`@vis.gl/react-google-maps`), Marker aus der Liste.

## 🧩 MCP-Server für den Betrieb (Team-Produktivität)

Diese MCPs helfen EUCH beim Bauen/Betreiben — in Claude Code/Cowork verbinden:

| MCP | Nutzen für matchfoundr |
|---|---|
| **Supabase MCP** | Migrationen, SQL, Logs, Typen direkt aus dem Chat (Zugriff aufs Projekt `urjpyhyezrwhwgnkkxjv` freischalten!) |
| **Stripe MCP** | Produkte/Preise anlegen, Test-Checkouts, Webhook-Debugging |
| **Resend MCP** | Mail-Templates testen, Zustellbarkeit prüfen |
| **GitHub MCP** | Issues/PRs aus dem Chat, Release-Notes |
| **Sentry MCP** (nach Sentry-Setup) | Fehler der Web-App direkt analysieren |
| **Linear/Notion MCP** | Roadmap & Guides-Redaktion (Notion→Guides-Pipeline, s.u.) |

## 📚 Notion → Guides-Pipeline (mittelfristig)
Guides leben aktuell in `src/data/guides.ts` (10 Artikel, typisiert). Für Redaktion ohne Deploy:
1. Notion-Datenbank mit denselben Feldern (slug, title, category, minutes, intro, sections).
2. Build-Script `scripts/sync-guides.ts` zieht via Notion-API und schreibt `guides.ts` — läuft im CI vor dem Build. Kein Runtime-Fetch nötig = bleibt schnell.

## 📱 PWA / Push (Monat 4–9)
1. `vite-plugin-pwa` + Manifest (Name, Icons aus `brand/`, `display: standalone`).
2. Push: Supabase-DB-Webhook auf `matches`/`messages` INSERT → Edge Function → Web-Push (VAPID). Abo-Verwaltung in `notification_prefs` (Tabelle existiert).

## Reihenfolge-Empfehlung
1. **Stripe** (Umsatz) → 2. **LinkedIn OAuth** (Conversion) → 3. **PWA** (Retention) → 4. Maps/Beratungsstellen-Karte → 5. Notion-Pipeline.
