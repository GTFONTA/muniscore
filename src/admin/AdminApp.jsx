// ============================================================
//  admin/AdminApp.jsx
//  Panel de administración de la whitelist (página /admin.html).
//  Aislado del sitio público: bundle y estilos propios.
//
//  Flujo: si no hay sesión admin → pantalla de login (email+clave).
//  Con sesión admin → tabla de empresas con alta, edición, baja
//  lógica (activo/inactivo), buscador y alerta de duplicados.
//
//  La seguridad real está en la base (RLS de 0012): si quien entra
//  no es admin, no ve ni puede tocar ninguna fila.
// ============================================================

import { useState, useEffect, useMemo } from 'react';
import {
  loginAdmin, sesionAdminActiva, cerrarSesionAdmin,
  listarEmpresas, crearEmpresa, editarEmpresa, setActivo,
} from '../lib/admin.js';

// Paleta consistente con el sitio (sin importar nada del sitio público).
const T = {
  bg: '#FFFFFF', bgWarm: '#FAF7F4', bgMuted: '#F1ECE7',
  border: '#E8E4DF', borderMid: '#D8D2CB',
  text: '#1A1A1A', textMid: '#5A524B', textLight: '#A09890',
  orange: '#E8612A', orangeSoft: '#FDEFE8',
  green: '#007A70', greenSoft: '#E6F2F0',
  red: '#C0392B', redSoft: '#FBEAE8',
  blue: '#2E5A8F', blueSoft: '#EAF1F9',
  radius: 12, radiusSm: 8,
};

const FONT = "'Manrope', system-ui, -apple-system, Segoe UI, Roboto, sans-serif";

const inputStyle = (ok = false) => ({
  width: '100%', padding: '10px 12px', borderRadius: T.radiusSm,
  border: `1.5px solid ${ok ? T.orange : T.border}`,
  background: ok ? T.orangeSoft : T.bg, color: T.text,
  fontSize: 14, fontFamily: FONT, outline: 'none', boxSizing: 'border-box',
});

const btnPrimary = (disabled = false) => ({
  padding: '10px 18px', borderRadius: T.radiusSm, border: 'none',
  background: disabled ? T.bgMuted : T.orange, color: disabled ? T.textLight : '#fff',
  fontWeight: 700, fontSize: 14, fontFamily: FONT,
  cursor: disabled ? 'default' : 'pointer',
});

const btnGhost = {
  padding: '8px 14px', borderRadius: T.radiusSm, background: 'transparent',
  border: `1.5px solid ${T.border}`, color: T.textMid, fontWeight: 600,
  fontSize: 13, fontFamily: FONT, cursor: 'pointer',
};

const emailValido = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((e || '').trim());

