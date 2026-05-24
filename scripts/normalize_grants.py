"""
Normalisiert Raw-Foerderprogramm-Daten in ein App-nahes Grants-Format.

Die Normalisierung ist deterministisch, damit sie lokal und in CI ohne API-Key
laeuft. Metadaten aus der kuratierten Quellenliste gewinnen gegen Text-Heuristik.
"""
import json
import re
from datetime import UTC, datetime
from pathlib import Path

RAW_DIR = Path(__file__).parent.parent / "data" / "grants" / "raw"
OUT_DIR = Path(__file__).parent.parent / "data" / "grants"
OUT_DIR.mkdir(parents=True, exist_ok=True)


def slugify(value: str) -> str:
    value = value.lower()
    replacements = {"ä": "ae", "ö": "oe", "ü": "ue", "ß": "ss"}
    for src, dest in replacements.items():
        value = value.replace(src, dest)
    value = re.sub(r"[^a-z0-9]+", "-", value).strip("-")
    return value or "foerderprogramm"


def infer_amount(source: dict) -> str:
    if source.get("amount_hint"):
        return source["amount_hint"]
    text = source.get("text") or ""
    patterns = [
        r"(?:bis zu|bis|maximal)\s+([€]\s?[\d.,]+\s?(?:mio\.|millionen)?)",
        r"([€]\s?[\d.,]+\s?(?:mio\.|millionen)?)\s+(?:zuschuss|kredit|darlehen|förderung)",
        r"(\d{1,3}\s?%\s+(?:zuschuss|förderquote|erwerbszuschuss|rabatt))",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.I)
        if match:
            return match.group(1).replace(" ", "")
    return "Siehe Programmseite"


def infer_duration(source: dict) -> str:
    if source.get("duration_hint"):
        return source["duration_hint"]
    text = (source.get("text") or "").lower()
    match = re.search(r"(\d{1,2})\s+(monate|jahre)", text)
    if match:
        return f"{match.group(1)} {match.group(2).capitalize()}"
    return "Programmabhängig"


def infer_deadline(source: dict) -> str:
    if source.get("deadline_hint"):
        return source["deadline_hint"]
    text = (source.get("text") or "").lower()
    if "laufend" in text or "jederzeit" in text:
        return "Laufend"
    if "stichtag" in text or "deadline" in text:
        return "Stichtage prüfen"
    return "Siehe Website"


def compute_fit(source: dict) -> int:
    stage = set(source.get("stage") or [])
    score = 70
    if {"pre-seed", "idee", "prototype"} & stage:
        score += 10
    if source.get("category") in {"stipendium", "pre-seed", "zuschuss"}:
        score += 7
    if source.get("region") == "Deutschland":
        score += 3
    if source.get("error"):
        score -= 8
    return max(52, min(score, 94))


def build_summary(source: dict, amount: str, duration: str) -> str:
    region = source.get("region", "Deutschland")
    category = source.get("category", "foerderung")
    name = source.get("name", "Förderprogramm")
    if category == "stipendium":
        return f"{name} passt fuer fruehe Gruenderteams mit innovativem Kern. Fokus: Lebenshaltung, Sachmittel und Coaching in {region}."
    if category == "kredit":
        return f"{name} ist eine Finanzierungsoption fuer Gruendung, Nachfolge oder fruehe Investitionen. Volumen: {amount}, Laufzeit: {duration}."
    if category in {"pre-seed", "kapital"}:
        return f"{name} unterstuetzt die Pre-Seed- oder Angel-Phase. Relevant, wenn Team, Marktchance und naechste Finanzierung konkret werden."
    if category in {"fue", "forschung"}:
        return f"{name} passt zu technologie- oder FuE-lastigen Vorhaben mit klarer Entwicklungsetappe und belastbarem Projektplan."
    return f"{name} ist ein Foerderprogramm fuer Gruender in {region}. Matchfoundr prueft Eignung, Materialien und naechste Antragsschritte."


def build_eligibility(source: dict) -> list[dict]:
    region = source.get("region", "Deutschland")
    category = source.get("category", "foerderung")
    items = [
        {"item": f"Region: {region}", "ok": True, "note": "Sitz oder Vorhaben muss zur Programmregion passen."},
        {"item": "Konkretes Vorhaben", "ok": True, "note": "Idee, Zielgruppe und Nutzen muessen nachvollziehbar sein."},
    ]
    if category in {"stipendium", "forschung"}:
        items.append({"item": "Innovationsgrad", "ok": "warn", "note": "Technischer oder wissenschaftlicher Neuheitsgrad sauber belegen."})
        items.append({"item": "Hochschul-/Forschungspartner", "ok": "warn", "note": "Bei EXIST meist zwingend vor Antrag klaeren."})
    elif category == "kredit":
        items.append({"item": "Tragfaehiger Finanzplan", "ok": "warn", "note": "Hausbank und Kapitaldienstfaehigkeit vorbereiten."})
    elif category in {"pre-seed", "kapital"}:
        items.append({"item": "Team & Cap Table", "ok": "warn", "note": "Rollen, Beteiligungen und Investmentlogik vorbereiten."})
    else:
        items.append({"item": "Antragsfaehige Unterlagen", "ok": "warn", "note": "Businessplan, Kostenplan und De-minimis/Beihilfe pruefen."})
    return items


