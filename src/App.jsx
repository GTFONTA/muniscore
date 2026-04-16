// ============================================================
//  App.jsx — Componente principal de Munilupa
//
//  Este archivo conecta el diseño visual con Supabase.
//  Los datos ya no son ficticios: vienen de la base de datos.
//
//  Para cambiar colores → editá el objeto T al principio
//  Para cambiar pesos de encuesta → editá PREGUNTAS más abajo
// ============================================================
import ModalCalificar from './components/ModalCalificar';
import { useState, useEffect, useCallback } from 'react';
import {
  getMunicipios,
  getEncuestasMunicipio,
  getDocumentos,
  getArticulos,
  enviarVoto,
  actualizarVoto,
  loginConEmail,
  getUsuarioActual,
  cerrarSesion,
  yaVoto,
  getComentariosPublicos,
  enviarContacto,
  getMesesPromedio,
} from './lib/supabase';
import MapaPoligonos from './components/MapaPoligonos';
import NoticiasCarrusel from './components/NoticiasCarrusel';

// ─────────────────────────────────────────────
//  TOKENS DE DISEÑO — estilo Airbnb
// ─────────────────────────────────────────────
const T = {
  bg:          "#FFFFFF",
  bgWarm:      "#F7F5F2",
  bgCard:      "#FFFFFF",
  bgMuted:     "#F3F0EC",
  border:      "#E8E4DF",
  borderMid:   "#D4CFC9",
  text:        "#1A1A1A",
  textMid:     "#6B6560",
  textLight:   "#A09890",
  orange:      "#E8612A",
  orangeSoft:  "#FDF1EC",
  orangeMid:   "#F5CDB8",
  green:       "#007A70",
  greenSoft:   "#E6F6F5",
  greenMid:    "#A0DDD9",
  blue:        "#0066CC",
  blueSoft:    "#EAF2FB",
  blueMid:     "#A8C8ED",
  yellow:      "#C27D00",
  yellowSoft:  "#FEF6E4",
  yellowMid:   "#F8D99A",
  red:         "#C0392B",
  redSoft:     "#FDEDEB",
  redMid:      "#F0ADA7",
  radius:      "16px",
  radiusSm:    "10px",
  radiusXl:    "24px",
  shadow:      "0 2px 16px rgba(0,0,0,0.07)",
  shadowHover: "0 8px 40px rgba(0,0,0,0.13)",
  shadowCard:  "0 1px 6px rgba(0,0,0,0.06)",
};

// ─────────────────────────────────────────────
//  PREGUNTAS DE LA ENCUESTA Y SUS PESOS
//  Para cambiar el peso de cada categoría:
//  1. Modificá el campo "peso" de cada pregunta
//  2. Asegurate de que todos los pesos sumen 1.00
// ─────────────────────────────────────────────
const PREGUNTAS = [
  { key: "transparencia",  emoji: "🔍", label: "Transparencia y ausencia de corrupción",        peso: 0.25, campo_db: "puntaje_transparencia"  },
  { key: "velocidad",      emoji: "⚡", label: "Velocidad de aprobación de planos y permisos",  peso: 0.20, campo_db: "puntaje_velocidad"      },
  { key: "normativa",      emoji: "📋", label: "Claridad y accesibilidad de las normativas",    peso: 0.20, campo_db: "puntaje_normativa"      },
  { key: "previsibilidad", emoji: "🎯", label: "Previsibilidad y consistencia de los procesos", peso: 0.15, campo_db: "puntaje_previsibilidad"  },
  { key: "atencion",       emoji: "🤝", label: "Atención al público en dependencias municipales",peso: 0.10, campo_db: "puntaje_atencion"       },
  { key: "impuestos",      emoji: "💰", label: "Razonabilidad de tasas e impuestos municipales",peso: 0.10, campo_db: "puntaje_impuestos"      },
];

// ─────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────
const getScore = (s) => {
  if (s >= 4.0) return { c: T.green,  soft: T.greenSoft,  mid: T.greenMid,  label: "Favorable" };
  if (s >= 3.0) return { c: T.yellow, soft: T.yellowSoft, mid: T.yellowMid, label: "Moderado"  };
  if (s >= 2.0) return { c: T.red,    soft: T.redSoft,    mid: T.redMid,    label: "Difícil"   };
  return               { c: T.red,    soft: T.redSoft,    mid: T.redMid,    label: "Crítico"   };
};

const formatFecha = (isoStr) => {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  return d.toLocaleDateString('es-AR', { year: 'numeric', month: 'short', day: 'numeric' });
};

// ─────────────────────────────────────────────
//  COMPONENTES BASE
// ─────────────────────────────────────────────
const Pill = ({ label, color }) => (
  <span style={{ display: "inline-block", padding: "3px 11px", borderRadius: 99, background: color + "18", color, fontSize: 11, fontWeight: 700 }}>
    {label}
  </span>
);

const Badge = ({ s, size = 56 }) => {
  const { c, soft, mid } = getScore(s || 0);
  return (
    <div style={{ width: size, height: size, borderRadius: size * 0.28, background: soft, border: `1.5px solid ${mid}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <span style={{ fontSize: size * 0.38, fontWeight: 800, color: c, lineHeight: 1 }}>{(s || 0).toFixed(1)}</span>
      {size > 50 && <span style={{ fontSize: 9, color: c, opacity: 0.7, letterSpacing: 1 }}>/ 5</span>}
    </div>
  );
};

const CatBar = ({ label, val, peso }) => {
  const { c } = getScore(val || 0);
  return (
    <div style={{ marginBottom: 13 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontSize: 13, color: T.textMid }}>{label} <span style={{ fontSize: 11, color: T.textLight }}>({Math.round(peso * 100)}%)</span></span>
        <span style={{ fontSize: 13, fontWeight: 700, color: c }}>{(val || 0).toFixed(1)}</span>
      </div>
      <div style={{ height: 6, background: T.bgMuted, borderRadius: 99, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${((val || 0) / 5) * 100}%`, background: c, borderRadius: 99, transition: "width 0.7s cubic-bezier(.4,0,.2,1)" }} />
      </div>
    </div>
  );
};

const BtnPrimary = ({ children, onClick, full, disabled, style: extra }) => (
  <button onClick={onClick} disabled={disabled} style={{
    width: full ? "100%" : "auto", padding: "16px 32px", borderRadius: T.radius,
    background: disabled ? T.bgMuted : T.orange, border: "none",
    color: disabled ? T.textLight : "#fff", fontWeight: 700, fontSize: 16,
    cursor: disabled ? "not-allowed" : "pointer", fontFamily: "inherit",
    boxShadow: disabled ? "none" : `0 4px 18px ${T.orange}44`,
    transition: "all 0.15s", ...extra,
  }}
    onMouseEnter={e => !disabled && (e.currentTarget.style.transform = "translateY(-2px) scale(1.04)")}
    onMouseLeave={e => e.currentTarget.style.transform = "translateY(0) scale(1)"}
  >{children}</button>
);

