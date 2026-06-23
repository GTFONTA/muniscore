-- ============================================================
--  Migración 0014 — DOMINIO B: limpieza del modelo viejo
--
--  Cierra la Opción D del lado de B: saca TODO lo de identidad que ya
--  vive en el Dominio A. Al terminar, B no contiene ni un solo email.
--
--  ⚠️ DESTRUCTIVA. Borra columnas, tablas, funciones y una vista.
--  Correr SOLO cuando A + la compuerta + el front ya estén andando
--  (validado end-to-end el 2026-06-22). Hace lo siguiente, EN ORDEN:
--
--   1) Retira los objetos que DEPENDEN de las columnas a borrar
--      (una policy por usuario_id; la vista de seguimiento por empresa_id).
--   2) Borra las RPC del modelo viejo (ya no las llama nadie).
--   3) Borra las columnas de identidad de `encuestas`.
--   4) Borra la whitelist, admins y sus funciones (viven en A).
--
--  NO toca: las reseñas (filas), `voter_token`, `votar_por_token`,
--  `tokens_que_votaron`, `config_compuerta`, los triggers/funciones del
--  mapa (`recalcular_puntajes`, `recalcular_puntaje_municipio`) ni la
--  policy pública `comentarios_validados_publicos`.
--
--  Diagnóstico previo (corrido en B) confirmó que NINGUNA función/trigger
--  vivo referencia empresa_id/usuario_id salvo `votar` y `mi_voto` (que se
--  borran acá), así que el recálculo del mapa sigue intacto.
--
--  Correr en: Supabase → SQL Editor (después de 0013).
-- ============================================================


-- ── 1) Objetos que dependen de las columnas a borrar ────────
-- Policy de lectura propia: filtraba por usuario_id (modelo por auth-user).
-- B ya no tiene votantes autenticados (el Auth vive en A) → vestigial.
drop policy if exists encuestas_lectura_propia on public.encuestas;

-- Vista de seguimiento viejo: dependía de encuestas.empresa_id +
-- empresas_autorizadas. Reemplazada por la solapa "Participación" del panel
-- (cruza tokens_que_votaron con el padrón de A).
drop view if exists public.seguimiento_empresas;


-- ── 2) RPC del modelo viejo (sin uso desde el front) ────────
drop function if exists public.votar(uuid,text,numeric,numeric,numeric,numeric,numeric,numeric,int,int,numeric,boolean,jsonb);
drop function if exists public.mi_voto(uuid, text);
drop function if exists public.email_autorizado(text);      -- ahora vive en A
drop function if exists public.puntajes_por_tipo(text, int);-- filtro viejo, sin uso


-- ── 3) Columnas de identidad de `encuestas` ─────────────────
-- empresa_id: borra de paso su FK a empresas_autorizadas y el índice
-- único viejo de 3 columnas (encuestas_empresa_municipio_tipoobra_key).
-- La unicidad la mantiene el índice por voter_token (0013).
alter table public.encuestas drop column if exists empresa_id;
alter table public.encuestas drop column if exists usuario_id;


-- ── 4) Whitelist, admins y sus funciones (todo vive en A) ───
-- empresas_autorizadas se borra DESPUÉS de soltar empresa_id (su FK) y la
-- vista; al caer arrastra su trigger de normalización y sus policies de admin.
drop table    if exists public.empresas_autorizadas cascade;
drop function if exists public.normalizar_empresa_autorizada();

drop table    if exists public.admins cascade;
drop function if exists public.es_admin();


-- ── Refresco final (no toca encuestas; solo agregados de municipios) ──
select public.recalcular_puntajes(id) from public.municipios;

-- ============================================================
--  Resultado: B queda SIN emails, sin whitelist, sin admins y sin las
--  columnas/identidad del modelo viejo. Los votos viven anclados solo a
--  `voter_token` opaco. La privacidad ya no depende de "no mirar": el dato
--  para de-anonimizar directamente NO existe en B.
-- ============================================================
