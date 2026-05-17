"""
Scraper für bekannte Startup-Deal-Programme.
Fetcht je eine Seite pro Deal-Quelle und speichert HTML + Metadaten als Raw-JSON.
"""
import json
import time
import re
from pathlib import Path
from datetime import datetime

try:
    import httpx
except ImportError:
    raise SystemExit("pip install httpx")

RAW_DIR = Path(__file__).parent.parent / "data" / "deals" / "raw"
RAW_DIR.mkdir(parents=True, exist_ok=True)

# ── Deal-Quellen ────────────────────────────────────────────────────────────
# Jeder Eintrag: bekannte URL der offiziellen Programm-Seite + Metadaten
SOURCES = [
    # Cloud & Infra
    {"id": "aws-activate",     "cat": "cloud",     "url": "https://aws.amazon.com/activate/",                        "company": "Amazon Web Services",  "product": "AWS Activate"},
    {"id": "gcp-startup",      "cat": "cloud",     "url": "https://cloud.google.com/startup",                        "company": "Google Cloud",          "product": "Google for Startups"},
    {"id": "azure-startup",    "cat": "cloud",     "url": "https://www.microsoft.com/en-us/startups",                "company": "Microsoft Azure",       "product": "Founders Hub"},
    {"id": "vercel-startup",   "cat": "cloud",     "url": "https://vercel.com/solutions/startups",                   "company": "Vercel",                "product": "Startup Plan"},
    {"id": "digitalocean",     "cat": "cloud",     "url": "https://www.digitalocean.com/hatch",                      "company": "DigitalOcean",          "product": "Hatch"},
    {"id": "supabase-startup", "cat": "cloud",     "url": "https://supabase.com/docs/guides/getting-started/startups","company": "Supabase",             "product": "Startup Program"},
    {"id": "cloudflare",       "cat": "cloud",     "url": "https://www.cloudflare.com/plans/",                       "company": "Cloudflare",            "product": "Free Tier"},
    {"id": "railway",          "cat": "cloud",     "url": "https://railway.app/pricing",                             "company": "Railway",               "product": "Startup Credits"},
    {"id": "fly-io",           "cat": "cloud",     "url": "https://fly.io/plans",                                    "company": "Fly.io",                "product": "Startup Plan"},
    {"id": "render",           "cat": "cloud",     "url": "https://render.com/pricing",                              "company": "Render",                "product": "Free Tier"},
    {"id": "planetscale",      "cat": "cloud",     "url": "https://planetscale.com/pricing",                         "company": "PlanetScale",           "product": "Startup Plan"},

    # SaaS & Tools
    {"id": "notion-startup",   "cat": "saas",      "url": "https://www.notion.so/startups",                          "company": "Notion",                "product": "Notion for Startups"},
    {"id": "hubspot-startup",  "cat": "saas",      "url": "https://www.hubspot.com/startups",                        "company": "HubSpot",               "product": "HubSpot for Startups"},
    {"id": "intercom",         "cat": "saas",      "url": "https://www.intercom.com/early-stage",                    "company": "Intercom",              "product": "Early Stage Program"},
    {"id": "figma-startup",    "cat": "saas",      "url": "https://www.figma.com/startups/",                         "company": "Figma",                 "product": "Figma for Startups"},
    {"id": "linear-startup",   "cat": "saas",      "url": "https://linear.app/startups",                             "company": "Linear",                "product": "Startup Plan"},
    {"id": "airtable",         "cat": "saas",      "url": "https://www.airtable.com/solution/startup-program",       "company": "Airtable",              "product": "Startup Program"},
    {"id": "retool-startup",   "cat": "saas",      "url": "https://retool.com/startups",                             "company": "Retool",                "product": "Startup Plan"},
    {"id": "1password",        "cat": "saas",      "url": "https://start.1password.com/sign-up/team",                "company": "1Password",             "product": "Teams"},
    {"id": "monday",           "cat": "saas",      "url": "https://monday.com/startups",                             "company": "monday.com",            "product": "Startup Plan"},
    {"id": "loom",             "cat": "saas",      "url": "https://www.loom.com/startups",                           "company": "Loom",                  "product": "Startup Plan"},
    {"id": "miro",             "cat": "saas",      "url": "https://miro.com/startups/",                              "company": "Miro",                  "product": "Startup Program"},
    {"id": "typeform",         "cat": "saas",      "url": "https://www.typeform.com/startups/",                      "company": "Typeform",              "product": "Startup Plan"},
    {"id": "zapier",           "cat": "saas",      "url": "https://zapier.com/l/startups",                           "company": "Zapier",                "product": "Startup Plan"},
    {"id": "postman",          "cat": "saas",      "url": "https://www.postman.com/startups/",                       "company": "Postman",               "product": "Startup Plan"},
    {"id": "segment-startup",  "cat": "saas",      "url": "https://segment.com/industry/startups/",                  "company": "Segment",               "product": "Startup Plan"},
    {"id": "mixpanel",         "cat": "saas",      "url": "https://mixpanel.com/startups/",                          "company": "Mixpanel",              "product": "Startup Plan"},
    {"id": "datadog",          "cat": "saas",      "url": "https://www.datadoghq.com/partner/startups/",             "company": "Datadog",               "product": "Startup Program"},

    # AI & ML
    {"id": "anthropic-startup","cat": "ai",        "url": "https://www.anthropic.com/startups",                      "company": "Anthropic",             "product": "Claude for Startups"},
    {"id": "openai-startup",   "cat": "ai",        "url": "https://openai.com/startups",                             "company": "OpenAI",                "product": "OpenAI for Startups"},
    {"id": "huggingface",      "cat": "ai",        "url": "https://huggingface.co/startups",                         "company": "Hugging Face",          "product": "Startup Program"},
    {"id": "cohere-startup",   "cat": "ai",        "url": "https://cohere.com/startups",                             "company": "Cohere",                "product": "Startup Program"},
    {"id": "mistral-startup",  "cat": "ai",        "url": "https://mistral.ai/startups/",                            "company": "Mistral AI",            "product": "Startup Credits"},
    {"id": "replicate",        "cat": "ai",        "url": "https://replicate.com/pricing",                           "company": "Replicate",             "product": "Startup Credits"},
    {"id": "together-ai",      "cat": "ai",        "url": "https://www.together.ai/startups",                        "company": "Together AI",           "product": "Startup Plan"},

    # Legal & Finance
    {"id": "stripe-atlas",     "cat": "legal",     "url": "https://stripe.com/de/atlas",                             "company": "Stripe",                "product": "Atlas + Startup Deal"},
    {"id": "brex",             "cat": "legal",     "url": "https://www.brex.com/startups",                           "company": "Brex",                  "product": "Startup Card"},
    {"id": "mercury",          "cat": "legal",     "url": "https://mercury.com/startups",                            "company": "Mercury",               "product": "Startup Banking"},
    {"id": "lexoffice",        "cat": "legal",     "url": "https://www.lexoffice.de/gruender/",                      "company": "Lexoffice",             "product": "Gründer-Tarif"},
    {"id": "sevdesk",          "cat": "legal",     "url": "https://sevdesk.de/",                                     "company": "sevDesk",               "product": "Startup-Tarif"},
    {"id": "wise-business",    "cat": "legal",     "url": "https://wise.com/de/business/",                           "company": "Wise Business",         "product": "Business Account"},

    # Marketing
    {"id": "mailchimp",        "cat": "marketing", "url": "https://mailchimp.com/pricing/",                          "company": "Mailchimp",             "product": "Free Plan"},
    {"id": "semrush",          "cat": "marketing", "url": "https://www.semrush.com/kb/1038-startup-program",         "company": "Semrush",               "product": "Startup Program"},
    {"id": "brevo",            "cat": "marketing", "url": "https://www.brevo.com/pricing/",                          "company": "Brevo (Sendinblue)",    "product": "Free Plan"},
    {"id": "hunter",           "cat": "marketing", "url": "https://hunter.io/pricing",                               "company": "Hunter.io",             "product": "Startup Plan"},
    {"id": "phantombuster",    "cat": "marketing", "url": "https://phantombuster.com/pricing",                       "company": "Phantombuster",         "product": "Startup Plan"},
    {"id": "producthunt",      "cat": "marketing", "url": "https://www.producthunt.com/ship",                        "company": "Product Hunt",          "product": "Ship"},

    # HR & Talent
    {"id": "deel",             "cat": "hr",        "url": "https://www.deel.com/startups",                           "company": "Deel",                  "product": "Startup Program"},
    {"id": "remote-com",       "cat": "hr",        "url": "https://remote.com/startups",                             "company": "Remote",                "product": "Startup Deal"},
    {"id": "personio",         "cat": "hr",        "url": "https://www.personio.de/startup/",                        "company": "Personio",              "product": "HR Startup Package"},
    {"id": "greenhouse",       "cat": "hr",        "url": "https://www.greenhouse.com/lp/startups",                  "company": "Greenhouse",            "product": "Startup Plan"},

    # Community
    {"id": "f6s-deals",        "cat": "community", "url": "https://www.f6s.com/company-deals",                       "company": "F6S",                   "product": "Deal Directory"},
]

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml",
    "Accept-Language": "de,en;q=0.9",
}


