-- ============================================================
--  DOMINIO A — Setup inicial (proyecto Supabase NUEVO, de la CEDU)
--
--  Este SQL se corre UNA vez, en el SQL Editor del PROYECTO NUEVO
--  (NO en el proyecto actual `muniscore`, que es el Dominio B).
--
--  Qué crea el Dominio A:
--   1) `empresas_autorizadas` — la whitelist (mail ↔ empresa ↔ cámara)
--      + columna `voter_token` (el token opaco que vincula con el voto).
--   2) `email_autorizado(text)` — la compuerta del login (devuelve solo
--      un booleano; no expone la lista).
--   3) `admins` + `es_admin()` + policies — para que la CEDU opere la
--      whitelist desde el panel (mismo modelo que la migración 0012 de B).
--
--  Lo que NO va acá: los votos (eso vive en el Dominio B). A nunca ve el
--  contenido del voto. El `voter_token` lo COMPLETA la compuerta (Edge
--  Function) la primera vez que cada empresa vota → así Gonzalo nunca ve
--  el mapa token↔empresa (lo carga después de entregar la cuenta).
--
--  Equivale a portar 0001 + 0002 + 0012 del Dominio B, más el token.
-- ============================================================


-- ── 1) Whitelist ────────────────────────────────────────────
create table if not exists public.empresas_autorizadas (
  id              uuid primary key default gen_random_uuid(),
  empresa         text not null,
  email           text not null,
  camara          text,
  activo          boolean not null default true,
  voter_token     text,                      -- opaco; lo llena la compuerta al 1er voto
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now()
);

-- Un mail = una empresa (el email se guarda normalizado, ver trigger).
create unique index if not exists empresas_autorizadas_email_key
  on public.empresas_autorizadas (email);

-- Cada token es único (NULLS DISTINCT: muchos NULL conviven hasta que
-- la compuerta los asigna).
create unique index if not exists empresas_autorizadas_token_key
  on public.empresas_autorizadas (voter_token);

-- Normalización de email (minúsculas/sin espacios) + actualizado_en.
create or replace function public.normalizar_empresa_autorizada()
returns trigger
language plpgsql
as $$
begin
  new.email := lower(btrim(new.email));
  new.actualizado_en := now();
  return new;
end;
$$;

drop trigger if exists trg_normalizar_empresa_autorizada on public.empresas_autorizadas;
create trigger trg_normalizar_empresa_autorizada
  before insert or update on public.empresas_autorizadas
  for each row execute function public.normalizar_empresa_autorizada();

-- RLS activada. Sin policies de lectura pública: la lista no sale por REST.
alter table public.empresas_autorizadas enable row level security;


-- ── 2) Compuerta del login: ¿este mail está autorizado? ─────
-- Devuelve SOLO un booleano (no expone la whitelist). La usa el front
-- ANTES de mandar el magic link.
create or replace function public.email_autorizado(p_email text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.empresas_autorizadas
    where email = lower(btrim(p_email)) and activo = true
  );
$$;

revoke all     on function public.email_autorizado(text) from public;
grant  execute on function public.email_autorizado(text) to anon, authenticated;


-- ── 3) Admins (panel de la whitelist) ───────────────────────
create table if not exists public.admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  email      text,
  creado_en  timestamptz not null default now()
);
alter table public.admins enable row level security;   -- no sale por REST

create or replace function public.es_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from public.admins a where a.user_id = auth.uid());
$$;

revoke all     on function public.es_admin() from public;
grant  execute on function public.es_admin() to anon, authenticated;

-- Policies: solo un admin lee/edita la whitelist. Sin DELETE (baja lógica).
drop policy if exists admins_leen_empresas       on public.empresas_autorizadas;
drop policy if exists admins_insertan_empresas   on public.empresas_autorizadas;
drop policy if exists admins_actualizan_empresas on public.empresas_autorizadas;

create policy admins_leen_empresas
  on public.empresas_autorizadas for select
  to authenticated using ( public.es_admin() );

create policy admins_insertan_empresas
  on public.empresas_autorizadas for insert
  to authenticated with check ( public.es_admin() );

create policy admins_actualizan_empresas
  on public.empresas_autorizadas for update
  to authenticated using ( public.es_admin() ) with check ( public.es_admin() );

grant select, insert, update on public.empresas_autorizadas to authenticated;


-- ============================================================
--  DESPUÉS de correr esto:
--   1) Crear el usuario admin de la CEDU: Authentication → Users →
--      Add user (email + clave, "Auto Confirm"). Luego:
--        insert into public.admins (user_id, email)
--        select id, email from auth.users
--        where email = lower(btrim('admin.cedu@ejemplo.com'))
--        on conflict (user_id) do nothing;
--   2) Cargar el primer padrón (alta de empresas) — desde el panel o por SQL.
--   3) La compuerta (Edge Function, fase siguiente) leerá/escribirá esta
--      tabla con el service_role del proyecto, y completará voter_token.
-- ============================================================
