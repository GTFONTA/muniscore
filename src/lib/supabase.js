// ============================================================
//  lib/supabase.js
//  Cliente de Supabase — punto de conexión con la base de datos
//
//  ¿QUÉ HACER ACÁ?
//  1. Crear cuenta en supabase.com
//  2. Crear proyecto nuevo
//  3. Ir a Settings → API → copiar los dos valores de abajo
//  4. Reemplazar los strings que dicen "REEMPLAZAR_CON_TU_..."
// ============================================================

import { createClient } from '@supabase/supabase-js';

// ⚠️ IMPORTANTE: reemplazá estos valores con los de tu proyecto Supabase
// Los encontrás en: supabase.com → Tu Proyecto → Settings → API
const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);


// ============================================================
//  FUNCIONES DE ACCESO A DATOS
//  Cada función hace UNA sola cosa. Si algo falla,
//  devuelve { data: null, error: mensaje_de_error }
// ============================================================

// ── Trae todos los municipios activos con sus puntajes ──────
export async function getMunicipios() {
  const { data, error } = await supabase
    .from('municipios')
    .select('*')
    .eq('activo', true)
    .order('region', { ascending: true })
    .order('nombre', { ascending: true });

  if (error) console.error('Error al cargar municipios:', error.message);
  return { data, error };
}

// ── Trae un municipio específico por su ID ──────────────────
export async function getMunicipio(id) {
  const { data, error } = await supabase
    .from('municipios')
    .select('*')
    .eq('id', id)
    .single();

  if (error) console.error('Error al cargar municipio:', error.message);
  return { data, error };
}

// ── Trae las encuestas de un municipio (sin datos personales) ─
export async function getEncuestasMunicipio(municipioId) {
  const { data, error } = await supabase
    .from('encuestas')
    .select('tipo_proyecto, comentario, created_at')  // Solo campos públicos
    .eq('municipio_id', municipioId)
    .eq('validado', true)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) console.error('Error al cargar encuestas:', error.message);
  return { data, error };
}

// ── Verifica si la EMPRESA ya votó este municipio PARA ESE TIPO ──
// Resuelve el voto por empresa_id (vía RPC mi_voto), no por usuario_id,
// así sigue precargando aunque el voto se haya emitido con un mail
// anterior (herencia). El tipo de obra es parte de la identidad del
// voto en v8: una reseña por (empresa, municipio, tipo_obra).
export async function yaVoto(municipioId, tipoObra = null) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { existe: false, votoId: null, votoActual: null };

  const { data, error } = await supabase.rpc('mi_voto', {
    p_municipio_id: municipioId,
    p_tipo_obra:    tipoObra,
  });
  if (error) {
    console.error('Error al verificar voto:', error.message);
    return { existe: false, votoId: null, votoActual: null };
  }

  // mi_voto devuelve un set (0 ó 1 fila)
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return { existe: false, votoId: null, votoActual: null };

  return {
    existe: true,
    votoId: row.id,
    votoActual: {
      tipoObra:               row.tipo_obra ?? "",
      transparencia:          row.puntaje_transparencia,
      velocidad:              row.puntaje_velocidad,
      normativa:              row.puntaje_normativa,
      impuestos:              row.puntaje_impuestos,
      atencion:               row.puntaje_atencion,
      previsibilidad:         row.puntaje_previsibilidad,
      meses:                  row.meses_aprobacion ?? "",
      velocidadPercibida:     row.velocidad_percibida ?? "",
      tasasPorcentaje:        row.tasas_porcentaje ?? "",
      presionPagosInformales: row.presion_pagos_informales ?? false,
      respuestas:             row.respuestas ?? null,
    }
  };
}

