import { useState } from 'react';
// ✅ CORRECTO para Vite — importar desde la ruta relativa
import { supabase } from '../lib/supabase';

// Lista de municipios del AMBA — modificá según necesites
const MUNICIPIOS_AMBA = [
  'CABA', 'Almirante Brown', 'Avellaneda', 'Berazategui', 'Berisso',
  'Brandsen', 'Campana', 'Cañuelas', 'Ensenada', 'Escobar',
  'Esteban Echeverría', 'Exaltación de la Cruz', 'Ezeiza', 'Florencio Varela',
  'General Las Heras', 'General Rodríguez', 'General San Martín', 'Hurlingham',
  'Ituzaingó', 'José C. Paz', 'La Matanza', 'La Plata', 'Lanús',
  'Lomas de Zamora', 'Luján', 'Malvinas Argentinas', 'Marcos Paz', 'Merlo',
  'Moreno', 'Morón', 'Pilar', 'Presidente Perón', 'Quilmes',
  'San Fernando', 'San Isidro', 'San Miguel', 'San Vicente',
  'Tigre', 'Tres de Febrero', 'Vicente López', 'Zárate',
];

// Componente principal del modal
export default function ModalCalificar({ alCerrar, alConfirmarMunicipio }) {
  // "paso" controla qué pantalla se muestra dentro del modal
  const [paso, setPaso] = useState('email'); // 'email' → 'esperando' → 'municipio'
  const [email, setEmail] = useState('');
  const [municipio, setMunicipio] = useState('');
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  // El usuario envía su email para recibir el magic link
  async function enviarMagicLink(e) {
    e.preventDefault();
    setCargando(true);
    setMensaje('');

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // Esta es la URL a la que Supabase redirige después de hacer clic en el email
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      setMensaje('❌ Error al enviar el email. Revisá que sea válido e intentá de nuevo.');
    } else {
      setPaso('esperando');
    }
    setCargando(false);
  }

  // El usuario confirma que ya verificó y elige el municipio
  function confirmarMunicipio() {
    if (!municipio) {
      setMensaje('Por favor elegí un municipio antes de continuar.');
      return;
    }
    // Llamamos a la función que nos pasó App.jsx para mostrar la encuesta
    alConfirmarMunicipio(municipio);
    alCerrar();
  }

return (
  // Fondo oscuro detrás del modal
  <div
    onClick={(e) => { if (e.target === e.currentTarget) alCerrar(); }}
    style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}
  >
    <div style={{
      background: 'white',
      borderRadius: 12,
      padding: '32px 24px',
      maxWidth: 500,
      width: '90%',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    }}>
      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
          {paso === 'email' && '📧 Verificá tu identidad'}
          {paso === 'esperando' && '📬 Revisá tu email'}
          {paso === 'municipio' && '📍 Elegí un municipio'}
        </h2>
        <button onClick={alCerrar} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer' }}>
          ×
        </button>
      </div>

      {/* PASO 1: Pedir email */}
      {paso === 'email' && (
        <div>
          <p style={{ color: '#666', fontSize: 14, marginBottom: 20 }}>
            Para garantizar la validez de las evaluaciones, verificamos que sos una persona real.
            Te enviaremos un link de acceso a tu email (sin contraseña).
          </p>
              


              
    <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 600, color: '#333' }}>
      Tu dirección de email
    </label>
    <input
      type="email"
      value={email}
      onChange={(e) => setEmail(e.target.value)}
      placeholder="ejemplo@correo.com"
      required
      style={{ width: '100%', border: '2px solid #ddd', borderRadius: 10, padding: '10px 14px', fontSize: 15, marginBottom: 16, outline: 'none', boxSizing: 'border-box' }}
    />
    <button onClick={enviarMagicLink} disabled={cargando} style={{ width: '100%', background: '#E87722', color: 'white', border: 'none', borderRadius: 10, padding: '12px 24px', fontWeight: 700, cursor: 'pointer' }}>
      {cargando ? 'Enviando...' : '✉️ Enviar link de verificación'}
    </button>
  </div>
)}

{/* PASO 2: Esperando que el usuario haga clic en el email */}
{paso === 'esperando' && (
  <div>
    <div style={{ textAlign: 'center', marginBottom: 20 }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>📬</div>
      <h3 style={{ margin: '0 0 12px 0', fontSize: 18, fontWeight: 700 }}>¡Link enviado!</h3>
      <p style={{ color: '#666', fontSize: 14, margin: 0 }}>
        Revisá tu casilla de correo y hacé clic en el link que te enviamos.
        Una vez que lo hagas, volvé aquí y continuá.
      </p>
    </div>
    <button onClick={() => setPaso('municipio')} style={{ width: '100%', background: '#E87722', color: 'white', border: 'none', borderRadius: 10, padding: '12px 24px', fontWeight: 700, cursor: 'pointer' }}>
      Ya verifiqué mi email →
    </button>
  </div>
)}

      {/* PASO 3: Elegir municipio */}
      {paso === 'municipio' && (
        <div>
          <p style={{ color: '#666', fontSize: 14, marginBottom: 20 }}>
            ¿En qué municipio realizaste o intentaste realizar una obra?
          </p>
          <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 600, color: '#333' }}>
            Seleccioná el municipio
          </label>
          <select value={municipio} onChange={(e) => setMunicipio(e.target.value)} style={{ width: '100%', border: '2px solid #ddd', borderRadius: 10, padding: '10px 14px', fontSize: 15, marginBottom: 16, outline: 'none', boxSizing: 'border-box' }}>
            <option value="">-- Elegí un municipio --</option>
            {MUNICIPIOS_AMBA.map((mun) => (
              <option key={mun} value={mun}>{mun}</option>
            ))}
          </select>
          <button onClick={confirmarMunicipio} style={{ width: '100%', background: '#E87722', color: 'white', border: 'none', borderRadius: 10, padding: '12px 24px', fontWeight: 700, cursor: 'pointer' }}>
            Calificar {municipio || 'municipio'} →
          </button>
        </div>
      )}

      {/* Mensajes de feedback */}
      {mensaje && (
        <div style={{ color: '#d32f2f', marginTop: 16, padding: '10px 14px', background: '#ffebee', borderRadius: 10, fontSize: 14 }}>
          {mensaje}
        </div>
      )}
    </div>
  </div>
);
}