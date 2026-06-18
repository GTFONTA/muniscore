-- ============================================================
--  Migración 0012 — Panel de administración de la whitelist
--
--  Habilita que un TERCERO (no el dueño del proyecto) administre la
--  tabla `empresas_autorizadas` desde una página web propia
--  (`/admin.html`), logueándose con email + contraseña, SIN entrar
--  jamás a Supabase ni ver el resto del proyecto.
--
--  PIEZAS:
--   1) Tabla `admins`: lista de usuarios (auth.users) con permiso de
--      administración. RLS bloqueada (nadie la lee por REST).
--   2) Función `es_admin()` (SECURITY DEFINER): devuelve true si el
--      usuario logueado está en `admins`. Bypassa RLS para poder leer
--      la tabla `admins`.
--   3) Policies RLS en `empresas_autorizadas`: SELECT / INSERT / UPDATE
--      SOLO si `es_admin()`. NO hay policy de DELETE (las bajas son
--      lógicas: `activo = false`, para no romper el vínculo con votos
--      ya emitidos por esa empresa).
--
--  SEGURIDAD / PRIVACIDAD:
--   - El admin SOLO toca `empresas_autorizadas`. No tiene acceso a
--     `encuestas` ni al contenido de los votos (sigue intacto el
--     principio de privacidad del proyecto).
--   - anon (sin sesión) nunca pasa: `es_admin()` usa `auth.uid()`, que
--     es NULL para anon → false.
--   - Un `authenticated` que NO sea admin tampoco ve nada: la policy
--     exige `es_admin()`.
--
--  NO toca: ninguna fila existente, ni el trigger de normalización de
--  0001 (que sigue pasando el email a minúsculas/sin espacios y
--  actualizando `actualizado_en`, también para los writes del admin).
--
--  Correr en: Supabase → SQL Editor (después de 0001..0011).
-- ============================================================

-- ── 1) Tabla de administradores ─────────────────────────────
create table if not exists public.admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  email      text,
  creado_en  timestamptz not null default now()
);

-- RLS activada SIN policies: la lista de admins no sale por REST.
-- Solo `service_role` (SQL Editor) y las funciones SECURITY DEFINER
-- pueden leerla.
alter table public.admins enable row level security;

-- ── 2) ¿El usuario logueado es admin? ───────────────────────
create or replace function public.es_admin()
returns boolean
language sql
security definer            -- puede leer `admins` aunque RLS la bloquee
stable
set search_path = public
as $$
  select exists (
    select 1 from public.admins a
    where a.user_id = auth.uid()
  );
$$;

revoke all     on function public.es_admin() from public;
grant  execute on function public.es_admin() to anon, authenticated;

-- ── 3) Policies de la whitelist: solo admins operan ─────────
-- (La tabla ya tiene RLS activada desde 0001, sin policies de escritura.)
drop policy if exists admins_leen_empresas       on public.empresas_autorizadas;
drop policy if exists admins_insertan_empresas   on public.empresas_autorizadas;
drop policy if exists admins_actualizan_empresas on public.empresas_autorizadas;

create policy admins_leen_empresas
  on public.empresas_autorizadas
  for select
  to authenticated
  using ( public.es_admin() );

create policy admins_insertan_empresas
  on public.empresas_autorizadas
  for insert
  to authenticated
  with check ( public.es_admin() );

create policy admins_actualizan_empresas
  on public.empresas_autorizadas
  for update
  to authenticated
  using ( public.es_admin() )
  with check ( public.es_admin() );

-- Privilegios de tabla para el rol `authenticated`. La RLS de arriba
-- los acota a SOLO admins (un authenticated no-admin pasa el GRANT
-- pero la policy lo deja sin filas). NO se concede DELETE (baja lógica).
grant select, insert, update on public.empresas_autorizadas to authenticated;

-- ============================================================
--  CÓMO DAR DE ALTA UN ADMIN (hacelo DESPUÉS, una sola vez por persona)
--
--  Paso 1 — En Supabase → Authentication → Users → "Add user":
--           cargá el EMAIL y la CONTRASEÑA de la persona y tildá
--           "Auto Confirm User".
--
--  Paso 2 — Volvé al SQL Editor y corré esto (reemplazá el mail).
--           Busca solo el id del usuario en auth.users, no copiás IDs:
--
--    insert into public.admins (user_id, email)
--    select id, email from auth.users
--    where email = lower(btrim('mail.de.la.persona@ejemplo.com'))
--    on conflict (user_id) do nothing;
--
--  Para sacarle el permiso a alguien (sin borrar su usuario):
--
--    delete from public.admins
--    where email = lower(btrim('mail.de.la.persona@ejemplo.com'));
--
--  Verificar quiénes son admins:
--
--    select email, creado_en from public.admins order by creado_en;
-- ============================================================
