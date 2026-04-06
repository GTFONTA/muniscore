# Guía: Sección de Noticias — Carrusel de Artículos Externos

## Política de copyright

Los artículos listados pertenecen a medios externos. **No se reproduce ningún
fragmento del texto original.** Cada tarjeta contiene:

- Una imagen libre de derechos (Unsplash/Pexels) relacionada temáticamente.
- Un copete de redacción propia (máximo 2 oraciones) que describe el tema sin
  citar ni parafrasear el artículo fuente.
- El título original como enlace externo que abre en pestaña nueva.
- Un crédito visible con el nombre del medio y la aclaración de que es solo
  un enlace, sin reproducción de contenido.

Esto cumple con las prácticas habituales de agregación de noticias y evita
infracciones de derechos de autor sobre el texto periodístico.

---

## Los 4 artículos configurados

| # | Medio | Título | URL |
|---|-------|--------|-----|
| 1 | El Cronista | Qué necesita el mercado inmobiliario para reactivarse en 2026 | https://www.cronista.com/columnistas/que-necesita-el-mercado-inmobiliario-para-reactivarse-en-2026/ |
| 2 | Zona Norte Diario | La Justicia suspende nuevas habilitaciones de torres en Tigre | https://www.zonanortediario.com.ar/13/11/2025/la-justicia-suspende-nuevas-habilitaciones-de-torres-en-tigre-y-el-municipio-anticipa-que-apelara-la-medida/ |
| 3 | 0221.com.ar | La Municipalidad sigue sin informar cuáles son los 400 barrios ilegales | https://www.0221.com.ar/la-plata/a-mas-cuatro-meses-la-denuncia-la-municipalidad-sigue-informar-cuales-son-los-400-barrios-ilegales-n105712 |
| 4 | Blog Eidico | Guía de permisos y gestiones para empezar a construir tu casa | https://blog.eidico.com.ar/guia-de-permisos-y-gestiones-para-empezar-a-construir-tu-casa/ |

---

## Descripción del componente

Un **carrusel horizontal con flechas de navegación** que permite recorrer los
artículos uno a uno:

- **Desktop** (≥ 768 px): 3 tarjetas visibles simultáneamente.
- **Mobile** (< 768 px): 1 tarjeta visible.
- Las flechas (◀ ▶) están posicionadas a los costados del carrusel.
- El desplazamiento usa `scrollBehavior: smooth` nativo — sin librerías.
- Las flechas se ocultan automáticamente cuando no hay más contenido en esa
  dirección.

---

## Dónde insertar el bloque

En `src/App.jsx`, buscar la sección de artículos (`getArticulos`) o la zona
inferior de contenido editorial. El bloque de noticias externas va **después
del ranking de municipios y antes del formulario de contacto**, como sección
independiente:

```jsx
{/* ── Noticias externas ── */}
<NoticiasCarrusel />
```

Si el proyecto es HTML puro, insertar el snippet completo dentro del `<main>`
o equivalente, entre la sección de datos y el footer.

---

## Código del componente completo

### Versión React (JSX) — `src/components/NoticiasCarrusel.jsx`

