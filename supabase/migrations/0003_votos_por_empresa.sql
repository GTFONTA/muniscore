-- ============================================================
--  Migración 0003 — Votos anclados a la empresa
--
--  Fase 3. La identidad del votante pasa a ser `empresa_id`
--  (FK a empresas_autorizadas.id), estable ante cambios de mail.
--
--  Correr en: Supabase → SQL Editor (después de 0001 y 0002).
--  NO migra ni borra votos existentes: quedan con empresa_id = NULL
--  (siguen contando en el promedio general vía el trigger existente).
-- ============================================================

-- ── 1) Columna empresa_id en encuestas ──────────────────────
alter table public.encuestas
  add column if not exists empresa_id uuid
    references public.empresas_autorizadas(id);

-- ── 2) Clave única para el UPSERT ───────────────────────────
-- "Una empresa, un voto por municipio". Los votos legacy tienen
-- empresa_id = NULL; en un índice UNIQUE los NULL son DISTINTOS
-- entre sí (default NULLS DISTINCT), así que las 78 filas viejas
-- NO entran en conflicto y no se tocan.
--
-- ⚠️ EXTENSIÓN FUTURA (prompt de "tipo de obra"): cuando llegue la
-- segmentación, esta clave pasa a (empresa_id, municipio_id,
-- tipo_proyecto). Es el ÚNICO lugar a cambiar acá, junto con el
-- ON CONFLICT del RPC `votar` más abajo.
create unique index if not exists encuestas_empresa_municipio_key
  on public.encuestas (empresa_id, municipio_id);

-- ── 3) RPC de guardado (UPSERT anclado a empresa_id) ────────
-- SECURITY DEFINER: resuelve empresa_id desde el email del JWT y
-- hace el UPSERT por encima de RLS. Esto permite la herencia de
-- votos al cambiar de mail (Fase 4), porque la fila se identifica
-- por empresa_id y no por auth.uid().
create or replace function public.votar(
  p_municipio_id   uuid,
  p_transparencia  int,
  p_velocidad      int,
  p_normativa      int,
  p_impuestos      int,
  p_atencion       int,
  p_previsibilidad int,
  p_meses          int  default null,
  p_tipo           text default null,
  p_comentario     text default null
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
  -- Email del usuario autenticado (desde el JWT), normalizado
  v_email := lower(btrim(auth.jwt() ->> 'email'));
  if v_email is null or v_email = '' then
    raise exception 'no_autenticado';
  end if;

  -- Resolver la empresa ACTIVA dueña de ese mail
  select id into v_empresa_id
  from public.empresas_autorizadas
  where email = v_email and activo = true;

  if v_empresa_id is null then
    raise exception 'no_autorizado';
  end if;

  -- UPSERT anclado a empresa_id.
  -- usuario_id se guarda solo como dato auxiliar (no es la clave).
  insert into public.encuestas (
    municipio_id, empresa_id, usuario_id,
    puntaje_transparencia, puntaje_velocidad, puntaje_normativa,
    puntaje_impuestos, puntaje_atencion, puntaje_previsibilidad,
    meses_aprobacion, tipo_proyecto, comentario, validado
  ) values (
    p_municipio_id, v_empresa_id, auth.uid(),
    p_transparencia, p_velocidad, p_normativa,
    p_impuestos, p_atencion, p_previsibilidad,
    p_meses, p_tipo, p_comentario, true
  )
  -- ⚠️ EXTENSIÓN FUTURA: agregar tipo_proyecto a la lista del ON CONFLICT.
  on conflict (empresa_id, municipio_id) do update set
    usuario_id             = excluded.usuario_id,
    puntaje_transparencia  = excluded.puntaje_transparencia,
    puntaje_velocidad      = excluded.puntaje_velocidad,
    puntaje_normativa      = excluded.puntaje_normativa,
    puntaje_impuestos      = excluded.puntaje_impuestos,
    puntaje_atencion       = excluded.puntaje_atencion,
    puntaje_previsibilidad = excluded.puntaje_previsibilidad,
    meses_aprobacion       = excluded.meses_aprobacion,
    tipo_proyecto          = excluded.tipo_proyecto,
    comentario             = excluded.comentario,
    validado               = true
  returning id into v_id;

  return v_id;
end;
$$;

revoke all     on function public.votar(uuid,int,int,int,int,int,int,int,text,text) from public;
grant  execute on function public.votar(uuid,int,int,int,int,int,int,int,text,text) to authenticated;

-- ── 4) RPC de lectura del propio voto (para precargar el form) ──
-- Devuelve SOLO el voto de la empresa del usuario actual para ese
-- municipio. Anclado a empresa_id, así sigue funcionando aunque el
-- voto se haya emitido con un mail anterior (Fase 4).
create or replace function public.mi_voto(p_municipio_id uuid)
returns table (
  id                     uuid,
  puntaje_transparencia  int,
  puntaje_velocidad      int,
  puntaje_normativa      int,
  puntaje_impuestos      int,
  puntaje_atencion       int,
  puntaje_previsibilidad int,
  meses_aprobacion       int,
  tipo_proyecto          text,
  comentario             text
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

  -- Alias "ea" evita ambigüedad con el output column "id" del RETURNS TABLE
  select ea.id into v_empresa_id
  from public.empresas_autorizadas ea
  where ea.email = v_email and ea.activo = true;

  if v_empresa_id is null then
    return;
  end if;

  return query
    select
      e.id,
      e.puntaje_transparencia::int,
      e.puntaje_velocidad::int,
      e.puntaje_normativa::int,
      e.puntaje_impuestos::int,
      e.puntaje_atencion::int,
      e.puntaje_previsibilidad::int,
      e.meses_aprobacion::int,
      e.tipo_proyecto::text,
      e.comentario::text
    from public.encuestas e
    where e.empresa_id = v_empresa_id
      and e.municipio_id = p_municipio_id
    limit 1;
end;
$$;

revoke all     on function public.mi_voto(uuid) from public;
grant  execute on function public.mi_voto(uuid) to authenticated;
