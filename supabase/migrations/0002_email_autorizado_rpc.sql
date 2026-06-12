-- ============================================================
--  Migración 0002 — RPC de compuerta: email_autorizado()
--
--  Fase 2. Permite que el cliente (anon) pregunte SOLO un booleano:
--  "¿este email está habilitado para votar?", sin poder leer la
--  lista de empresas (la tabla sigue con RLS bloqueada).
--
--  Correr en: Supabase → SQL Editor (después de 0001).
-- ============================================================

create or replace function public.email_autorizado(p_email text)
returns boolean
language sql
security definer            -- corre con privilegios del owner: puede leer la tabla
stable
set search_path = public    -- evita secuestro de search_path
as $$
  select exists (
    select 1
    from public.empresas_autorizadas
    where email = lower(btrim(p_email))   -- mismo canon que el trigger de normalización
      and activo = true
  );
$$;

-- La función solo devuelve true/false; no filtra datos de la tabla.
revoke all     on function public.email_autorizado(text) from public;
grant  execute on function public.email_autorizado(text) to anon, authenticated;
