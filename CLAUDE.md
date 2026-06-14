# CLAUDE.md — Contexto del proyecto Munilupa

> Este archivo se lee automáticamente al inicio de cada sesión. Mantiene el
> contexto clave para no perderlo entre conversaciones. **Actualizar al cerrar
> cada fase.**

---

## 1. Qué es el proyecto

**Munilupa** ("Gestión municipal a la vista") — mapa/ranking que muestra en qué
municipios del AMBA es más fácil o difícil construir, según evaluaciones de
empresas constructoras. Lanzamiento previsto en la **CEDU** (cámara).

**Stack real (OJO, no es Next.js):**
- React 19 + Vite 8 (SPA, sin servidor propio — la anon key vive en el cliente)
- Supabase: Auth (magic link / `signInWithOtp`), Postgres, RLS, RPCs `SECURITY DEFINER`, triggers
- Deploy previsto: Vercel (pendiente, al final)

**Proyecto Supabase:** `muniscore` (ref `fdvoiaoobjtsvkzpobyq`), org "GTFONTA's Org" (plan Free), branch `main` = PRODUCTION.

---

## 2. Objetivo general (la feature en curso)

Convertir Munilupa de **voto abierto** (cualquiera con email + magic link) a un
sistema de **lista blanca** (solo empresas autorizadas votan). Plan multi-fase.

### Decisión de diseño CENTRAL (respetar a rajatabla)
La identidad del votante es la **EMPRESA** (un `empresa_id` estable), **NO el email**.
El email es solo la credencial actual de la empresa y puede cambiar. Los votos se
guardan anclados a `empresa_id`, nunca al email ni al auth user. Esto garantiza:
(a) "una empresa, un voto por municipio"; (b) el voto sobrevive a cambios de mail;
(c) seguimiento de participación sin exponer el contenido del voto.

### Principio de seguridad/privacidad (no negociable)
La restricción de voto se enforcea **EN LA BASE (RLS)**, no solo en la UI. El
seguimiento de participación expone SOLO un booleano "votó / no votó" por empresa.
NUNCA una vista que cruce empresa con el contenido/dirección del voto.

---

## 3. Restricciones NO NEGOCIABLES (verbatim del usuario)

- NO modificar las fórmulas de puntaje, los pesos ni las afirmaciones.
- NO cambiar colores, tipografía ni estilos existentes.
- NO refactorizar código no relacionado con esta feature.
- Cambios pequeños e incrementales.
- Si algo es ambiguo, **preguntar antes de asumir**.
- Al terminar cada fase, **mostrar qué archivos se tocaron y esperar OK** antes de seguir.
- **NO borrar ni alterar votos.** Las 78 evaluaciones son de prueba (cargadas por el
  equipo); el usuario las borrará MANUALMENTE antes del lanzamiento. No tocarlas.

---

## 4. Estado de las fases

| Fase | Descripción | Estado |
|---|---|---|
| 0 | Diagnóstico (sin cambios) | ✅ |
| 1 | Tabla `empresas_autorizadas` | ✅ |
| 2 | Gate antes del magic link (verifica whitelist) | ✅ |
| 3 | Votos anclados a `empresa_id` (UPSERT vía RPC) | ✅ |
| 4 | Herencia ante cambio de mail | ✅ (validada por SQL) |
| 5 | RLS barrera primaria + privacidad de lectura | ✅ |
| 6 | Vista `seguimiento_empresas` (votó/no votó) | ✅ (validada por SQL) |

### Feature en curso: Segmentación por tipo de obra + Puntaje v8
> Spec: `PROMPT_TIPO_OBRA_Y_PUNTAJE_V8.md` (rama `feature/tipo-obra-puntaje-v8`).
> Decisiones confirmadas: (1) afirmaciones en JSONB `respuestas`; (2) derivar velocidad
> legacy desde meses (3m=5;3-6=4;6-9=3;9-12=2;12+=1) en Fase 4; (3) `tipo_obra` slug nuevo,
> `tipo_proyecto` legacy se mantiene; (4) unique `(empresa_id, municipio_id, tipo_obra)`;
> (5) ya se quitaron comentarios del form + subpágina Reseñas + pestaña Opiniones (commit aparte).

