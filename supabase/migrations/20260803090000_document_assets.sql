-- Unterlagen online: Datei in den privaten Bucket "media", Metadaten und
-- extrahierter Text in die DB. Bisher lagen beide nur in den iOS-UserDefaults —
-- weg bei App-Löschung, kein Gerätewechsel, und der Co-Pilot sah nur 1200 Zeichen.

create table if not exists public.document_assets (
  -- Die ID kommt vom Client (FounderDocumentAsset.id), damit lokal und remote
  -- dieselbe Unterlage dieselbe Identität hat.
  id            uuid primary key,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  title         text not null,
  file_name     text not null,
  kind          text not null default 'upload',
  size_bytes    bigint not null default 0,
  -- Pfad im Bucket "media" (<user_id>/<id>.<ext>). Leer, solange der Upload
  -- noch nicht durch ist — die Zeile darf trotzdem existieren.
  storage_path  text,
  -- Kurzfassung für Listen und knappe Prompts.
  text_preview  text not null default '',
  -- Volltext, soweit extrahierbar. Basis für Co-Pilot-Antworten auf Unterlagen.
  text_content  text not null default '',
  imported_at   timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.document_assets enable row level security;

drop policy if exists "Users manage own document assets" on public.document_assets;
create policy "Users manage own document assets"
  on public.document_assets for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_document_assets_user on public.document_assets(user_id);

-- ─────────────────────────────────────────────────────────────
-- Storage: der Bucket "media" ist privat und hatte bisher GAR KEINE Policy,
-- war also für jeden Client dicht. Zugriff nur auf den eigenen Ordner —
-- der erste Pfadabschnitt muss die eigene User-ID sein.
-- ─────────────────────────────────────────────────────────────

drop policy if exists "media own read"   on storage.objects;
drop policy if exists "media own insert" on storage.objects;
drop policy if exists "media own update" on storage.objects;
drop policy if exists "media own delete" on storage.objects;

create policy "media own read" on storage.objects for select
  to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "media own insert" on storage.objects for insert
  to authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "media own update" on storage.objects for update
  to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "media own delete" on storage.objects for delete
  to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
