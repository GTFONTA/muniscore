-- ============================================================
--  Migración 0013 — DOMINIO B: votos anclados a token opaco
--                   + compuerta "pasamanos ciego"
--
--  Parte de la Opción D (auditoría de privacidad). Separa identidad
--  (Dominio A, CEDU) de votos (Dominio B, este proyecto). Acá, en B,
--  el voto deja de anclarse a `empresa_id` (que apunta al email) y
--  pasa a anclarse a un `voter_token` OPACO que genera y entrega el
--  Dominio A. B nunca ve el email ni el nombre de la empresa.
--
--  PRINCIPIO "pasamanos ciego": la compuerta (Edge Function en A) NO
--  conoce los campos del voto; solo valida al votante, le pone el token
--  y reenvía el resto como un JSON. Por eso la RPC de escritura recibe
--  `p_payload jsonb` (un blob), no un argumento por campo. Así, agregar
--  o quitar preguntas del formulario en el futuro es SOLO Dominio B +
--  frontend, sin tocar el Dominio A (sin depender de la CEDU).
--
--  ESTA MIGRACIÓN ES ADITIVA Y NO ROMPE NADA HOY:
--   - NO borra reseñas (las legacy quedan con voter_token NULL).
--   - NO toca el RPC `votar`/`mi_voto` viejos ni `empresa_id`/`usuario_id`
--     (siguen vivos durante la transición; se retiran cuando el front
--     corte al nuevo camino y la identidad se mude a A — migración aparte).
--   - El recálculo del mapa pasa a agrupar por `voter_token` (con el
--     mismo criterio legacy: cada reseña sin token = su propio "voto").
--
--  Correr en: Supabase → SQL Editor (después de 0001..0012).
--  ⚠️ NO correr todavía si el Dominio A / la compuerta no existen: el
--     camino nuevo de voto recién funciona cuando A puede llamarlo.
-- ============================================================


-- ── 1) Columna voter_token + unicidad por (token, municipio, tipo_obra) ──
-- El token lo genera el Dominio A (texto opaco). B solo lo guarda.
-- Legacy = NULL (NULLS DISTINCT → no colisionan, no se tocan).
alter table public.encuestas
  add column if not exists voter_token text;

comment on column public.encuestas.voter_token is
  'Token opaco del votante (lo genera el Dominio A). Reemplaza a empresa_id como identidad. NULL = legacy.';

-- `usuario_id` era NOT NULL (modelo viejo, voto por auth-user). El voto por
-- token NO lo escribe (B no maneja identidad) → lo hacemos opcional. (Su
-- eliminación definitiva queda para la limpieza posterior, ver el final.)
alter table public.encuestas
  alter column usuario_id drop not null;

create unique index if not exists encuestas_token_municipio_tipoobra_key
  on public.encuestas (voter_token, municipio_id, tipo_obra);


-- ── 2) Secreto compartido con la compuerta ──────────────────
-- La compuerta (en A) prueba que el write viene de ella pasando este
-- secreto. Sin él, aunque alguien tenga la anon key pública de B, no
-- puede escribir votos. RLS activada SIN policies → no sale por REST;
-- solo lo leen las funciones SECURITY DEFINER y el service_role.
create table if not exists public.config_compuerta (
  id       int primary key default 1,
  secreto  text not null,
  check (id = 1)                       -- una sola fila
);

alter table public.config_compuerta enable row level security;

-- Cargá el secreto REAL (uno largo y aleatorio) y poné EXACTAMENTE el
-- mismo en las variables de la Edge Function del Dominio A:
--   insert into public.config_compuerta (id, secreto)
--   values (1, 'PEGAR-ACA-UN-SECRETO-LARGO-Y-ALEATORIO')
--   on conflict (id) do update set secreto = excluded.secreto;


