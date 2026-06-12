-- ============================================================
--  EJEMPLO de carga masiva — empresas CEDU (lista blanca)
--
--  Adaptá las filas de abajo con la lista real de la CEDU.
--  - Un mail por empresa (una empresa = una identidad de votante).
--  - No hace falta poner el email en minúsculas a mano: el trigger
--    `normalizar_empresa_autorizada` lo pasa a minúsculas y le quita
--    espacios automáticamente al insertar.
--  - `activo` queda en true por default; no es necesario listarlo.
--
--  Correr en: Supabase → SQL Editor (después de la migración 0001).
--  Idempotente: si el email ya existe, NO duplica ni pisa
--  (on conflict do nothing). Para reactivar/cambiar nombre, editá
--  la fila a mano (eso es la Fase 4).
-- ============================================================

insert into public.empresas_autorizadas (empresa, email, camara) values
  ('Constructora Ejemplo 1 S.A.',  'contacto@ejemplo1.com',   'CEDU'),
  ('Desarrolladora Ejemplo 2 SRL', 'obras@ejemplo2.com.ar',   'CEDU'),
  ('Grupo Ejemplo 3',              'info@ejemplo3.com',       'CEDU')
on conflict (email) do nothing;

-- Verificación rápida tras la carga:
--   select empresa, email, camara, activo from public.empresas_autorizadas order by empresa;
