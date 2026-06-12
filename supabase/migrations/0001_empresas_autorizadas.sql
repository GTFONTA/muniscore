-- ============================================================
--  Migración 0001 — Tabla de empresas autorizadas (lista blanca)
--
--  Fase 1 del plan de votación por empresa.
--  Identidad estable del votante = `id` de esta tabla (empresa_id).
--  El `email` es solo la credencial ACTUAL y puede cambiar (Fase 4),
--  sin que cambie el `id`.
--
--  Correr en: Supabase → SQL Editor.
--  NO toca datos existentes (solo crea objetos nuevos).
-- ============================================================

-- ── Tabla ───────────────────────────────────────────────────
create table if not exists public.empresas_autorizadas (
  id              uuid primary key default gen_random_uuid(),  -- identidad permanente de la empresa
  empresa         text not null,                               -- nombre de la empresa
  email           text not null,                               -- credencial actual (se normaliza a minúsculas)
  camara          text,                                        -- ej. 'CEDU'
  activo          boolean not null default true,
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now()
);

-- ── Unicidad de email (case-insensitive gracias a la normalización) ──
-- El email se guarda siempre en minúsculas y sin espacios (ver trigger),
-- así que un UNIQUE simple alcanza para "un mail = una empresa".
create unique index if not exists empresas_autorizadas_email_key
  on public.empresas_autorizadas (email);

-- ── Normalización de email + mantenimiento de actualizado_en ────────
-- Se aplica EN LA BASE, tanto al insertar como al actualizar el email
-- (incluido el cambio de credencial de la Fase 4). Garantiza que la
-- comparación de la compuerta (Fase 2) y de RLS (Fase 5) siempre
-- trabaje contra un email canónico (minúsculas, sin espacios).
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
  for each row
  execute function public.normalizar_empresa_autorizada();

-- ── RLS: bloqueada por defecto ──────────────────────────────
-- La lista de empresas NO debe ser pública (mapea email ↔ empresa).
-- Activamos RLS sin policies de lectura: el rol anon NO puede leer
-- ni escribir esta tabla. La verificación de "¿este mail está
-- autorizado?" se hará vía una función SECURITY DEFINER que devuelve
-- solo un booleano (se entrega en la Fase 2), sin exponer la lista.
-- El service_role (SQL Editor / backoffice) ignora RLS y puede cargar
-- datos con normalidad.
alter table public.empresas_autorizadas enable row level security;

-- (Sin policies a propósito: acceso solo por service_role o por
--  funciones SECURITY DEFINER controladas. Se agregan en fases siguientes.)
