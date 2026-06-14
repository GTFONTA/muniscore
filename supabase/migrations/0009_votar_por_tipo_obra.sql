-- ============================================================
--  Migración 0009 — Fase 3 del v8: voto por tipo de obra (RPC swap)
--
--  Hace el "swap" que la 0008 dejó pendiente a propósito:
--   1) puntaje_* pasan a numeric (los puntajes v8 son fraccionarios;
--      el prompt prohíbe redondeos nuevos → no se pueden truncar a int).
--   2) Se elimina el índice único viejo de 2 columnas
--      `encuestas_empresa_municipio_key`. La unicidad ahora la da el
--      índice de 3 columnas `encuestas_empresa_municipio_tipoobra_key`
--      (creado en 0008): "un voto por (empresa, municipio, tipo_obra)".
--   3) `votar` se reescribe: recibe tipo_obra + los campos v8 y hace
--      ON CONFLICT sobre las 3 columnas. Ya NO escribe tipo_proyecto
--      (label legacy) ni comentario (se quitó del form).
--   4) `mi_voto` se reescribe: filtra por tipo_obra y devuelve los
--      campos v8 para precargar/editar la reseña de ese tipo.
--
--  Correr en: Supabase → SQL Editor (después de 0001..0008).
--  NO borra reseñas. Las reseñas legacy quedan intactas (tipo_obra NULL).
-- ============================================================

-- ── 1) puntaje_* → numeric (puntajes v8 fraccionarios) ──────
alter table public.encuestas
  alter column puntaje_transparencia  type numeric using puntaje_transparencia::numeric,
  alter column puntaje_velocidad      type numeric using puntaje_velocidad::numeric,
  alter column puntaje_normativa      type numeric using puntaje_normativa::numeric,
  alter column puntaje_impuestos      type numeric using puntaje_impuestos::numeric,
  alter column puntaje_atencion       type numeric using puntaje_atencion::numeric,
  alter column puntaje_previsibilidad type numeric using puntaje_previsibilidad::numeric;

-- ── 2) Eliminar el índice único viejo de 2 columnas ─────────
drop index if exists public.encuestas_empresa_municipio_key;

-- ── 3) RPC `votar` (UPSERT por empresa + tipo_obra) ─────────
drop function if exists public.votar(uuid,int,int,int,int,int,int,int,text,text);