| Fase v8 | Descripción | Estado |
|---|---|---|
| 0 | Diagnóstico (tabla, trigger, form, afirmaciones inexistentes hoy) | ✅ |
| 1 | DB: columnas `tipo_obra`/`velocidad_percibida`/`tasas_porcentaje`/`presion_pagos_informales`/`respuestas` + índice único 3-cols (0008) | ✅ (corrida en Supabase) |
| 2 | Catálogo central v8 (`src/lib/puntajeV8.js`: pesos, fórmulas, afirmaciones textuales) | ✅ |
| 3 | Formulario (tipo_obra 1er paso, afirmaciones desde config, crítica, velocidad percibida+cuadro, tasas) + swap del índice/RPC `votar` (0009) | ✅ |
| 4 | Recálculo v8 por reseña + trigger agregación 2 niveles + filtro de mapa por tipo (UMBRAL_MIN_RESEÑAS=3, vía RPC/vista SECURITY DEFINER) | ⬜ |

**Pesos v8:** Transparencia 25%, Velocidad 25%, Normativa 10%, Previsibilidad 15%,
Atención 10%, Tasas 15%. (Velocidad y Tasas: 60% cuantitativo + 40% cuestionario.)

---

## 5. Archivos clave

**Frontend:**
- `src/lib/supabase.js` — capa de datos. Funciones clave:
  - `loginConEmail(email)` — **gate centralizado**: verifica whitelist vía RPC
    `email_autorizado` y solo entonces manda el magic link. Lo usan App.jsx y ModalCalificar.
    Devuelve `{error:null}` | `{error:'no_autorizado'}` | `{error:'envio'}`.
  - `yaVoto(municipioId, tipoObra=null)` — usa RPC `mi_voto(p_municipio_id, p_tipo_obra)`
    (resuelve por empresa_id + tipo_obra). Devuelve `votoActual` con los campos v8
    (respuestas, presionPagosInformales, velocidadPercibida, tasasPorcentaje, meses).
  - `guardarVotoEmpresa(payload)` (interno) — llama RPC `votar` con la firma v8 (tipo_obra
    + puntajes numeric + meses/velocidad_percibida/tasas/presion/respuestas). `enviarVoto` y
    `actualizarVoto` delegan ambos acá (votoId se ignora; la identidad es la empresa).
- `src/lib/puntajeV8.js` — **fuente única** del v8: `TIPOS_OBRA`, `CATEGORIAS`, `PESOS`,
  `AFIRMACIONES` (texto exacto), `AFIRMACION_CRITICA`, cuadros de velocidad, textos
  obligatorios y fórmulas puras (`puntajeReseña`, etc.). El form lee de acá; NO duplicar.
- `src/App.jsx` — login + form de voto v8 (`ModalEncuesta`): paso 1 = tipo_obra (obligatorio,
  define la identidad del voto), luego las 6 categorías con afirmaciones-checkbox, afirmación
  crítica al final de Transparencia, bloque cuantitativo de Velocidad (meses estadístico +
  velocidad_percibida 1-5 + cuadro orientativo) y de Tasas (% sobre costo directo). El cliente
  calcula los puntajes por categoría con `puntajeReseña` y guarda también los insumos crudos.
  ⚠️ `PREGUNTAS`/`CatBar`/Metodología (panel detalle e índice) siguen con pesos VIEJOS: se
  ajustan en Fase 4. Obligatorios para enviar: tipo_obra + velocidad_percibida + % de tasas.
- `src/components/ModalCalificar.jsx` — usa el gate centralizado `loginConEmail`.

**Migraciones SQL (correr en Supabase SQL Editor, en orden):**
- `supabase/migrations/0001_empresas_autorizadas.sql` — tabla whitelist + trigger de
  normalización (email lower+trim) + RLS activado SIN policies (tabla bloqueada).