```jsx
// ============================================================
//  NoticiasCarrusel.jsx
//  Carrusel de noticias externas — sin librerías externas
//  Muestra 3 tarjetas en desktop, 1 en mobile
//  Flechas laterales con scroll suave
// ============================================================

import { useRef, useState, useEffect, useCallback } from 'react';

// ─── Datos de los artículos ───────────────────────────────────
// Copetes: redacción propia. Imágenes: Unsplash (libres de uso).
// Fuente: solo enlace externo, sin reproducción de texto original.
const ARTICULOS = [
  {
    id: 1,
    titulo: "Qué necesita el mercado inmobiliario para reactivarse en 2026",
    copete:
      "El sector analiza las condiciones macroeconómicas y regulatorias que podrían impulsar una recuperación sostenida de la actividad inmobiliaria en Argentina durante el próximo año. Expertos del mercado identifican los factores clave que deben confluir para que la demanda repunte.",
    fuente: "El Cronista",
    url: "https://www.cronista.com/columnistas/que-necesita-el-mercado-inmobiliario-para-reactivarse-en-2026/",
    // Imagen: edificios urbanos modernos — Unsplash (libre de uso)
    imagen: "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=600&q=80",
    alt: "Vista de edificios de oficinas y viviendas en ciudad",
  },
  {
    id: 2,
    titulo: "La Justicia suspende nuevas habilitaciones de torres en Tigre y el Municipio anticipa que apelará",
    copete:
      "Una resolución judicial frena temporalmente los permisos de construcción para nuevas torres en el partido de Tigre, en respuesta a una demanda vecinal por impacto ambiental y urbano. El ejecutivo municipal anunció que recurrirá la medida ante la instancia superior.",
    fuente: "Zona Norte Diario",
    url: "https://www.zonanortediario.com.ar/13/11/2025/la-justicia-suspende-nuevas-habilitaciones-de-torres-en-tigre-y-el-municipio-anticipa-que-apelara-la-medida/",
    // Imagen: grúas y construcción urbana — Unsplash (libre de uso)
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
    // Imagen: barrio popular visto desde arriba — Unsplash (libre de uso)
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

// ─── Tokens de diseño (coherentes con App.jsx) ───────────────
const T = {
  bg:          "#FFFFFF",
  bgWarm:      "#F7F5F2",
  bgCard:      "#FFFFFF",
  border:      "#E8E4DF",
  text:        "#1A1A1A",
  textMid:     "#6B6560",
  textLight:   "#A09890",
  orange:      "#E8612A",
  orangeSoft:  "#FDF1EC",
  radius:      "16px",
  radiusSm:    "10px",
  shadow:      "0 2px 16px rgba(0,0,0,0.07)",
  shadowHover: "0 8px 40px rgba(0,0,0,0.13)",
};

// ─── Estilos en objeto (evita dependencia de módulos CSS) ─────
const s = {
  seccion: {
    padding: "48px 24px",
    background: T.bgWarm,
    borderTop: `1px solid ${T.border}`,
    borderBottom: `1px solid ${T.border}`,
  },
  titulo: {
    fontSize: "clamp(20px, 3vw, 28px)",
    fontWeight: 600,
    color: T.text,
    marginBottom: "8px",
    textAlign: "left",
  },
  subtitulo: {
    fontSize: "15px",
    color: T.textMid,
    marginBottom: "32px",
    textAlign: "left",
  },
  // Contenedor de flechas + pista
  wrapper: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  // Pista scrollable
  pista: {
    display: "flex",
    gap: "20px",
    overflowX: "hidden",       // se oculta; el scroll lo manejan las flechas
    scrollBehavior: "smooth",
    flex: 1,
    // Evitar que el usuario haga scroll táctil accidental en desktop
    WebkitOverflowScrolling: "touch",
  },
  // Flecha de navegación
  flecha: (habilitada) => ({
    flexShrink: 0,
    width: "44px",
    height: "44px",
    borderRadius: "50%",
    border: `1px solid ${T.border}`,
    background: T.bgCard,
    boxShadow: T.shadow,
    cursor: habilitada ? "pointer" : "default",
    opacity: habilitada ? 1 : 0.3,
    fontSize: "18px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "box-shadow 0.2s, opacity 0.2s",
    userSelect: "none",
    pointerEvents: habilitada ? "auto" : "none",
  }),
  // Tarjeta individual
  tarjeta: {
    // En desktop: ~1/3 del ancho visible. En mobile: 100%.
    // Se controla vía CSS media query (ver <style> al final).
    flexShrink: 0,
    background: T.bgCard,
    borderRadius: T.radius,
    border: `1px solid ${T.border}`,
    boxShadow: T.shadow,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    transition: "box-shadow 0.25s, transform 0.25s",
  },
  imagen: {
    width: "100%",
    height: "180px",
    objectFit: "cover",
    display: "block",
  },
  cuerpo: {
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    flex: 1,
    gap: "8px",
  },
  enlace: {
    fontSize: "15px",
    fontWeight: 600,
    color: T.text,
    textDecoration: "none",
    lineHeight: "1.4",
    // Subrayado sutil al hover (ver hover en JSX)
  },
  copete: {
    fontSize: "13px",
    color: T.textMid,
    lineHeight: "1.6",
    margin: 0,
    flex: 1,
  },
  fuente: {
    fontSize: "11px",
    color: T.textLight,
    borderTop: `1px solid ${T.border}`,
    paddingTop: "10px",
    marginTop: "auto",
  },
};

export default function NoticiasCarrusel() {
  const pistaRef   = useRef(null);
  const [puedePrev, setPuedePrev] = useState(false);
  const [puedeNext, setPuedeNext] = useState(true);

  // Actualiza el estado de las flechas según posición del scroll
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
    el.addEventListener("scroll", actualizarFlechas, { passive: true });
    window.addEventListener("resize", actualizarFlechas);
    return () => {
      el.removeEventListener("scroll", actualizarFlechas);
      window.removeEventListener("resize", actualizarFlechas);
    };
  }, [actualizarFlechas]);

  // Desplaza el carrusel: avanza/retrocede por el ancho de una tarjeta
  const desplazar = (direccion) => {
    const el = pistaRef.current;
    if (!el) return;
    // Ancho de la primera tarjeta + gap
    const tarjeta = el.querySelector("[data-tarjeta]");
    const ancho   = tarjeta ? tarjeta.offsetWidth + 20 : 280;
    el.scrollBy({ left: direccion * ancho, behavior: "smooth" });
  };

  return (
    <>
      {/* Reglas CSS para el ancho responsivo de tarjetas */}
      <style>{`
        .noticias-tarjeta {
          width: calc((100% - 40px) / 3);
        }
        @media (max-width: 767px) {
          .noticias-tarjeta {
            width: 100%;
          }
        }
        .noticias-enlace:hover {
          color: ${T.orange};
          text-decoration: underline;
        }
        .noticias-tarjeta:hover {
          box-shadow: ${T.shadowHover};
          transform: translateY(-2px);
        }
      `}</style>

      <section style={s.seccion} aria-label="Noticias del sector">
        <h2 style={s.titulo}>Noticias del sector</h2>
        <p style={s.subtitulo}>
          Artículos de medios externos sobre urbanismo, normativa y mercado inmobiliario.
        </p>

        <div style={s.wrapper}>
          {/* Flecha izquierda */}
          <button
            style={s.flecha(puedePrev)}
            onClick={() => desplazar(-1)}
            aria-label="Anterior"
          >
            ‹
          </button>

          {/* Pista de tarjetas */}
          <div ref={pistaRef} style={s.pista} role="list">
            {ARTICULOS.map((art) => (
              <article
                key={art.id}
                data-tarjeta
                className="noticias-tarjeta"
                style={s.tarjeta}
                role="listitem"
              >
                <img
                  src={art.imagen}
                  alt={art.alt}
                  style={s.imagen}
                  loading="lazy"
                />
                <div style={s.cuerpo}>
                  {/* Título como enlace externo */}
                  <a
                    href={art.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={s.enlace}
                    className="noticias-enlace"
                  >
                    {art.titulo}
                  </a>

                  {/* Copete de redacción propia */}
                  <p style={s.copete}>{art.copete}</p>

                  {/* Crédito de fuente */}
                  <p style={s.fuente}>
                    Fuente:{" "}
                    <a
                      href={art.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: T.orange, textDecoration: "none" }}
                    >
                      {art.fuente}
                    </a>
                    {" "}— Solo enlace externo, sin reproducción de contenido
                  </p>
                </div>
              </article>
            ))}
          </div>

          {/* Flecha derecha */}
          <button
            style={s.flecha(puedeNext)}
            onClick={() => desplazar(1)}
            aria-label="Siguiente"
          >
            ›
          </button>
        </div>
      </section>
    </>
  );
}
```

