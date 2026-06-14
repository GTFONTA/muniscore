-- ============================================================
--  Migración 0011 — Fase 4 (parte 2): filtro de mapa por tipo de obra
--
--  RPC `puntajes_por_tipo(p_tipo_obra, p_umbral)` que devuelve, para
--  UN tipo de obra, el puntaje por municipio calculado SOLO con las
--  reseñas de ese tipo. Lo usa el frontend para recolorear el mapa
--  cuando el usuario filtra por tipo.
--
--  CLAVES DE DISEÑO:
--   - Para un tipo dado, cada desarrollador aporta a lo sumo UNA reseña
--     (lo garantiza el índice único (empresa, municipio, tipo_obra)).
--     Por eso acá el promedio es PLANO (no hace falta agregación en 2
--     niveles como en el índice general).
--   - Umbral: solo devuelve municipios con al menos `p_umbral` reseñas
--     de ese tipo (inicial = 3, configurable por parámetro). Si no llega
--     al umbral, el municipio NO aparece → el frontend lo pinta neutro
--     ("sin datos suficientes"). No se colorea con una sola opinión.
--   - Las reseñas con tipo_obra NULL (legacy) quedan EXCLUIDAS solas
--     (el filtro `tipo_obra = p_tipo_obra` nunca matchea NULL).
--   - PRIVACIDAD: devuelve SOLO agregados por municipio (promedios y un
--     conteo). NUNCA empresa_id, usuario_id ni el contenido por reseña.
--     SECURITY DEFINER para poder leer las columnas puntaje_* (que por
--     RLS no son visibles vía REST a anon/authenticated).
--
--  Correr en: Supabase → SQL Editor (después de 0001..0010).
-- ============================================================

create or replace function public.puntajes_por_tipo(
  p_tipo_obra text,
  p_umbral    int default 3
)
returns table (
  municipio_id           uuid,
  total_votos            int,
  puntaje_global         numeric,
  puntaje_transparencia  numeric,
  puntaje_velocidad      numeric,
  puntaje_normativa      numeric,
  puntaje_previsibilidad numeric,
  puntaje_atencion       numeric,
  puntaje_impuestos      numeric
)
language sql
security definer
set search_path = public
as $$
  select
    e.municipio_id,
    count(*)::int as total_votos,
    -- Global ponderado v8 (Tasas = puntaje_impuestos).
    avg(e.puntaje_transparencia)  * 0.25 +
    avg(e.puntaje_velocidad)      * 0.25 +
    avg(e.puntaje_normativa)      * 0.10 +
    avg(e.puntaje_previsibilidad) * 0.15 +
    avg(e.puntaje_atencion)       * 0.10 +
    avg(e.puntaje_impuestos)      * 0.15      as puntaje_global,
    avg(e.puntaje_transparencia)  as puntaje_transparencia,
    avg(e.puntaje_velocidad)      as puntaje_velocidad,
    avg(e.puntaje_normativa)      as puntaje_normativa,
    avg(e.puntaje_previsibilidad) as puntaje_previsibilidad,
    avg(e.puntaje_atencion)       as puntaje_atencion,
    avg(e.puntaje_impuestos)      as puntaje_impuestos
  from public.encuestas e
  where e.validado = true
    and e.tipo_obra = p_tipo_obra
  group by e.municipio_id
  having count(*) >= p_umbral;
$$;

revoke all     on function public.puntajes_por_tipo(text, int) from public;
grant  execute on function public.puntajes_por_tipo(text, int) to anon, authenticated;