- `supabase/migrations/0002_email_autorizado_rpc.sql` — RPC `email_autorizado(text)→bool`
  (SECURITY DEFINER, devuelve solo booleano, no expone la lista).
- `supabase/migrations/0003_votos_por_empresa.sql` — columna `empresa_id` en encuestas,
  unique index `encuestas_empresa_municipio_key (empresa_id, municipio_id)`, RPC `votar`
  (UPSERT anclado a empresa, SECURITY DEFINER, valida whitelist) y RPC `mi_voto`.
- `supabase/migrations/0004_rls_fase5.sql` — dropea policies de INSERT/UPDATE directas;
  privilegios a nivel columna (anon/authenticated solo leen columnas anónimas).
- `supabase/migrations/0005_seguimiento_fase6.sql` — vista `seguimiento_empresas`
  (booleano `ha_votado` por empresa) + `revoke` a anon/authenticated. Propone (no implementa)
  un RPC SECURITY DEFINER con chequeo de rol admin para acceso desde la app.
- `supabase/migrations/0006_tipos_obra.sql` — renombra los tipos de obra (coherencia
  form ↔ DB); reemplaza el CHECK `encuestas_tipo_proyecto_check` con los 6 nombres nuevos,
  agregado `NOT VALID` para no tocar votos legacy. Arregla el bug de 'Barrio Privado'.
- `supabase/migrations/0007_drop_constraint_viejo.sql` — elimina el constraint redundante
  `encuestas_municipio_id_usuario_id_key` (modelo viejo por auth-user) que bloqueaba el voto
  real. No borra votos; la unicidad la mantiene `encuestas_empresa_municipio_key`.
- `supabase/migrations/0008_tipo_obra_puntaje_v8.sql` — **Fase 1 del v8**. Agrega (aditivo,
  sin tocar reseñas): `tipo_obra` (text, CHECK 6 slugs o NULL), `velocidad_percibida`
  (smallint CHECK 1-5), `tasas_porcentaje` (numeric ≥0), `presion_pagos_informales`
  (boolean, afirmación crítica), `respuestas` (jsonb), e índice único
  `encuestas_empresa_municipio_tipoobra_key (empresa_id, municipio_id, tipo_obra)`.
  NO borra el índice viejo de 2 cols ni toca el RPC `votar` (eso va en Fase 3).
- `supabase/migrations/0009_votar_por_tipo_obra.sql` — **Fase 3 del v8** (el "swap"):
  (1) `puntaje_*` → `numeric` (los puntajes v8 son fraccionarios, no se pueden truncar);
  (2) DROP del índice viejo `encuestas_empresa_municipio_key` (2 cols); la unicidad la da
  ahora el de 3 cols de 0008; (3) reescribe `votar` con firma v8 (recibe `p_tipo_obra` + los
  campos nuevos, `ON CONFLICT (empresa_id, municipio_id, tipo_obra)`, ya NO escribe
  `tipo_proyecto`/`comentario`; lanza `tipo_obra_requerido` si viene NULL); (4) reescribe
  `mi_voto(p_municipio_id, p_tipo_obra)` para filtrar por tipo y devolver los campos v8.
  No borra reseñas; las legacy quedan con `tipo_obra` NULL.
- `supabase/seed/empresas_cedu_ejemplo.sql` — ejemplo de carga masiva (on conflict do nothing).

---

## 6. Objetos de base de datos (estado actual)

**Tablas:** `municipios` (con columnas agregadas `total_votos`, `puntaje_global`
mantenidas por triggers), `encuestas` (votos), `empresas_autorizadas` (whitelist),
`articulos`, `contactos`, `documentos`.

**RLS en `encuestas` (tras Fase 5):**
- Policies de escritura (INSERT/UPDATE): **eliminadas**. Todo write pasa SOLO por el
  RPC `votar` (SECURITY DEFINER, omite RLS).
