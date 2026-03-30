// ⚠️ NOTA VITE: No usar 'use client' — eso es solo Next.js
// En Vite todos los componentes son del cliente por defecto

import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';

// 🎨 Función que decide el color según el puntaje
function obtenerColor(puntaje) {
  if (!puntaje || puntaje === 0) return '#CCCCCC'; // Gris: sin datos
  if (puntaje < 3)  return '#E74C3C'; // 🔴 Rojo: difícil (1 a 2.9)
  if (puntaje < 4)  return '#F39C12'; // 🟡 Amarillo: moderado (3 a 3.9)
  return '#27AE60';                   // 🟢 Verde: favorable (4 a 5)
}

export default function MapaPoligonos({ municipios }) {
  const [geojsonData, setGeojsonData] = useState(null);
  const [seleccionado, setSeleccionado] = useState(null);
  // geojsonLayerRef guarda referencia a la capa para poder resetear estilos
  const geojsonLayerRef = useRef(null);

  // 📥 Cargamos el GeoJSON desde la carpeta public/ cuando el componente arranca
  useEffect(() => {
    fetch('/municipios-amba.geojson')
      .then(res => res.json())
      .then(data => setGeojsonData(data))
      .catch(err => console.error('Error al cargar el GeoJSON:', err));
  }, []);
  useEffect(() => {
  setTimeout(() => {
    window.dispatchEvent(new Event('resize'));
  }, 100);
  }, []);
  // 🎨 Función de estilo para cada polígono
  function estilo(feature) {
    // El nombre del municipio en el GeoJSON puede ser "NAM", "nombre", "NOMDEPTO"
    // Revisá tu archivo GeoJSON para saber cuál es el correcto
    const nombre = feature.properties.departamento;
    
    // Buscamos ese municipio en nuestros datos de puntajes
    const datos = municipios?.find(m =>
      m.nombre.toLowerCase().trim() === nombre?.toLowerCase().trim()
    );
    
    return {
      fillColor: obtenerColor(datos?.puntaje_promedio || 0),
      fillOpacity: 0.65,
      color: '#FFFFFF',  // borde blanco
      weight: 2,
    };
  }

  // 🖱️ Función que se ejecuta para cada polígono al renderizarse
  function onCadaPoligono(feature, layer) {
    const nombre = feature.properties.departamento;
    const datos = municipios?.find(m =>
      m.nombre.toLowerCase().trim() === nombre?.toLowerCase().trim()
    );
    const puntaje = datos?.puntaje_promedio?.toFixed(1) || 'Sin datos';

    // Tooltip: aparece al pasar el mouse
    layer.bindTooltip(
      `${nombre}
Índice: ${puntaje} / 5.0`,
      { sticky: true, direction: 'top' }
    );

    // Eventos del mouse
    layer.on({
      mouseover: (e) => {
        e.target.setStyle({ fillOpacity: 0.9, weight: 3, color: '#E87722' });
      },
      mouseout: (e) => {
        if (geojsonLayerRef.current) {
          geojsonLayerRef.current.resetStyle(e.target);
        }
      },
      click: () => {
        setSeleccionado({
          nombre,
          puntaje: datos?.puntaje_promedio || 0,
          evaluaciones: datos?.total_evaluaciones || 0,
        });
      },
    });
  }

  return (
    <div>
      {/* 🗺️ Contenedor del mapa */}
      <MapContainer center={[-34.62, -58.44]} zoom={9} style={{ height: '600px', width: '100%' }}>
        {/* Fondo cartográfico limpio y gratuito */}
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap contributors' />

        {/* Polígonos del GeoJSON — solo se renderizan cuando el archivo cargó */}
        {geojsonData && (
          <GeoJSON data={geojsonData} style={estilo} onEachFeature={onCadaPoligono} ref={geojsonLayerRef} />
        )}
      </MapContainer>

      {/* Panel informativo del municipio seleccionado */}
      {seleccionado && (
        <div style={{ marginTop: '20px', padding: '20px', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2>
              {seleccionado.nombre}
            </h2>
            <span style={{ fontSize: '12px', color: '#999' }}>
              {seleccionado.evaluaciones} evaluaciones
            </span>
          </div>

          <div style={{ marginTop: '10px' }}>
            <p style={{ fontSize: '14px', color: '#666' }}>
              Índice de Puntuación:
            </p>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#27AE60' }}>
              {seleccionado.puntaje.toFixed ? seleccionado.puntaje.toFixed(1) : '0.0'}
               /5.0
            </div>
          </div>

          <button onClick={() => setSeleccionado(null)}
            style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#aaa', marginLeft: 12 }}
          >×</button>
        </div>
      )}

      {/* Leyenda de colores */}
      <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#fff', borderRadius: '5px' }}>
        <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '20px', height: '20px', backgroundColor: '#27AE60', borderRadius: '3px' }}></div>
            ≥ 4.0 Favorable
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '20px', height: '20px', backgroundColor: '#F39C12', borderRadius: '3px' }}></div>
            3–3.9 Moderado
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '20px', height: '20px', backgroundColor: '#E74C3C', borderRadius: '3px' }}></div>
            {'<'} 3.0 Difícil
          </div>
        </div>
      </div>
    </div>
  );
}