def extract_text(html: str, max_chars: int = 8000) -> str:
    """Simplem HTML → Text ohne externe Libs."""
    # Skripte und Styles entfernen
    html = re.sub(r'<(script|style)[^>]*>.*?</\1>', ' ', html, flags=re.DOTALL | re.IGNORECASE)
    # Tags entfernen
    text = re.sub(r'<[^>]+>', ' ', html)
    # Whitespace normalisieren
    text = re.sub(r'\s+', ' ', text).strip()
    return text[:max_chars]


def scrape_source(client: httpx.Client, source: dict) -> dict:
    raw = {
        "id": source["id"],
        "company": source["company"],
        "product": source["product"],
        "cat": source["cat"],
        "url": source["url"],
        "scraped_at": datetime.utcnow().isoformat(),
        "text": None,
        "error": None,
    }
    try:
        r = client.get(source["url"], timeout=20, follow_redirects=True)
        r.raise_for_status()
        raw["text"] = extract_text(r.text)
        raw["status_code"] = r.status_code
        print(f"  ✓  {source['id']} ({len(raw['text'])} chars)")
    except Exception as e:
        raw["error"] = str(e)
        print(f"  ✗  {source['id']}: {e}")
    return raw


def run():
    date_str = datetime.utcnow().strftime("%Y-%m-%d")
    out_file = RAW_DIR / f"curated_{date_str}.json"

    results = []
    with httpx.Client(headers=HEADERS, http2=False) as client:
        for i, source in enumerate(SOURCES):
            print(f"[{i+1}/{len(SOURCES)}] {source['id']}")
            results.append(scrape_source(client, source))
            time.sleep(1.2)  # höfliches Crawling

    with open(out_file, "w", encoding="utf-8") as f:
        json.dump({"scraped_at": datetime.utcnow().isoformat(), "sources": results}, f, ensure_ascii=False, indent=2)

    ok = sum(1 for r in results if not r["error"])
    print(f"\n✓ {ok}/{len(results)} Quellen erfolgreich → {out_file.name}")


if __name__ == "__main__":
    run()
