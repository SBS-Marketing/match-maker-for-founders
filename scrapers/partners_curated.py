"""
Scraper fuer kuratierte Partner- und Anbieterquellen im Marketplace.

Die Liste deckt die noch offenen Kategorien ab: Steuer, Kapital, Mentoren,
Talent und Growth. Wie bei Grants bleibt die kuratierte Metaschicht wichtig,
damit die App auch bei blockierten Websites nutzbare Partnerdaten erzeugt.
"""
import json
import re
import time
from datetime import UTC, datetime
from pathlib import Path

try:
    import httpx
except ImportError:
    raise SystemExit("pip install httpx")

RAW_DIR = Path(__file__).parent.parent / "data" / "partners" / "raw"
RAW_DIR.mkdir(parents=True, exist_ok=True)

SOURCES = [
    {
        "id": "startup-tax-readiness",
        "service": "tax",
        "name": "Startup Tax Readiness",
        "firm": "matchfoundr Partner Desk",
        "city": "Remote",
        "url": "https://www.lexoffice.de/gruender/",
        "booking_url": "https://www.lexoffice.de/gruender/",
        "blurb": "Setup fuer Buchhaltung, USt, Lohn, DATEV-Export und erste Monatsabschluesse.",
        "fit_hint": 88,
        "specialties": ["Buchhaltung", "USt-Voranmeldung", "DATEV", "Lohn"],
        "package_hint": "ab €390 / Monat",
    },
    {
        "id": "research-allowance-desk",
        "service": "tax",
        "name": "Forschungszulage Desk",
        "firm": "matchfoundr Partner Desk",
        "city": "Deutschland",
        "url": "https://www.bescheinigung-forschungszulage.de/",
        "booking_url": "https://www.bescheinigung-forschungszulage.de/",
        "blurb": "Prueft FuE-Faehigkeit und strukturiert Nachweise fuer Forschungszulage-Antraege.",
        "fit_hint": 84,
        "specialties": ["Forschungszulage", "FuE-Dokumentation", "Kostenplan", "Antrag"],
        "package_hint": "Erstcheck kostenlos",
    },
    {
        "id": "angel-readiness",
        "service": "capital",
        "name": "Angel Readiness Sprint",
        "firm": "matchfoundr Capital Desk",
        "city": "Berlin",
        "url": "https://www.business-angels.de/",
        "booking_url": "https://www.business-angels.de/",
        "blurb": "Bereitet Angel-Runde, Onepager, Target List und Intro-Material fuer Pre-Seed vor.",
        "fit_hint": 86,
        "specialties": ["Angel-Runde", "Onepager", "Target List", "Intro Prep"],
        "package_hint": "2 Wochen Sprint",
    },
    {
        "id": "kfw-finance-desk",
        "service": "capital",
        "name": "KfW & Hausbank Finance Desk",
        "firm": "matchfoundr Capital Desk",
        "city": "Deutschland",
        "url": "https://www.kfw.de/inlandsfoerderung/Unternehmen/Gr%C3%BCnden-Nachfolgen/",
        "booking_url": "https://www.kfw.de/inlandsfoerderung/Unternehmen/Gr%C3%BCnden-Nachfolgen/",
        "blurb": "Strukturiert Finanzierungsbedarf, Hausbank-Unterlagen und Foerderkredit-Optionen.",
        "fit_hint": 78,
        "specialties": ["KfW", "Hausbank", "Liquiditaetsplanung", "Finanzplan"],
        "package_hint": "Finanzierungscheck",
    },
    {
        "id": "operator-office-hours",
        "service": "mentor",
        "name": "Operator Office Hours",
        "firm": "matchfoundr Mentor Network",
        "city": "Remote",
        "url": "https://www.startupgrind.com/startups/",
        "booking_url": "https://www.startupgrind.com/startups/",
        "blurb": "Erfahrene Operator fuer Produkt, Sales, Hiring und erste Fuehrungsroutinen.",
        "fit_hint": 91,
        "specialties": ["Product", "Sales", "Hiring", "Founder Coaching"],
        "package_hint": "30 Min Office Hour",
    },
    {
        "id": "gtm-mentor-circle",
        "service": "mentor",
        "name": "GTM Mentor Circle",
        "firm": "matchfoundr Mentor Network",
        "city": "Remote",
        "url": "https://www.germanaccelerator.com/our-programs",
        "booking_url": "https://www.germanaccelerator.com/our-programs",
        "blurb": "Mentoren fuer Go-to-Market, US-Expansion, ICP-Schaerfung und Enterprise Sales.",
        "fit_hint": 87,
        "specialties": ["GTM", "ICP", "Enterprise Sales", "Expansion"],
        "package_hint": "Mentor Matching",
    },
    {
        "id": "first-five-hires",
        "service": "talent",
        "name": "First Five Hires",
        "firm": "matchfoundr Talent Desk",
        "city": "Deutschland",
        "url": "https://wellfound.com/recruit",
        "booking_url": "https://wellfound.com/recruit",
        "blurb": "Pipeline fuer erste Engineer-, Growth- und Ops-Rollen mit Founder-tauglicher Vorauswahl.",
        "fit_hint": 89,
        "specialties": ["Engineering", "Growth", "Ops", "Founder Fit"],
        "package_hint": "Shortlist in 10 Tagen",
    },
    {
        "id": "fractional-talent",
        "service": "talent",
        "name": "Fractional Talent Pool",
        "firm": "matchfoundr Talent Desk",
        "city": "Remote",
        "url": "https://www.malt.de/",
        "booking_url": "https://www.malt.de/",
        "blurb": "Fractional Spezialisten fuer Design, Data, Finance und Growth bevor Vollzeit-Hiring Sinn ergibt.",
        "fit_hint": 82,
        "specialties": ["Fractional", "Design", "Data", "Finance"],
        "package_hint": "ab 1 Tag / Woche",
    },
    {
        "id": "launch-growth-sprint",
        "service": "growth",
        "name": "Launch Growth Sprint",
        "firm": "matchfoundr Growth Desk",
        "city": "Berlin",
        "url": "https://www.producthunt.com/ship",
        "booking_url": "https://www.producthunt.com/ship",
        "blurb": "Launch-Plan, Landingpage-Review, Outreach-Sequenzen und erste Kanaltests.",
        "fit_hint": 90,
        "specialties": ["Launch", "Landingpage", "Outreach", "Analytics"],
        "package_hint": "10 Tage Sprint",
    },
    {
        "id": "b2b-sales-motion",
        "service": "growth",
        "name": "B2B Sales Motion",
        "firm": "matchfoundr Growth Desk",
        "city": "Remote",
        "url": "https://www.apollo.io/startups",
        "booking_url": "https://www.apollo.io/startups",
        "blurb": "ICP, Lead-Listen, Sequenzen und Discovery Script fuer die ersten 30 B2B-Gespraeche.",
        "fit_hint": 86,
        "specialties": ["ICP", "Outbound", "Discovery", "CRM"],
        "package_hint": "Pipeline Sprint",
    },
]

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    "Accept": "text/html,application/xhtml+xml",
    "Accept-Language": "de,en;q=0.9",
}


