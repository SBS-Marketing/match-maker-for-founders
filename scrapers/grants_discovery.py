"""
Discovery-Scraper fuer Foerderprogramm-Kandidaten.

Er sammelt Links aus offiziellen Such-/Uebersichtsseiten. Die Ergebnisse sind
bewusst Rohkandidaten: Ein Mensch oder ein spaeterer Ranker entscheidet, was in
die kuratierte Quellenliste uebernommen wird.
"""
import json
import re
import time
from datetime import UTC, datetime
from pathlib import Path
from urllib.parse import urljoin, urlparse

try:
    import httpx
except ImportError:
    raise SystemExit("pip install httpx")

RAW_DIR = Path(__file__).parent.parent / "data" / "grants" / "raw"
RAW_DIR.mkdir(parents=True, exist_ok=True)

SEED_PAGES = [
    {
        "id": "foerderdatenbank-suche",
        "url": "https://www.foerderdatenbank.de/FDB/DE/Foerderprogramme/foerderprogramme.html",
        "region": "Deutschland",
    },
    {
        "id": "startupbw-programme",
        "url": "https://www.startupbw.de/foerderprogramme",
        "region": "Baden-Württemberg",
    },
    {
        "id": "ibb-business-team",
        "url": "https://www.ibb-business-team.de/foerderprogramme",
        "region": "Berlin",
    },
    {
        "id": "ifb-hamburg-programme",
        "url": "https://www.ifbhh.de/foerderprogramme",
        "region": "Hamburg",
    },
]

KEYWORDS = (
    "gründ", "gruend", "startup", "start-up", "innovation", "exist",
    "seed", "wagniskapital", "digital", "forschung", "transfer",
)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    "Accept": "text/html,application/xhtml+xml",
    "Accept-Language": "de,en;q=0.9",
}


def extract_links(html: str, base_url: str) -> list[dict]:
    links = []
    for match in re.finditer(r"<a\b[^>]*href=[\"']([^\"']+)[\"'][^>]*>(.*?)</a>", html, flags=re.I | re.S):
        href, label_html = match.groups()
        label = re.sub(r"<[^>]+>", " ", label_html)
        label = re.sub(r"\s+", " ", label).strip()
        url = urljoin(base_url, href)
        parsed = urlparse(url)
        if parsed.scheme not in {"http", "https"}:
            continue
        haystack = f"{label} {url}".lower()
        if not any(keyword in haystack for keyword in KEYWORDS):
            continue
        links.append({"title": label or parsed.path.rsplit("/", 1)[-1], "url": url})
    deduped = {}
    for link in links:
        deduped[link["url"]] = link
    return list(deduped.values())


def run() -> None:
    date_str = datetime.now(UTC).strftime("%Y-%m-%d")
    out_file = RAW_DIR / f"discovery_{date_str}.json"
    candidates = []

    with httpx.Client(headers=HEADERS, http2=False, follow_redirects=True) as client:
        for seed in SEED_PAGES:
            print(f"Seed: {seed['id']}")
            try:
                res = client.get(seed["url"], timeout=25)
                res.raise_for_status()
                links = extract_links(res.text, seed["url"])
                for link in links:
                    candidates.append({**link, "source": seed["id"], "region": seed["region"]})
                print(f"  ✓ {len(links)} Kandidaten")
            except Exception as exc:
                print(f"  ✗ {exc}")
            time.sleep(1.0)

    out_file.write_text(
        json.dumps({"scraped_at": datetime.now(UTC).isoformat(), "candidates": candidates}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"\n✓ {len(candidates)} Kandidaten → {out_file.name}")


if __name__ == "__main__":
    run()
