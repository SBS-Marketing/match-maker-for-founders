"""
Logo- & Banner-Scraper für Partner und Deals.

Zieht von jeder Quell-Website das beste verfügbare Markenbild:
  Logo (Quadrat):  apple-touch-icon → größtes <link rel="icon"> → /favicon.ico
                   → Google-Favicon-Dienst als letzter Fallback
  Banner (breit):  og:image / twitter:image (typisch 1200×630)

Normalisierung mit Pillow:
  Logos  → 256×256 PNG, quadratisch gepolstert (transparent), für die
           kleinen abgerundeten Kacheln in App und Web
  Banner → max. 1200 px breit, JPEG q82

Ablage:  public/logos/<slug>.png   public/banners/<slug>.jpg
Anreicherung: schreibt logo_url/banner_url in
  - data/partners/partners_*.json (neueste) → danach build_partners_json.py laufen lassen
  - public/deals.json + docs/deals.json direkt (logo_url zusätzlich zum Emoji-"logo")

Aufruf: python3.11+ scripts/fetch_logos.py  (braucht httpx + pillow)
"""

import io
import json
import re
import time
from pathlib import Path
from urllib.parse import urljoin, urlparse

try:
    import httpx
    from PIL import Image
except ImportError:
    raise SystemExit("pip install httpx pillow")

ROOT = Path(__file__).parent.parent
LOGO_DIR = ROOT / "public" / "logos"
BANNER_DIR = ROOT / "public" / "banners"
LOGO_DIR.mkdir(parents=True, exist_ok=True)
BANNER_DIR.mkdir(parents=True, exist_ok=True)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    "Accept": "text/html,application/xhtml+xml,image/*",
    "Accept-Language": "de,en;q=0.9",
}

LOGO_SIZE = 256
BANNER_MAX_W = 1200


# ── HTML-Analyse ─────────────────────────────────────────────


def find_image_candidates(html: str, base_url: str) -> tuple[list[str], list[str]]:
    """Liefert (logo_kandidaten, banner_kandidaten), beste zuerst."""
    logos: list[tuple[int, str]] = []
    banners: list[str] = []

    for m in re.finditer(r"<link[^>]+>", html, re.IGNORECASE):
        tag = m.group(0)
        rel = _attr(tag, "rel").lower()
        href = _attr(tag, "href")
        if not href or "icon" not in rel:
            continue
        size = 0
        sizes = _attr(tag, "sizes")
        if sizes:
            nums = re.findall(r"(\d+)x\d+", sizes)
            if nums:
                size = int(nums[0])
        # apple-touch-icon ist meist 180×180 und die beste Quelle
        if "apple-touch" in rel:
            size = max(size, 180)
        if href.lower().endswith(".svg"):
            size += 1  # SVG skaliert verlustfrei — leicht bevorzugen
        logos.append((size, urljoin(base_url, href)))

    for m in re.finditer(r"<meta[^>]+>", html, re.IGNORECASE):
        tag = m.group(0)
        prop = (_attr(tag, "property") or _attr(tag, "name")).lower()
        content = _attr(tag, "content")
        if not content:
            continue
        if prop in ("og:image", "og:image:url", "twitter:image", "twitter:image:src"):
            banners.append(urljoin(base_url, content))

    logos.sort(key=lambda item: -item[0])
    return [url for _, url in logos], banners


def _attr(tag: str, name: str) -> str:
    m = re.search(rf'{name}\s*=\s*["\']([^"\']+)["\']', tag, re.IGNORECASE)
    return m.group(1).strip() if m else ""


# ── Download + Normalisierung ────────────────────────────────


def download_image(client: httpx.Client, url: str) -> Image.Image | None:
    try:
        res = client.get(url, timeout=15, follow_redirects=True)
        res.raise_for_status()
        if "svg" in res.headers.get("content-type", "") or url.lower().endswith(".svg"):
            return None  # SVG kann Pillow nicht — überspringen, nächster Kandidat
        img = Image.open(io.BytesIO(res.content))
        img.load()
        return img
    except Exception:
        return None