---

### Versión HTML + CSS + JS puro (sin framework)

Para sitios sin React, pegar este bloque completo donde corresponda:

```html
<!-- ============================================================
  Sección: Noticias externas
  Carrusel responsivo — sin librerías externas
  Desktop: 3 tarjetas | Mobile: 1 tarjeta
  ============================================================ -->

<style>
  /* ── Variables — sincronizar con el resto del sitio ── */
  :root {
    --nc-bg-sec:    #F7F5F2;
    --nc-bg-card:   #FFFFFF;
    --nc-border:    #E8E4DF;
    --nc-text:      #1A1A1A;
    --nc-text-mid:  #6B6560;
    --nc-text-lgt:  #A09890;
    --nc-accent:    #E8612A;
    --nc-radius:    16px;
    --nc-shadow:    0 2px 16px rgba(0,0,0,0.07);
    --nc-shadow-hv: 0 8px 40px rgba(0,0,0,0.13);
  }

  /* ── Sección contenedora ── */
  .nc-seccion {
    padding: 48px 24px;
    background: var(--nc-bg-sec);
    border-top: 1px solid var(--nc-border);
    border-bottom: 1px solid var(--nc-border);
    box-sizing: border-box;
  }

  .nc-seccion h2 {
    font-size: clamp(20px, 3vw, 28px);
    font-weight: 600;
    color: var(--nc-text);
    margin: 0 0 8px;
  }

  .nc-seccion > p {
    font-size: 15px;
    color: var(--nc-text-mid);
    margin: 0 0 32px;
  }

  /* ── Wrapper flechas + pista ── */
  .nc-wrapper {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  /* ── Pista scrollable ── */
  .nc-pista {
    display: flex;
    gap: 20px;
    overflow-x: hidden;
    scroll-behavior: smooth;
    flex: 1;
  }

  /* ── Tarjetas ── */
  .nc-tarjeta {
    flex-shrink: 0;
    width: calc((100% - 40px) / 3); /* 3 tarjetas en desktop */
    background: var(--nc-bg-card);
    border-radius: var(--nc-radius);
    border: 1px solid var(--nc-border);
    box-shadow: var(--nc-shadow);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    transition: box-shadow 0.25s, transform 0.25s;
  }
  .nc-tarjeta:hover {
    box-shadow: var(--nc-shadow-hv);
    transform: translateY(-2px);
  }

  .nc-tarjeta img {
    width: 100%;
    height: 180px;
    object-fit: cover;
    display: block;
  }

  .nc-cuerpo {
    padding: 20px;
    display: flex;
    flex-direction: column;
    flex: 1;
    gap: 8px;
  }

  .nc-enlace {
    font-size: 15px;
    font-weight: 600;
    color: var(--nc-text);
    text-decoration: none;
    line-height: 1.4;
  }
  .nc-enlace:hover { color: var(--nc-accent); text-decoration: underline; }

  .nc-copete {
    font-size: 13px;
    color: var(--nc-text-mid);
    line-height: 1.6;
    margin: 0;
    flex: 1;
  }

  .nc-fuente {
    font-size: 11px;
    color: var(--nc-text-lgt);
    border-top: 1px solid var(--nc-border);
    padding-top: 10px;
    margin-top: auto;
  }
  .nc-fuente a {
    color: var(--nc-accent);
    text-decoration: none;
  }

  /* ── Flechas ── */
  .nc-flecha {
    flex-shrink: 0;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: 1px solid var(--nc-border);
    background: var(--nc-bg-card);
    box-shadow: var(--nc-shadow);
    cursor: pointer;
    font-size: 20px;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: box-shadow 0.2s, opacity 0.2s;
    user-select: none;
  }
  .nc-flecha:disabled { opacity: 0.3; cursor: default; pointer-events: none; }

  /* ── Responsive: 1 tarjeta en mobile ── */
  @media (max-width: 767px) {
    .nc-tarjeta { width: 100%; }
  }
</style>

<section class="nc-seccion" aria-label="Noticias del sector">
  <h2>Noticias del sector</h2>
  <p>Artículos de medios externos sobre urbanismo, normativa y mercado inmobiliario.</p>

  <div class="nc-wrapper">
    <!-- Flecha izquierda -->
    <button class="nc-flecha" id="nc-prev" aria-label="Anterior" disabled>&#8249;</button>

    <!-- Pista de tarjetas -->
    <div class="nc-pista" id="nc-pista" role="list">

      <!-- Tarjeta 1 -->
      <article class="nc-tarjeta" role="listitem">
        <!-- Imagen libre de derechos: Unsplash — edificios urbanos -->
        <img
          src="https://images.unsplash.com/photo-1486325212027-8081e485255e?w=600&q=80"
          alt="Vista de edificios de oficinas y viviendas en ciudad"
          loading="lazy"
        />
        <div class="nc-cuerpo">
          <a
            class="nc-enlace"
            href="https://www.cronista.com/columnistas/que-necesita-el-mercado-inmobiliario-para-reactivarse-en-2026/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Qué necesita el mercado inmobiliario para reactivarse en 2026
          </a>
          <p class="nc-copete">
            El sector analiza las condiciones macroeconómicas y regulatorias que podrían
            impulsar una recuperación sostenida de la actividad inmobiliaria en Argentina
            durante el próximo año. Expertos identifican los factores clave que deben
            confluir para que la demanda repunte.
          </p>
          <p class="nc-fuente">
            Fuente:
            <a href="https://www.cronista.com/columnistas/que-necesita-el-mercado-inmobiliario-para-reactivarse-en-2026/"
               target="_blank" rel="noopener noreferrer">El Cronista</a>
            — Solo enlace externo, sin reproducción de contenido
          </p>
        </div>
      </article>

      <!-- Tarjeta 2 -->
      <article class="nc-tarjeta" role="listitem">
        <!-- Imagen libre de derechos: Unsplash — grúas y construcción -->
        <img
          src="https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&q=80"
          alt="Obra en construcción con grúas en zona urbana"
          loading="lazy"
        />
        <div class="nc-cuerpo">
          <a
            class="nc-enlace"
            href="https://www.zonanortediario.com.ar/13/11/2025/la-justicia-suspende-nuevas-habilitaciones-de-torres-en-tigre-y-el-municipio-anticipa-que-apelara-la-medida/"
            target="_blank"
            rel="noopener noreferrer"
          >
            La Justicia suspende nuevas habilitaciones de torres en Tigre y el
            Municipio anticipa que apelará la medida
          </a>
          <p class="nc-copete">
            Una resolución judicial frena temporalmente los permisos de construcción
            para nuevas torres en el partido de Tigre, en respuesta a una demanda
            vecinal por impacto ambiental y urbano. El ejecutivo municipal anunció
            que recurrirá la medida ante la instancia superior.
          </p>
          <p class="nc-fuente">
            Fuente:
            <a href="https://www.zonanortediario.com.ar/13/11/2025/la-justicia-suspende-nuevas-habilitaciones-de-torres-en-tigre-y-el-municipio-anticipa-que-apelara-la-medida/"
               target="_blank" rel="noopener noreferrer">Zona Norte Diario</a>
            — Solo enlace externo, sin reproducción de contenido
          </p>
        </div>
      </article>

      <!-- Tarjeta 3 -->
      <article class="nc-tarjeta" role="listitem">
        <!-- Imagen libre de derechos: Unsplash — barrio popular aéreo -->
        <img
          src="https://images.unsplash.com/photo-1601979031925-424e53b6caaa?w=600&q=80"
          alt="Vista aérea de barrio residencial denso"
          loading="lazy"
        />
        <div class="nc-cuerpo">
          <a
            class="nc-enlace"
            href="https://www.0221.com.ar/la-plata/a-mas-cuatro-meses-la-denuncia-la-municipalidad-sigue-informar-cuales-son-los-400-barrios-ilegales-n105712"
            target="_blank"
            rel="noopener noreferrer"
          >
            A más de cuatro meses de la denuncia, la Municipalidad sigue sin
            informar cuáles son los 400 barrios ilegales
          </a>
          <p class="nc-copete">
            La Plata mantiene sin respuesta pública una denuncia que señala la
            existencia de cuatro centenas de asentamientos irregulares dentro del
            ejido municipal. La falta de transparencia genera interrogantes sobre
            la planificación territorial y los derechos de los vecinos afectados.
          </p>
          <p class="nc-fuente">
            Fuente:
            <a href="https://www.0221.com.ar/la-plata/a-mas-cuatro-meses-la-denuncia-la-municipalidad-sigue-informar-cuales-son-los-400-barrios-ilegales-n105712"
               target="_blank" rel="noopener noreferrer">0221.com.ar</a>
            — Solo enlace externo, sin reproducción de contenido
          </p>
        </div>
      </article>

      <!-- Tarjeta 4 -->
      <article class="nc-tarjeta" role="listitem">
        <!-- Imagen libre de derechos: Unsplash — planos de arquitectura -->
        <img
          src="https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=600&q=80"
          alt="Planos de arquitectura desplegados sobre una mesa de trabajo"
          loading="lazy"
        />
        <div class="nc-cuerpo">
          <a
            class="nc-enlace"
            href="https://blog.eidico.com.ar/guia-de-permisos-y-gestiones-para-empezar-a-construir-tu-casa/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Guía de permisos y gestiones para empezar a construir tu casa
          </a>
          <p class="nc-copete">
            Antes de iniciar una obra residencial en Argentina es necesario cumplir
            una serie de trámites municipales y provinciales que varían según la
            localidad. Esta guía detalla los pasos esenciales para obtener los
            permisos de edificación y evitar contratiempos legales.
          </p>
          <p class="nc-fuente">
            Fuente:
            <a href="https://blog.eidico.com.ar/guia-de-permisos-y-gestiones-para-empezar-a-construir-tu-casa/"
               target="_blank" rel="noopener noreferrer">Blog Eidico</a>
            — Solo enlace externo, sin reproducción de contenido
          </p>
        </div>
      </article>

    </div><!-- /nc-pista -->

    <!-- Flecha derecha -->
    <button class="nc-flecha" id="nc-next" aria-label="Siguiente">&#8250;</button>
  </div>
</section>

<script>
  (function () {
    const pista = document.getElementById('nc-pista');
    const prev  = document.getElementById('nc-prev');
    const next  = document.getElementById('nc-next');

    // Calcula cuánto desplazar: ancho de la primera tarjeta + gap
    function anchoTarjeta() {
      const t = pista.querySelector('.nc-tarjeta');
      return t ? t.offsetWidth + 20 : 280;
    }

    // Actualiza el estado habilitado/deshabilitado de las flechas
    function actualizarFlechas() {
      prev.disabled = pista.scrollLeft <= 4;
      next.disabled = pista.scrollLeft + pista.clientWidth >= pista.scrollWidth - 4;
    }

    prev.addEventListener('click', function () {
      pista.scrollBy({ left: -anchoTarjeta(), behavior: 'smooth' });
    });

    next.addEventListener('click', function () {
      pista.scrollBy({ left: anchoTarjeta(), behavior: 'smooth' });
    });

    pista.addEventListener('scroll', actualizarFlechas, { passive: true });
    window.addEventListener('resize', actualizarFlechas);

    // Estado inicial
    actualizarFlechas();
  })();
</script>
```

