"""
Baut public/deals.json aus dem neuesten normalisierten Datensatz.
Wird nach normalize_deals.py ausgeführt — macht die Daten für deals.html verfügbar.
"""
import json
import shutil
from pathlib import Path
from datetime import datetime

DEALS_DIR  = Path(__file__).parent.parent / "data" / "deals"
PUBLIC_DIR = Path(__file__).parent.parent / "public"
DOCS_DIR   = Path(__file__).parent.parent / "docs"

# Kategorien-Mapping: cat → Anzeigename + Icon
CAT_META = {
    "cloud":     {"icon": "☁️",  "label": "Cloud & Infra"},
    "saas":      {"icon": "🛠",  "label": "SaaS & Tools"},
    "ai":        {"icon": "🤖",  "label": "AI & ML"},
    "legal":     {"icon": "⚖️",  "label": "Legal & Finance"},
    "marketing": {"icon": "📣",  "label": "Marketing"},
    "community": {"icon": "🤝",  "label": "Community"},
    "hr":        {"icon": "👥",  "label": "HR & Talent"},
}


def compute_stats(deals: list[dict]) -> dict:
    """Berechnet Zusammenfassung für die Hero-Section."""
    total_value_usd = 0
    for d in deals:
        val = d.get("value", "")
        # Grobe Schätzung aus Value-String
        m_parts = []
        for part in val.replace("$", "").replace("€", "").replace("K", "000").replace("M", "000000").split():
            digits = "".join(c for c in part if c.isdigit())
            if digits:
                m_parts.append(int(digits))
        if m_parts:
            total_value_usd += max(m_parts)

    cats = {}
    for d in deals:
        cat = d.get("cat", "saas")
        cats[cat] = cats.get(cat, 0) + 1

    return {
        "total_deals": len(deals),
        "total_value_approx": f"${total_value_usd // 1000}K+" if total_value_usd > 0 else "Variiert",
        "categories": len(cats),
        "by_category": cats,
        "last_updated": datetime.utcnow().strftime("%Y-%m-%d"),
    }


def run():
    # Neueste normalisierte Datei finden
    files = sorted(DEALS_DIR.glob("deals_*.json"))
    if not files:
        print("Keine deals_*.json gefunden. normalize_deals.py zuerst ausführen.")
        return

    latest = files[-1]
    print(f"Verwende: {latest.name}")

    with open(latest, encoding="utf-8") as f:
        data = json.load(f)

    deals = data.get("deals", [])

    # Anreichern mit Cat-Metadaten
    for d in deals:
        cat = d.get("cat", "saas")
        meta = CAT_META.get(cat, {"icon": "🎁", "label": cat.capitalize()})
        d["cat_icon"] = meta["icon"]
        d["cat_label"] = meta["label"]

    # Sortierung: epic zuerst, dann big, good, free
    tier_order = {"epic": 0, "big": 1, "good": 2, "free": 3}
    deals.sort(key=lambda d: tier_order.get(d.get("tier", "good"), 99))

    output = {
        "generated_at": datetime.utcnow().isoformat(),
        "source_file": latest.name,
        "stats": compute_stats(deals),
        "deals": deals,
    }

    out_path = PUBLIC_DIR / "deals.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    docs_path = DOCS_DIR / "deals.json"
    if DOCS_DIR.exists():
        shutil.copyfile(out_path, docs_path)

    print(f"✓ {len(deals)} Deals → public/deals.json")
    if DOCS_DIR.exists():
        print("✓ docs/deals.json synchronisiert")
    print(f"  Stats: {output['stats']}")


if __name__ == "__main__":
    run()
