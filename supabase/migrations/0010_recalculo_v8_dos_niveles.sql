-- ============================================================
--  Migración 0010 — Fase 4 (parte 1): índice v8 con agregación
--                   en DOS niveles + pesos v8
--
--  Reescribe SOLO la función `recalcular_puntajes(uuid)` (la que
--  colorea el mapa, vía el trigger `after_encuesta_insert`).
--
--  CAMBIOS:
--   1) Pesos v8: Transparencia 0.25, Velocidad 0.25, Normativa 0.10,
--      Previsibilidad 0.15, Atención 0.10, Tasas(=puntaje_impuestos) 0.15.
--      (Antes: 0.25/0.20/0.20/0.15/0.10/0.10.)
--   2) Agregación en DOS niveles para puntaje_global, total_votos y
--      las 6 columnas por categoría:
--        - Nivel 1: promedio de las reseñas de cada desarrollador
--          (un "voto-desarrollador").
--        - Nivel 2: promedio entre desarrolladores.
--      total_votos = cantidad de desarrolladores (no de reseñas planas).
--   3) Reseñas legacy con empresa_id NULL: cada una cuenta como su
--      propio desarrollador (decisión confirmada). Clave de agrupación:
--      coalesce(empresa_id::text, 'r:'||id::text). En producción, tras
--      borrar los datos de prueba, solo quedan votos reales por empresa.
--
--  NO toca:
--   - El segundo trigger `recalcular_puntaje_municipio` (mantiene las
--     columnas vestigiales puntaje_promedio/total_evaluaciones, que el
--     frontend NO usa).
--   - Ninguna fila de `encuestas` (solo recomputa agregados de municipios).
--   - meses_promedio: sigue siendo promedio plano (dato estadístico).
--
--  Correr en: Supabase → SQL Editor (después de 0001..0009).
-- ============================================================

create or replace function public.recalcular_puntajes(p_municipio_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $function$
begin
  update municipios m set
    puntaje_transparencia  = a.t,
    puntaje_velocidad      = a.v,
    puntaje_normativa      = a.n,
    puntaje_impuestos      = a.imp,
    puntaje_atencion       = a.at,
    puntaje_previsibilidad = a.pr,
    puntaje_global         = a.g,
    total_votos            = a.tv,
    meses_promedio         = a.meses
  from (
    -- Nivel 1: promedio por desarrollador (cada legacy sin empresa_id
    -- es su propio desarrollador, vía coalesce con el id de la reseña).
    with por_dev as (
      select
        coalesce(empresa_id::text, 'r:' || id::text) as dev,
        avg(puntaje_transparencia::decimal)  as t,
        avg(puntaje_velocidad::decimal)      as v,
        avg(puntaje_normativa::decimal)      as n,
        avg(puntaje_impuestos::decimal)      as imp,
        avg(puntaje_atencion::decimal)       as at,
        avg(puntaje_previsibilidad::decimal) as pr
      from encuestas
      where municipio_id = p_municipio_id
        and validado = true
      group by 1
    )
    -- Nivel 2: promedio entre desarrolladores + global ponderado v8.
    select
      coalesce(avg(t),   0) as t,
      coalesce(avg(v),   0) as v,
      coalesce(avg(n),   0) as n,
      coalesce(avg(imp), 0) as imp,
      coalesce(avg(at),  0) as at,
      coalesce(avg(pr),  0) as pr,
      coalesce(
        avg(t)   * 0.25 +
        avg(v)   * 0.25 +
        avg(n)   * 0.10 +
        avg(pr)  * 0.15 +
        avg(at)  * 0.10 +
        avg(imp) * 0.15
      , 0) as g,
      count(*) as tv,
      (
        select avg(meses_aprobacion::decimal)
        from encuestas
        where municipio_id = p_municipio_id
          and validado = true
          and meses_aprobacion is not null
      ) as meses
    from por_dev
  ) a
  where m.id = p_municipio_id;
end;
$function$;

-- ── Recálculo único de TODOS los municipios con la fórmula v8 ──
-- (Solo recomputa agregados en `municipios`; no toca `encuestas`.)
select public.recalcular_puntajes(id) from public.municipios;