const BtnGhost = ({ children, onClick }) => (
  <button onClick={onClick} style={{ padding: "12px 20px", borderRadius: T.radius, background: "transparent", border: `1.5px solid ${T.border}`, color: T.textMid, fontWeight: 600, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>{children}</button>
);

// ─────────────────────────────────────────────
//  SKELETON LOADER (mientras carga Supabase)
// ─────────────────────────────────────────────
const Skeleton = ({ w = "100%", h = 16, radius = 8 }) => (
  <div style={{ width: w, height: h, borderRadius: radius, background: `linear-gradient(90deg, ${T.bgMuted} 25%, ${T.border} 50%, ${T.bgMuted} 75%)`, backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite" }} />
);

// ─────────────────────────────────────────────
//  RANKING
// ─────────────────────────────────────────────
const CATEGORIAS_RANKING = [
  { key: "global",         label: "Índice Ponderado",                       campo: "puntaje_global",         invertir: false },
  { key: "transparencia",  label: "Transparencia y ausencia de corrupción", campo: "puntaje_transparencia",  invertir: false },
  { key: "velocidad",      label: "Velocidad de aprobación",                campo: "puntaje_velocidad",      invertir: false },
  { key: "normativa",      label: "Claridad y accesibilidad normativa",     campo: "puntaje_normativa",      invertir: false },
  { key: "previsibilidad", label: "Previsibilidad y consistencia",          campo: "puntaje_previsibilidad", invertir: false },
  { key: "atencion",       label: "Atención al público",                    campo: "puntaje_atencion",       invertir: false },
  { key: "impuestos",      label: "Razonabilidad de tasas y aranceles",     campo: "puntaje_impuestos",      invertir: false },
  { key: "meses",          label: "Meses promedio de demora en aprobación", campo: null,                     invertir: true  },
];

const VistaRanking = ({ municipios, onRefresh }) => {
  const [categoria, setCategoria] = useState("global");
  const [mesesData, setMesesData] = useState([]);
  const [ultimaAct, setUltimaAct] = useState(new Date());

  const cargarMeses = useCallback(async () => {
    const data = await getMesesPromedio();
    setMesesData(data);
    setUltimaAct(new Date());
  }, []);

  useEffect(() => {
    cargarMeses();
    const interval = setInterval(() => { cargarMeses(); if (onRefresh) onRefresh(); }, 60000);
    return () => clearInterval(interval);
  }, [cargarMeses, onRefresh]);

  const catConfig = CATEGORIAS_RANKING.find(c => c.key === categoria);
  const isMeses   = categoria === "meses";
  const maxMeses  = mesesData.length ? Math.max(...mesesData.map(d => d.meses_promedio)) : 1;

  const buildTop = () => {
    if (isMeses) {
      return [...mesesData]
        .sort((a, b) => a.meses_promedio - b.meses_promedio)
        .slice(0, 10)
        .map(d => {
          const mun = municipios.find(m => m.id === d.municipio_id);
          return { nombre: mun?.nombre || "—", valor: d.meses_promedio, votos: d.count, _id: d.municipio_id };
        });
    }
    return municipios
      .filter(m => (m.total_votos || 0) >= 3 && (m[catConfig.campo] || 0) > 0)
      .sort((a, b) => b[catConfig.campo] - a[catConfig.campo])
      .slice(0, 10)
      .map(m => ({ nombre: m.nombre, valor: m[catConfig.campo], votos: m.total_votos, _id: m.id }));
  };

  const buildBottom = (excludeIds) => {
    if (isMeses) {
      return [...mesesData]
        .sort((a, b) => b.meses_promedio - a.meses_promedio)
        .filter(d => !excludeIds.has(d.municipio_id))
        .slice(0, 10)
        .map(d => {
          const mun = municipios.find(m => m.id === d.municipio_id);
          return { nombre: mun?.nombre || "—", valor: d.meses_promedio, votos: d.count };
        });
    }
    return municipios
      .filter(m => (m.total_votos || 0) >= 3 && (m[catConfig.campo] || 0) > 0 && !excludeIds.has(m.id))
      .sort((a, b) => a[catConfig.campo] - b[catConfig.campo])
      .slice(0, 10)
      .map(m => ({ nombre: m.nombre, valor: m[catConfig.campo], votos: m.total_votos }));
  };

  const top10     = buildTop();
  const top10Ids  = new Set(top10.map(r => r._id));
  const peor10    = buildBottom(top10Ids);

  const FilaRanking = ({ pos, nombre, valor, votos, esMejores }) => {
    const barColor = isMeses
      ? (esMejores ? T.green : T.red)
      : getScore(valor).c;
    const barSoft = isMeses
      ? (esMejores ? T.greenSoft : T.redSoft)
      : getScore(valor).soft;
    const barWidth = isMeses
      ? `${Math.min((valor / maxMeses) * 100, 100).toFixed(1)}%`
      : `${Math.min((valor / 5) * 100, 100).toFixed(1)}%`;
    const valorStr = isMeses
      ? `${valor.toFixed(1)} meses`
      : `${valor.toFixed(1)} / 5`;

    return (
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: `1px solid ${T.border}` }}>
        <span style={{ width: 26, textAlign: "right", fontSize: 14, fontWeight: 700, color: T.textLight, flexShrink: 0 }}>{pos}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nombre}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: barColor, marginLeft: 8, flexShrink: 0 }}>{valorStr}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ flex: 1, height: 7, borderRadius: 99, background: barSoft, overflow: "hidden" }}>
              <div style={{ height: "100%", width: barWidth, borderRadius: 99, background: barColor, transition: "width 0.4s ease" }} />
            </div>
            <span style={{ fontSize: 11, color: T.textLight, flexShrink: 0 }}>{votos} eval.</span>
          </div>
        </div>
      </div>
    );
  };

  const TablaRanking = ({ titulo, filas, esMejores }) => (
    <div style={{ flex: 1, background: T.bg, borderRadius: T.radiusXl, border: `1px solid ${T.border}`, padding: "28px 28px 18px", boxShadow: T.shadowCard }}>
      <h3 style={{ margin: "0 0 18px", fontSize: 20, fontWeight: 800, color: T.text }}>{titulo}</h3>
      {filas.length === 0
        ? <p style={{ fontSize: 13, color: T.textLight, textAlign: "center", padding: "24px 0" }}>Sin datos suficientes aún</p>
        : filas.map((f, i) => <FilaRanking key={i} pos={i + 1} nombre={f.nombre} valor={f.valor} votos={f.votos} esMejores={esMejores} />)
      }
      <p style={{ margin: "12px 0 0", fontSize: 11, color: T.textLight, fontStyle: "italic" }}>Solo se muestran municipios con 3 o más evaluaciones</p>
    </div>
  );

  return (
    <div style={{ flex: 1, width: "100%", padding: "52px 48px", animation: "fadeUp 0.25s ease" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
        <p style={{ margin: "0 0 6px", fontSize: 12, color: T.orange, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>Índice AMBA</p>
        <h1 className="ranking-heading" style={{ margin: "0 0 10px", fontSize: 42, fontWeight: 800, color: T.text, letterSpacing: -1 }}>
          <span style={{ whiteSpace: "nowrap" }}>Ranking de</span>{' '}
          <span style={{ color: T.orange }}>municipios</span>
        </h1>
        <p style={{ fontSize: 17, color: T.textMid, margin: "0 0 28px" }}>Compará el desempeño de cada municipio según la categoría que más te interesa.</p>
      </div>

      <div style={{ marginBottom: 28 }}>
        <select
          value={categoria}
          onChange={e => setCategoria(e.target.value)}
          style={{ padding: "12px 18px", borderRadius: T.radiusSm, border: `1.5px solid ${T.border}`, background: T.bg, color: T.text, fontSize: 15, fontFamily: "inherit", cursor: "pointer", outline: "none", minWidth: 300 }}
        >
          {CATEGORIAS_RANKING.map(c => (
            <option key={c.key} value={c.key}>{c.label}</option>
          ))}
        </select>
      </div>

      <div className="ranking-cols">
        <TablaRanking titulo="🏆 Top 10 — Mejores para construir" filas={top10} esMejores={true} />
        <TablaRanking titulo="⚠️ Peores 10 — Mayor dificultad" filas={peor10} esMejores={false} />
      </div>

      <p style={{ marginTop: 16, fontSize: 11, color: T.textLight, textAlign: "right" }}>
        Última actualización: {ultimaAct.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
      </p>
    </div>
  );
};

// ─────────────────────────────────────────────
//  MODAL DE ENCUESTA
// ─────────────────────────────────────────────
const ModalEncuesta = ({ mun, usuario, onClose, onVotado }) => {
  const [paso, setPaso] = useState(usuario ? 1 : 0);
  const [email, setEmail] = useState("");
  const [pts, setPts] = useState({ transparencia: 0, velocidad: 0, normativa: 0, impuestos: 0, atencion: 0, previsibilidad: 0 });
  const [meses, setMeses] = useState("");
  const [tipo, setTipo] = useState("");
  const [comentario, setComentario] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [linkEnviado, setLinkEnviado] = useState(false);
  const [votoExistenteInfo, setVotoExistenteInfo] = useState(null);
  const [cargandoVotoExistente, setCargandoVotoExistente] = useState(!!usuario);

  useEffect(() => {
    if (!usuario) return;
    (async () => {
      const resultado = await yaVoto(mun.id);
      if (resultado.existe) {
        setPts({
          transparencia:  resultado.votoActual.transparencia,
          velocidad:      resultado.votoActual.velocidad,
          normativa:      resultado.votoActual.normativa,
          impuestos:      resultado.votoActual.impuestos,
          atencion:       resultado.votoActual.atencion,
          previsibilidad: resultado.votoActual.previsibilidad,
        });
        setMeses(String(resultado.votoActual.meses || ""));
        setTipo(resultado.votoActual.tipo || "");
        setComentario(resultado.votoActual.comentario || "");
        setVotoExistenteInfo({ votoId: resultado.votoId });
      }
      setCargandoVotoExistente(false);
    })();
  }, [mun.id, usuario]);

  const prog  = Object.values(pts).filter(v => v > 0).length;
  const listo = prog === 6;
  const emailOk = email.includes("@") && email.includes(".");

  const handleLogin = async () => {
    setCargando(true); setError(null);
    const { error } = await loginConEmail(email);
    setCargando(false);
    if (error) { setError("No pudimos enviar el email. Verificá que sea válido."); return; }
    setLinkEnviado(true);
  };

  const handleEnviar = async () => {
    if (!listo) return;
    setCargando(true); setError(null);

    const payload = {
      municipioId:            mun.id,
      puntajeTransparencia:   pts.transparencia,
      puntajeVelocidad:       pts.velocidad,
      puntajeNormativa:       pts.normativa,
      puntajeImpuestos:       pts.impuestos,
      puntajeAtencion:        pts.atencion,
      puntajePrevisibilidad:  pts.previsibilidad,
      mesesAprobacion:        meses ? parseInt(meses) : null,
      tipoProyecto:           tipo || null,
      comentario:             comentario.trim() || null,
    };

    const { error } = votoExistenteInfo
      ? await actualizarVoto({ votoId: votoExistenteInfo.votoId, ...payload })
      : await enviarVoto(payload);

    setCargando(false);
    if (error) { setError("No se pudo registrar el voto. Intentá de nuevo."); return; }
    setPaso(2);
    if (onVotado) onVotado();
  };

  const Stars = ({ campo, val }) => (
    <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 10 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} onClick={() => setPts(p => ({ ...p, [campo]: n }))} style={{
          width: 44, height: 44, borderRadius: T.radiusSm, cursor: "pointer",
          border: `1.5px solid ${n <= val ? T.orange : T.border}`,
          background: n <= val ? T.orangeSoft : T.bgWarm,
          color: n <= val ? T.orange : T.textLight,
          fontSize: 18, fontWeight: 700, transition: "all 0.12s",
          transform: n <= val ? "scale(1.1)" : "scale(1)", fontFamily: "inherit"
        }}>★</button>
      ))}
      {val > 0 && <span style={{ fontSize: 12, color: T.textMid, alignSelf: "center", marginLeft: 4, fontStyle: "italic" }}>
        {["", "Muy difícil", "Difícil", "Regular", "Bueno", "Excelente"][val]}
      </span>}
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(26,26,26,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, backdropFilter: "blur(6px)" }}>
      <div style={{ background: T.bg, borderRadius: T.radiusXl, width: 500, maxWidth: "92vw", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 80px rgba(0,0,0,0.18)", animation: "fadeUp 0.22s ease" }}>

        {/* Header */}
        <div style={{ padding: "28px 30px 22px", borderBottom: `1px solid ${T.border}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ margin: "0 0 4px", fontSize: 11, color: T.textLight, letterSpacing: 2, textTransform: "uppercase" }}>
                {paso === 0 ? "Verificación" : paso === 1 ? `Paso 2 · Calificación` : "Listo"}
              </p>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: T.text }}>
                {paso === 2 ? "¡Gracias por tu aporte!" : `Calificar ${mun.nombre}`}
              </h2>
            </div>
            <button onClick={onClose} style={{ width: 44, height: 44, borderRadius: "50%", border: `1.5px solid ${T.border}`, background: T.bg, cursor: "pointer", fontSize: 16, color: T.textLight }}>✕</button>
          </div>
          {paso === 1 && (
            <div style={{ display: "flex", gap: 5, marginTop: 18 }}>
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} style={{ flex: 1, height: 4, borderRadius: 99, background: prog >= i ? T.orange : T.bgMuted, transition: "background 0.2s" }} />
              ))}
            </div>
          )}
        </div>

        <div style={{ padding: "24px 30px 28px" }}>
          {error && <div style={{ padding: "12px 14px", borderRadius: T.radiusSm, background: T.redSoft, border: `1px solid ${T.redMid}`, color: T.red, fontSize: 13, marginBottom: 16 }}>{error}</div>}

          {/* PASO 0: Login con email */}
          {paso === 0 && !linkEnviado && <>
            <p style={{ fontSize: 14, color: T.textMid, margin: "0 0 20px", lineHeight: 1.6 }}>Ingresá tu email para validar tu identidad. Te enviamos un link de acceso, sin contraseña.</p>
            <input type="email" placeholder="hola@ejemplo.com" value={email} onChange={e => setEmail(e.target.value)}
              style={{ width: "100%", padding: "14px 16px", borderRadius: T.radius, border: `1.5px solid ${emailOk ? T.orange : T.border}`, background: emailOk ? T.orangeSoft : T.bgWarm, color: T.text, fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
            />
            <p style={{ fontSize: 12, color: T.textLight, margin: "8px 0 22px" }}>📧 Una dirección = un voto por municipio.</p>
            <div style={{ display: "flex", gap: 12 }}>
              <BtnGhost onClick={onClose}>Cancelar</BtnGhost>
              <BtnPrimary onClick={handleLogin} disabled={!emailOk || cargando} style={{ flex: 1 }}>
                {cargando ? "Enviando..." : "Enviar link de acceso →"}
              </BtnPrimary>
            </div>
          </>}

          {paso === 0 && linkEnviado && (
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📧</div>
              <p style={{ fontSize: 15, color: T.text, fontWeight: 700, marginBottom: 8 }}>Revisá tu email</p>
              <p style={{ fontSize: 14, color: T.textMid, lineHeight: 1.6 }}>Enviamos un link a <strong>{email}</strong>. Hacé clic en él y volvé a esta página para calificar.</p>
            </div>
          )}

          {/* PASO 1: Encuesta */}
          {paso === 1 && <>
            {votoExistenteInfo && (
              <div style={{ padding: "10px 14px", borderRadius: T.radiusSm, background: T.blueSoft, border: `1px solid ${T.blueMid}`, color: T.blue, fontSize: 13, marginBottom: 16 }}>
                Estás actualizando tu calificación anterior. Los nuevos puntajes reemplazarán los anteriores.
              </div>
            )}
            {PREGUNTAS.map(p => (
              <div key={p.key} style={{ marginBottom: 22 }}>
                <p style={{ margin: 0, fontSize: 14, color: T.text, fontWeight: 600 }}>{p.emoji} {p.label}</p>
                <Stars campo={p.key} val={pts[p.key]} />
              </div>
            ))}
            <div style={{ padding: 18, borderRadius: T.radius, background: T.bgWarm, border: `1px solid ${T.border}`, marginTop: 8, marginBottom: 24 }}>
              <p style={{ margin: "0 0 14px", fontSize: 13, fontWeight: 600, color: T.text }}>Datos opcionales</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
                <select value={tipo} onChange={e => setTipo(e.target.value)} style={{ width: "100%", padding: "10px 14px", borderRadius: T.radiusSm, border: `1px solid ${T.border}`, background: T.bg, color: tipo ? T.text : T.textLight, fontSize: 13, fontFamily: "inherit" }}>
                  <option value="">Tipo de proyecto</option>
                  {["Casa unifamiliar", "Edificio", "Industrial", "Comercial", "Otro"].map(o => <option key={o}>{o}</option>)}
                </select>
                <div>
                  <input type="number" placeholder="Meses promedio para obtención de permiso de construcción" value={meses} onChange={e => setMeses(e.target.value)}
                    style={{ width: "100%", padding: "10px 14px", borderRadius: T.radiusSm, border: `1px solid ${T.border}`, background: T.bg, color: T.text, fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" }}
                  />
                  <style>{`input[type="number"]::placeholder { font-size: 0.75rem; }`}</style>
                </div>
              </div>
              <textarea
                placeholder="Comentario anónimo sobre tu experiencia en este municipio (opcional)..."
                value={comentario}
                onChange={e => setComentario(e.target.value)}
                maxLength={600}
                rows={3}
                style={{ width: "100%", padding: "10px 14px", borderRadius: T.radiusSm, border: `1px solid ${T.border}`, background: T.bg, color: T.text, fontSize: 13, fontFamily: "inherit", resize: "vertical", outline: "none", boxSizing: "border-box" }}
              />
              {comentario.length > 0 && (
                <p style={{ margin: "4px 0 0", fontSize: 11, color: T.textLight, textAlign: "right" }}>{comentario.length}/600</p>
              )}
            </div>
            <BtnPrimary full onClick={handleEnviar} disabled={!listo || cargando || cargandoVotoExistente}>
              {cargando ? "Enviando..." : listo ? "Enviar mi calificación →" : `Completá todas las categorías (${prog}/6)`}
            </BtnPrimary>
          </>}

          {/* PASO 2: Confirmación */}
          {paso === 2 && (
            <div style={{ textAlign: "center", padding: "10px 0 8px" }}>
              <div style={{ width: 72, height: 72, borderRadius: "50%", background: T.greenSoft, border: `2px solid ${T.greenMid}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, margin: "0 auto 20px" }}>✓</div>
              <p style={{ fontSize: 15, color: T.textMid, lineHeight: 1.7, margin: "0 0 28px" }}>
                Tu calificación de <strong style={{ color: T.text }}>{mun.nombre}</strong> fue {votoExistenteInfo ? "actualizada" : "registrada"}. El índice se actualizará en los próximos minutos.
              </p>
              <BtnPrimary onClick={onClose}>Volver al mapa</BtnPrimary>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
//  PANEL LATERAL DEL MUNICIPIO
// ─────────────────────────────────────────────
const PanelMunicipio = ({ mun, usuario, onClose, onVotado }) => {
  const [tab, setTab]               = useState("datos");
  const [showSurvey, setShowSurvey] = useState(false);
  const [comentarios, setComentarios] = useState([]);
  const [documentos, setDocumentos]   = useState([]);
  const [cargando, setCargando]       = useState(false);

  const { c, soft, label } = getScore(mun.puntaje_global || 0);

  // Cargar comentarios o documentos según la pestaña activa
  useEffect(() => {
    if (tab === "comentarios" && comentarios.length === 0) {
      setCargando(true);
      getEncuestasMunicipio(mun.id).then(({ data }) => {
        setComentarios(data || []);
        setCargando(false);
      });
    }
    if (tab === "normativa" && documentos.length === 0) {
      setCargando(true);
      getDocumentos(mun.id).then(({ data }) => {
        setDocumentos(data || []);
        setCargando(false);
      });
    }
  }, [tab]);

  if (!mun.id) {
    return (
      <div style={{ position: "absolute", top: 0, right: 0, width: 380, height: "100%", background: "rgba(255,255,255,0.85)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", borderLeft: "1px solid rgba(255,255,255,0.6)", display: "flex", flexDirection: "column", zIndex: 20, boxShadow: "-12px 0 48px rgba(0,0,0,0.12)", animation: "slideIn 0.22s ease" }}>
        <div style={{ padding: "26px 26px 20px", borderBottom: `1px solid ${T.border}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: T.text, letterSpacing: -0.5 }}>{mun.nombre}</h2>
            <button onClick={onClose} style={{ width: 44, height: 44, borderRadius: "50%", border: `1.5px solid ${T.border}`, background: T.bg, color: T.textLight, cursor: "pointer", fontSize: 14 }}>✕</button>
          </div>
        </div>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 32, textAlign: "center" }}>
          <div>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🏗</div>
            <p style={{ fontSize: 15, color: T.textMid, lineHeight: 1.7, margin: 0 }}>
              Este municipio aún no está disponible en la plataforma.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "absolute", top: 0, right: 0, width: 380, height: "100%", background: "rgba(255,255,255,0.85)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", borderLeft: "1px solid rgba(255,255,255,0.6)", display: "flex", flexDirection: "column", zIndex: 20, boxShadow: "-12px 0 48px rgba(0,0,0,0.12)", animation: "slideIn 0.22s ease" }}>

      {/* Header */}
      <div style={{ padding: "26px 26px 20px", background: `linear-gradient(160deg, ${soft} 0%, #fff 100%)`, borderBottom: `1px solid ${T.border}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <p style={{ margin: "0 0 4px", fontSize: 11, color: T.textLight, letterSpacing: 2, textTransform: "uppercase" }}>{mun.region}</p>
            <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: T.text, letterSpacing: -0.5 }}>{mun.nombre}</h2>
          </div>
          <button onClick={onClose} style={{ width: 44, height: 44, borderRadius: "50%", border: `1.5px solid ${T.border}`, background: T.bg, color: T.textLight, cursor: "pointer", fontSize: 14 }}>✕</button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 18 }}>
          <Badge s={mun.puntaje_global} size={66} />
          <div>
            <Pill label={label} color={c} />
            <p style={{ margin: "8px 0 0", fontSize: 13, color: T.textMid }}>
              <strong style={{ color: T.text }}>{mun.total_votos || 0}</strong> evaluaciones
              {mun.meses_promedio && <> · <strong style={{ color: T.text }}>{mun.meses_promedio} meses</strong> prom.</>}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", padding: "0 10px", borderBottom: `1px solid ${T.border}` }}>
        {[["datos", "Datos"], ["comentarios", "Opiniones"], ["normativa", "Normativa"]].map(([t, l]) => (
          <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: "14px 4px", background: "none", border: "none", borderBottom: tab === t ? `2px solid ${T.orange}` : "2px solid transparent", color: tab === t ? T.orange : T.textLight, fontWeight: tab === t ? 700 : 500, cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>{l}</button>
        ))}
      </div>

      {/* Contenido */}
      <div style={{ flex: 1, overflowY: "auto", padding: "22px 26px" }}>

        {tab === "datos" && <>
          {PREGUNTAS.map(p => (
            <CatBar key={p.key} label={p.label.split(" ").slice(0, 3).join(" ")} val={mun[p.campo_db]} peso={p.peso} />
          ))}
          {(mun.puntaje_global || 0) < 2.5 && (
            <div style={{ marginTop: 18, padding: "14px 16px", borderRadius: T.radius, background: T.redSoft, border: `1px solid ${T.redMid}` }}>
              <p style={{ margin: "0 0 4px", fontSize: 13, color: T.red, fontWeight: 700 }}>⚠ Atención</p>
              <p style={{ margin: 0, fontSize: 13, color: "#7B2021", lineHeight: 1.5 }}>Este municipio presenta dificultades administrativas significativas.</p>
            </div>
          )}
          {(mun.puntaje_global || 0) >= 4.0 && (
            <div style={{ marginTop: 18, padding: "14px 16px", borderRadius: T.radius, background: T.greenSoft, border: `1px solid ${T.greenMid}` }}>
              <p style={{ margin: "0 0 4px", fontSize: 13, color: T.green, fontWeight: 700 }}>✓ Condiciones favorables</p>
              <p style={{ margin: 0, fontSize: 13, color: "#005A55", lineHeight: 1.5 }}>Alta transparencia y agilidad. Recomendado para nuevos desarrollos.</p>
            </div>
          )}
        </>}

        {tab === "comentarios" && (
          cargando
            ? <Skeleton h={80} radius={12} />
            : comentarios.length === 0
              ? <p style={{ fontSize: 14, color: T.textLight, textAlign: "center", marginTop: 32 }}>Aún no hay opiniones para este municipio.<br />¡Sé el primero en calificarlo!</p>
              : comentarios.filter(c => c.comentario).map((c, i) => (
                <div key={i} style={{ padding: 16, borderRadius: T.radius, background: T.bgWarm, border: `1px solid ${T.border}`, marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontSize: 12, color: T.textLight }}>{formatFecha(c.created_at)}</span>
                    {c.tipo_proyecto && <Pill label={c.tipo_proyecto} color={T.blue} />}
                  </div>
                  <p style={{ margin: 0, fontSize: 13, color: T.textMid, lineHeight: 1.6 }}>{c.comentario}</p>
                </div>
              ))
        )}

        {tab === "normativa" && (
          cargando
            ? <Skeleton h={56} radius={12} />
            : documentos.length === 0
              ? <p style={{ fontSize: 14, color: T.textLight, textAlign: "center", marginTop: 32 }}>Aún no hay documentos cargados para este municipio.</p>
              : documentos.map((d, i) => (
                <a key={i} href={d.archivo_url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", background: T.bgWarm, borderRadius: T.radius, marginBottom: 10, border: `1px solid ${T.border}`, cursor: "pointer" }}>
                    <div style={{ width: 40, height: 40, borderRadius: T.radiusSm, background: T.orangeSoft, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: T.orange }}>{d.formato}</div>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: T.text }}>{d.nombre}</p>
                      <p style={{ margin: "2px 0 0", fontSize: 11, color: T.textLight }}>{d.tipo} · {d.anio}</p>
                    </div>
                    <span style={{ color: T.orange, fontWeight: 700, fontSize: 18 }}>↓</span>
                  </div>
                </a>
              ))
        )}
      </div>

      {/* CTA */}
      <div style={{ padding: "16px 26px 22px", borderTop: `1px solid ${T.border}` }}>
        <BtnPrimary full onClick={() => setShowSurvey(true)}>
          Calificar {mun.nombre} →
        </BtnPrimary>
      </div>

      {showSurvey && <ModalEncuesta mun={mun} usuario={usuario} onClose={() => setShowSurvey(false)} onVotado={() => { setShowSurvey(false); if (onVotado) onVotado(); }} />}
    </div>
  );
};

// ─────────────────────────────────────────────
//  NODO DEL MAPA
// ─────────────────────────────────────────────
// NOTA: En la versión de producción estos nodos se reemplazan
// por polígonos GeoJSON reales usando Leaflet.js.
// Este componente sirve como placeholder visual.



// ─────────────────────────────────────────────
//  APP PRINCIPAL
// ─────────────────────────────────────────────
export default function App() {
  const [municipios, setMunicipios] = useState([]);
  const [activo, setActivo]         = useState(null);
  const [vista, setVista]           = useState("mapa");
  const [filtro, setFiltro]         = useState("Todos");
  const [usuario, setUsuario]       = useState(null);
  const [articulos, setArticulos]   = useState([]);
  const [cargando, setCargando]     = useState(true);
  const [mostrarModalCalificar, setMostrarModalCalificar] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  // Tarea 4 — comentarios comunidad en Noticias
  const [comentariosComunidad, setComentariosComunidad] = useState([]);
  const [cargandoComments, setCargandoComments]         = useState(false);
  const [filtroComMunicipio, setFiltroComMunicipio]     = useState("");
  // Tarea 6 — formulario de contacto
  const [contactForm, setContactForm]       = useState({ nombre: "", email: "", tipoConsulta: "", mensaje: "" });
  const [enviandoContacto, setEnviandoContacto] = useState(false);
  const [contactoEnviado, setContactoEnviado]   = useState(false);
  const [errorContacto, setErrorContacto]       = useState(null);

  const refreshMunicipios = useCallback(async () => {
    const { data } = await getMunicipios();
    if (data) setMunicipios(data);
  }, []);

  // Carga inicial de datos
  useEffect(() => {
    const cargarDatos = async () => {
      setCargando(true);
      const [{ data: munis }, { data: arts }, user] = await Promise.all([
        getMunicipios(),
        getArticulos(),
        getUsuarioActual(),
      ]);
      setMunicipios(munis || []);
      setArticulos(arts || []);
      setUsuario(user);
      setCargando(false);
    };
    cargarDatos();

    // Escuchar cambios de sesión (cuando el usuario valida su email)
    // Importar supabase directamente para el listener
    import('./lib/supabase').then(({ supabase }) => {
      const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
        setUsuario(session?.user || null);
      });
      return () => listener.subscription.unsubscribe();
    });
  }, []);

  // Cargar comentarios de la comunidad cuando se abre la sección Noticias
  useEffect(() => {
    if (vista !== "noticias") return;
    setCargandoComments(true);
    const munId = filtroComMunicipio
      ? municipios.find(m => m.nombre === filtroComMunicipio)?.id || null
      : null;
    getComentariosPublicos(munId, 40).then(({ data }) => {
      setComentariosComunidad(data || []);
      setCargandoComments(false);
    });
  }, [vista, filtroComMunicipio]);

  // Inyectar fuente y animaciones
  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap";
    link.rel = "stylesheet"; document.head.appendChild(link);
    const s = document.createElement("style");
    s.textContent = `
      @keyframes slideIn { from{transform:translateX(20px);opacity:0} to{transform:translateX(0);opacity:1} }
      @keyframes fadeUp  { from{transform:translateY(16px);opacity:0} to{transform:translateY(0);opacity:1} }
      @keyframes ripple  { 0%{transform:scale(1);opacity:0.5} 100%{transform:scale(1.7);opacity:0} }
      @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
      * { box-sizing:border-box; }
      ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-track{background:transparent}
      ::-webkit-scrollbar-thumb{background:${T.borderMid};border-radius:2px}
      .nav-links { display:flex; gap:0; align-items:center; }
      .nav-cta   { display:flex; align-items:center; }
      .nav-hamburger { display:none; background:none; border:none; font-size:22px; cursor:pointer; color:${T.text}; padding:8px; line-height:1; }
      .ranking-cols { display:flex; gap:24px; align-items:flex-start; }
      @media (max-width:768px) {
        .nav-links, .nav-cta { display:none !important; }
        .nav-hamburger { display:block !important; }
        .ranking-cols { flex-direction:column; }
      }
      .hero-bar {
        width: 100%;
        padding: 1.25rem 3rem;
        border-radius: 0;
        background: #FFFAF7;
        border-bottom: 1px solid ${T.orangeMid};
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
      }
      .hero-left {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
        align-items: center;
      }
      @media (max-width:768px) {
        .hero-bar {
          flex-direction: column;
          align-items: center;
          padding: 1rem;
        }
        .hero-bar h1 {
          font-size: 1.1rem !important;
          letter-spacing: normal !important;
          line-height: 1.3 !important;
          word-break: break-word;
        }
      }
    `;
    document.head.appendChild(s);
  }, []);

  const regiones = ["Todos", "CABA", "GBA Norte", "GBA Oeste", "GBA Sur"];
  const filtrados = filtro === "Todos" ? municipios : municipios.filter(m => m.region === filtro);

  const mejor = municipios.length ? [...municipios].sort((a, b) => (b.puntaje_global || 0) - (a.puntaje_global || 0))[0] : null;
  const peor  = municipios.length ? [...municipios].sort((a, b) => (a.puntaje_global || 0) - (b.puntaje_global || 0))[0] : null;
  const prom  = municipios.length ? (municipios.reduce((a, m) => a + (m.puntaje_global || 0), 0) / municipios.length).toFixed(2) : "0.00";
  const totalVotos = municipios.reduce((a, m) => a + (m.total_votos || 0), 0).toLocaleString("es-AR");

  return (
    <div style={{ fontFamily: "'Manrope', sans-serif", background: T.bgWarm, color: T.text, minHeight: "100vh", display: "flex", flexDirection: "column" }}>

      {/* NAVBAR */}
      <nav style={{ background: "rgba(255,255,255,0.95)", backdropFilter: "blur(16px)", borderBottom: `1px solid ${T.border}`, padding: "0 48px", display: "flex", alignItems: "center", height: 64, gap: 32, position: "sticky", top: 0, zIndex: 1000, boxShadow: `0 1px 0 ${T.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src="/logo-icono.png" alt="MuniLupa ícono" style={{ height: "48px", width: "auto", objectFit: "contain" }} />
          <div>
            <div style={{ fontSize: 21, fontWeight: 800, color: T.text, letterSpacing: -0.5 }}>Muni<span style={{ color: T.orange }}>lupa</span></div>
            <div style={{ fontSize: 10, color: T.textLight, letterSpacing: 1.5, textTransform: "uppercase", whiteSpace: "nowrap" }}>Gestión Municipal a la vista</div>
          </div>
        </div>

        <div className="nav-links">
          {[["mapa", "Mapa"], ["ranking", "Ranking"], ["noticias", "Noticias"], ["metodologia", "Metodología"], ["contacto", "Contacto"]].map(([v, l]) => (
            <button key={v} onClick={() => setVista(v)} style={{ background: "none", border: "none", padding: "22px 16px", cursor: "pointer", borderBottom: vista === v ? `2px solid ${T.orange}` : "2px solid transparent", color: vista === v ? T.text : T.textMid, fontWeight: vista === v ? 700 : 500, fontSize: 15, fontFamily: "inherit" }}>{l}</button>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        {/* Indicador de sesión — desktop */}
        <div className="nav-cta">
          {usuario
            ? <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 13, color: T.textMid }}>✓ {usuario.email}</span>
                <button onClick={cerrarSesion} style={{ fontSize: 13, color: T.textLight, background: "none", border: `1px solid ${T.border}`, padding: "7px 14px", borderRadius: T.radiusSm, cursor: "pointer", fontFamily: "inherit" }}>Salir</button>
              </div>
            : <BtnPrimary onClick={() => setMostrarModalCalificar(true)}>Calificar municipio</BtnPrimary>
          }
        </div>

        {/* Botón hamburguesa — mobile */}
        <button className="nav-hamburger" onClick={() => setMenuAbierto(m => !m)}>
          {menuAbierto ? "✕" : "☰"}
        </button>
      </nav>

      {/* Menú desplegable mobile */}
      {menuAbierto && (
        <div style={{ position: "fixed", top: 62, left: 0, right: 0, background: T.bg, borderBottom: `1px solid ${T.border}`, padding: "12px 24px 20px", display: "flex", flexDirection: "column", gap: 0, zIndex: 999, boxShadow: "0 8px 24px rgba(0,0,0,0.08)" }}>
          {[["mapa", "Mapa"], ["ranking", "Ranking"], ["noticias", "Noticias"], ["metodologia", "Metodología"], ["contacto", "Contacto"]].map(([v, l]) => (
            <button key={v} onClick={() => { setVista(v); setMenuAbierto(false); }} style={{ background: "none", border: "none", textAlign: "left", padding: "13px 0", cursor: "pointer", borderBottom: `1px solid ${T.border}`, color: vista === v ? T.orange : T.text, fontWeight: vista === v ? 700 : 500, fontSize: 15, fontFamily: "inherit" }}>{l}</button>
          ))}
          <div style={{ marginTop: 14 }}>
            {usuario
              ? <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 12, color: T.textMid }}>✓ {usuario.email}</span>
                  <button onClick={() => { cerrarSesion(); setMenuAbierto(false); }} style={{ fontSize: 12, color: T.textLight, background: "none", border: `1px solid ${T.border}`, padding: "6px 12px", borderRadius: T.radiusSm, cursor: "pointer", fontFamily: "inherit" }}>Salir</button>
                </div>
              : <BtnPrimary full onClick={() => { setMostrarModalCalificar(true); setMenuAbierto(false); }}>Calificar municipio</BtnPrimary>
            }
          </div>
        </div>
      )}
      {mostrarModalCalificar && (
        <ModalCalificar
          alCerrar={() => setMostrarModalCalificar(false)}
          alConfirmarMunicipio={(municipioElegido) => {
            // Busca el municipio en la lista y abre la encuesta
            const mun = municipios.find(
              m => m.nombre.toLowerCase() === municipioElegido.toLowerCase()
            );
            if (mun) {
              setActivo(mun);
            }
            setMostrarModalCalificar(false);
          }}
        />
      )}

      {/* VISTA: MAPA */}
      {vista === "mapa" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {/* HERO */}
          <div className="hero-bar">
            {/* Bloque izquierdo: textos */}
            <div className="hero-left">
              <p style={{ margin: 0, fontSize: 12, color: T.orange, letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 600 }}>
                NUEVO · ÍNDICE MUNICIPAL DE CONSTRUCCIÓN
              </p>
              <h1 style={{ margin: 0, fontSize: 40, fontWeight: 800, color: T.text, lineHeight: 1.2 }}>
                El primer mapa que revela en qué{" "}
                <span style={{ fontWeight: 800, fontStyle: "italic", color: T.orange }}>municipios</span>{" "}
                es más{" "}
                <span style={{ fontWeight: 800, color: "#2E7D32" }}>fácil</span>{" "}
                o{" "}
                <span style={{ fontWeight: 800, color: T.red }}>difícil</span>{" "}
                construir
              </h1>
              <p style={{ margin: 0, fontSize: 17, color: "#555" }}>
                Transparencia, tiempos y burocracia municipio por municipio.
              </p>
            </div>
          </div>
          {/* Stats — Bento Grid */}
          <div style={{ background: T.bgWarm, borderBottom: `1px solid ${T.border}`, padding: "16px 48px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, maxWidth: 1440, margin: "0 auto" }}>
              {cargando
                ? [1,2,3,4].map(i => <Skeleton key={i} w="100%" h={80} radius={16} />)
                : [
                    { label: "Promedio AMBA",    val: prom + " / 5.0",  col: getScore(parseFloat(prom)).c },
                    { label: "Evaluaciones",     val: totalVotos,        col: T.blue },
                    { label: "Mejor índice",     val: mejor?.nombre,     col: T.green },
                    { label: "Mayor dificultad", val: peor?.nombre,      col: T.red },
                  ].map((s, i) => (
                    <div key={i} style={{ borderRadius: 16, background: T.bg, boxShadow: T.shadowCard, padding: "18px 22px", border: `1px solid ${T.border}`, display: "flex", flexDirection: "column", gap: 5 }}>
                      <p style={{ margin: 0, fontSize: 11, color: T.textLight, letterSpacing: 1.5, textTransform: "uppercase" }}>{s.label}</p>
                      <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: s.col, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.val || "—"}</p>
                    </div>
                  ))
              }
            </div>
          </div>
          {/* CTA */}
          <div style={{ display: "flex", justifyContent: "center", margin: "1rem 0" }}>
            <div style={{ padding: "0.6rem 1.4rem", borderRadius: 999, background: "#F5F5F5", border: "1px solid #E0E0E0", color: "#333", fontSize: 13, whiteSpace: "nowrap" }}>
              👆 Hacé clic en tu municipio para ver su estadística y puntuarlo
            </div>
          </div>
          <div style={{ width: '100%', position: 'relative' }}>
            <MapaPoligonos
              municipios={municipios}
              onSeleccionar={(mun) => setActivo(mun)}
            />
            {activo && (
              <div style={{ position: 'absolute', inset: 0, zIndex: 1000 }}>
                <PanelMunicipio
                  mun={activo}
                  usuario={usuario}
                  onClose={() => setActivo(null)}
                  onVotado={async () => {
                    const { data } = await getMunicipios();
                    if (data) {
                      setMunicipios(data);
                      const updated = data.find(m => m.id === activo.id);
                      if (updated) setActivo(updated);
                    }
                  }}
                />
              </div>
            )}
          </div>
          {/* Leyenda — desktop */}
          <div className="legend-desktop" style={{ gap: 14, alignItems: "center", justifyContent: "center", padding: "10px 0" }}>
            {[[T.green, "≥ 4.0 Favorable"], [T.yellow, "3–3.9 Moderado"], [T.red, "< 3.0 Difícil"]].map(([c, l]) => (
              <div key={l} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />
                <span style={{ fontSize: 12, color: T.textMid }}>{l}</span>
              </div>
            ))}
          </div>
          {/* Leyenda — mobile bottom sheet */}
          <div className="legend-bottom-sheet" style={{ transform: legendOpen ? "translateY(0)" : "translateY(calc(100% - 44px))" }}>
            <div onClick={() => setLegendOpen(o => !o)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "12px 24px", cursor: "pointer", minHeight: 44 }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: T.borderMid }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: T.textMid }}>Leyenda del mapa</span>
              <span style={{ fontSize: 11, color: T.textLight }}>{legendOpen ? "▼" : "▲"}</span>
            </div>
            <div style={{ display: "flex", gap: 20, alignItems: "center", justifyContent: "center", padding: "4px 24px 20px", flexWrap: "wrap" }}>
              {[[T.green, "≥ 4.0 Favorable"], [T.yellow, "3–3.9 Moderado"], [T.red, "< 3.0 Difícil"]].map(([c, l]) => (
                <div key={l} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 12, height: 12, borderRadius: "50%", background: c }} />
                  <span style={{ fontSize: 13, color: T.textMid }}>{l}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* VISTA: RANKING */}
      {vista === "ranking" && (
        <VistaRanking municipios={municipios} onRefresh={refreshMunicipios} />
      )}

      {/* VISTA: NOTICIAS */}
      {vista === "noticias" && (
        <div style={{ flex: 1, width: "100%", padding: "52px 48px", animation: "fadeUp 0.25s ease" }}>
          <div style={{ maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
            <p style={{ margin: "0 0 6px", fontSize: 12, color: T.orange, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>Blog & Noticias</p>
            <h1 style={{ margin: "0 0 10px", fontSize: 42, fontWeight: 800, color: T.text, letterSpacing: -1 }}>Para <span style={{ color: T.orange }}>desarrolladores</span> e inversores</h1>
            <p style={{ fontSize: 17, color: T.textMid, margin: "0 0 40px" }}>Normativa, análisis y novedades del sector en el AMBA.</p>
          </div>

          {cargando
            ? <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(290px,1fr))", gap: 22 }}>
                {[1,2,3].map(i => <Skeleton key={i} h={320} radius={16} />)}
              </div>
            : articulos.length === 0
              ? null
              : <>
                  {articulos.find(a => a.destacado) && (() => {
                    const dest = articulos.find(a => a.destacado);
                    return (
                      <div className="featured-article" style={{ display: "flex", borderRadius: T.radiusXl, overflow: "hidden", background: T.bg, boxShadow: T.shadowHover, border: `1px solid ${T.border}`, marginBottom: 32, cursor: "pointer" }}>
                        {dest.imagen_url && <div className="featured-article-image" style={{ width: "42%", flexShrink: 0, overflow: "hidden", minHeight: 280 }}><img src={dest.imagen_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => e.target.style.display = "none"} /></div>}
                        <div style={{ padding: "36px 40px" }}>
                          <Pill label="DESTACADO" color={T.orange} />
                          <h2 style={{ margin: "14px 0 14px", fontSize: 24, fontWeight: 800, color: T.text, lineHeight: 1.35 }}>{dest.titulo}</h2>
                          <p style={{ fontSize: 15, color: T.textMid, lineHeight: 1.7, margin: "0 0 18px" }}>{dest.resumen}</p>
                          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                            <span style={{ fontSize: 12, color: T.textLight }}>{formatFecha(dest.created_at)}</span>
                            <span style={{ fontSize: 13, color: T.orange, fontWeight: 700 }}>Leer artículo →</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 24 }}>
                    {articulos.filter(a => !a.destacado).map((n, i) => (
                      <div key={i} style={{ background: T.bg, borderRadius: T.radiusXl, overflow: "hidden", border: `1px solid ${T.border}`, cursor: "pointer", boxShadow: T.shadowCard, transition: "box-shadow 0.2s, transform 0.2s" }}
                        onMouseEnter={e => { e.currentTarget.style.boxShadow = T.shadowHover; e.currentTarget.style.transform = "translateY(-4px)"; }}
                        onMouseLeave={e => { e.currentTarget.style.boxShadow = T.shadowCard; e.currentTarget.style.transform = "translateY(0)"; }}
                      >
                        {n.imagen_url && <div style={{ height: 200, overflow: "hidden", background: T.bgMuted }}><img src={n.imagen_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => e.target.style.display = "none"} /></div>}
                        <div style={{ padding: "24px 26px 26px" }}>
                          <div style={{ marginBottom: 12 }}><Pill label={n.categoria} color={T.blue} /></div>
                          <h3 style={{ margin: "0 0 12px", fontSize: 17, fontWeight: 700, color: T.text, lineHeight: 1.45 }}>{n.titulo}</h3>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: 12, color: T.textLight }}>{formatFecha(n.created_at)}</span>
                            <span style={{ fontSize: 13, color: T.orange, fontWeight: 700 }}>Leer →</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
          }

          {/* ── Noticias externas — carrusel ────────────────── */}
          <div style={{ marginTop: articulos.length > 0 ? 48 : 0 }}>
            <NoticiasCarrusel />
          </div>

          {/* ── Opiniones de la comunidad ───────────────────── */}
          <div style={{ marginTop: 56 }}>
            <div style={{ marginBottom: 24 }}>
              <div style={{ textAlign: "center", marginBottom: 12 }}>
                <p style={{ margin: "0 0 4px", fontSize: 11, color: T.orange, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", textAlign: "center" }}>Comunidad</p>
                <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: T.text, letterSpacing: -0.5, textAlign: "center" }}>Opiniones anónimas</h2>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <select
                  value={filtroComMunicipio}
                  onChange={e => setFiltroComMunicipio(e.target.value)}
                  style={{ padding: "9px 14px", borderRadius: T.radius, border: `1.5px solid ${T.border}`, background: T.bg, color: filtroComMunicipio ? T.text : T.textLight, fontSize: 13, fontFamily: "inherit", cursor: "pointer" }}
                >
                  <option value="">Todos los municipios</option>
                  {municipios.map(m => <option key={m.id} value={m.nombre}>{m.nombre}</option>)}
                </select>
              </div>
            </div>

            {cargandoComments
              ? <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 16 }}>
                  {[1,2,3].map(i => <Skeleton key={i} h={110} radius={14} />)}
                </div>
              : comentariosComunidad.length === 0
                ? <p style={{ color: T.textLight, textAlign: "center", marginTop: 32, fontSize: 14 }}>
                    Aún no hay opiniones de la comunidad.{!filtroComMunicipio ? " ¡Calificá un municipio para ser el primero!" : ""}
                  </p>
                : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 16 }}>
                    {comentariosComunidad.map((c, i) => (
                      <div key={i} style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: "16px 18px", boxShadow: T.shadowCard }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: T.orange }}>
                            {c.municipios?.nombre || "—"}
                          </span>
                          <span style={{ fontSize: 11, color: T.textLight }}>{formatFecha(c.created_at)}</span>
                        </div>
                        <p style={{ margin: 0, fontSize: 13, color: T.textMid, lineHeight: 1.6 }}>{c.comentario}</p>
                        {c.tipo_proyecto && (
                          <div style={{ marginTop: 10 }}><Pill label={c.tipo_proyecto} color={T.blue} /></div>
                        )}
                      </div>
                    ))}
                  </div>
            }
          </div>
        </div>
      )}

      {/* VISTA: METODOLOGÍA */}
      {vista === "metodologia" && (
        <div style={{ flex: 1, width: "100%", padding: "52px 48px", animation: "fadeUp 0.25s ease" }}>
          <div style={{ maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
            <p style={{ margin: "0 0 6px", fontSize: 12, color: T.orange, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>Transparencia</p>
            <h1 className="metodologia-heading" style={{ margin: "0 0 10px", fontSize: 42, fontWeight: 800, color: T.text, letterSpacing: -1, lineHeight: 1.2 }}>Metodología & <span style={{ color: T.orange }}>Privacidad</span></h1>
            <p style={{ fontSize: 17, color: T.textMid, marginBottom: 36, lineHeight: 1.7 }}>Munilupa es una herramienta de inteligencia colectiva. Los índices reflejan la experiencia de los usuarios, no la posición de ninguna organización ni partido político.</p>
          </div>
          <div style={{ maxWidth: 860, margin: "0 auto", display: "flex", flexDirection: "column", gap: 14 }}>
            {[
              { icon: "⚖️", titulo: "¿Cómo se calcula el índice?", texto: `Transparencia (25%) · Velocidad de aprobación (20%) · Claridad normativa (20%) · Previsibilidad (15%) · Atención al público (10%) · Carga impositiva (10%). El promedio ponderado de todas las encuestas válidas genera el índice de cada municipio.` },
              { icon: "🙋", titulo: "¿Quién puede participar?", texto: "Desarrolladores, constructores, arquitectos, ingenieros y vecinos que construyeron su vivienda. Recomendamos calificar solo municipios donde hayas trabajado, aunque no hay restricción formal." },
              { icon: "🛡️", titulo: "¿Cómo se evitan votos duplicados?", texto: "Cada email puede votar una sola vez por municipio. El sistema valida el email antes de registrar el voto." },
              { icon: "🔒", titulo: "Privacidad de tus datos", texto: "Almacenamos únicamente el hash de tu email, la fecha del voto y los puntajes. Cumplimos con la Ley 25.326 de Protección de Datos Personales de la República Argentina." },
            ].map((s, i) => (
              <div key={i} style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: "28px 36px", display: "flex", alignItems: "flex-start", gap: 22, boxShadow: T.shadowCard }}>
                <div style={{ fontSize: 32, width: 48, flexShrink: 0, textAlign: "center", marginTop: 2 }}>{s.icon}</div>
                <div style={{ flex: 1, textAlign: "left" }}>
                  <p style={{ margin: "0 0 8px", fontSize: 19, fontWeight: 700, color: T.text }}>{s.titulo}</p>
                  <p style={{ margin: 0, fontSize: 15, color: T.textMid, lineHeight: 1.7 }}>{s.texto}</p>
                </div>
              </div>
            ))}
            {/* Sponsor */}
            <div style={{ marginTop: 18, padding: "26px 36px", borderRadius: T.radiusXl, background: `linear-gradient(135deg, ${T.orangeSoft}, #FFF)`, border: `1.5px solid ${T.orangeMid}`, display: "flex", alignItems: "flex-start", gap: 22 }}>
              <div style={{ width: 48, flexShrink: 0, textAlign: "center", fontSize: 30, marginTop: 2 }}>🤝</div>
              <div style={{ flex: 1, textAlign: "left" }}>
                <p style={{ margin: "0 0 4px", fontSize: 12, color: T.orange, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" }}>Patrocinios</p>
                <p style={{ margin: 0, fontSize: 15, color: T.textMid }}>¿Tu empresa quiere llegar a desarrolladores del AMBA? <span style={{ color: T.orange, fontWeight: 700, cursor: "pointer" }} onClick={() => setVista("contacto")}>Hablemos →</span></p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VISTA: CONTACTO */}
      {vista === "contacto" && (
        <div style={{ flex: 1, width: "100%", padding: "52px 48px", animation: "fadeUp 0.25s ease", display: "flex", flexDirection: "column", alignItems: "center"}}>
          <p style={{ margin: "0 0 6px", fontSize: 12, color: T.orange, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>Escribinos</p>
          <h1 style={{ margin: "0 0 10px", fontSize: 42, fontWeight: 800, color: T.text, letterSpacing: -1 }}>
            <span style={{ color: T.orange }}>Contacto</span>
          </h1>
          <p style={{ fontSize: 17, color: T.textMid, margin: "0 0 36px", lineHeight: 1.7, textAlign: "center" }}>
            ¿Encontraste un error, querés dar feedback o hablar de patrocinios? Completá el formulario y te respondemos.
          </p>

          {contactoEnviado ? (
            <div style={{ maxWidth: 520, textAlign: "center", padding: "40px 0" }}>
              <div style={{ width: 72, height: 72, borderRadius: "50%", background: T.greenSoft, border: `2px solid ${T.greenMid}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, margin: "0 auto 20px" }}>✓</div>
              <p style={{ fontSize: 18, fontWeight: 700, color: T.text, margin: "0 0 10px" }}>¡Mensaje enviado!</p>
              <p style={{ fontSize: 14, color: T.textMid, lineHeight: 1.6 }}>Gracias por contactarnos. Te respondemos a la brevedad.</p>
              <div style={{ marginTop: 24 }}>
                <BtnGhost onClick={() => { setContactoEnviado(false); setContactForm({ nombre: "", email: "", tipoConsulta: "", mensaje: "" }); }}>Enviar otro mensaje</BtnGhost>
              </div>
            </div>
          ) : (
            <div style={{ maxWidth: 680, margin: "0 auto" }}>
              {errorContacto && (
                <div style={{ padding: "12px 14px", borderRadius: T.radiusSm, background: T.redSoft, border: `1px solid ${T.redMid}`, color: T.red, fontSize: 13, marginBottom: 20 }}>{errorContacto}</div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: T.textMid, marginBottom: 7, letterSpacing: 0.5 }}>NOMBRE</label>
                    <input
                      type="text"
                      placeholder="Tu nombre"
                      value={contactForm.nombre}
                      onChange={e => setContactForm(f => ({ ...f, nombre: e.target.value }))}
                      style={{ width: "100%", padding: "14px 18px", borderRadius: T.radiusSm, border: `1.5px solid ${T.border}`, background: T.bg, color: T.text, fontSize: 16, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: T.textMid, marginBottom: 7, letterSpacing: 0.5 }}>EMAIL</label>
                    <input
                      type="email"
                      placeholder="tu@email.com"
                      value={contactForm.email}
                      onChange={e => setContactForm(f => ({ ...f, email: e.target.value }))}
                      style={{ width: "100%", padding: "14px 18px", borderRadius: T.radiusSm, border: `1.5px solid ${T.border}`, background: T.bg, color: T.text, fontSize: 16, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: T.textMid, marginBottom: 7, letterSpacing: 0.5 }}>TIPO DE CONSULTA</label>
                  <select
                    value={contactForm.tipoConsulta}
                    onChange={e => setContactForm(f => ({ ...f, tipoConsulta: e.target.value }))}
                    style={{ width: "100%", padding: "14px 18px", borderRadius: T.radiusSm, border: `1.5px solid ${T.border}`, background: T.bg, color: contactForm.tipoConsulta ? T.text : T.textLight, fontSize: 16, fontFamily: "inherit", outline: "none" }}
                  >
                    <option value="">Seleccioná una opción</option>
                    {["Feedback", "Error técnico", "Publicidad / Patrocinio", "Otro"].map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: T.textMid, marginBottom: 7, letterSpacing: 0.5 }}>MENSAJE</label>
                  <textarea
                    placeholder="Escribí tu mensaje..."
                    value={contactForm.mensaje}
                    onChange={e => setContactForm(f => ({ ...f, mensaje: e.target.value }))}
                    rows={5}
                    maxLength={1000}
                    style={{ width: "100%", padding: "14px 18px", borderRadius: T.radiusSm, border: `1.5px solid ${T.border}`, background: T.bg, color: T.text, fontSize: 16, fontFamily: "inherit", outline: "none", resize: "vertical", boxSizing: "border-box", minHeight: 140 }}
                  />
                  {contactForm.mensaje.length > 0 && (
                    <p style={{ margin: "4px 0 0", fontSize: 11, color: T.textLight, textAlign: "right" }}>{contactForm.mensaje.length}/1000</p>
                  )}
                </div>
                <BtnPrimary
                  full
                  disabled={enviandoContacto}
                  onClick={async () => {
                    if (!contactForm.nombre || !contactForm.email || !contactForm.tipoConsulta || !contactForm.mensaje) {
                      setErrorContacto("Por favor completá todos los campos.");
                      return;
                    }
                    setEnviandoContacto(true); setErrorContacto(null);
                    const { error } = await enviarContacto({
                      nombre:       contactForm.nombre,
                      email:        contactForm.email,
                      tipoConsulta: contactForm.tipoConsulta,
                      mensaje:      contactForm.mensaje,
                    });
                    setEnviandoContacto(false);
                    if (error) { setErrorContacto("No se pudo enviar el mensaje. Intentá de nuevo."); return; }
                    setContactoEnviado(true);
                  }}
                >
                  {enviandoContacto ? "Enviando..." : "Enviar mensaje →"}
                </BtnPrimary>
              </div>
            </div>
          )}
        </div>
      )}

      {/* FAB — Calificar municipio (solo mobile, oculto en Contacto para no tapar el formulario) */}
      {vista !== "contacto" && <button
        className="fab-mobile"
        onClick={() => setMostrarModalCalificar(true)}
        title="Calificar municipio"
        style={{
          position: "fixed", bottom: 88, right: 24,
          width: 56, height: 56, borderRadius: "50%",
          background: T.orange, color: "#fff", fontSize: 22,
          boxShadow: `0 4px 20px ${T.orange}88`,
          zIndex: 1100, border: "none", cursor: "pointer",
          alignItems: "center", justifyContent: "center",
          fontFamily: "inherit",
          transition: "transform 0.2s ease, box-shadow 0.2s ease",
          lineHeight: 1,
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.12)"; }}
        onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
      >★</button>}

      {/* FOOTER */}
      <footer style={{ borderTop: `1px solid ${T.border}`, padding: "20px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", background: T.bg, fontSize: 13, color: T.textLight, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontWeight: 800, fontSize: 15, color: T.text }}>Muni<span style={{ color: T.orange }}>lupa</span></span>
          <span style={{ color: T.borderMid }}>·</span>
          <span>© 2025 · Gestión Municipal a la vista</span>
        </div>
        <div style={{ display: "flex", gap: 22 }}>
          {["Términos", "Privacidad", "Contacto"].map(l => <span key={l} style={{ cursor: "pointer" }}>{l}</span>)}
        </div>
      </footer>
    </div>
  );
}