create or replace function public.votar(
  p_municipio_id              uuid,
  p_tipo_obra                 text,
  p_transparencia             numeric,
  p_velocidad                 numeric,
  p_normativa                 numeric,
  p_impuestos                 numeric,
  p_atencion                  numeric,
  p_previsibilidad            numeric,
  p_meses                     int     default null,
  p_velocidad_percibida       int     default null,
  p_tasas_porcentaje          numeric default null,
  p_presion_pagos_informales  boolean default null,
  p_respuestas                jsonb   default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email      text;
  v_empresa_id uuid;
  v_id         uuid;
begin
  -- tipo_obra es obligatorio en el modelo v8 (ON CONFLICT lo necesita)
  if p_tipo_obra is null or p_tipo_obra = '' then
    raise exception 'tipo_obra_requerido';
  end if;

  -- Email del usuario autenticado (desde el JWT), normalizado
  v_email := lower(btrim(auth.jwt() ->> 'email'));
  if v_email is null or v_email = '' then
    raise exception 'no_autenticado';
  end if;

  -- Resolver la empresa ACTIVA dueña de ese mail (alias evita ambigüedad)
  select ea.id into v_empresa_id
  from public.empresas_autorizadas ea
  where ea.email = v_email and ea.activo = true;

  if v_empresa_id is null then
    raise exception 'no_autorizado';
  end if;

  -- UPSERT anclado a (empresa_id, municipio_id, tipo_obra)
  insert into public.encuestas (
    municipio_id, empresa_id, usuario_id, tipo_obra,
    puntaje_transparencia, puntaje_velocidad, puntaje_normativa,
    puntaje_impuestos, puntaje_atencion, puntaje_previsibilidad,
    meses_aprobacion, velocidad_percibida, tasas_porcentaje,
    presion_pagos_informales, respuestas, validado
  ) values (
    p_municipio_id, v_empresa_id, auth.uid(), p_tipo_obra,
    p_transparencia, p_velocidad, p_normativa,
    p_impuestos, p_atencion, p_previsibilidad,
    p_meses, p_velocidad_percibida, p_tasas_porcentaje,
    p_presion_pagos_informales, p_respuestas, true
  )
  on conflict (empresa_id, municipio_id, tipo_obra) do update set
    usuario_id               = excluded.usuario_id,
    puntaje_transparencia    = excluded.puntaje_transparencia,
    puntaje_velocidad        = excluded.puntaje_velocidad,
    puntaje_normativa        = excluded.puntaje_normativa,
    puntaje_impuestos        = excluded.puntaje_impuestos,
    puntaje_atencion         = excluded.puntaje_atencion,
    puntaje_previsibilidad   = excluded.puntaje_previsibilidad,
    meses_aprobacion         = excluded.meses_aprobacion,
    velocidad_percibida      = excluded.velocidad_percibida,
    tasas_porcentaje         = excluded.tasas_porcentaje,
    presion_pagos_informales = excluded.presion_pagos_informales,
    respuestas               = excluded.respuestas,
    validado                 = true
  returning id into v_id;

  return v_id;
end;
$$;

revoke all     on function public.votar(uuid,text,numeric,numeric,numeric,numeric,numeric,numeric,int,int,numeric,boolean,jsonb) from public;
grant  execute on function public.votar(uuid,text,numeric,numeric,numeric,numeric,numeric,numeric,int,int,numeric,boolean,jsonb) to authenticated;

-- ── 4) RPC `mi_voto` (lectura del voto propio por tipo_obra) ──
drop function if exists public.mi_voto(uuid);

create or replace function public.mi_voto(
  p_municipio_id uuid,
  p_tipo_obra    text default null
)
returns table (
  id                       uuid,
  tipo_obra                text,
  puntaje_transparencia    numeric,
  puntaje_velocidad        numeric,
  puntaje_normativa        numeric,
  puntaje_impuestos        numeric,
  puntaje_atencion         numeric,
  puntaje_previsibilidad   numeric,
  meses_aprobacion         int,
  velocidad_percibida      int,
  tasas_porcentaje         numeric,
  presion_pagos_informales boolean,
  respuestas               jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email      text;
  v_empresa_id uuid;
begin
  v_email := lower(btrim(auth.jwt() ->> 'email'));
  if v_email is null or v_email = '' then
    return;
  end if;

  select ea.id into v_empresa_id
  from public.empresas_autorizadas ea
  where ea.email = v_email and ea.activo = true;

  if v_empresa_id is null then
    return;
  end if;

  return query
    select
      e.id,
      e.tipo_obra::text,
      e.puntaje_transparencia::numeric,
      e.puntaje_velocidad::numeric,
      e.puntaje_normativa::numeric,
      e.puntaje_impuestos::numeric,
      e.puntaje_atencion::numeric,
      e.puntaje_previsibilidad::numeric,
      e.meses_aprobacion::int,
      e.velocidad_percibida::int,
      e.tasas_porcentaje::numeric,
      e.presion_pagos_informales::boolean,
      e.respuestas::jsonb
    from public.encuestas e
    where e.empresa_id = v_empresa_id
      and e.municipio_id = p_municipio_id
      and (p_tipo_obra is null or e.tipo_obra is not distinct from p_tipo_obra)
    limit 1;
end;
$$;

revoke all     on function public.mi_voto(uuid, text) from public;
grant  execute on function public.mi_voto(uuid, text) to authenticated;

-- ============================================================
--  PENDIENTE (Fase 4): ajustar el trigger de `municipios` a los
--  pesos v8 (25/25/10/15/10/15) y a la agregación en DOS niveles
--  (promedio por empresa, luego entre empresas). Hasta entonces, el
--  trigger sigue con los pesos viejos (índice general aproximado).
-- ============================================================