---

## Instrucciones para adaptar colores y tipografía

### En la versión React

Editar las constantes del objeto `T` al inicio del archivo. Los valores ya están
sincronizados con `App.jsx`:

| Token | Valor actual | Dónde cambiarlo |
|-------|-------------|-----------------|
| `T.orange` | `#E8612A` | Color de acento (hover del enlace, crédito fuente) |
| `T.bgWarm` | `#F7F5F2` | Fondo de la sección |
| `T.bgCard` | `#FFFFFF` | Fondo de cada tarjeta |
| `T.border` | `#E8E4DF` | Bordes y separadores |
| `T.text`   | `#1A1A1A` | Títulos |
| `T.textMid`| `#6B6560` | Copete |

Para aplicar la misma tipografía del sitio reemplazar en el `<style>`:
```css
.nc-seccion { font-family: var(--sans); }
```

### En la versión HTML puro

Ajustar las variables CSS dentro del bloque `:root {}` del snippet.
Si el sitio ya define variables globales con otros nombres, reemplazar los
valores `var(--nc-*)` por los equivalentes del proyecto.

---

## Nota de copyright — por qué se usa copete propio y enlace externo

Los artículos periodísticos están protegidos por derechos de autor desde su
publicación. Reproducir párrafos, aunque sea parcialmente, puede constituir
infracción bajo la Ley 11.723 (Argentina) y el Convenio de Berna.

El modelo elegido es el estándar de los **agregadores de noticias**:

1. **Título original** como enlace — permitido, ya que un título no es
   copyrightable en sí mismo cuando actúa como referencia.
2. **Copete de redacción propia** — describe de qué trata el artículo con
   palabras propias, sin reproducir el texto fuente.
3. **Imagen de Unsplash** — licencia libre (Unsplash License), permite uso
   comercial sin atribución obligatoria, aunque se recomienda crédito opcional.
4. **Crédito visible** al medio fuente — buena práctica editorial y
   cumplimiento de las expectativas del lector.

Si en el futuro se quisiera mostrar un extracto real del artículo, se
deberá obtener permiso escrito del medio o verificar que el artículo
esté bajo licencia Creative Commons.
