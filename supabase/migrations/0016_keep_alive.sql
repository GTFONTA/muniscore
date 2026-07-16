-- ============================================================
--  Migración 0016 — Tabla `keep_alive` (anti-pausa de Supabase Free)
--
--  PROPÓSITO (y NADA MÁS que esto):
--  Existe únicamente para generar actividad de base de datos y evitar
--  que Supabase pause el proyecto Free por 7 días de inactividad. NO
--  tiene ninguna relación con la lógica de negocio (mapa, votos, padrón,
--  puntajes). Un GitHub Action (.github/workflows/keep-alive.yml) le
--  pega un SELECT trivial cada 3 días.
--
--  ¿DÓNDE SE CORRE?
--  Solo en el proyecto "Munilupa-listado" (ref ltzfauobraykanxisgkx),
--  que sigue en plan Free. El proyecto "muniscore" va a PRO (no se pausa),
--  así que NO hace falta correr esto ahí.
--  (Si algún día también quedara en Free, este mismo archivo sirve tal cual.)
--
--  Correr en: Supabase → SQL Editor del proyecto Listado.
--  NO toca ningún objeto existente (solo crea la tabla nueva).
--  Es idempotente: se puede correr más de una vez sin romper nada.
-- ============================================================

-- ── Tabla mínima ────────────────────────────────────────────
create table if not exists public.keep_alive (
  id  int primary key,
  ts  timestamptz not null default now()
);

-- ── Fila única (id = 1) ─────────────────────────────────────
-- El ping hace un SELECT; con una fila alcanza. on conflict do nothing
-- para que re-correr la migración no falle ni duplique.
insert into public.keep_alive (id) values (1)
  on conflict (id) do nothing;

-- ── RLS activada ────────────────────────────────────────────
alter table public.keep_alive enable row level security;

-- ── Única policy: SELECT para anon ──────────────────────────
-- Sin INSERT, sin UPDATE, sin DELETE (nadie puede escribir vía REST).
-- El keep-alive usa exclusivamente la anon key para leer.
drop policy if exists keep_alive_select_anon on public.keep_alive;
create policy keep_alive_select_anon
  on public.keep_alive
  for select
  to anon
  using (true);

-- Privilegio de tabla a nivel rol (la policy filtra filas; el grant
-- habilita el SELECT). Explícito para no depender de default privileges.
grant select on public.keep_alive to anon;