-- ── 3) RPC de escritura: votar_por_token (pasamanos ciego) ──
-- Recibe el secreto, el token y el voto entero como JSON. Extrae los
-- campos del JSON acá (no en la compuerta). UPSERT por (token, municipio,
-- tipo_obra). NO escribe empresa_id ni usuario_id (B no maneja identidad).
--
-- Forma esperada de p_payload (las claves las define el formulario):
--   {
--     "municipio_id": "uuid", "tipo_obra": "slug",
--     "transparencia": num, "velocidad": num, "normativa": num,
--     "impuestos": num, "atencion": num, "previsibilidad": num,
--     "meses": int|null, "velocidad_percibida": int|null,
--     "tasas_porcentaje": num|null, "presion_pagos_informales": bool|null,
--     "respuestas": { ... }|null
--   }
create or replace function public.votar_por_token(
  p_secreto  text,
  p_token    text,
  p_payload  jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ok        boolean;
  v_municipio uuid;
  v_tipo_obra text;
  v_id        uuid;
begin
  -- Barrera: el secreto tiene que coincidir con el guardado en B.
  select (c.secreto = p_secreto) into v_ok
  from public.config_compuerta c where c.id = 1;
  if v_ok is distinct from true then
    raise exception 'no_autorizado';
  end if;

  if p_token is null or p_token = '' then
    raise exception 'token_requerido';
  end if;

  v_municipio := (p_payload ->> 'municipio_id')::uuid;
  v_tipo_obra := p_payload ->> 'tipo_obra';
  if v_municipio is null then
    raise exception 'municipio_requerido';
  end if;
  if v_tipo_obra is null or v_tipo_obra = '' then
    raise exception 'tipo_obra_requerido';
  end if;

  insert into public.encuestas (
    municipio_id, voter_token, tipo_obra,
    puntaje_transparencia, puntaje_velocidad, puntaje_normativa,
    puntaje_impuestos, puntaje_atencion, puntaje_previsibilidad,
    meses_aprobacion, velocidad_percibida, tasas_porcentaje,
    presion_pagos_informales, respuestas, validado
  ) values (
    v_municipio, p_token, v_tipo_obra,
    (p_payload ->> 'transparencia')::numeric,
    (p_payload ->> 'velocidad')::numeric,
    (p_payload ->> 'normativa')::numeric,
    (p_payload ->> 'impuestos')::numeric,
    (p_payload ->> 'atencion')::numeric,
    (p_payload ->> 'previsibilidad')::numeric,
    (p_payload ->> 'meses')::int,
    (p_payload ->> 'velocidad_percibida')::int,
    (p_payload ->> 'tasas_porcentaje')::numeric,
    (p_payload ->> 'presion_pagos_informales')::boolean,
    p_payload -> 'respuestas',
    true
  )
  on conflict (voter_token, municipio_id, tipo_obra) do update set
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

-- La compuerta llama por REST con la anon key pública de B; el secreto
-- es la verdadera barrera. anon sin el secreto recibe 'no_autorizado'.
revoke all     on function public.votar_por_token(text, text, jsonb) from public;
grant  execute on function public.votar_por_token(text, text, jsonb) to anon, authenticated;


-- ── 4) RPC de participación: tokens_que_votaron ─────────────
-- Devuelve SOLO la lista de tokens que tienen al menos un voto. Sin
-- contenido. El panel del Dominio A la cruza con su padrón para mostrar
-- "votó / no votó". La lista es inofensiva incluso si se filtrara: sin
-- el mapa token↔empresa (que vive en A) los tokens no significan nada.
create or replace function public.tokens_que_votaron()
returns table (voter_token text)
language sql
security definer
stable
set search_path = public
as $$
  select distinct e.voter_token
  from public.encuestas e
  where e.voter_token is not null;
$$;

revoke all     on function public.tokens_que_votaron() from public;
grant  execute on function public.tokens_que_votaron() to anon, authenticated;


-- ── 5) Recálculo del mapa: agrupar por voter_token ──────────
-- Igual que 0010 pero la clave de "desarrollador" pasa de empresa_id a
-- voter_token (cada reseña sin token = su propio desarrollador, como antes
-- con empresa_id NULL). Pesos v8 y agregación en 2 niveles, sin cambios.
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
    with por_dev as (
      select
        coalesce(voter_token, 'r:' || id::text) as dev,
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

-- Recalcular todos (no toca encuestas; solo agregados de municipios).
select public.recalcular_puntajes(id) from public.municipios;


-- ============================================================
--  PENDIENTE (migraciones posteriores, cuando A y el front estén listos):
--   - Retirar el camino viejo: DROP de `votar`/`mi_voto`, y mudar a A la
--     whitelist `empresas_autorizadas`, `admins`, `es_admin()` y Auth.
--   - Quitar de B las columnas de identidad ya sin uso: `empresa_id`
--     (+ su FK e índice viejo) y `usuario_id`. Reduce superficie de PII.
--   - Validar por SQL que desde B no se llega a ningún email.
-- ============================================================
