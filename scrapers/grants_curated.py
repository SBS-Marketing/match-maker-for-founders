"""
Scraper fuer kuratierte deutsche Foerderprogramme.

Die Quellenliste enthaelt offizielle Programmseiten. Das Script speichert
Metadaten plus extrahierten Seitentext als Raw-JSON, damit die Normalisierung
ohne weitere Netzwerkanfragen reproduzierbar bleibt.
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

RAW_DIR = Path(__file__).parent.parent / "data" / "grants" / "raw"
RAW_DIR.mkdir(parents=True, exist_ok=True)

SOURCES = [
    {
        "id": "exist-gruenderstipendium",
        "name": "EXIST-Gründerstipendium",
        "body": "BMWK · DLR Projektträger",
        "region": "Deutschland",
        "category": "stipendium",
        "stage": ["idee", "pre-seed", "hochschule"],
        "url": "https://www.exist.de/EXIST/Navigation/DE/Gruendungsfoerderung/EXIST-Gruendungsstipendium/exist-gruendungsstipendium.html",
        "apply_url": "https://www.exist.de/EXIST/Navigation/DE/Gruendungsfoerderung/EXIST-Gruendungsstipendium/Antragstellung/antragstellung.html",
        "amount_hint": "bis ca. €125.000",
        "duration_hint": "12 Monate",
        "deadline_hint": "Laufend über Hochschule",
    },
    {
        "id": "exist-forschungstransfer",
        "name": "EXIST-Forschungstransfer",
        "body": "BMWK · DLR Projektträger",
        "region": "Deutschland",
        "category": "forschung",
        "stage": ["forschung", "deeptech", "pre-seed"],
        "url": "https://www.exist.de/EXIST/Navigation/DE/Gruendungsfoerderung/EXIST-Forschungstransfer/exist-forschungstransfer.html",
        "apply_url": "https://www.exist.de/EXIST/Navigation/DE/Gruendungsfoerderung/EXIST-Forschungstransfer/Antragstellung/antragstellung.html",
        "amount_hint": "bis ca. €250.000+",
        "duration_hint": "18 Monate + Phase II",
        "deadline_hint": "Stichtage / Projektträger prüfen",
    },
    {
        "id": "invest-zuschuss-wagniskapital",
        "name": "INVEST Zuschuss für Wagniskapital",
        "body": "BAFA · Business Angels",
        "region": "Deutschland",
        "category": "kapital",
        "stage": ["pre-seed", "seed", "angel"],
        "url": "https://www.bafa.de/DE/Wirtschaft/Beratung_Finanzierung/Invest/invest_node.html",
        "apply_url": "https://fms.bafa.de/BafaFrame/invest",
        "amount_hint": "20% Erwerbszuschuss",
        "duration_hint": "Investmentabhängig",
        "deadline_hint": "Laufend",
    },
    {
        "id": "kfw-erp-gruenderkredit-startgeld",
        "name": "ERP-Gründerkredit - StartGeld",
        "body": "KfW · Finanzierung",
        "region": "Deutschland",
        "category": "kredit",
        "stage": ["gruendung", "nachfolge", "early"],
        "url": "https://www.kfw.de/inlandsfoerderung/Unternehmen/Gr%C3%BCnden-Nachfolgen/F%C3%B6rderprodukte/ERP-Gr%C3%BCnderkredit-Startgeld-(067)/",
        "apply_url": "https://www.kfw.de/inlandsfoerderung/Unternehmen/Gr%C3%BCnden-Nachfolgen/F%C3%B6rderprodukte/ERP-Gr%C3%BCnderkredit-Startgeld-(067)/",
        "amount_hint": "bis €125.000",
        "duration_hint": "bis 10 Jahre",
        "deadline_hint": "Laufend über Hausbank",
    },
    {
        "id": "profit-berlin",
        "name": "ProFIT Berlin",
        "body": "IBB Business Team",
        "region": "Berlin",
        "category": "fue",
        "stage": ["prototype", "fue", "seed"],
        "url": "https://www.ibb-business-team.de/profit",
        "apply_url": "https://www.ibb-business-team.de/profit",
        "amount_hint": "bis €1,5 Mio.",
        "duration_hint": "Projektabhängig",
        "deadline_hint": "Rollierend",
    },
    {
        "id": "gruendungsbonus-berlin",
        "name": "GründungsBONUS Berlin",
        "body": "IBB Business Team",
        "region": "Berlin",
        "category": "zuschuss",
        "stage": ["gruendung", "early", "prototype"],
        "url": "https://www.ibb-business-team.de/gruendungsbonus",
        "apply_url": "https://www.ibb-business-team.de/gruendungsbonus",
        "amount_hint": "bis €50.000",
        "duration_hint": "12 Monate",
        "deadline_hint": "Rollierend",
    },
    {
        "id": "startup-bw-pre-seed",
        "name": "Start-up BW Pre-Seed",
        "body": "Land Baden-Württemberg · Startup BW",
        "region": "Baden-Württemberg",
        "category": "pre-seed",
        "stage": ["pre-seed", "prototype", "team"],
        "url": "https://www.startupbw.de/foerderprogramme/start-up-bw-pre-seed",
        "apply_url": "https://www.startupbw.de/foerderprogramme/start-up-bw-pre-seed",
        "amount_hint": "bis €200.000",
        "duration_hint": "Finanzierungsrunde",
        "deadline_hint": "Über Betreuungspartner",
    },
    {
        "id": "ifb-innorampup",
        "name": "InnoRampUp",
        "body": "IFB Hamburg",
        "region": "Hamburg",
        "category": "zuschuss",
        "stage": ["pre-seed", "prototype", "innovation"],
        "url": "https://www.ifbhh.de/foerderprogramm/innorampup",
        "apply_url": "https://www.ifbhh.de/foerderprogramm/innorampup",
        "amount_hint": "bis €150.000",
        "duration_hint": "Projektabhängig",
        "deadline_hint": "Rollierend",
    },
    {
        "id": "nrwbank-gruendungskredit",
        "name": "NRW.BANK.Gründungskredit",
        "body": "NRW.BANK",
        "region": "Nordrhein-Westfalen",
        "category": "kredit",
        "stage": ["gruendung", "nachfolge", "wachstum"],
        "url": "https://www.nrwbank.de/de/foerderung/foerderprodukte/15204/nrwbankgruendungskredit.html",
        "apply_url": "https://www.nrwbank.de/de/foerderung/foerderprodukte/15204/nrwbankgruendungskredit.html",
        "amount_hint": "bis €10 Mio.",
        "duration_hint": "bis 20 Jahre",
        "deadline_hint": "Laufend über Hausbank",
    },
    {
        "id": "go-inno",
        "name": "go-inno Innovationsgutschein",
        "body": "BMWK · Innovationsberatung",
        "region": "Deutschland",
        "category": "beratung",
        "stage": ["innovation", "mittelstand", "prototype"],
        "url": "https://www.bmwk.de/Redaktion/DE/Artikel/Technologie/go-inno.html",
        "apply_url": "https://www.bmwk.de/Redaktion/DE/Artikel/Technologie/go-inno.html",
        "amount_hint": "bis 50% Beratungskosten",
        "duration_hint": "Beratungsprojekt",
        "deadline_hint": "Laufend",
    },
]

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml",
    "Accept-Language": "de,en;q=0.9",
}


def extract_text(html: str, max_chars: int = 10000) -> str:
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
        res = client.get(source["url"], timeout=25, follow_redirects=True)
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
            time.sleep(1.1)

    out_file.write_text(
        json.dumps({"scraped_at": datetime.now(UTC).isoformat(), "sources": results}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    ok = sum(1 for item in results if not item.get("error"))
    print(f"\n✓ {ok}/{len(results)} Quellen erfolgreich → {out_file.name}")


if __name__ == "__main__":
    run()
