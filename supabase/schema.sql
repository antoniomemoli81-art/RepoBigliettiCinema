-- ==========================================================
-- CINEPASS VAULT - SUPABASE DATABASE & STORAGE SCHEMA
-- ==========================================================
-- Esegui questo script nel SQL Editor della dashboard di Supabase.

-- 1. Tabella Vouchers
create table if not exists public.vouchers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null default auth.uid(),
  code text not null,
  pin text not null,
  expiration_date date not null,
  circuit text not null default 'The Space Cinema',
  sf_code text,
  beneficiary text,
  pdf_storage_path text,
  pdf_filename text,
  is_used boolean default false not null,
  used_at timestamptz,
  movie_title text,
  viewing_date date,
  notes text,
  batch_id uuid default gen_random_uuid(),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 2. Indici per velocizzare ricerche e filtri frequenti
create index if not exists idx_vouchers_user_status on public.vouchers(user_id, is_used);
create index if not exists idx_vouchers_user_expiration on public.vouchers(user_id, expiration_date);
create index if not exists idx_vouchers_user_code on public.vouchers(user_id, code);
create index if not exists idx_vouchers_public_used on public.vouchers(is_used, viewing_date);

-- 3. Abilitazione Row Level Security (RLS)
alter table public.vouchers enable row level security;

-- Policy di Sicurezza:
-- I voucher usati (is_used = true) sono pubblici (per lo storico/portfolio film),
-- mentre quelli disponibili sono visibili unicamente dall'utente proprietario autenticato.
drop policy if exists "Gli utenti possono visualizzare solo i propri voucher" on public.vouchers;
drop policy if exists "Visualizzazione voucher usati pubblici o personali" on public.vouchers;

create policy "Visualizzazione voucher usati pubblici o personali"
  on public.vouchers for select
  using (is_used = true or auth.uid() = user_id);

create policy "Gli utenti possono inserire i propri voucher"
  on public.vouchers for insert
  with check (auth.uid() = user_id);

create policy "Gli utenti possono aggiornare i propri voucher"
  on public.vouchers for update
  using (auth.uid() = user_id);

create policy "Gli utenti possono eliminare i propri voucher"
  on public.vouchers for delete
  using (auth.uid() = user_id);

-- 4. Trigger per aggiornare automaticamente 'updated_at'
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_vouchers_updated_at on public.vouchers;
create trigger set_vouchers_updated_at
  before update on public.vouchers
  for each row
  execute function public.handle_updated_at();

-- 5. Configurazione Storage Bucket 'vouchers'
insert into storage.buckets (id, name, public)
values ('vouchers', 'vouchers', false)
on conflict (id) do nothing;

drop policy if exists "Gli utenti possono visualizzare i propri file PDF" on storage.objects;
drop policy if exists "Visualizzazione file PDF" on storage.objects;

-- RLS per Storage Objects (lettura file)
create policy "Visualizzazione file PDF"
  on storage.objects for select
  using (bucket_id = 'vouchers');

create policy "Gli utenti possono caricare i propri file PDF"
  on storage.objects for insert
  with check (bucket_id = 'vouchers' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Gli utenti possono aggiornare i propri file PDF"
  on storage.objects for update
  using (bucket_id = 'vouchers' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Gli utenti possono eliminare i propri file PDF"
  on storage.objects for delete
  using (bucket_id = 'vouchers' and auth.uid()::text = (storage.foldername(name))[1]);
