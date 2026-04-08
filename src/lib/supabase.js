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

// ── Verifica si el usuario ya votó en este municipio ────────
export async function yaVoto(municipioId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { existe: false, votoId: null, votoActual: null };

  const { data } = await supabase
    .from('encuestas')
    .select('id, puntaje_transparencia, puntaje_velocidad, puntaje_normativa, puntaje_impuestos, puntaje_atencion, puntaje_previsibilidad, meses_aprobacion, tipo_proyecto, comentario')
    .eq('municipio_id', municipioId)
    .eq('usuario_id', user.id)
    .maybeSingle();

  if (!data) return { existe: false, votoId: null, votoActual: null };
  return {
    existe: true,
    votoId: data.id,
    votoActual: {
      transparencia:  data.puntaje_transparencia,
      velocidad:      data.puntaje_velocidad,
      normativa:      data.puntaje_normativa,
      impuestos:      data.puntaje_impuestos,
      atencion:       data.puntaje_atencion,
      previsibilidad: data.puntaje_previsibilidad,
      meses:          data.meses_aprobacion ?? "",
      tipo:           data.tipo_proyecto ?? "",
      comentario:     data.comentario ?? "",
    }
  };
}

// ── Envía el voto del usuario ───────────────────────────────
export async function enviarVoto({
  municipioId,
  puntajeTransparencia,
  puntajeVelocidad,
  puntajeNormativa,
  puntajeImpuestos,
  puntajeAtencion,
  puntajePrevisibilidad,
  mesesAprobacion,
  tipoProyecto,
  comentario,
}) {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Debés iniciar sesión para votar.' };
  }

  const { data, error } = await supabase
    .from('encuestas')
    .insert({
      municipio_id:           municipioId,
      usuario_id:             user.id,
      puntaje_transparencia:  puntajeTransparencia,
      puntaje_velocidad:      puntajeVelocidad,
      puntaje_normativa:      puntajeNormativa,
      puntaje_impuestos:      puntajeImpuestos,
      puntaje_atencion:       puntajeAtencion,
      puntaje_previsibilidad: puntajePrevisibilidad,
      meses_aprobacion:       mesesAprobacion || null,
      tipo_proyecto:          tipoProyecto || null,
      comentario:             comentario || null,
      validado:               user.email_confirmed_at ? true : false,
    });

  if (error) console.error('Error al enviar voto:', error.message);
  return { data, error };
}

// ── Actualiza un voto existente del usuario ─────────────────
export async function actualizarVoto({ votoId, puntajeTransparencia, puntajeVelocidad, puntajeNormativa, puntajeImpuestos, puntajeAtencion, puntajePrevisibilidad, mesesAprobacion, tipoProyecto, comentario }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Debés iniciar sesión para votar.' };

  const { data, error } = await supabase
    .from('encuestas')
    .update({
      puntaje_transparencia:  puntajeTransparencia,
      puntaje_velocidad:      puntajeVelocidad,
      puntaje_normativa:      puntajeNormativa,
      puntaje_impuestos:      puntajeImpuestos,
      puntaje_atencion:       puntajeAtencion,
      puntaje_previsibilidad: puntajePrevisibilidad,
      meses_aprobacion:       mesesAprobacion || null,
      tipo_proyecto:          tipoProyecto || null,
      comentario:             comentario || null,
    })
    .eq('id', votoId);

  if (error) console.error('Error al actualizar voto:', error.message);
  return { data, error };
}

// ── Autenticación: iniciar sesión con Magic Link ─────────────
// El usuario recibe un email con un link, sin contraseña
export async function loginConEmail(email) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: window.location.origin,  // Redirige de vuelta a la app
    },
  });

  if (error) console.error('Error al enviar Magic Link:', error.message);
  return { error };
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
