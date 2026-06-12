-- ============================================================
--  Migración 0006 — Renombrar tipos de obra (coherencia form ↔ DB)
--
--  Unifica los nombres del `<select>` del form (App.jsx) con el CHECK
--  constraint de la base. De paso arregla el BUG PREEXISTENTE: el form
--  ofrecía 'Barrio Privado/Club de campo', que el constraint rechazaba.
--
--  Mapeo de nombres (viejo → nuevo):
--    Casa unifamiliar              → Vivienda Unifamiliar
--    Edificio                      → Vivienda Multifamiliar
--    Industrial                    → Industrial y Logístico
--    Comercial                     → Comercial y Servicios
--    Barrio Privado/Club de campo  → Desarrollo Urbanístico   (nuevo, antes inválido)
--    Otro                          → Otro
--
--  Correr en: Supabase → SQL Editor (después de 0001..0005).
--
--  ⚠️ NO se alteran votos. Las 78 evaluaciones de prueba tienen los
--  nombres VIEJOS guardados; el usuario las borrará a mano antes del
--  lanzamiento. Por eso el constraint nuevo se agrega NOT VALID: aplica
--  a todo voto NUEVO o EDITADO, pero NO escanea (ni rechaza) las filas
--  legacy existentes. Los votos legacy tienen empresa_id = NULL, así que
--  el RPC `votar` (ON CONFLICT empresa_id, municipio_id) nunca los toca.
-- ============================================================

-- ── 1) Sacar el constraint viejo ────────────────────────────
alter table public.encuestas
  drop constraint if exists encuestas_tipo_proyecto_check;

-- ── 2) Constraint nuevo con los 6 nombres, sin validar filas viejas ──
alter table public.encuestas
  add constraint encuestas_tipo_proyecto_check
  check (tipo_proyecto = any (array[
    'Vivienda Unifamiliar',
    'Vivienda Multifamiliar',
    'Industrial y Logístico',
    'Comercial y Servicios',
    'Desarrollo Urbanístico',
    'Otro'
  ]))
  not valid;

-- ============================================================
--  PENDIENTE (NO en esta migración):
--  Cuando el usuario borre los votos de prueba (los que tienen nombres
--  viejos), se puede "sellar" el constraint para que también garantice
--  los datos históricos:
--
--    alter table public.encuestas
--      validate constraint encuestas_tipo_proyecto_check;
--
--  Si quedara alguna fila con nombre viejo, ese VALIDATE fallaría y
--  avisaría qué fila corregir. Hacerlo recién DESPUÉS del borrado.
-- ============================================================
