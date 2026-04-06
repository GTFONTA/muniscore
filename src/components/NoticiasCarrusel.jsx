// ============================================================
//  NoticiasCarrusel.jsx
//  Carrusel de noticias externas — sin librerías externas
//
//  Desktop (≥768px): 3 tarjetas visibles simultáneamente
//  Mobile  (<768px): 1 tarjeta visible
//  Flechas laterales con scroll suave nativo
//
//  Política de copyright:
//  - Copetes de redacción propia (no reproduce texto original)
//  - Imágenes libres de Unsplash (Unsplash License)
//  - Título como enlace externo _blank
//  - Crédito visible al medio fuente
// ============================================================

import { useRef, useState, useEffect, useCallback } from 'react';

// ─── Tokens de diseño sincronizados con App.jsx ──────────────
const T = {
  bg:          "#FFFFFF",
  bgWarm:      "#F7F5F2",
  border:      "#E8E4DF",
  text:        "#1A1A1A",
  textMid:     "#6B6560",
  textLight:   "#A09890",
  orange:      "#E8612A",
  radius:      "16px",
  radiusSm:    "10px",
  shadow:      "0 2px 16px rgba(0,0,0,0.07)",
  shadowHover: "0 8px 40px rgba(0,0,0,0.13)",
  shadowCard:  "0 1px 6px rgba(0,0,0,0.06)",
};

// ─── Datos de los artículos externos ─────────────────────────
// Copetes: redacción propia. Imágenes: Unsplash (libres de uso).
// Fuente: solo enlace externo, sin reproducción de texto original.
const ARTICULOS = [
  {
    id: 1,
    titulo: "Qué necesita el mercado inmobiliario para reactivarse en 2026",
    copete:
      "El sector analiza las condiciones macroeconómicas y regulatorias que podrían impulsar una recuperación sostenida de la actividad inmobiliaria en Argentina durante el próximo año. Expertos identifican los factores clave que deben confluir para que la demanda repunte.",
    fuente: "El Cronista",
    url: "https://www.cronista.com/columnistas/que-necesita-el-mercado-inmobiliario-para-reactivarse-en-2026/",
    // Imagen: edificios de oficinas y viviendas — Unsplash (libre de uso)
    imagen: "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=600&q=80",
    alt: "Vista de edificios de oficinas y viviendas en ciudad",
  },
  {
    id: 2,
    titulo: "La Justicia suspende nuevas habilitaciones de torres en Tigre y el Municipio anticipa que apelará la medida",
    copete:
      "Una resolución judicial frena temporalmente los permisos de construcción para nuevas torres en el partido de Tigre, en respuesta a una demanda vecinal por impacto ambiental y urbano. El ejecutivo municipal anunció que recurrirá la medida ante la instancia superior.",
    fuente: "Zona Norte Diario",
    url: "https://www.zonanortediario.com.ar/13/11/2025/la-justicia-suspende-nuevas-habilitaciones-de-torres-en-tigre-y-el-municipio-anticipa-que-apelara-la-medida/",
    // Imagen: obra en construcción con grúas — Unsplash (libre de uso)
    imagen: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&q=80",
    alt: "Obra en construcción con grúas en zona urbana",
  },
  {
    id: 3,
    titulo: "A más de cuatro meses de la denuncia, la Municipalidad sigue sin informar cuáles son los 400 barrios ilegales",
    copete:
      "La Plata mantiene sin respuesta pública una denuncia que señala la existencia de cuatro centenas de asentamientos irregulares dentro del ejido municipal. La falta de transparencia genera interrogantes sobre la planificación territorial y los derechos de los vecinos afectados.",
    fuente: "0221.com.ar",
    url: "https://www.0221.com.ar/la-plata/a-mas-cuatro-meses-la-denuncia-la-municipalidad-sigue-informar-cuales-son-los-400-barrios-ilegales-n105712",
    // Imagen: barrio residencial denso visto desde arriba — Unsplash (libre de uso)
    imagen: "https://images.unsplash.com/photo-1601979031925-424e53b6caaa?w=600&q=80",
    alt: "Vista aérea de barrio residencial denso",
  },
  {
    id: 4,
    titulo: "Guía de permisos y gestiones para empezar a construir tu casa",
    copete:
      "Antes de iniciar una obra residencial en Argentina es necesario cumplir una serie de trámites municipales y provinciales que varían según la localidad. Esta guía detalla los pasos esenciales para obtener los permisos de edificación y evitar contratiempos legales.",
    fuente: "Blog Eidico",
    url: "https://blog.eidico.com.ar/guia-de-permisos-y-gestiones-para-empezar-a-construir-tu-casa/",
    // Imagen: planos de arquitectura sobre mesa — Unsplash (libre de uso)
    imagen: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=600&q=80",
    alt: "Planos de arquitectura desplegados sobre una mesa de trabajo",
  },
];