def normalize_logo(img: Image.Image) -> Image.Image:
    """Quadratisch auf 256×256 mit transparentem Rand — passt in runde Ecken."""
    img = img.convert("RGBA")
    img.thumbnail((LOGO_SIZE, LOGO_SIZE), Image.LANCZOS)
    canvas = Image.new("RGBA", (LOGO_SIZE, LOGO_SIZE), (0, 0, 0, 0))
    canvas.paste(img, ((LOGO_SIZE - img.width) // 2, (LOGO_SIZE - img.height) // 2), img)
    return canvas


def normalize_banner(img: Image.Image) -> Image.Image:
    img = img.convert("RGB")
    if img.width > BANNER_MAX_W:
        h = round(img.height * BANNER_MAX_W / img.width)
        img = img.resize((BANNER_MAX_W, h), Image.LANCZOS)
    return img


def fetch_brand_images(client: httpx.Client, slug: str, page_url: str) -> tuple[str | None, str | None]:
    """Lädt Logo + Banner für eine Quelle. Gibt (logo_url, banner_url) relativ zurück."""
    logo_path = LOGO_DIR / f"{slug}.png"
    banner_path = BANNER_DIR / f"{slug}.jpg"
    logo_rel = f"/logos/{slug}.png"
    banner_rel = f"/banners/{slug}.jpg"

    # Bereits vorhanden → nicht erneut ziehen (Admin-Uploads nicht überschreiben)
    if logo_path.exists() and banner_path.exists():
        return logo_rel, banner_rel

    logo_candidates: list[str] = []
    banner_candidates: list[str] = []
    origin = f"{urlparse(page_url).scheme}://{urlparse(page_url).netloc}"

    try:
        res = client.get(page_url, timeout=18, follow_redirects=True)
        res.raise_for_status()
        logo_candidates, banner_candidates = find_image_candidates(res.text, str(res.url))
    except Exception:
        pass

    # Fallbacks ans Ende der Kandidatenliste
    domain = urlparse(page_url).netloc
    logo_candidates += [
        f"{origin}/apple-touch-icon.png",
        f"{origin}/favicon.ico",
        f"https://www.google.com/s2/favicons?domain={domain}&sz=128",
    ]

    logo_ok = logo_path.exists()
    if not logo_ok:
        for url in logo_candidates:
            img = download_image(client, url)
            if img is None or min(img.size) < 32:
                continue
            normalize_logo(img).save(logo_path, "PNG", optimize=True)
            logo_ok = True
            break

    banner_ok = banner_path.exists()
    if not banner_ok:
        for url in banner_candidates:
            img = download_image(client, url)
            if img is None or img.width < 400:
                continue
            normalize_banner(img).save(banner_path, "JPEG", quality=82, optimize=True)
            banner_ok = True
            break

    return (logo_rel if logo_ok else None, banner_rel if banner_ok else None)


# ── Kataloge anreichern ──────────────────────────────────────


def enrich_partners(client: httpx.Client) -> None:
    files = sorted((ROOT / "data" / "partners").glob("partners_*.json"))
    if not files:
        print("Keine partners_*.json — übersprungen.")
        return
    data = json.loads(files[-1].read_text(encoding="utf-8"))
    partners = data.get("partners", [])
    for idx, p in enumerate(partners, start=1):
        url = p.get("sourceUrl") or p.get("bookingUrl")
        if not url:
            continue
        logo, banner = fetch_brand_images(client, p["slug"], url)
        if logo:
            p["logoUrl"] = logo
        if banner:
            p["bannerUrl"] = banner
        print(f"  [{idx}/{len(partners)}] {p['slug']}: logo={'✓' if logo else '–'} banner={'✓' if banner else '–'}")
        time.sleep(0.4)
    files[-1].write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"✓ Partner angereichert → {files[-1].name} (danach build_partners_json.py ausführen)")


def enrich_deals(client: httpx.Client) -> None:
    deals_file = ROOT / "public" / "deals.json"
    if not deals_file.exists():
        print("Kein public/deals.json — übersprungen.")
        return
    data = json.loads(deals_file.read_text(encoding="utf-8"))
    deals = data.get("deals", [])
    for idx, d in enumerate(deals, start=1):
        url = d.get("url") or d.get("claim_url")
        if not url:
            continue
        logo, banner = fetch_brand_images(client, d["id"], url)
        if logo:
            d["logo_url"] = logo
        if banner:
            d["banner_url"] = banner
        print(f"  [{idx}/{len(deals)}] {d['id']}: logo={'✓' if logo else '–'} banner={'✓' if banner else '–'}")
        time.sleep(0.4)
    deals_file.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    docs_deals = ROOT / "docs" / "deals.json"
    if docs_deals.exists():
        docs_deals.write_text(deals_file.read_text(encoding="utf-8"), encoding="utf-8")
    print("✓ Deals angereichert → public/deals.json (+ docs/deals.json)")


def run() -> None:
    with httpx.Client(headers=HEADERS, http2=False) as client:
        print("── Partner ──")
        enrich_partners(client)
        print("── Deals ──")
        enrich_deals(client)
    logos = len(list(LOGO_DIR.glob("*.png")))
    banners = len(list(BANNER_DIR.glob("*.jpg")))
    print(f"\n✓ {logos} Logos in public/logos, {banners} Banner in public/banners")


if __name__ == "__main__":
    run()