def build_timeline(source: dict) -> list[dict]:
    category = source.get("category", "foerderung")
    if category == "kredit":
        return [
            {"phase": "Finanzierungsbedarf klaeren", "weeks": "Wo 1", "desc": "Investitionen, Liquiditaet und Eigenmittel sauber aufstellen."},
            {"phase": "Hausbankgespraech", "weeks": "Wo 2-3", "desc": "Unterlagen einreichen, KfW/NRW.BANK-Produkt pruefen lassen."},
            {"phase": "Bewilligung & Abruf", "weeks": "Wo 4+", "desc": "Kreditentscheidung, Vertragsunterlagen, Mittelabruf."},
        ]
    return [
        {"phase": "Fit-Check", "weeks": "Wo 1", "desc": "Programmregion, Stage, Team und Foerderlogik pruefen."},
        {"phase": "Skizze & Unterlagen", "weeks": "Wo 2-3", "desc": "Kurzkonzept, Finanzplan und Nachweise vorbereiten."},
        {"phase": "Einreichung", "weeks": "Wo 4", "desc": "Portal, Projekttraeger oder Betreuungspartner nutzen."},
        {"phase": "Rueckfragen & Bewilligung", "weeks": "Wo 5+", "desc": "Formalia, Nachreichungen und Start der Foerderperiode."},
    ]


def build_materials(source: dict) -> list[dict]:
    category = source.get("category", "foerderung")
    materials = [
        {"item": "Kurzbeschreibung / Pitch", "done": False},
        {"item": "Businessplan oder Projektskizze", "done": False},
        {"item": "Finanzplan", "done": False},
    ]
    if category in {"stipendium", "forschung"}:
        materials += [
            {"item": "Lebenslaeufe des Teams", "done": False},
            {"item": "Hochschul- oder Forschungspartner", "done": False},
        ]
    elif category == "kredit":
        materials += [
            {"item": "BWA / Liquiditaetsplanung", "done": False},
            {"item": "Hausbank-Unterlagen", "done": False},
        ]
    else:
        materials += [
            {"item": "Kosten- und Meilensteinplan", "done": False},
            {"item": "De-minimis-/Beihilfeangaben", "done": False},
        ]
    return materials


def normalize_source(source: dict) -> dict:
    amount = infer_amount(source)
    duration = infer_duration(source)
    deadline = infer_deadline(source)
    fit = compute_fit(source)
    return {
        "slug": slugify(source.get("id") or source.get("name", "")),
        "name": source.get("name", ""),
        "body": source.get("body", ""),
        "amount": amount,
        "duration": duration,
        "deadline": deadline,
        "fit": fit,
        "prefilled": max(38, min(82, fit - 12)),
        "summary": build_summary(source, amount, duration),
        "region": source.get("region", "Deutschland"),
        "category": source.get("category", "foerderung"),
        "stage": source.get("stage", []),
        "sourceUrl": source.get("final_url") or source.get("url", ""),
        "applyUrl": source.get("apply_url") or source.get("final_url") or source.get("url", ""),
        "scrapeStatus": "ok" if not source.get("error") else "error",
        "eligibility": build_eligibility(source),
        "timeline": build_timeline(source),
        "materials": build_materials(source),
    }


def load_latest_curated() -> list[dict]:
    files = sorted(RAW_DIR.glob("curated_*.json"))
    if not files:
        raise SystemExit("Keine data/grants/raw/curated_*.json gefunden. grants_curated.py zuerst ausfuehren.")
    data = json.loads(files[-1].read_text(encoding="utf-8"))
    return data.get("sources", [])


def run() -> None:
    date_str = datetime.now(UTC).strftime("%Y-%m-%d")
    grants = [normalize_source(source) for source in load_latest_curated()]
    grants.sort(key=lambda item: (-item["fit"], item["name"]))
    out_file = OUT_DIR / f"grants_{date_str}.json"
    out_file.write_text(
        json.dumps({"generated_at": datetime.now(UTC).isoformat(), "grants": grants}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"✓ {len(grants)} Förderprogramme → {out_file.name}")


if __name__ == "__main__":
    run()
