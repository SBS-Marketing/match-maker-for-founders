"""
Normalisiert rohe Deal-Daten mit Claude claude-opus-4-7.
Liest alle curated_*.json und discovery_*.json aus data/deals/raw/
und erstellt eine einheitliche deals_YYYY-MM-DD.json.
"""
import json
import os
import re
from pathlib import Path
from datetime import datetime

try:
    import anthropic
except ImportError:
    raise SystemExit("pip install anthropic")

RAW_DIR  = Path(__file__).parent.parent / "data" / "deals" / "raw"
OUT_DIR  = Path(__file__).parent.parent / "data" / "deals"
OUT_DIR.mkdir(parents=True, exist_ok=True)

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY")

SCHEMA_EXAMPLE = {
    "id": "aws-activate",
    "company": "Amazon Web Services",
    "product": "AWS Activate",
    "cat": "cloud",
    "logo": "🟠",
    "value": "bis $100.000",
    "badge": "EPIC",
    "badge_class": "epic",
    "desc": "Credits für AWS-Services inkl. EC2, S3, RDS & mehr.",
    "eligibility": "Startup mit ext. Finanzierung od. in Accelerator",
    "duration": "Einmalig",
    "url": "https://aws.amazon.com/activate/",
    "tags": ["Credits", "Cloud", "AWS"],
    "tier": "epic",
    "active": True,
    "normalized_at": "2025-01-01T00:00:00",
}

TIER_RULES = """
tier:
- "epic"  → Wert > $10K oder > 50% Rabatt auf enterprise Software
- "big"   → Wert $1K–$10K oder 3–12 Monate kostenlos
- "good"  → Kleinere Credits, Trial, < 50% Rabatt
- "free"  → Komplett kostenlose Tier ohne Ablauf

badge_class: "epic" | "big" | "good" | "free"
badge:       Kurzer Wert-String z.B. "EPIC", "$10K", "95% off", "Free"
"""

LOGOS = {
    "amazon": "🟠", "aws": "🟠",
    "google": "🔵",
    "microsoft": "🔷", "azure": "🔷",
    "vercel": "▲",
    "digitalocean": "🌊",
    "supabase": "⚡",
    "cloudflare": "🟡",
    "railway": "🚂",
    "notion": "📓",
    "hubspot": "🟠",
    "intercom": "💬",
    "figma": "🎨",
    "linear": "🔷",
    "airtable": "📊",
    "retool": "🛠",
    "slack": "💼",
    "stripe": "💳",
    "brex": "💰",
    "mercury": "🏦",
    "anthropic": "🤖",
    "openai": "🟢",
    "hugging": "🤗",
    "mistral": "🌀",
    "cohere": "🌐",
    "mailchimp": "🐵",
    "semrush": "📈",
    "deel": "🌍",
    "remote": "💻",
    "personio": "👔",
    "miro": "🖼",
    "loom": "🎥",
    "mixpanel": "📊",
    "datadog": "🐶",
}

def get_logo(company: str) -> str:
    cl = company.lower()
    for key, emoji in LOGOS.items():
        if key in cl:
            return emoji
    return "🎁"