// ── Guardado del voto anclado a la EMPRESA (UPSERT vía RPC) ──
// Toda la resolución mail→empresa_id y la clave única
// (empresa_id, municipio_id) viven en el RPC `votar` (SECURITY
// DEFINER). El cliente no decide insert vs update: el UPSERT lo
// resuelve. Por eso enviarVoto y actualizarVoto delegan en la
// MISMA función (sin duplicar lógica). `votoId` se ignora: la
// identidad es la empresa, no la fila ni el auth user.
async function guardarVotoEmpresa({
  municipioId,
  tipoObra,
  puntajeTransparencia,
  puntajeVelocidad,
  puntajeNormativa,
  puntajeImpuestos,
  puntajeAtencion,
  puntajePrevisibilidad,
  mesesAprobacion,
  velocidadPercibida,
  tasasPorcentaje,
  presionPagosInformales,
  respuestas,
}) {
  const { data, error } = await supabase.rpc('votar', {
    p_municipio_id:             municipioId,
    p_tipo_obra:                tipoObra,
    p_transparencia:            puntajeTransparencia,
    p_velocidad:                puntajeVelocidad,
    p_normativa:                puntajeNormativa,
    p_impuestos:                puntajeImpuestos,
    p_atencion:                 puntajeAtencion,
    p_previsibilidad:           puntajePrevisibilidad,
    p_meses:                    mesesAprobacion ?? null,
    p_velocidad_percibida:      velocidadPercibida ?? null,
    p_tasas_porcentaje:         tasasPorcentaje ?? null,
    p_presion_pagos_informales: presionPagosInformales ?? null,
    p_respuestas:               respuestas ?? null,
  });

  if (error) {
    console.error('Error al guardar voto:', error.message);
    // El RPC lanza 'no_autorizado' / 'no_autenticado' / 'tipo_obra_requerido'
    // como excepción.
    if (error.message && error.message.includes('no_autorizado')) {
      return { data: null, error: 'no_autorizado' };
    }
    return { data: null, error };
  }
  return { data, error: null };
}

// ── Envía el voto (alias hacia el UPSERT por empresa) ────────
export async function enviarVoto(payload) {
  return guardarVotoEmpresa(payload);
}

// ── Actualiza el voto (mismo UPSERT por empresa; votoId ignorado) ──
export async function actualizarVoto(payload) {
  return guardarVotoEmpresa(payload);
}

// ── Autenticación: COMPUERTA + envío de Magic Link ───────────
// ÚNICA función para pedir el Magic Link. La usan los dos modales
// (App.jsx → ModalEncuesta y components/ModalCalificar.jsx).
//
// Antes de enviar el link, verifica contra la lista blanca usando el
// RPC `email_autorizado` (booleano, no expone la lista). Si el mail no
// está habilitado (o no está activo), NO envía el link.
//
// Devuelve:
//   { error: null }            → autorizado, link enviado (flujo de siempre)
//   { error: 'no_autorizado' } → el mail no está en la lista blanca
//   { error: 'envio' }         → fallo técnico (RPC o envío del OTP)
export async function loginConEmail(email) {
  const emailNorm = (email || '').trim().toLowerCase();

  // 1) Compuerta: ¿está habilitado para votar?
  const { data: autorizado, error: rpcError } = await supabase
    .rpc('email_autorizado', { p_email: emailNorm });

  if (rpcError) {
    console.error('Error al verificar autorización:', rpcError.message);
    return { error: 'envio' };
  }
  if (!autorizado) {
    return { error: 'no_autorizado' };
  }

  // 2) Autorizado → flujo de siempre (sin cambios)
  const { error } = await supabase.auth.signInWithOtp({
    email: emailNorm,
    options: {
      emailRedirectTo: window.location.origin,  // Redirige de vuelta a la app
    },
  });

  if (error) {
    console.error('Error al enviar Magic Link:', error.message);
    return { error: 'envio' };
  }
  return { error: null };
}

// ── Obtener el usuario actual ────────────────────────────────
export async function getUsuarioActual() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// ── Cerrar sesión ────────────────────────────────────────────
export async function cerrarSesion() {
  await supabase.auth.signOut();
}

