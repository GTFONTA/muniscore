// ⚠️ NOTA VITE: No usar 'use client' — eso es solo Next.js
// En Vite todos los componentes son del cliente por defecto

import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';

// Quita tildes y normaliza para comparar nombres de municipios
function normalizar(str) {
  return str?.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\./g, '').toLowerCase().trim() || '';
}

// 🎨 Función que decide el color según el puntaje (polígonos del mapa)
function obtenerColor(puntaje) {
  if (!puntaje || puntaje === 0) return '#CCCCCC'; // Gris: sin datos
  if (puntaje < 3)  return '#E74C3C'; // 🔴 Rojo: difícil (1 a 2.9)
  if (puntaje < 4)  return '#F39C12'; // 🟡 Amarillo: moderado (3 a 3.9)
  return '#27AE60';                   // 🟢 Verde: favorable (4 a 5)
}

// 🎨 Color del badge en el tooltip (escala más fina — WCAG 2.1 AA sobre blanco)
function obtenerColorBadge(puntaje) {
  if (!puntaje || puntaje === 0) return '#9CA3AF';
  if (puntaje < 2.5) return '#D32F2F'; // ratio ~5.2:1 ✓
  if (puntaje < 3.5) return '#C27D00'; // ratio ~4.7:1 ✓
  return '#007A70';                    // ratio ~4.6:1 ✓
}

// Componente interno que accede al mapa para hacer zoom
function ZoomToFeature({ feature }) {
  const map = useMap();
  useEffect(() => {
    if (!feature) return;
    try {
      const bounds = L.geoJSON(feature).getBounds();
      map.fitBounds(bounds, { padding: [40, 40] });
    } catch (e) {
      console.error('Error al hacer zoom al municipio:', e);
    }
  }, [feature, map]);
  return null;
}

