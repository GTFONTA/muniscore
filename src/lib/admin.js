// ============================================================
//  lib/admin.js
//  Capa de datos del PANEL DE ADMINISTRACIÓN de la whitelist.
//
//  Es independiente del sitio público: usa su PROPIO cliente de
//  Supabase con un storageKey distinto, así la sesión del admin NO
//  se mezcla con la del votante si ambos usan el mismo navegador.
//
//  Toda la seguridad real vive en la base (migración 0012):
//   - `es_admin()` (RPC) dice si el usuario logueado es administrador.
//   - Las policies RLS solo dejan leer/insertar/editar
//     `empresas_autorizadas` a los admins. Acá NO se decide permiso:
//     si alguien no es admin, la base devuelve vacío / error.
// ============================================================

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Cliente propio del panel (sesión separada del sitio público).
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: { storageKey: 'munilupa-admin', persistSession: true, autoRefreshToken: true },
});

// ── ¿El usuario actual es admin? ─────────────────────────────
async function verificarAdmin() {
  const { data, error } = await supabaseAdmin.rpc('es_admin');
  if (error) {
    console.error('Error al verificar admin:', error.message);
    return false;
  }
  return data === true;
}

// ── Login con email + contraseña ─────────────────────────────
// Devuelve:
//   { error: null }          → logueado Y es admin
//   { error: 'credenciales' }→ email/clave inválidos
//   { error: 'no_admin' }    → credenciales OK pero no es administrador
export async function loginAdmin(email, password) {
  const emailNorm = (email || '').trim().toLowerCase();

  const { error } = await supabaseAdmin.auth.signInWithPassword({
    email: emailNorm,
    password: password || '',
  });
  if (error) {
    console.error('Error de login admin:', error.message);
    return { error: 'credenciales' };
  }

  // Logueó: ahora verificamos que sea admin de verdad (en la base).
  const ok = await verificarAdmin();
  if (!ok) {
    await supabaseAdmin.auth.signOut();
    return { error: 'no_admin' };
  }
  return { error: null };
}

// ── ¿Hay una sesión admin válida ya abierta? ─────────────────
// La usa la página al cargar para no pedir login de nuevo.
export async function sesionAdminActiva() {
  const { data: { user } } = await supabaseAdmin.auth.getUser();
  if (!user) return null;
  const ok = await verificarAdmin();
  if (!ok) {
    await supabaseAdmin.auth.signOut();
    return null;
  }
  return { email: user.email };
}

// ── Cerrar sesión ────────────────────────────────────────────
export async function cerrarSesionAdmin() {
  await supabaseAdmin.auth.signOut();
}

// ── Listar todas las empresas de la whitelist ────────────────
// La RLS solo devuelve filas si el usuario es admin.
export async function listarEmpresas() {
  const { data, error } = await supabaseAdmin
    .from('empresas_autorizadas')
    .select('id, empresa, email, camara, activo, creado_en, actualizado_en')
    .order('empresa', { ascending: true });

  if (error) console.error('Error al listar empresas:', error.message);
  return { data: data || [], error };
}

// ── Crear una empresa nueva ──────────────────────────────────
// El email se normaliza solo (trigger de 0001). Si el mail ya existe,
// la base rechaza por el índice único → devolvemos 'email_duplicado'.
export async function crearEmpresa({ empresa, email, camara }) {
  const { data, error } = await supabaseAdmin
    .from('empresas_autorizadas')
    .insert({ empresa: (empresa || '').trim(), email, camara: (camara || '').trim() || null })
    .select()
    .single();

  if (error) {
    console.error('Error al crear empresa:', error.message);
    if (error.code === '23505') return { data: null, error: 'email_duplicado' };
    return { data: null, error: 'error' };
  }
  return { data, error: null };
}

// ── Editar una empresa existente (nombre / mail / cámara / activo) ──
export async function editarEmpresa(id, { empresa, email, camara, activo }) {
  const cambios = {};
  if (empresa !== undefined) cambios.empresa = (empresa || '').trim();
  if (email  !== undefined) cambios.email  = email;
  if (camara !== undefined) cambios.camara = (camara || '').trim() || null;
  if (activo !== undefined) cambios.activo = !!activo;

  const { data, error } = await supabaseAdmin
    .from('empresas_autorizadas')
    .update(cambios)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error al editar empresa:', error.message);
    if (error.code === '23505') return { data: null, error: 'email_duplicado' };
    return { data: null, error: 'error' };
  }
  return { data, error: null };
}

// ── Atajo: dar de baja / reactivar (baja lógica, nunca borra) ──
export async function setActivo(id, activo) {
  return editarEmpresa(id, { activo });
}
