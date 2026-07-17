-- matchfoundr · Logos & Banner für den Partner-Katalog
-- Gefüllt vom Logo-Scraper (scripts/fetch_logos.py) bzw. Admin-Upload.

alter table public.partner_offers
  add column if not exists logo_url text,
  add column if not exists banner_url text;