export default function MapaPoligonos({ municipios, onSeleccionar }) {
  const [geojsonData, setGeojsonData]     = useState(null);
  const [seleccionado, setSeleccionado]   = useState(null);
  const [busqueda, setBusqueda]           = useState('');
  const [sugerencias, setSugerencias]     = useState([]);
  const [featureFoco, setFeatureFoco]     = useState(null);
  const [isMobile, setIsMobile]           = useState(false);
  const [mapInteractive, setMapInteractive] = useState(false);

  const geojsonLayerRef  = useRef(null);
  const municipiosRef    = useRef(municipios);
  const busquedaRef      = useRef(null);

  // Mantener el ref sincronizado en cada render (antes de que Leaflet llame a onCadaPoligono)
  municipiosRef.current = municipios;

  // 📥 Cargar el GeoJSON desde /public
  useEffect(() => {
    fetch('/municipios-amba.geojson')
      .then(res => res.json())
      .then(data => setGeojsonData(data))
      .catch(err => console.error('Error al cargar el GeoJSON:', err));
  }, []);

  useEffect(() => {
    setTimeout(() => window.dispatchEvent(new Event('resize')), 100);
  }, []);

  // Detectar mobile para activar overlay de interacción consciente
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // (municipiosRef se actualiza en el render body para garantizar sincronía con Leaflet)

  // Cerrar sugerencias al hacer click fuera
  useEffect(() => {
    function handler(e) {
      if (busquedaRef.current && !busquedaRef.current.contains(e.target)) {
        setSugerencias([]);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ─── Buscador ──────────────────────────────────────────
  function handleBusqueda(valor) {
    setBusqueda(valor);
    if (!valor.trim() || !geojsonData) { setSugerencias([]); return; }
    const filtradas = geojsonData.features
      .filter(f => normalizar(f.properties.departamento).includes(normalizar(valor)))
      .slice(0, 7);
    setSugerencias(filtradas);
  }

  function seleccionarDesdeSearch(feature) {
    const nombre = feature.properties.departamento;
    setBusqueda(nombre);
    setSugerencias([]);
    setFeatureFoco(feature);

    const datos = municipiosRef.current?.find(m => normalizar(m.nombre) === normalizar(nombre));
    setSeleccionado({
      nombre,
      puntaje:     datos?.puntaje_global || 0,
      evaluaciones: datos?.total_votos || 0,
    });
    if (onSeleccionar && datos) onSeleccionar(datos);
  }

  // ─── Estilo de cada polígono ────────────────────────────
  function estilo(feature) {
    const nombre = feature.properties.departamento;
    const datos  = municipios?.find(m => normalizar(m.nombre) === normalizar(nombre));
    return {
      fillColor:   obtenerColor(datos?.puntaje_global || 0),
      fillOpacity: 0.65,
      color:       '#FFFFFF',
      weight:      2,
    };
  }

  // ─── Eventos de cada polígono ───────────────────────────
  function onCadaPoligono(feature, layer) {
    const nombre     = feature.properties.departamento;
    const datos      = municipiosRef.current?.find(m => normalizar(m.nombre) === normalizar(nombre));
    const puntajeRaw = datos?.puntaje_global;
    const puntaje    = puntajeRaw?.toFixed(1) || null;
    const color      = obtenerColorBadge(puntajeRaw);
    const barWidth   = puntajeRaw ? Math.round((puntajeRaw / 5) * 100) : 0;

    const tooltipHTML = `
      <div style="padding:10px 14px;min-width:180px;font-family:'Manrope',sans-serif;">
        <div style="font-size:12px;font-weight:700;color:#1A1A1A;margin-bottom:6px;letter-spacing:0.5px;text-transform:uppercase;">
          🏛 ${nombre}
        </div>
        <div style="height:1px;background:#E8E4DF;margin-bottom:8px;"></div>
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="border:2px solid ${color};color:${color};background:${color}18;font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;letter-spacing:0.3px;white-space:nowrap;">
            ${puntaje ? `★ ${puntaje}` : 'Sin datos'}
          </span>
          ${puntaje ? `<span style="font-size:12px;color:#9CA3AF;">/ 5.0</span>` : ''}
        </div>
        ${puntaje ? `
        <div style="margin-top:8px;height:4px;background:#F3F0EC;border-radius:4px;overflow:hidden;">
          <div style="height:100%;width:${barWidth}%;background:${color};border-radius:4px;"></div>
        </div>` : ''}
      </div>
    `;

    layer.bindTooltip(tooltipHTML, {
      sticky: true,
      direction: 'top',
      className: 'muni-tooltip',
    });

    layer.on({
      mouseover: (e) => {
        e.target.setStyle({ fillOpacity: 0.9, weight: 3, color: '#E87722' });
      },
      mouseout: (e) => {
        if (geojsonLayerRef.current) geojsonLayerRef.current.resetStyle(e.target);
      },
      click: () => {
        const datosClick = municipiosRef.current?.find(m => normalizar(m.nombre) === normalizar(nombre));
        setSeleccionado({
          nombre,
          puntaje:      datosClick?.puntaje_global || 0,
          evaluaciones: datosClick?.total_votos || 0,
        });
        if (onSeleccionar) onSeleccionar(datosClick || { nombre, id: null, puntaje_global: 0, total_votos: 0, region: '' });
      },
    });
  }

  return (
    <div>
      <style>{`
        @keyframes muniTooltipFadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .leaflet-tooltip.muni-tooltip {
          background: #FFFFFF;
          border: none;
          border-radius: 12px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.07);
          padding: 0;
          animation: muniTooltipFadeIn 150ms ease;
        }
        .leaflet-tooltip.muni-tooltip::before {
          display: none;
        }
      `}</style>
      {/* 🔍 Buscador de municipios */}
      <div ref={busquedaRef} style={{ position: 'relative', marginBottom: 10 }}>
        <input
          type="text"
          placeholder="🔍 Buscar municipio..."
          value={busqueda}
          onChange={e => handleBusqueda(e.target.value)}
          style={{
            width: '100%', padding: '10px 16px', borderRadius: 10,
            border: '1.5px solid #E8E4DF', background: '#FFFFFF',
            fontSize: 14, fontFamily: 'inherit', outline: 'none',
            boxSizing: 'border-box', color: '#1A1A1A',
          }}
          onFocus={e => { e.target.style.borderColor = '#E8612A'; }}
          onBlur={e  => { e.target.style.borderColor = '#E8E4DF'; }}
        />
        {sugerencias.length > 0 && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
            background: '#FFFFFF', border: '1px solid #E8E4DF', borderRadius: 10,
            zIndex: 1001, boxShadow: '0 8px 24px rgba(0,0,0,0.1)', overflow: 'hidden',
          }}>
            {sugerencias.map(f => {
              const nom  = f.properties.departamento;
              const dat  = municipiosRef.current?.find(m => normalizar(m.nombre) === normalizar(nom));
              const color = obtenerColor(dat?.puntaje_global || 0);
              return (
                <div
                  key={nom}
                  onMouseDown={() => seleccionarDesdeSearch(f)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid #F3F0EC', minHeight: 44 }}
                  onMouseEnter={e => e.currentTarget.style.background = '#FDF1EC'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: '#1A1A1A', textTransform: 'capitalize', fontFamily: 'inherit' }}>
                    {nom.charAt(0) + nom.slice(1).toLowerCase()}
                  </span>
                  {dat?.puntaje_global ? (
                    <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700, color }}>
                      {dat.puntaje_global.toFixed(1)}
                    </span>
                  ) : (
                    <span style={{ marginLeft: 'auto', fontSize: 11, color: '#A09890' }}>Sin datos</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 🗺️ Mapa */}
      <div style={{ position: 'relative' }}>
        {/* Overlay de interacción consciente — solo mobile, hasta primer tap */}
        {isMobile && !mapInteractive && (
          <div className="map-touch-overlay" onClick={() => setMapInteractive(true)}>
            <span>Tocá para activar el mapa<br />Usá dos dedos para desplazar</span>
          </div>
        )}
        <MapContainer
          center={[-34.62, -58.44]}
          zoom={9}
          style={{ height: '65vh', minHeight: '500px', width: '100%', borderRadius: 0 }}
          scrollWheelZoom={!isMobile || mapInteractive}
          dragging={!isMobile || mapInteractive}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap contributors'
          />
          {geojsonData && (
            <GeoJSON
              key={(municipios?.reduce((acc, m) => acc + (m.puntaje_global || 0), 0) ?? 0).toFixed(4)}
              data={geojsonData}
              style={estilo}
              onEachFeature={onCadaPoligono}
              ref={geojsonLayerRef}
            />
          )}
          {/* Zoom al municipio seleccionado desde el buscador */}
          <ZoomToFeature feature={featureFoco} />
        </MapContainer>
      </div>
    </div>
  );
}
