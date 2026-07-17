"""
Baut aus dem aktuellen Partner-Katalog (data/partners/partners_*.json)
eine Upsert-Migration für die Supabase-Tabelle partner_offers.
Die Tabelle speist die iOS-App (Entdecken) — Web liest partners.generated.ts.

Aufruf: python3 scripts/build_partner_offers_sql.py [ziel.sql]
"""
import json
import sys
from datetime import UTC, datetime
from pathlib import Path

ROOT = Path(__file__).parent.parent
PARTNERS_DIR = ROOT / "data" / "partners"

# check-Constraint der Tabelle — cofounder läuft über Swipe, nicht über Partner.
ALLOWED_SERVICES = {"capital", "growth", "mentor", "talent", "tax", "legal", "funding"}


def sql_str(value: str | None) -> str:
    if value is None or value == "":
        return "null"
    return "'" + str(value).replace("'", "''") + "'"


def sql_jsonb(value) -> str:
    return sql_str(json.dumps(value or [], ensure_ascii=False)) + "::jsonb"


def run() -> None:
    files = sorted(PARTNERS_DIR.glob("partners_*.json"))
    if not files:
        raise SystemExit("Keine partners_*.json gefunden. Pipeline zuerst ausführen.")
    partners = json.loads(files[-1].read_text(encoding="utf-8")).get("partners", [])
    partners = [p for p in partners if p.get("service") in ALLOWED_SERVICES]
    if not partners:
        raise SystemExit("Keine gültigen Partner im Katalog.")

    stamp = datetime.now(UTC).strftime("%Y%m%d%H%M%S")
    default_out = ROOT / "supabase" / "migrations" / f"{stamp}_partner_offers_catalog.sql"
    out = Path(sys.argv[1]) if len(sys.argv) > 1 else default_out

    rows = []
    for p in partners:
        rows.append(
            "(\n"
            f"  {sql_str(p['slug'])}, {sql_str(p['name'])}, {sql_str(p['firm'])},\n"
            f"  {sql_str(p['service'])}, {sql_str(p.get('city') or 'Remote')}, {sql_str(p.get('blurb') or '')},\n"
            f"  {int(p.get('fit') or 75)}, {sql_str(p.get('sourceUrl'))}, {sql_str(p.get('bookingUrl'))},\n"
            f"  {sql_str(p.get('scrapeStatus'))},\n"
            f"  {sql_jsonb(p.get('specialties'))},\n"
            f"  {sql_jsonb(p.get('packages'))},\n"
            f"  {sql_jsonb(p.get('why'))},\n"
            f"  {sql_jsonb(p.get('vouches'))},\n"
            "  true, now()\n"
            ")"
        )

    sql = (
        "-- matchfoundr · Partner-Katalog für die Entdecken-Sektion\n"
        f"-- Generiert von scripts/build_partner_offers_sql.py aus {files[-1].name}\n"
        f"-- {len(partners)} Partner über alle Kategorien: "
        + ", ".join(sorted({p["service"] for p in partners}))
        + "\n\n"
        "insert into public.partner_offers (\n"
        "  slug, name, firm, service_id, city, blurb, fit, source_url, booking_url, scrape_status,\n"
        "  specialties, packages, why, vouches, is_active, updated_at\n"
        ") values\n"
        + ",\n".join(rows)
        + "\non conflict (slug) do update set\n"
        "  name = excluded.name,\n"
        "  firm = excluded.firm,\n"
        "  service_id = excluded.service_id,\n"
        "  city = excluded.city,\n"
        "  blurb = excluded.blurb,\n"
        "  fit = excluded.fit,\n"
        "  source_url = excluded.source_url,\n"
        "  booking_url = excluded.booking_url,\n"
        "  scrape_status = excluded.scrape_status,\n"
        "  specialties = excluded.specialties,\n"
        "  packages = excluded.packages,\n"
        "  why = excluded.why,\n"
        "  vouches = excluded.vouches,\n"
        "  is_active = excluded.is_active,\n"
        "  updated_at = now();\n"
    )
    out.write_text(sql, encoding="utf-8")
    print(f"✓ {len(partners)} Partner → {out.relative_to(ROOT)}")


if __name__ == "__main__":
    run()
