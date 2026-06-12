-- ============================================================
--  Migración 0007 — Eliminar constraint viejo (modelo por auth-user)
--
--  `encuestas_municipio_id_usuario_id_key (municipio_id, usuario_id)`
--  es del modelo ABANDONADO "un auth-user, un voto por municipio".
--  Contradice el modelo nuevo "una empresa, un voto por municipio"
--  (+ herencia ante cambio de mail) y bloquea el voto real cuando el
--  mismo usuario ya tenía un voto previo (incluido un voto de prueba
--  legacy con empresa_id = NULL) en ese municipio.
--
--  ⚠️ NO borra ni altera votos: solo quita una regla de unicidad
--  redundante. La unicidad correcta la garantiza
--  `encuestas_empresa_municipio_key (empresa_id, municipio_id)` (0003).
--
--  Nota: se adelanta respecto del plan original (que lo dejaba para
--  después de borrar los votos de prueba) porque estaba bloqueando el
--  testeo del flujo real. Efecto transitorio: mientras existan los
--  votos de prueba, un municipio re-votado puede tener 2 filas (la
--  legacy con empresa NULL + la real); desaparece al borrar las pruebas
--  (el trigger de agregados recalcula desde cero).
--
--  Correr en: Supabase → SQL Editor (después de 0001..0006).
-- ============================================================

alter table public.encuestas
  drop constraint if exists encuestas_municipio_id_usuario_id_key;
