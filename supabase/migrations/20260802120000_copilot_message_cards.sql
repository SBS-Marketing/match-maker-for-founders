-- Rich Cards: strukturierte Karten (Kontakt, Recherche) an einer Co-Pilot-Nachricht.
-- Getrennt von `sources`, weil eine Karte eigene Felder hat und der Client sie
-- als Bauteil rendert, nicht als Link-Liste.
alter table public.copilot_messages
  add column if not exists cards jsonb not null default '[]'::jsonb;

comment on column public.copilot_messages.cards is
  'Validierte Rich Cards: [{kind:"contact",name,role,organization,phone,email,street,postal_code,city,website,note,source_url}] oder [{kind:"research",title,summary,bullets,sources}]';
