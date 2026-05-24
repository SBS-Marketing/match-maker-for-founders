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
    "mongodb": "🍃",
    "neon": "🟩",
    "heroku": "🟣",
    "atlassian": "🔵",
    "webflow": "🌊",
    "elevenlabs": "🎙",
    "deepgram": "🎧",
    "fireworks": "🎆",
    "baseten": "🧠",
    "langchain": "🔗",
    "llamaindex": "🦙",
    "pinecone": "🌲",
    "assemblyai": "🎙",
    "qonto": "🏦",
    "kontist": "🏦",
    "ashby": "👥",
    "workable": "👥",
    "oyster": "🌍",
    "greenhouse": "🌱",
    "recruitee": "👥",
    "factorial": "👔",
    "kenjo": "👔",
    "homerun": "🏁",
    "y combinator": "🟧",
    "techstars": "⭐",
    "founder institute": "🏛",
    "german accelerator": "🇩🇪",
}

CLAIM_URL_OVERRIDES = {
    # Prefer the concrete claim/startup/pricing target over broad homepages.
    "cloudflare": "https://www.cloudflare.com/startups/",
    "sevdesk": "https://sevdesk.de/gruender/",
    "german-accelerator": "https://www.germanaccelerator.com/our-programs",
    "yc-startup-school": "https://www.startupschool.org/users/sign_up",
    "founder-institute": "https://fi.co/join",
    "startup-genome": "https://startupgenome.com/startup-resources",
    "indie-hackers": "https://www.indiehackers.com/sign-up",
}

def get_logo(company: str) -> str:
    cl = company.lower()
    for key, emoji in LOGOS.items():
        if key in cl:
            return emoji
    return "🎁"


def get_claim_url(source: dict, fallback_url: str = "") -> str:
    return CLAIM_URL_OVERRIDES.get(source.get("id", ""), fallback_url or source.get("url", ""))


def infer_value_and_tier(source: dict) -> tuple[str, str, str]:
    """Best-effort value extraction from the official page text."""
    text = re.sub(r"\s+", " ", source.get("text") or "")
    lower = text.lower()
    cat = source.get("cat", "saas")

    if cat == "community":
        if "free" in lower or "kostenlos" in lower:
            return "Kostenloser Einstieg", "Free", "free"
        return "Founder-Ressource", "Startup", "good"

    money_patterns = [
        r"(?:up to|bis zu|bis|worth|credits? up to)\s*([$€]\s?[\d.,]+(?:\s?[kKmM])?)",
        r"([$€]\s?[\d.,]+(?:\s?[kKmM])?)\s+(?:in\s+)?(?:credits?|guthaben|value|wert)",
        r"(?:credits?|guthaben|value|wert)\s+(?:of|von|bis zu|bis)?\s*([$€]\s?[\d.,]+(?:\s?[kKmM])?)",
    ]
    value_context_words = (
        "credit",
        "credits",
        "guthaben",
        "discount",
        "rabatt",
        "savings",
        "save",
        "free",
        "kostenlos",
        "perk",
        "perks",
    )
    for pattern in money_patterns:
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            start, end = m.span()
            context = lower[max(0, start - 100): min(len(lower), end + 100)]
            if not any(word in context for word in value_context_words):
                continue
            raw = m.group(1).replace(" ", "")
            value = f"bis {raw} Credits" if "credit" in lower or "guthaben" in lower else f"bis {raw}"
            numeric = raw.lower().replace("$", "").replace("€", "").replace(",", "").replace(".", "")
            multiplier = 1000 if "k" in raw.lower() else 1000000 if "m" in raw.lower() else 1
            amount = int(re.sub(r"\D", "", numeric) or "0") * multiplier
            if amount >= 10000:
                return value, "EPIC", "epic"
            if amount >= 1000:
                return value, raw, "big"
            return value, "Deal", "good"

    percent = re.search(r"(\d{2,3})\s?%\s+(?:off|discount|rabatt)", lower)
    if percent:
        pct = int(percent.group(1))
        tier = "big" if pct >= 50 else "good"
        return f"{pct}% Rabatt", f"{pct}% off", tier

    months = re.search(r"(\d{1,2})\s+(?:months?|monate)\s+(?:free|kostenlos)", lower)
    if months:
        n = int(months.group(1))
        tier = "big" if n >= 6 else "good"
        return f"{n} Monate kostenlos", f"{n} Mo", tier

    if "free plan" in lower or "free tier" in lower or "kostenloser tarif" in lower:
        return "Free Tier verfügbar", "Free", "free"

    if "startup" in lower or "founder" in lower or "gründer" in lower:
        return "Startup-Programm", "Startup", "good"

    return "Siehe Website", "Deal", "good"


