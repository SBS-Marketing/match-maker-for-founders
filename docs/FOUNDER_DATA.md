# Datenquellen: Ansprechpartner, Kreditgeber, Finanzierung, Deals

Wo liegen die gescannten Daten, wie laufen die Jobs, und wie kommen sie in Web + App.

## Die drei Kataloge

| Katalog | Datei | Inhalt | Stand prüfen |
|---|---|---|---|
| **Partner / Ansprechpartner** | `public/partners.json` (+ `docs/partners.json`) | 10 kuratierte Ansprechpartner inkl. **KfW & Hausbank Finance Desk** (Kreditgeber, `bookingUrl` zum Termin) — Anwälte, Steuerberater, Förderberater | Feld `generated_at` |
| **Förderungen / Finanzierung** | `public/grants.json` (+ `docs/grants.json`) | 10 Förderprogramme mit `applyUrl`, `eligibility`, `timeline`, `materials` — Gründungszuschuss, Mikrokredit & Co. | Feld `generated_at` |
| **Deals / Vergünstigungen** | `public/deals.json` (+ `docs/deals.json`) | ~70 Software- und Service-Deals mit `claim_url`, Kategorie, Wert | Feld `generated_at` |

Historie: `data/deals/deals_YYYY-MM-DD.json` (ein Snapshot pro Lauf).
Generierte TypeScript-Spiegel für die Website: `src/data/grants.generated.ts`, `src/data/partners.generated.ts`.

## Die Jobs (alles noch da und aktiv)

1. **Scraper** — `scrapers/*.py`: `deals_curated`, `deals_discovery`, `grants_curated`, `grants_discovery`, `partners_curated`
2. **KI-Normalisierung** — `scripts/normalize_*.py` (Claude via `ANTHROPIC_API_KEY`)
3. **JSON-Build** — `scripts/build_*_json.py` → schreibt `public/` + `docs/` + Snapshot

**Automatisch:** GitHub Action `weekly-deals.yml` läuft **jeden Dienstag 07:00 UTC**, committet als `matchfoundr-bot` und legt bei Fehlern ein Issue an.
**Manuell:** GitHub → Actions → *Weekly Deals* → **Run workflow**.
**Auslieferung:** `deploy-tools.yml` deployt `public/` bei jedem Push nach Netlify; `docs/` liegt zusätzlich auf GitHub Pages.

## Zugriff aus den Apps

- **Website:** lädt `/deals.json`, `/grants.json`, `/partners.json` direkt (gleicher Origin). Der Admin-Bereich zeigt unter `/admin` → Insights den Status jeder Quelle (Anzahl + Stand + Link).
- **iOS:** `ios/Matchfoundr/Backend/RemoteCatalog.swift` (`RemoteCatalog.shared.refresh()`) lädt die drei JSONs von `raw.githubusercontent.com` (main-Branch) und cacht sie in UserDefaults für Offline-Betrieb. Modelle: `CatalogDeal`, `CatalogGrant`, `CatalogPartner`.
- **Zusätzlich in Supabase:** `partner_offers` (Live-Partnerdaten für iOS) und `community_events` (Events, vom Admin gepflegt).