// ── Trae artículos publicados ─────────────────────────────────
export async function getArticulos(limit = 10) {
  const { data, error } = await supabase
    .from('articulos')
    .select('id, titulo, resumen, imagen_url, categoria, destacado, created_at, municipio_id')
    .eq('publicado', true)
    .order('destacado', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) console.error('Error al cargar artículos:', error.message);
  return { data, error };
}

// ── Trae comentarios anónimos de la comunidad ────────────────
// Usa el campo `comentario` de la tabla encuestas (ya existe).
// Opcionalmente filtra por municipio_id.
export async function getComentariosPublicos(municipioId = null, limit = 30) {
  let query = supabase
    .from('encuestas')
    .select('comentario, created_at, tipo_proyecto, municipios(nombre)')
    .not('comentario', 'is', null)
    .eq('validado', true)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (municipioId) {
    query = query.eq('municipio_id', municipioId);
  }

  const { data, error } = await query;
  if (error) console.error('Error al cargar comentarios:', error.message);
  return { data, error };
}

// ── Envía un mensaje de contacto ─────────────────────────────
// Requiere la tabla `contactos` en Supabase. SQL para crearla:
//
//   CREATE TABLE contactos (
//     id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
//     nombre        text NOT NULL,
//     email         text NOT NULL,
//     tipo_consulta text NOT NULL,
//     mensaje       text NOT NULL,
//     created_at    timestamptz DEFAULT now(),
//     leido         boolean DEFAULT false
//   );
//   ALTER TABLE contactos ENABLE ROW LEVEL SECURITY;
//   CREATE POLICY "insertar" ON contactos FOR INSERT WITH CHECK (true);
//   CREATE POLICY "leer admins" ON contactos FOR SELECT USING (auth.role() = 'service_role');
//
export async function enviarContacto({ nombre, email, tipoConsulta, mensaje }) {
  const { data, error } = await supabase
    .from('contactos')
    .insert({ nombre, email, tipo_consulta: tipoConsulta, mensaje });

  if (error) console.error('Error al enviar contacto:', error.message);
  return { data, error };
}

// ── Trae documentos de un municipio ──────────────────────────
export async function getDocumentos(municipioId) {
  const { data, error } = await supabase
    .from('documentos')
    .select('*')
    .eq('municipio_id', municipioId)
    .eq('vigente', true)
    .order('tipo', { ascending: true });

  if (error) console.error('Error al cargar documentos:', error.message);
  return { data, error };
}

// ── Puntajes por municipio para UN tipo de obra (filtro del mapa) ──
// Llama al RPC `puntajes_por_tipo` (SECURITY DEFINER). Devuelve solo
// agregados por municipio (promedios + conteo), nunca contenido por
// reseña. Solo incluye municipios con >= `umbral` reseñas de ese tipo.
export async function getPuntajesPorTipo(tipoObra, umbral = 3) {
  const { data, error } = await supabase.rpc('puntajes_por_tipo', {
    p_tipo_obra: tipoObra,
    p_umbral:    umbral,
  });
  if (error) console.error('Error al cargar puntajes por tipo:', error.message);
  return { data, error };
}

// ── Meses promedio de aprobación por municipio ───────────────
export async function getMesesPromedio() {
  const { data, error } = await supabase
    .from('encuestas')
    .select('municipio_id, meses_aprobacion')
    .not('meses_aprobacion', 'is', null)
    .eq('validado', true);

  if (error || !data) return [];

  const grouped = {};
  data.forEach(({ municipio_id, meses_aprobacion }) => {
    if (!grouped[municipio_id]) grouped[municipio_id] = [];
    grouped[municipio_id].push(meses_aprobacion);
  });

  return Object.entries(grouped)
    .filter(([, vals]) => vals.length >= 3)
    .map(([municipio_id, vals]) => ({
      municipio_id,
      meses_promedio: vals.reduce((a, b) => a + b, 0) / vals.length,
      count: vals.length,
    }));
}