def default_tags(source: dict) -> list[str]:
    cat = source.get("cat", "saas")
    tags_by_cat = {
        "cloud": ["Cloud", "Credits", "Infra"],
        "saas": ["SaaS", "Produktivität", "Tools"],
        "ai": ["AI", "API", "Credits"],
        "legal": ["Finance", "Legal", "Banking"],
        "marketing": ["Marketing", "Growth", "Tools"],
        "hr": ["HR", "Recruiting", "Talent"],
        "community": ["Community", "Netzwerk", "Founder"],
    }
    return tags_by_cat.get(cat, [cat.capitalize()])


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
        deal["claim_url"] = get_claim_url(source, deal["url"])
        deal["cat"] = source.get("cat", deal.get("cat", "saas"))
        deal["logo"] = get_logo(source.get("company", ""))
        deal["normalized_at"] = datetime.utcnow().isoformat()
        return deal

    except Exception as e:
        print(f"  Claude-Fehler für {source['id']}: {e}")
        return fallback_normalize(source)


def fallback_normalize(source: dict) -> dict:
    """Einfaches Fallback ohne Claude – behält bekannte Werte."""
    value, badge, tier = infer_value_and_tier(source)
    cat = source.get("cat", "saas")
    desc_by_cat = {
        "cloud": "Cloud- oder Infrastruktur-Angebot für Startups. Nützlich für Hosting, Datenbanken, Deployments und technische Skalierung.",
        "saas": "SaaS-Tool für frühe Teams. Nützlich für Produktivität, Kollaboration, Analytics oder interne Workflows.",
        "ai": "AI-/ML-Angebot für Startups. Nützlich für Prototyping, Inferenz, Datenpipelines oder KI-Features im Produkt.",
        "legal": "Legal-/Finance-Angebot für Gründer. Nützlich für Banking, Buchhaltung, Gesellschaftsstruktur oder Finanzprozesse.",
        "marketing": "Marketing-/Growth-Angebot für frühe Teams. Nützlich für Launch, CRM, Analytics, Outreach oder SEO.",
        "hr": "HR-/Talent-Angebot für Startups. Nützlich für Recruiting, Onboarding, Payroll oder Teamprozesse.",
        "community": "Founder-Community oder Accelerator-Ressource. Nützlich für Netzwerk, Feedback, Mentoren und erste Reichweite.",
    }
    return {
        "id": source["id"],
        "company": source.get("company", ""),
        "product": source.get("product", ""),
        "cat": cat,
        "logo": get_logo(source.get("company", "")),
        "value": value,
        "badge": badge,
        "badge_class": tier,
        "desc": desc_by_cat.get(cat, f"Startup-Angebot von {source.get('company', '')}. Details auf der offiziellen Website."),
        "eligibility": "Startups, Gründerteams oder kleine Unternehmen; Details auf der offiziellen Website prüfen.",
        "duration": "Siehe Website",
        "url": source.get("url", ""),
        "claim_url": get_claim_url(source),
        "tags": default_tags(source),
        "tier": tier,
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