export default function NoticiasCarrusel() {
  const pistaRef    = useRef(null);
  const [puedePrev, setPuedePrev] = useState(false);
  const [puedeNext, setPuedeNext] = useState(true);

  // Recalcula si las flechas deben estar activas según la posición del scroll
  const actualizarFlechas = useCallback(() => {
    const el = pistaRef.current;
    if (!el) return;
    setPuedePrev(el.scrollLeft > 4);
    setPuedeNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = pistaRef.current;
    if (!el) return;
    actualizarFlechas();
    el.addEventListener('scroll', actualizarFlechas, { passive: true });
    window.addEventListener('resize', actualizarFlechas);
    return () => {
      el.removeEventListener('scroll', actualizarFlechas);
      window.removeEventListener('resize', actualizarFlechas);
    };
  }, [actualizarFlechas]);

  // Desplaza la pista: avanza o retrocede exactamente el ancho de una tarjeta
  const desplazar = (dir) => {
    const el = pistaRef.current;
    if (!el) return;
    const tarjeta = el.querySelector('[data-tarjeta]');
    const paso    = tarjeta ? tarjeta.offsetWidth + 20 : 300;
    el.scrollBy({ left: dir * paso, behavior: 'smooth' });
  };

  return (
    <>
      {/* ── Estilos responsivos para las tarjetas ── */}
      <style>{`
        .nc-tarjeta {
          width: calc((100% - 40px) / 3);
        }
        @media (max-width: 767px) {
          .nc-tarjeta { width: 100%; }
        }
        .nc-titulo-enlace:hover {
          color: ${T.orange} !important;
          text-decoration: underline;
        }
        .nc-tarjeta:hover {
          box-shadow: ${T.shadowHover} !important;
          transform: translateY(-3px);
        }
      `}</style>

      <section
        aria-label="Noticias del sector"
        style={{
          marginTop: 48,
          padding: '40px 0',
          background: T.bgWarm,
          borderRadius: T.radius,
          border: `1px solid ${T.border}`,
        }}
      >
        {/* Encabezado */}
        <div style={{ padding: '0 24px 28px' }}>
          <p style={{ margin: '0 0 4px', fontSize: 11, color: T.orange, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>
            Sector en perspectiva
          </p>
          <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 800, color: T.text, letterSpacing: -0.4 }}>
            Noticias del sector
          </h2>
          <p style={{ margin: 0, fontSize: 14, color: T.textMid }}>
            Artículos de medios externos sobre urbanismo, normativa y mercado inmobiliario.
          </p>
        </div>

        {/* Wrapper: flecha izquierda · pista · flecha derecha */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px' }}>

          {/* Flecha anterior */}
          <button
            onClick={() => desplazar(-1)}
            disabled={!puedePrev}
            aria-label="Artículo anterior"
            style={{
              flexShrink: 0,
              width: 40, height: 40,
              borderRadius: '50%',
              border: `1px solid ${T.border}`,
              background: T.bg,
              boxShadow: T.shadowCard,
              cursor: puedePrev ? 'pointer' : 'default',
              opacity: puedePrev ? 1 : 0.3,
              fontSize: 20,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'opacity 0.2s',
              pointerEvents: puedePrev ? 'auto' : 'none',
              fontFamily: 'inherit',
            }}
          >
            ‹
          </button>

          {/* Pista scrollable */}
          <div
            ref={pistaRef}
            role="list"
            style={{
              display: 'flex',
              gap: 20,
              overflowX: 'hidden',
              scrollBehavior: 'smooth',
              flex: 1,
            }}
          >
            {ARTICULOS.map((art) => (
              <article
                key={art.id}
                data-tarjeta
                role="listitem"
                className="nc-tarjeta"
                style={{
                  flexShrink: 0,
                  background: T.bg,
                  borderRadius: T.radius,
                  border: `1px solid ${T.border}`,
                  boxShadow: T.shadowCard,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'box-shadow 0.25s, transform 0.25s',
                }}
              >
                {/* Imagen representativa (Unsplash — libre de uso) */}
                <img
                  src={art.imagen}
                  alt={art.alt}
                  loading="lazy"
                  style={{ width: '100%', height: 170, objectFit: 'cover', display: 'block' }}
                />

                <div style={{ padding: '18px 20px 20px', display: 'flex', flexDirection: 'column', flex: 1, gap: 10 }}>
                  {/* Título como enlace externo que abre en pestaña nueva */}
                  <a
                    href={art.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="nc-titulo-enlace"
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: T.text,
                      textDecoration: 'none',
                      lineHeight: 1.45,
                      fontFamily: 'inherit',
                    }}
                  >
                    {art.titulo}
                  </a>

                  {/* Copete de redacción propia (máximo 2 oraciones) */}
                  <p style={{ margin: 0, fontSize: 12, color: T.textMid, lineHeight: 1.65, flex: 1 }}>
                    {art.copete}
                  </p>

                  {/* Crédito de fuente */}
                  <p style={{
                    margin: 0,
                    fontSize: 11,
                    color: T.textLight,
                    borderTop: `1px solid ${T.border}`,
                    paddingTop: 10,
                  }}>
                    Fuente:{' '}
                    <a
                      href={art.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: T.orange, textDecoration: 'none', fontWeight: 600 }}
                    >
                      {art.fuente}
                    </a>
                    {' '}— Solo enlace externo, sin reproducción de contenido
                  </p>
                </div>
              </article>
            ))}
          </div>

          {/* Flecha siguiente */}
          <button
            onClick={() => desplazar(1)}
            disabled={!puedeNext}
            aria-label="Artículo siguiente"
            style={{
              flexShrink: 0,
              width: 40, height: 40,
              borderRadius: '50%',
              border: `1px solid ${T.border}`,
              background: T.bg,
              boxShadow: T.shadowCard,
              cursor: puedeNext ? 'pointer' : 'default',
              opacity: puedeNext ? 1 : 0.3,
              fontSize: 20,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'opacity 0.2s',
              pointerEvents: puedeNext ? 'auto' : 'none',
              fontFamily: 'inherit',
            }}
          >
            ›
          </button>

        </div>
      </section>
    </>
  );
}
