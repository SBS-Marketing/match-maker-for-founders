"""
Normalisiert Partnerquellen in Marketplace-Partner fuer die App.
"""
import json
import re
from datetime import UTC, datetime
from pathlib import Path

RAW_DIR = Path(__file__).parent.parent / "data" / "partners" / "raw"
OUT_DIR = Path(__file__).parent.parent / "data" / "partners"
OUT_DIR.mkdir(parents=True, exist_ok=True)


def slugify(value: str) -> str:
    value = value.lower().replace("ä", "ae").replace("ö", "oe").replace("ü", "ue").replace("ß", "ss")
    return re.sub(r"[^a-z0-9]+", "-", value).strip("-")


def build_packages(source: dict) -> list[dict]:
    primary = source.get("package_hint") or "Erstgespräch"
    return [
        {
            "name": primary,
            "price": "auf Anfrage" if "kostenlos" not in primary.lower() else "Kostenlos",
            "desc": source.get("blurb", "Kuratierter Partner aus dem matchfoundr-Netzwerk."),
        },
        {
            "name": "Co-Pilot Briefing",
            "price": "inklusive",
            "desc": "Profil, Kontext und offene Fragen werden vor dem Erstgespräch strukturiert.",
        },
    ]


def normalize_source(source: dict) -> dict:
    specialties = source.get("specialties") or []
    fit = int(source.get("fit_hint") or 75)
    if source.get("error"):
        fit -= 4
    levels = [0.96, 0.9, 0.84, 0.78, 0.72]
    return {
        "slug": slugify(source.get("id") or source.get("name", "")),
        "name": source.get("name", ""),
        "firm": source.get("firm", ""),
        "service": source.get("service", "mentor"),
        "city": source.get("city", "Remote"),
        "blurb": source.get("blurb", ""),
        "fit": max(60, min(fit, 96)),
        "sourceUrl": source.get("final_url") or source.get("url", ""),
        "bookingUrl": source.get("booking_url") or source.get("final_url") or source.get("url", ""),
        "scrapeStatus": "ok" if not source.get("error") else "error",
        "specialties": [
            {"label": label, "level": levels[idx] if idx < len(levels) else 0.7}
            for idx, label in enumerate(specialties)
        ],
        "packages": build_packages(source),
        "why": [
            f"Passt in die Kategorie {source.get('service', 'Marketplace')} und ist fuer fruehe Teams vorkuratiert.",
            "Co-Pilot kann Kontext, offene Unterlagen und naechste Fragen vorab uebergeben.",
            "Geeignet fuer schnelle Erstpruefung statt langer Anbieterrecherche.",
        ],
        "vouches": [
            {
                "from": "matchfoundr",
                "role": "Partner Research",
                "quote": "Kuratierter Eintrag aus der aktuellen Partner-Pipeline.",
            }
        ],
    }


def load_latest() -> list[dict]:
    files = sorted(RAW_DIR.glob("curated_*.json"))
    if not files:
        raise SystemExit("Keine data/partners/raw/curated_*.json gefunden.")
    return json.loads(files[-1].read_text(encoding="utf-8")).get("sources", [])


def run() -> None:
    date_str = datetime.now(UTC).strftime("%Y-%m-%d")
    partners = [normalize_source(source) for source in load_latest()]
    partners.sort(key=lambda item: (item["service"], -item["fit"], item["name"]))
    out_file = OUT_DIR / f"partners_{date_str}.json"
    out_file.write_text(
        json.dumps({"generated_at": datetime.now(UTC).isoformat(), "partners": partners}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"✓ {len(partners)} Partner → {out_file.name}")


if __name__ == "__main__":
    run()