def normalize_with_claude(source: dict) -> dict | None:
    """Sendet rohen Text an Claude und bekommt strukturierten Deal zurück."""
    if not ANTHROPIC_API_KEY:
        return fallback_normalize(source)

    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

    prompt = f"""Du bist ein Daten-Extraktor für Startup-Deals. Analysiere folgenden Webseitentext und extrahiere alle relevanten Deal-Informationen.

Firma: {source.get('company', 'Unbekannt')}
Produkt: {source.get('product', '')}
URL: {source.get('url', '')}
Kategorie: {source.get('cat', 'saas')}

Webseitentext:
{source.get('text', '')[:6000]}

Extrahiere GENAU DIESES JSON-Format (keine Markdown-Backticks, nur reines JSON):
{json.dumps(SCHEMA_EXAMPLE, ensure_ascii=False, indent=2)}

Wichtige Regeln:
{TIER_RULES}

- "value": Der konkrete Wert des Deals auf Deutsch (z.B. "bis $100.000 Credits", "6 Monate kostenlos", "50% Rabatt")
- "desc": 1-2 Sätze Beschreibung auf Deutsch, was das Angebot beinhaltet
- "eligibility": Wer qualifiziert sich (auf Deutsch, kurz)
- "duration": Wie lange gilt das Angebot
- "tags": 3-5 relevante Schlagwörter
- "active": true wenn das Angebot noch aktiv scheint, false wenn eingestellt/ausgelaufen
- Wenn du keinen konkreten Deal-Wert findest, setze "active": false

Antworte NUR mit gültigem JSON, kein weiterer Text."""

    try:
        response = client.messages.create(
            model="claude-opus-4-7",
            max_tokens=800,
            thinking={"type": "adaptive"},
            messages=[{"role": "user", "content": prompt}],
        )
        text = next((b.text for b in response.content if hasattr(b, 'text')), None)
        if not text:
            return fallback_normalize(source)

        # JSON aus Response extrahieren
        match = re.search(r'\{[\s\S]+\}', text)
        if not match:
            return fallback_normalize(source)

        deal = json.loads(match.group())
        deal["id"] = source["id"]
        deal["url"] = source.get("url", deal.get("url", ""))
        deal["cat"] = source.get("cat", deal.get("cat", "saas"))
        deal["logo"] = get_logo(source.get("company", ""))
        deal["normalized_at"] = datetime.utcnow().isoformat()
        return deal

    except Exception as e:
        print(f"  Claude-Fehler für {source['id']}: {e}")
        return fallback_normalize(source)


def fallback_normalize(source: dict) -> dict:
    """Einfaches Fallback ohne Claude – behält bekannte Werte."""
    return {
        "id": source["id"],
        "company": source.get("company", ""),
        "product": source.get("product", ""),
        "cat": source.get("cat", "saas"),
        "logo": get_logo(source.get("company", "")),
        "value": "Siehe Website",
        "badge": "Deal",
        "badge_class": "good",
        "desc": f"Startup-Programm von {source.get('company', '')}. Details auf der offiziellen Website.",
        "eligibility": "Startups",
        "duration": "Siehe Website",
        "url": source.get("url", ""),
        "tags": [source.get("cat", "").capitalize()],
        "tier": "good",
        "active": True,
        "normalized_at": datetime.utcnow().isoformat(),
    }


def load_latest_raw() -> list[dict]:
    """Lädt den neuesten Raw-Datensatz."""
    files = sorted(RAW_DIR.glob("curated_*.json"))
    if not files:
        print("Keine curated_*.json gefunden. Scrapers zuerst ausführen.")
        return []
    latest = files[-1]
    print(f"Lade: {latest.name}")
    with open(latest, encoding="utf-8") as f:
        data = json.load(f)
    return data.get("sources", [])


def run():
    sources = load_latest_raw()
    if not sources:
        return

    print(f"{len(sources)} Quellen zu normalisieren…")
    if not ANTHROPIC_API_KEY:
        print("⚠  ANTHROPIC_API_KEY nicht gesetzt – Fallback-Normalisierung")

    deals = []
    for i, source in enumerate(sources):
        if source.get("error"):
            print(f"  ⊘  {source['id']} (Scraping-Fehler übersprungen)")
            continue

        print(f"[{i+1}/{len(sources)}] {source['id']}")
        deal = normalize_with_claude(source)
        if deal and deal.get("active", True):
            deals.append(deal)

    # Deduplizieren nach ID
    seen = set()
    unique = []
    for d in deals:
        if d["id"] not in seen:
            seen.add(d["id"])
            unique.append(d)

    date_str = datetime.utcnow().strftime("%Y-%m-%d")
    out_file = OUT_DIR / f"deals_{date_str}.json"
    out = {
        "generated_at": datetime.utcnow().isoformat(),
        "count": len(unique),
        "deals": unique,
    }
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)

    print(f"\n✓ {len(unique)} aktive Deals → {out_file.name}")
    return out_file


if __name__ == "__main__":
    run()