- Policies de lectura que quedan: `comentarios_validados_publicos` (anon, filas
  validadas+con comentario) y `encuestas_lectura_propia` (authenticated, filas propias).
- Privilegios columna: anon/authenticated SOLO pueden leer
  `municipio_id, tipo_proyecto, comentario, meses_aprobacion, created_at, validado`.
  `empresa_id`, `usuario_id` y los `puntaje_*` quedan inaccesibles vía REST.

**Vistas (tras Fase 6):** `seguimiento_empresas` — una fila por empresa de la whitelist
con booleano `ha_votado` (vía `EXISTS` sobre `encuestas.empresa_id = ea.id`). Expone SOLO
`empresa_id, empresa, email, camara, activo, ha_votado` — NUNCA contenido del voto.
`revoke all from anon, authenticated` → no sale por REST; solo `service_role` (SQL Editor)
la lee. Los votos legacy (empresa_id NULL) no matchean ninguna empresa real.

**RPCs (todas SECURITY DEFINER):** `email_autorizado(text)`,
`votar(uuid, text, numeric×6, int, int, numeric, boolean, jsonb)` (firma v8 tras 0009),
`mi_voto(uuid, text)` (firma v8 tras 0009).
- En `mi_voto` y `votar`, resolver la empresa con alias de tabla
  (`select ea.id ... from empresas_autorizadas ea`) para evitar `column "id" is ambiguous`.
- `votar` (v8): `ON CONFLICT (empresa_id, municipio_id, tipo_obra)`; lanza `tipo_obra_requerido`
  si `p_tipo_obra` es NULL/''. Ya NO escribe `tipo_proyecto` ni `comentario`.
- `puntaje_*` en `encuestas` son `numeric` desde 0009 (puntajes v8 fraccionarios).

**Triggers en `encuestas`:** `after_encuesta_insert` / `trigger_recalcular_puntaje`
(recomputan agregados de `municipios` desde cero en INSERT OR UPDATE → UPSERT-safe,
sin doble conteo).

**Columnas v8 en `encuestas` (tras 0008):** `tipo_obra` (slug, NULL=legacy),
`velocidad_percibida` (1-5), `tasas_porcentaje` (numeric), `presion_pagos_informales`
(boolean crítico), `respuestas` (jsonb con afirmaciones tildadas). Todas NULL en legacy.
`meses_aprobacion` se reusa como "meses hasta permiso" (estadístico en v8). `tipo_proyecto`
(label legacy de 0006) queda intacto y SEPARADO de `tipo_obra` (slug).

**Constraints relevantes:**
- ~~`encuestas_empresa_municipio_key (empresa_id, municipio_id)` UNIQUE~~ —
  **ELIMINADO en 0009** (el "swap"). La unicidad la da ahora el índice de 3 cols.
- `encuestas_empresa_municipio_tipoobra_key (empresa_id, municipio_id, tipo_obra)` UNIQUE
  (tras 0008) — "un voto por tipo de obra". Es el ON CONFLICT del RPC `votar` desde 0009.
  NULLS DISTINCT: legacy (tipo_obra NULL) no colisiona.
- `encuestas_tipo_obra_check` (tras 0008) — acepta los 6 SLUGS o NULL: 'vivienda_unifamiliar',
  'vivienda_multifamiliar','industrial_logistico','comercial_servicios',
  'desarrollo_urbanistico','otro'.
- ~~`encuestas_municipio_id_usuario_id_key (municipio_id, usuario_id)` UNIQUE~~ —
  **ELIMINADA en 0007** (era del modelo viejo por auth-user; bloqueaba el voto real
  cuando el mismo usuario ya tenía un voto previo en el municipio). El drop no borró votos.