def extract_text(html: str, max_chars: int = 7000) -> str:
    html = re.sub(r"<(script|style|noscript)[^>]*>.*?</\1>", " ", html, flags=re.DOTALL | re.IGNORECASE)
    html = re.sub(r"<[^>]+>", " ", html)
    return re.sub(r"\s+", " ", html).strip()[:max_chars]


def scrape_source(client: httpx.Client, source: dict) -> dict:
    raw = {
        **source,
        "scraped_at": datetime.now(UTC).isoformat(),
        "text": None,
        "status_code": None,
        "final_url": None,
        "error": None,
    }
    try:
        res = client.get(source["url"], timeout=18, follow_redirects=True)
        raw["status_code"] = res.status_code
        raw["final_url"] = str(res.url)
        res.raise_for_status()
        raw["text"] = extract_text(res.text)
        print(f"  ✓ {source['id']} ({len(raw['text'])} chars)")
    except Exception as exc:
        raw["error"] = str(exc)
        print(f"  ✗ {source['id']}: {exc}")
    return raw


def run() -> None:
    date_str = datetime.now(UTC).strftime("%Y-%m-%d")
    out_file = RAW_DIR / f"curated_{date_str}.json"
    results = []
    with httpx.Client(headers=HEADERS, http2=False) as client:
        for idx, source in enumerate(SOURCES, start=1):
            print(f"[{idx}/{len(SOURCES)}] {source['id']}")
            results.append(scrape_source(client, source))
            time.sleep(0.9)
    out_file.write_text(
        json.dumps({"scraped_at": datetime.now(UTC).isoformat(), "sources": results}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    ok = sum(1 for item in results if not item.get("error"))
    print(f"\n✓ {ok}/{len(results)} Partnerquellen erfolgreich → {out_file.name}")


if __name__ == "__main__":
    run()
