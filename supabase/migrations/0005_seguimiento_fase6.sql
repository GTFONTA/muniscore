-- ============================================================
--  Migración 0005 — Fase 6: Seguimiento de participación (privado)
--
--  Objetivo: que la CEDU/backoffice pueda ver QUIÉN participó y
--  QUIÉN NO, sin exponer JAMÁS qué votó cada empresa ni la dirección
--  del voto. Solo un booleano `ha_votado` por empresa.
--
--  Principio de privacidad (no negociable):
--   - NUNCA se cruza empresa ↔ contenido/dirección del voto.
--   - Solo se expone: identidad de la empresa + booleano participó/no.
--
--  Acceso (barrera en la base, no solo en UI):
--   - La vista NO se concede a anon ni a authenticated → NO sale por
--     la API REST pública. Solo el `service_role` (SQL Editor /
--     backoffice) puede leerla, igual que la tabla `empresas_autorizadas`.
--
--  Correr en: Supabase → SQL Editor (después de 0001..0004).
--  NO toca datos: solo crea una vista de lectura.
-- ============================================================

-- ── Vista de seguimiento ────────────────────────────────────
-- `ha_votado` se calcula con EXISTS sobre `encuestas` anclado a
-- empresa_id (la identidad estable). No trae ninguna columna de
-- puntaje ni comentario: imposible inferir el contenido del voto.
--
-- Nota sobre votos legacy: las 78 filas de prueba tienen
-- empresa_id = NULL, así que NO matchean ningún ea.id y NO inflan
-- el `ha_votado` de ninguna empresa real. Correcto para el lanzamiento.
create or replace view public.seguimiento_empresas as
select
  ea.id          as empresa_id,
  ea.empresa,
  ea.email,
  ea.camara,
  ea.activo,
  exists (
    select 1
    from public.encuestas e
    where e.empresa_id = ea.id
  ) as ha_votado
from public.empresas_autorizadas ea;

-- ── Cerrar el acceso público a la vista ─────────────────────
-- Por defecto una vista nueva puede heredar privilegios; lo
-- revocamos explícitamente. Solo service_role (que ignora RLS y
-- privilegios) la lee desde el SQL Editor / backoffice.
revoke all on public.seguimiento_empresas from anon, authenticated;

-- ============================================================
--  PROPUESTA (NO implementada acá) — acceso por rol para la CEDU
--
--  Hoy el seguimiento se consulta desde el SQL Editor (service_role).
--  Si en el futuro la CEDU necesita ver esto desde la app/un panel
--  sin usar el SQL Editor, la opción correcta y segura es:
--
--   1) Crear un RPC SECURITY DEFINER `seguimiento()` que devuelva
--      la vista SOLO si el usuario llamante es de la CEDU (p. ej.
--      validando su email contra una whitelist de administradores,
--      o un claim/rol 'admin' en el JWT).
--   2) `grant execute` de ese RPC únicamente a `authenticated`, con
--      el chequeo de rol ADENTRO de la función (raise exception si
--      no es admin).
--
--  Así nunca se concede SELECT directo de la vista a authenticated,
--  y el control de quién ve el seguimiento queda enforced en la base.
--  Se implementará cuando se defina el mecanismo de "admin/CEDU".
-- ============================================================