- `encuestas_tipo_proyecto_check` (tras 0006) — acepta: 'Vivienda Unifamiliar',
  'Vivienda Multifamiliar','Industrial y Logístico','Comercial y Servicios',
  'Desarrollo Urbanístico','Otro' (+ NULL). Agregado `NOT VALID`: aplica a votos nuevos/
  editados, no escanea filas legacy (nombres viejos). Tras borrar votos de prueba, correr
  `validate constraint`. El `<select>` (App.jsx ~485) ya ofrece exactamente estos 6 valores.
  [HISTÓRICO] Antes de 0006 aceptaba 'Casa unifamiliar','Edificio','Industrial','Comercial',
  'Otro' y el form ofrecía además 'Barrio Privado/Club de campo' (rechazado por la DB).

---

## 7. Datos/identidades clave (para tests)

- **Mail A (real, del usuario):** `gf@zanara.ar` → empresa **"Zanara SA"**,
  `empresa_id = 59280cef-e967-4b5a-a850-f8df0f1abbd6`, activo=true.
- **Mail B (para tests de herencia):** `gtf_@hotmail.com` (NO está como fila separada en
  la whitelist; usado solo para simular cambio de mail).
- Voto de prueba creado en Fase 3/4: La Plata, anclado a empresa 59280cef.
- **78 evaluaciones** de prueba en `encuestas` (la anon key solo veía 8 por RLS:
  filtra `validado AND comentario IS NOT NULL`). NO BORRAR (lo hace el usuario).

---

## 8. Email / SMTP

- Configurado **Resend como SMTP propio** en Supabase (Auth → Emails → SMTP Settings):
  host `smtp.resend.com`, port 465, user `resend`, password = API key Resend,
  sender `no-reply@zanara.ar`, sender name "Munilupa".
- Rate limit de emails subido a 50/h.
- ✅ **Dominio `zanara.ar` VERIFICADO en Resend** (región sa-east-1 / São Paulo). DNS en
  InMotion Hosting (cPanel Zone Editor). Registros agregados en subdominios para NO tocar
  el correo Google Workspace de la empresa: TXT `resend._domainkey` (DKIM), MX `send`
  (`feedback-smtp.sa-east-1.amazonses.com`), TXT `send` (SPF `v=spf1 include:amazonses.com ~all`).
  Los MX de la raíz `zanara.ar` (Google) quedaron intactos. Ya envía a CUALQUIER dominio
  (probado OK con un mail externo).
- ✅ **API key de Resend regenerada** (la vieja, expuesta en una captura, fue borrada).
  La nueva (permiso "Sending access") está cargada en el campo Password de Supabase SMTP.

---

## 9. Pendientes

- (Fase 6 futura, cuando se defina "admin/CEDU") Implementar RPC SECURITY DEFINER
  `seguimiento()` con chequeo de rol admin adentro, para ver el seguimiento desde la app
  sin dar SELECT directo de la vista a authenticated. Queda propuesto en 0005.
- Tras borrar votos de prueba: `alter table encuestas validate constraint encuestas_tipo_proyecto_check;`
  (sella el CHECK nuevo de tipos para datos históricos; ver 0006).
- Deploy a Vercel (al final): env vars `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`,
  redirect URLs en Supabase, SMTP.
- (Opcional) Proponer tabla `historial_mails` para auditar cambios de email.
- (Observación, fuera de scope) Con un solo client, tras login las lecturas públicas
  corren como `authenticated` → el feed público muestra solo filas propias. Limitación
  preexistente; evaluar si conviene ampliar la policy de lectura a authenticated.

---

## 10. Cómo trabajar en este repo

- El usuario NO es programador: necesita **guía paso a paso** ("qué abro, qué aprieto,
  qué escribo y dónde"), sobre todo en Supabase.
- El usuario corre el SQL manualmente en **Supabase → SQL Editor** y pega resultados/capturas.
- Tests de RLS por rol: usar `SET ROLE anon|authenticated; ... ; RESET ROLE;` en SQL Editor
  (más confiable que la consola del browser).
- Mostrar el SQL/código ANTES de que lo aplique; esperar su OK entre fases.
- Idioma: español (rioplatense).
