"""
Discovery-Scraper: findet neue Startup-Deals auf Aggregator-Seiten.

Quellen:
- Startupstash.com  – hat JSON-Daten eingebettet
- SaaSworthy.com    – Startup-Programs-Seite
- Pitchbook Deal-Verzeichnis (öffentlicher Teil)
"""
import json
import re
import time
from pathlib import Path
from datetime import datetime

try:
    import httpx
except ImportError:
    raise SystemExit("pip install httpx")

RAW_DIR = Path(__file__).parent.parent / "data" / "deals" / "raw"
RAW_DIR.mkdir(parents=True, exist_ok=True)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/json,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

DISCOVERY_SOURCES = [
    {
        "id": "freefounderstack",
        "url": "https://www.freefounderstack.com/",
        "cat": "aggregator",
    },
    {
        "id": "freestartupdeals",
        "url": "https://www.freestartupdeals.com/",
        "cat": "aggregator",
    },
    {
        "id": "innmind_deals",
        "url": "https://innmind.com/startup-deals/",
        "cat": "aggregator",
    },
    {
        "id": "foundersprime",
        "url": "https://www.foundersprime.com/",
        "cat": "aggregator",
    },
    {
        "id": "startcamp",
        "url": "https://startcamp.com/",
        "cat": "aggregator",
    },
    {
        "id": "f6s_deals",
        "url": "https://www.f6s.com/deals",
        "cat": "aggregator",
    },
    {
        "id": "startupperks_directory",
        "url": "https://startupperks.directory/",
        "cat": "aggregator",
    },
    {
        "id": "founderlift",
        "url": "https://www.founderlift.space/",
        "cat": "aggregator",
    },
    {
        "id": "startup_perks_io",
        "url": "https://startupperks.io/",
        "cat": "aggregator",
    },
]


def extract_links_and_text(html: str, base_url: str) -> dict:
    """Extrahiert Links und Text aus HTML."""
    # Links mit Deal-Keywords
    deal_pattern = re.compile(
        r'href=["\']([^"\']+)["\'][^>]*>([^<]{3,80})<',
        re.IGNORECASE,
    )
    deal_keywords = ["startup", "discount", "deal", "free", "credit", "program", "offer"]
    links = []
    for m in deal_pattern.finditer(html):
        href, text = m.group(1), m.group(2).strip()
        if any(kw in href.lower() or kw in text.lower() for kw in deal_keywords):
            # Nur externe Links
            if href.startswith("http") and base_url not in href:
                links.append({"url": href, "text": text})

    # Seitentext für Claude
    text = re.sub(r'<(script|style)[^>]*>.*?</\1>', ' ', html, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r'<[^>]+>', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()

    return {"text": text[:12000], "deal_links": links[:100]}


def run():
    date_str = datetime.utcnow().strftime("%Y-%m-%d")
    out_file = RAW_DIR / f"discovery_{date_str}.json"

    all_results = []

    with httpx.Client(headers=HEADERS, http2=False) as client:
        for source in DISCOVERY_SOURCES:
            print(f"[discovery] {source['id']}")
            result = {
                "id": source["id"],
                "url": source["url"],
                "scraped_at": datetime.utcnow().isoformat(),
                "error": None,
                "text": None,
                "deal_links": [],
            }
            try:
                r = client.get(source["url"], timeout=20, follow_redirects=True)
                r.raise_for_status()
                extracted = extract_links_and_text(r.text, source["url"])
                result.update(extracted)
                print(f"  ✓  {len(result['deal_links'])} deal-Links, {len(result['text'])} chars")
            except Exception as e:
                result["error"] = str(e)
                print(f"  ✗  {e}")

            all_results.append(result)
            time.sleep(2)

    # Alle Deal-Links deduplizieren
    seen_urls = set()
    unique_links = []
    for r in all_results:
        for link in r.get("deal_links", []):
            if link["url"] not in seen_urls:
                seen_urls.add(link["url"])
                unique_links.append(link)

    out = {
        "scraped_at": datetime.utcnow().isoformat(),
        "sources": all_results,
        "discovered_links": unique_links,
        "discovered_count": len(unique_links),
    }

    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)

    print(f"\n✓ {len(unique_links)} neue Deal-Links entdeckt → {out_file.name}")


if __name__ == "__main__":
    run()
