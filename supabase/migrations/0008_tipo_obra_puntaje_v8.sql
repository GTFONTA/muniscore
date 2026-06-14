-- ============================================================
--  Migración 0008 — Fase 1 del v8: segmentación por tipo de obra
--                   + campos del nuevo sistema de puntaje
--
--  Agrega las columnas que necesita el sistema v8 SIN tocar datos
--  existentes ni fórmulas (eso llega en fases posteriores).
--
--  Esta migración es PURAMENTE ADITIVA:
--   - NO borra el índice viejo `encuestas_empresa_municipio_key`.
--   - NO modifica el RPC `votar` ni `mi_voto`.
--  Motivo: el RPC `votar` hace `ON CONFLICT (empresa_id, municipio_id)`.
--  Si dropeáramos ese índice ahora, el UPSERT se rompería y el voto
--  dejaría de funcionar. El reemplazo (drop del índice de 2 columnas +
--  cambiar el ON CONFLICT a 3 columnas) se hace en la fase del
--  formulario/RPC (Fase 3), cuando el form ya envía `tipo_obra`.
--  Hasta entonces, el índice viejo sigue garantizando "un voto por
--  municipio" y la app sigue andando.
--
--  Correr en: Supabase → SQL Editor (después de 0001..0007).
--  NO migra ni borra reseñas: son datos de prueba, se conservan.
-- ============================================================

-- ── 1) tipo_obra (slug) — segmentación ──────────────────────
-- SLUGS (valor en DB) ≠ etiquetas visibles del front. Distinto del
-- `tipo_proyecto` legacy (labels de 0006): ese queda intacto.
-- Las reseñas existentes quedan con tipo_obra = NULL ("sin clasificar"):
-- cuentan para el índice general (vía su empresa) pero NUNCA para un
-- filtro por tipo. El CHECK admite NULL, así que valida sin problemas.
alter table public.encuestas
  add column if not exists tipo_obra text;

alter table public.encuestas
  drop constraint if exists encuestas_tipo_obra_check;

alter table public.encuestas
  add constraint encuestas_tipo_obra_check
  check (tipo_obra is null or tipo_obra = any (array[
    'vivienda_unifamiliar',
    'vivienda_multifamiliar',
    'industrial_logistico',
    'comercial_servicios',
    'desarrollo_urbanistico',
    'otro'
  ]));

-- ── 2) velocidad_percibida (1–5) — NUEVO, SÍ entra al puntaje ──
-- Autoevaluación de velocidad del municipio (peso 60 % de la categoría
-- Velocidad en v8). Legacy = NULL; su Puntaje_tiempo se derivará desde
-- meses_aprobacion en la Fase 4 (recálculo), no acá.
alter table public.encuestas
  add column if not exists velocidad_percibida smallint;

alter table public.encuestas
  drop constraint if exists encuestas_velocidad_percibida_check;

alter table public.encuestas
  add constraint encuestas_velocidad_percibida_check
  check (velocidad_percibida is null
         or velocidad_percibida between 1 and 5);

-- ── 3) tasas_porcentaje — NUEVO, SÍ entra al puntaje ────────
-- % de tasas municipales sobre el costo directo de construcción.
-- Alimenta el Puntaje_costo (peso 60 % de la categoría Tasas en v8).
-- Legacy = NULL. numeric sin precisión fija para no perder decimales.
alter table public.encuestas
  add column if not exists tasas_porcentaje numeric;

alter table public.encuestas
  drop constraint if exists encuestas_tasas_porcentaje_check;

alter table public.encuestas
  add constraint encuestas_tasas_porcentaje_check
  check (tasas_porcentaje is null or tasas_porcentaje >= 0);

-- ── 4) presion_pagos_informales — afirmación CRÍTICA ────────
-- Campo boolean PROPIO (no va en el JSONB): si es true, el v8 fija la
-- categoría Transparencia en 1 estrella (override, no cálculo).
-- Legacy = NULL (no se preguntó). NULL/false = sin override.
alter table public.encuestas
  add column if not exists presion_pagos_informales boolean;

-- ── 5) respuestas (JSONB) — afirmaciones tildadas por categoría ──
-- Fuente de verdad de QUÉ afirmaciones marcó el desarrollador, para
-- poder armar a futuro el resumen por municipio. Legacy = NULL.
-- Forma propuesta (se consolida en la Fase 2; la columna no la fuerza):
--   {
--     "transparencia":  [bool x5],   -- las 5 normales (la crítica va aparte)
--     "velocidad":      [bool x6],
--     "normativa":      [bool x5],
--     "previsibilidad": [bool x6],
--     "atencion":       [bool x6],
--     "tasas":          [bool x6]
--   }
alter table public.encuestas
  add column if not exists respuestas jsonb;

-- ── 6) Unicidad por (empresa, municipio, tipo_obra) ─────────
-- "Un voto por tipo de obra". Default NULLS DISTINCT: las filas legacy
-- (empresa_id NULL y/o tipo_obra NULL) NO entran en conflicto y no se
-- tocan. OJO: mientras tipo_obra siga NULL en votos nuevos (antes de la
-- Fase 3), este índice NO impone unicidad por sí solo; esa garantía la
-- sigue dando el índice viejo de 2 columnas, que se mantiene a propósito.
create unique index if not exists encuestas_empresa_municipio_tipoobra_key
  on public.encuestas (empresa_id, municipio_id, tipo_obra);

-- ── Documentación de columnas (opcional, ayuda a futuro) ────
comment on column public.encuestas.tipo_obra is
  'Slug del tipo de obra (v8). NULL = legacy sin clasificar. Distinto de tipo_proyecto (label legacy).';
comment on column public.encuestas.velocidad_percibida is
  'Autoevaluación de velocidad 1-5 (v8). Peso 60% de la categoría Velocidad. NULL = legacy.';
comment on column public.encuestas.tasas_porcentaje is
  '% de tasas sobre costo directo de obra (v8). Alimenta Puntaje_costo. NULL = legacy.';
comment on column public.encuestas.presion_pagos_informales is
  'Afirmación crítica de Transparencia (v8). true => override de la categoría a 1 estrella.';
comment on column public.encuestas.respuestas is
  'JSONB con las afirmaciones tildadas por categoría (v8). NULL = legacy.';

-- ============================================================
--  PENDIENTE (NO en esta migración):
--   - Fase 3/RPC: drop de `encuestas_empresa_municipio_key` (2 cols) y
--     cambiar `votar` a ON CONFLICT (empresa_id, municipio_id, tipo_obra),
--     pasando tipo_obra + los nuevos campos.
--   - Fase 4/recálculo: para las reseñas legacy (velocidad_percibida NULL)
--     derivar el Puntaje_tiempo desde meses_aprobacion con el cuadro de
--     tipos generales (<3m=5; 3-6=4; 6-9=3; 9-12=2; 12+=1). Confirmado por
--     el usuario; se aplica en la Fase 4, no acá.
-- ============================================================
