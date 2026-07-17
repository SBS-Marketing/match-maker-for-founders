"""
Discovery-Scraper fuer Behoerden-, Kammer- und Pflichtkontakt-Kandidaten.

Ziel: kleine Gruendungen sollen schnell die richtigen Anlaufstellen finden:
Handwerkskammer, IHK, Gewerbeamt, Finanzamt, Gesundheitsamt,
Berufsgenossenschaft, Innung und lokale Gruendungsberatung.

Die Ergebnisse sind Rohkandidaten. Ein spaeterer Ranker oder Admin kuratiert,
welche Treffer als Partner/Ansprechpartner in die App uebernommen werden.
"""
import json
import re
import time
from datetime import UTC, datetime
from pathlib import Path
from urllib.parse import parse_qs, quote_plus, unquote, urljoin, urlparse

try:
    import httpx
except ImportError:
    raise SystemExit("pip install httpx")

RAW_DIR = Path(__file__).parent.parent / "data" / "authorities" / "raw"
RAW_DIR.mkdir(parents=True, exist_ok=True)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    "Accept": "text/html,application/xhtml+xml",
    "Accept-Language": "de,en;q=0.9",
}

DEFAULT_LOCATIONS = [
    "44866",
    "Bochum",
    "Dortmund",
    "Essen",
    "Berlin",
    "Hamburg",
    "Muenchen",
]

CONTACT_TYPES = [
    {
        "id": "hwk",
        "label": "Handwerkskammer",
        "queries": [
            "{location} Handwerkskammer Existenzgruendung Ansprechpartner",
            "{location} HWK Betriebsberatung Gruender Kontakt",
            "{location} Handwerksrolle Eintragung Ansprechpartner",
        ],
        "keywords": ["handwerkskammer", "hwk", "handwerksrolle", "betriebsberatung"],
    },
    {
        "id": "ihk",
        "label": "IHK",
        "queries": [
            "{location} IHK Existenzgruendung Ansprechpartner",
            "{location} IHK Gruendungsberatung Kontakt",
            "{location} IHK Gewerbeanmeldung Beratung",
        ],
        "keywords": ["ihk", "existenzgruendung", "gruendungsberatung"],
    },
    {
        "id": "gewerbeamt",
        "label": "Gewerbeamt",
        "queries": [
            "{location} Gewerbeamt Gewerbeanmeldung Ansprechpartner",
            "{location} Stadt Gewerbe anmelden Kontakt",
        ],
        "keywords": ["gewerbeamt", "gewerbeanmeldung", "gewerbe anmelden"],
    },
    {
        "id": "finanzamt",
        "label": "Finanzamt",
        "queries": [
            "{location} Finanzamt steuerliche Erfassung Existenzgruendung",
            "{location} Finanzamt Steuernummer Selbststaendigkeit Kontakt",
        ],
        "keywords": ["finanzamt", "steuerliche erfassung", "steuernummer"],
    },
    {
        "id": "gesundheitsamt",
        "label": "Gesundheitsamt",
        "queries": [
            "{location} Gesundheitsamt Hygienebelehrung Lebensmittel Kontakt",
            "{location} Gesundheitsamt Gastronomie Hygiene Ansprechpartner",
        ],
        "keywords": ["gesundheitsamt", "hygiene", "lebensmittel", "belehrung"],
    },
    {
        "id": "berufsgenossenschaft",
        "label": "Berufsgenossenschaft",
        "queries": [
            "{industry} Berufsgenossenschaft Gruender anmelden",
            "{industry} BG Anmeldung Unternehmen Ansprechpartner",
        ],
        "keywords": ["berufsgenossenschaft", "bg", "anmeldung"],
    },
]

RANKER_PROMPT = """
Du bist Research-Ranker fuer matchfoundr.
Bewerte Rohkandidaten fuer kleine Gruendungen. Ziel ist NICHT Startup-Hype,
sondern richtige Pflichtkontakte und offizielle Anlaufstellen.

Priorisiere:
1. Offizielle Kammern/Behoerden/Kommunen vor Blogs.
2. Regionale Treffer passend zu PLZ/Stadt vor generischen Seiten.
3. Seiten mit Kontakt, Termin, Beratung, Ansprechpartner oder Formular.
4. Handwerk: HWK/Handwerksrolle/Innung/Betriebsberatung.
5. Handel/Agentur/Beratung: IHK/Gewerbeamt/Finanzamt.
6. Gastro/Beauty/Gesundheit: Gesundheitsamt, Erlaubnis, Hygiene, Kammer.

Gib fuer jeden guten Kandidaten JSON zurueck:
{
  "slug": "stabile-id",
  "name": "sichtbarer Name",
  "service_id": "legal|tax|mentor|growth|funding",
  "authority_type": "hwk|ihk|gewerbeamt|finanzamt|gesundheitsamt|bg|innung",
  "city": "Region",
  "blurb": "Warum diese Stelle relevant ist",
  "source_url": "https://...",
  "fit": 0-100,
  "next_step": "Was der Nutzer dort konkret tun soll"
}
"""


