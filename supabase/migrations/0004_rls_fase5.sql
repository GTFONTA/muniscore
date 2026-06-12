-- ============================================================
--  Migración 0004 — Fase 5: RLS como barrera primaria + privacidad
--
--  Objetivo (2 partes):
--   A) ESCRITURA: que NINGÚN write directo a `encuestas` sea posible
--      vía REST. Todo voto pasa SOLO por el RPC `votar()` (SECURITY
--      DEFINER), que valida la whitelist y ancla a empresa_id.
--      → La restricción queda enforced EN LA BASE, no solo en la UI.
--
--   B) LECTURA: ocultar el vínculo empresa↔voto. RLS filtra FILAS,
--      no COLUMNAS; por eso usamos privilegios a nivel COLUMNA para
--      que el público (anon/authenticated vía REST) solo lea columnas
--      anónimas (sin identidad ni puntajes individuales).
--
--  Correr en: Supabase → SQL Editor (después de 0001, 0002 y 0003).
--
--  NO se toca:
--   - Los puntajes AGREGADOS siguen saliendo de la tabla `municipios`
--     (mantenida por los triggers existentes). No se modifican.
--   - La precarga del propio voto sigue por el RPC `mi_voto`
--     (SECURITY DEFINER, omite estas restricciones).
--   - Los triggers de recálculo y la lógica de puntaje.
-- ============================================================

-- ── A) Cerrar la escritura directa a `encuestas` ────────────
-- Sin policies de INSERT/UPDATE, RLS deniega por defecto cualquier
-- escritura directa vía REST (para cualquier rol). El RPC `votar`
-- es SECURITY DEFINER → omite RLS → sigue funcionando y es el ÚNICO
-- camino de escritura (con validación de whitelist adentro).
drop policy if exists "encuestas_insertar_autenticado"            on public.encuestas;
drop policy if exists "usuarios pueden actualizar su propio voto" on public.encuestas;

-- ── B) Privacidad de lectura: privilegios a nivel columna ───
-- Quitamos el SELECT amplio y concedemos SOLO columnas anónimas.
-- Quedan INACCESIBLES vía REST: id, usuario_id, empresa_id y todos
-- los puntaje_* individuales → no se puede cruzar empresa ↔ voto.
revoke select on public.encuestas from anon, authenticated;

grant select (
  municipio_id,
  tipo_proyecto,
  comentario,
  meses_aprobacion,
  created_at,
  validado
) on public.encuestas to anon, authenticated;

-- ============================================================
--  PENDIENTE (NO en esta migración):
--  Eliminar la constraint redundante `encuestas_municipio_id_usuario_id_key`
--  (modelo viejo "un auth-user, un voto por municipio"), superada por
--  `encuestas_empresa_municipio_key`. Hacerlo DESPUÉS de borrar los
--  votos de prueba (empresa_id = NULL), para evitar artefactos de la
--  transición. Quedará en una migración aparte cuando se confirme.
-- ============================================================