// ──────────────────────────────────────────────────────────────
//  Pantalla de login
// ──────────────────────────────────────────────────────────────
function Login({ onOk }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  const enviar = async (e) => {
    e?.preventDefault();
    setError(null); setCargando(true);
    const { error } = await loginAdmin(email, password);
    setCargando(false);
    if (error === 'credenciales') { setError('Email o contraseña incorrectos.'); return; }
    if (error === 'no_admin')    { setError('Este usuario no tiene permisos de administración.'); return; }
    if (error)                   { setError('No se pudo iniciar sesión. Probá de nuevo.'); return; }
    onOk(email.trim().toLowerCase());
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.bgWarm, fontFamily: FONT, padding: 20 }}>
      <form onSubmit={enviar} style={{ width: '100%', maxWidth: 380, background: T.bg, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: '32px 28px', boxShadow: '0 8px 32px rgba(0,0,0,0.06)' }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 22, color: T.text }}>
          Muni<span style={{ color: T.orange }}>lupa</span>
        </h1>
        <p style={{ margin: '0 0 24px', fontSize: 13, color: T.textLight }}>Panel de administración · whitelist</p>

        {error && (
          <div style={{ padding: '10px 12px', borderRadius: T.radiusSm, background: T.redSoft, border: `1px solid ${T.red}33`, color: T.red, fontSize: 13, marginBottom: 16 }}>{error}</div>
        )}

        <label style={{ display: 'block', fontSize: 12, color: T.textMid, fontWeight: 600, marginBottom: 6 }}>Email</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" style={{ ...inputStyle(), marginBottom: 16 }} autoComplete="username" />

        <label style={{ display: 'block', fontSize: 12, color: T.textMid, fontWeight: 600, marginBottom: 6 }}>Contraseña</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" style={{ ...inputStyle(), marginBottom: 24 }} autoComplete="current-password" />

        <button type="submit" disabled={cargando || !email || !password} style={{ ...btnPrimary(cargando || !email || !password), width: '100%' }}>
          {cargando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
//  Tabla / panel principal
// ──────────────────────────────────────────────────────────────
function Panel({ adminEmail, onSalir }) {
  const [empresas, setEmpresas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [aviso, setAviso] = useState(null);   // { tipo:'ok'|'error', texto }

  // Alta
  const [nuevo, setNuevo] = useState({ empresa: '', email: '', camara: '' });
  const [guardandoNuevo, setGuardandoNuevo] = useState(false);

  // Edición inline
  const [editId, setEditId] = useState(null);
  const [editVals, setEditVals] = useState({ empresa: '', email: '', camara: '' });
  const [guardandoEdit, setGuardandoEdit] = useState(false);

  const cargar = async () => {
    setCargando(true);
    const { data } = await listarEmpresas();
    setEmpresas(data);
    setCargando(false);
  };
  useEffect(() => { cargar(); }, []);

  const flash = (tipo, texto) => { setAviso({ tipo, texto }); setTimeout(() => setAviso(null), 4000); };

  // Duplicados (mismo mail o mismo nombre)
  const dups = useMemo(() => {
    const mails = {}, nombres = {};
    empresas.forEach(e => {
      const m = (e.email || '').toLowerCase().trim();
      const n = (e.empresa || '').toLowerCase().trim();
      if (m) mails[m] = (mails[m] || 0) + 1;
      if (n) nombres[n] = (nombres[n] || 0) + 1;
    });
    const mailDup = new Set(Object.keys(mails).filter(k => mails[k] > 1));
    const nomDup  = new Set(Object.keys(nombres).filter(k => nombres[k] > 1));
    return { mailDup, nomDup, hay: mailDup.size > 0 || nomDup.size > 0 };
  }, [empresas]);

  const filtradas = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    if (!q) return empresas;
    return empresas.filter(e =>
      (e.empresa || '').toLowerCase().includes(q) ||
      (e.email || '').toLowerCase().includes(q) ||
      (e.camara || '').toLowerCase().includes(q));
  }, [empresas, busqueda]);

  const totalActivas = empresas.filter(e => e.activo).length;

  // ── Acciones ──
  const agregar = async () => {
    if (!nuevo.empresa.trim() || !emailValido(nuevo.email)) {
      flash('error', 'Completá el nombre y un email válido.'); return;
    }
    setGuardandoNuevo(true);
    const { error } = await crearEmpresa(nuevo);
    setGuardandoNuevo(false);
    if (error === 'email_duplicado') { flash('error', 'Ese email ya está cargado.'); return; }
    if (error) { flash('error', 'No se pudo agregar. Probá de nuevo.'); return; }
    setNuevo({ empresa: '', email: '', camara: '' });
    flash('ok', 'Empresa agregada.');
    cargar();
  };

  const empezarEdicion = (e) => {
    setEditId(e.id);
    setEditVals({ empresa: e.empresa || '', email: e.email || '', camara: e.camara || '' });
  };

  const guardarEdicion = async (id) => {
    if (!editVals.empresa.trim() || !emailValido(editVals.email)) {
      flash('error', 'Completá el nombre y un email válido.'); return;
    }
    setGuardandoEdit(true);
    const { error } = await editarEmpresa(id, editVals);
    setGuardandoEdit(false);
    if (error === 'email_duplicado') { flash('error', 'Ese email ya está cargado en otra empresa.'); return; }
    if (error) { flash('error', 'No se pudo guardar. Probá de nuevo.'); return; }
    setEditId(null);
    flash('ok', 'Cambios guardados.');
    cargar();
  };

  const cambiarActivo = async (e) => {
    const { error } = await setActivo(e.id, !e.activo);
    if (error) { flash('error', 'No se pudo cambiar el estado.'); return; }
    setEmpresas(prev => prev.map(x => x.id === e.id ? { ...x, activo: !e.activo } : x));
  };

  const th = { textAlign: 'left', padding: '10px 12px', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: T.textLight, fontWeight: 700, borderBottom: `1px solid ${T.border}` };
  const td = { padding: '10px 12px', fontSize: 14, color: T.text, borderBottom: `1px solid ${T.border}`, verticalAlign: 'middle' };

  return (
    <div style={{ minHeight: '100vh', background: T.bgWarm, fontFamily: FONT }}>
      {/* Barra superior */}
      <header style={{ background: T.bg, borderBottom: `1px solid ${T.border}`, padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <strong style={{ fontSize: 18, color: T.text }}>Muni<span style={{ color: T.orange }}>lupa</span></strong>
          <span style={{ fontSize: 13, color: T.textLight, marginLeft: 10 }}>· Administración de empresas</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 13, color: T.textMid }}>{adminEmail}</span>
          <button onClick={onSalir} style={btnGhost}>Salir</button>
        </div>
      </header>

      <main style={{ maxWidth: 1000, margin: '0 auto', padding: '28px 24px 60px' }}>
        {aviso && (
          <div style={{ padding: '10px 14px', borderRadius: T.radiusSm, marginBottom: 18, fontSize: 13,
            background: aviso.tipo === 'ok' ? T.greenSoft : T.redSoft,
            color: aviso.tipo === 'ok' ? T.green : T.red,
            border: `1px solid ${(aviso.tipo === 'ok' ? T.green : T.red)}33` }}>
            {aviso.texto}
          </div>
        )}

        {/* Alta */}
        <section style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: 20, marginBottom: 24 }}>
          <h2 style={{ margin: '0 0 14px', fontSize: 15, color: T.text }}>Agregar empresa</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.4fr 0.8fr auto', gap: 10, alignItems: 'center' }}>
            <input placeholder="Nombre de la empresa" value={nuevo.empresa} onChange={e => setNuevo({ ...nuevo, empresa: e.target.value })} style={inputStyle(!!nuevo.empresa.trim())} />
            <input placeholder="email@empresa.com" value={nuevo.email} onChange={e => setNuevo({ ...nuevo, email: e.target.value })} style={inputStyle(emailValido(nuevo.email))} />
            <input placeholder="Cámara (ej. CEDU)" value={nuevo.camara} onChange={e => setNuevo({ ...nuevo, camara: e.target.value })} style={inputStyle()} />
            <button onClick={agregar} disabled={guardandoNuevo} style={btnPrimary(guardandoNuevo)}>{guardandoNuevo ? 'Agregando…' : 'Agregar'}</button>
          </div>
        </section>

        {/* Alerta de duplicados */}
        {dups.hay && (
          <div style={{ padding: '12px 14px', borderRadius: T.radiusSm, marginBottom: 18, fontSize: 13, background: T.blueSoft, color: T.blue, border: `1px solid ${T.blue}33` }}>
            ⚠️ Hay posibles duplicados (mismo email o mismo nombre). Están marcados en la tabla — revisalos y editá o dá de baja el que sobre.
          </div>
        )}

        {/* Buscador + conteo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
          <input placeholder="🔍 Buscar por nombre, email o cámara…" value={busqueda} onChange={e => setBusqueda(e.target.value)} style={{ ...inputStyle(), maxWidth: 360 }} />
          <span style={{ fontSize: 13, color: T.textLight }}>{totalActivas} activas · {empresas.length} en total</span>
        </div>

        {/* Tabla */}
        <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: T.radius, overflow: 'hidden' }}>
          {cargando ? (
            <div style={{ padding: 40, textAlign: 'center', color: T.textLight, fontSize: 14 }}>Cargando…</div>
          ) : filtradas.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: T.textLight, fontSize: 14 }}>
              {empresas.length === 0 ? 'Todavía no hay empresas cargadas.' : 'Sin resultados para esa búsqueda.'}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={th}>Empresa</th>
                  <th style={th}>Email</th>
                  <th style={th}>Cámara</th>
                  <th style={th}>Estado</th>
                  <th style={{ ...th, textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map(e => {
                  const editando = editId === e.id;
                  const mailMarcado = dups.mailDup.has((e.email || '').toLowerCase().trim());
                  const nomMarcado  = dups.nomDup.has((e.empresa || '').toLowerCase().trim());
                  return (
                    <tr key={e.id} style={{ background: e.activo ? T.bg : T.bgMuted }}>
                      <td style={td}>
                        {editando
                          ? <input value={editVals.empresa} onChange={ev => setEditVals({ ...editVals, empresa: ev.target.value })} style={inputStyle(!!editVals.empresa.trim())} />
                          : <span style={{ fontWeight: 600 }}>{e.empresa}{nomMarcado && <span title="Nombre repetido" style={{ color: T.blue, marginLeft: 6 }}>⚠️</span>}</span>}
                      </td>
                      <td style={td}>
                        {editando
                          ? <input value={editVals.email} onChange={ev => setEditVals({ ...editVals, email: ev.target.value })} style={inputStyle(emailValido(editVals.email))} />
                          : <span>{e.email}{mailMarcado && <span title="Email repetido" style={{ color: T.blue, marginLeft: 6 }}>⚠️</span>}</span>}
                      </td>
                      <td style={td}>
                        {editando
                          ? <input value={editVals.camara} onChange={ev => setEditVals({ ...editVals, camara: ev.target.value })} style={inputStyle()} />
                          : (e.camara || <span style={{ color: T.textLight }}>—</span>)}
                      </td>
                      <td style={td}>
                        <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: e.activo ? T.greenSoft : T.bgMuted, color: e.activo ? T.green : T.textLight }}>
                          {e.activo ? 'Activa' : 'Inactiva'}
                        </span>
                      </td>
                      <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {editando ? (
                          <>
                            <button onClick={() => guardarEdicion(e.id)} disabled={guardandoEdit} style={{ ...btnPrimary(guardandoEdit), padding: '7px 14px', marginRight: 8 }}>Guardar</button>
                            <button onClick={() => setEditId(null)} style={btnGhost}>Cancelar</button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => empezarEdicion(e)} style={{ ...btnGhost, marginRight: 8 }}>Editar</button>
                            <button onClick={() => cambiarActivo(e)} style={{ ...btnGhost, color: e.activo ? T.red : T.green, borderColor: (e.activo ? T.red : T.green) + '55' }}>
                              {e.activo ? 'Dar de baja' : 'Reactivar'}
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <p style={{ fontSize: 12, color: T.textLight, marginTop: 16, lineHeight: 1.6 }}>
          Las bajas no borran la empresa: la pasan a <strong>inactiva</strong> (deja de poder votar, pero se conserva su historial).
          Para cargas grandes de empresas nuevas, pedile el bloque al equipo de Munilupa.
        </p>
      </main>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
export default function AdminApp() {
  const [sesion, setSesion] = useState(undefined); // undefined=cargando, null=sin sesión, {email}=ok

  useEffect(() => { sesionAdminActiva().then(setSesion); }, []);

  if (sesion === undefined) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, color: T.textLight, background: T.bgWarm }}>Cargando…</div>;
  }
  if (!sesion) return <Login onOk={(email) => setSesion({ email })} />;
  return <Panel adminEmail={sesion.email} onSalir={async () => { await cerrarSesionAdmin(); setSesion(null); }} />;
}