def clean_html(value: str) -> str:
    value = re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", value, flags=re.I | re.S)
    value = re.sub(r"<[^>]+>", " ", value)
    value = value.replace("&amp;", "&").replace("&quot;", '"')
    return re.sub(r"\s+", " ", value).strip()


def normalize_result_url(raw: str) -> str | None:
    parsed = urlparse(raw)
    if parsed.netloc.endswith("duckduckgo.com"):
        params = parse_qs(parsed.query)
        if params.get("uddg"):
            return unquote(params["uddg"][0])
    if raw.startswith("/"):
        raw = urljoin("https://duckduckgo.com", raw)
        return normalize_result_url(raw)
    if parsed.scheme in {"http", "https"}:
        return raw
    return None


def extract_results(html: str, query: str, contact_type: dict, location: str) -> list[dict]:
    results = []
    pattern = re.compile(
        r'<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>(.*?)</a>'
        r'.{0,2500}?(?:class="result__snippet"[^>]*>(.*?)</a>|class="result__snippet"[^>]*>(.*?)</div>)?',
        re.I | re.S,
    )
    for match in pattern.finditer(html):
        url = normalize_result_url(match.group(1))
        title = clean_html(match.group(2))
        snippet = clean_html(match.group(3) or match.group(4) or "")
        if not url or not title:
            continue
        haystack = f"{title} {snippet} {url}".lower()
        score = sum(12 for kw in contact_type["keywords"] if kw in haystack)
        if ".de" in url:
            score += 5
        if any(token in haystack for token in ["kontakt", "ansprechpartner", "beratung", "termin"]):
            score += 8
        if any(blocked in url for blocked in ["facebook", "instagram", "youtube"]):
            score -= 30
        if score <= 0:
            continue
        results.append(
            {
                "contact_type": contact_type["id"],
                "label": contact_type["label"],
                "location": location,
                "query": query,
                "title": title,
                "url": url,
                "snippet": snippet,
                "score": score,
            }
        )
    return results


def run(locations: list[str] | None = None, industry: str = "Handwerk") -> None:
    locations = locations or DEFAULT_LOCATIONS
    date_str = datetime.now(UTC).strftime("%Y-%m-%d")
    out_file = RAW_DIR / f"authority_contacts_{date_str}.json"
    prompt_file = RAW_DIR / f"authority_ranker_prompt_{date_str}.txt"
    candidates = []

    with httpx.Client(headers=HEADERS, follow_redirects=True, timeout=20) as client:
        for location in locations:
            for contact_type in CONTACT_TYPES:
                for template in contact_type["queries"]:
                    query = template.format(location=location, industry=industry)
                    url = f"https://duckduckgo.com/html/?q={quote_plus(query)}"
                    print(f"[authority] {query}")
                    try:
                        res = client.get(url)
                        res.raise_for_status()
                        found = extract_results(res.text, query, contact_type, location)
                        candidates.extend(found)
                        print(f"  ok: {len(found)} Treffer")
                    except Exception as exc:
                        print(f"  error: {exc}")
                    time.sleep(1.2)

    deduped = {}
    for candidate in sorted(candidates, key=lambda row: row["score"], reverse=True):
        deduped.setdefault(candidate["url"], candidate)

    out = {
        "scraped_at": datetime.now(UTC).isoformat(),
        "locations": locations,
        "industry": industry,
        "ranker_prompt_file": prompt_file.name,
        "candidates": list(deduped.values()),
    }
    out_file.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    prompt_file.write_text(RANKER_PROMPT.strip() + "\n", encoding="utf-8")
    print(f"\nOK {len(out['candidates'])} Kandidaten -> {out_file}")
    print(f"OK Ranker-Prompt -> {prompt_file}")


if __name__ == "__main__":
    run()
