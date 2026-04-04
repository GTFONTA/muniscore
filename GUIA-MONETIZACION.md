# Guía: Monetización con Google AdSense y patrocinadores propios

Esta guía explica cómo integrar publicidad en Munilupa sin afectar la experiencia de usuario.

---

## PARTE 1 — Google AdSense

### Paso 1 — Obtener el código de AdSense

1. Registrate en [Google AdSense](https://www.google.com/adsense)
2. Agregá tu sitio y esperá la aprobación (puede tardar días)
3. Una vez aprobado, obtendrás un `client ID` con este formato:
   ```
   ca-pub-XXXXXXXXXXXXXXXX
   ```

### Paso 2 — Insertar el script global en `index.html`

Agregá el script de AdSense en el `<head>` de `index.html`:

```html
<!-- index.html -->
<head>
  ...
  <script
    async
    src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX"
    crossorigin="anonymous"
  ></script>
</head>
```

### Paso 3 — Crear el componente `AnuncioAdSense.jsx`

Creá el archivo `src/components/AnuncioAdSense.jsx`:

```jsx
import { useEffect, useRef } from 'react';

export default function AnuncioAdSense({ slot, format = 'auto', style = {} }) {
  const ref = useRef(null);

  useEffect(() => {
    try {
      if (ref.current && ref.current.childElementCount === 0) {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      }
    } catch (e) {
      console.error('AdSense error:', e);
    }
  }, []);

  return (
    <div style={{ overflow: 'hidden', textAlign: 'center', ...style }}>
      <ins
        ref={ref}
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}
```

### Paso 4 — Ubicaciones recomendadas en la app

#### A) Entre el header de stats y el mapa (banner horizontal)
En `src/App.jsx`, dentro de la vista "mapa", después del bloque de stats:

```jsx
import AnuncioAdSense from './components/AnuncioAdSense';

// Dentro de la vista mapa, antes del MapaPoligonos:
<AnuncioAdSense
  slot="1234567890"
  format="horizontal"
  style={{ margin: '8px 0', maxHeight: 90 }}
/>
```

#### B) Al pie de la sección Noticias (entre artículos)
Insertá un anuncio cada 3 artículos en el grid del blog.

#### C) Sidebar de la sección Metodología
Un anuncio vertical 160×600 en el lateral derecho cuando el ancho lo permita.

### Formatos recomendados por ubicación

| Ubicación | Formato AdSense | Tamaño sugerido |
|-----------|----------------|-----------------|
| Encima del mapa | `horizontal` | 728×90 (leaderboard) |
| Entre artículos | `rectangle` | 336×280 |
| Sidebar desktop | `vertical` | 160×600 |
| Mobile (entre secciones) | `auto` | Responsivo |

---

## PARTE 2 — Patrocinadores propios (banners)

Para clientes directos (estudios de arquitectura, desarrolladoras, etc.) podés mostrar
banners propios sin intermediarios.

### Estructura de datos en Supabase

Creá una tabla `patrocinadores`:

```sql
CREATE TABLE patrocinadores (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      text NOT NULL,
  imagen_url  text NOT NULL,   -- URL del banner (ej: 300x100 px)
  url_destino text NOT NULL,   -- URL al hacer click
  posicion    text NOT NULL,   -- 'mapa_top' | 'noticias_lateral' | 'footer'
  activo      boolean DEFAULT true,
  fecha_inicio date,
  fecha_fin    date
);
```

### Componente `BannerPatrocinador.jsx`

Creá `src/components/BannerPatrocinador.jsx`:

```jsx
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function BannerPatrocinador({ posicion }) {
  const [banner, setBanner] = useState(null);

  useEffect(() => {
    supabase
      .from('patrocinadores')
      .select('*')
      .eq('posicion', posicion)
      .eq('activo', true)
      .lte('fecha_inicio', new Date().toISOString().split('T')[0])
      .gte('fecha_fin',    new Date().toISOString().split('T')[0])
      .limit(1)
      .single()
      .then(({ data }) => setBanner(data));
  }, [posicion]);

  if (!banner) return null;

  return (
    <a
      href={banner.url_destino}
      target="_blank"
      rel="noopener noreferrer sponsored"
      style={{ display: 'block', textAlign: 'center' }}
      title={`Patrocinado por ${banner.nombre}`}
    >
      <img
        src={banner.imagen_url}
        alt={`Patrocinado por ${banner.nombre}`}
        style={{ maxWidth: '100%', height: 'auto', borderRadius: 8 }}
      />
      <p style={{ fontSize: 10, color: '#A09890', marginTop: 4 }}>Contenido patrocinado</p>
    </a>
  );
}
```

### Ubicaciones sugeridas para patrocinadores

| Posición | Dónde colocarlo | Tamaño banner |
|----------|----------------|---------------|
| `mapa_top` | Encima del mapa, sección principal | 728×90 px |
| `noticias_lateral` | Columna lateral en la sección Noticias | 300×250 px |
| `footer` | Zona superior del footer | 468×60 px |
| `panel_municipio` | Base del PanelMunicipio (zona de CTA) | 300×100 px |

### Cómo usar en App.jsx

```jsx
import BannerPatrocinador from './components/BannerPatrocinador';

// En la vista mapa, encima del MapaPoligonos:
<BannerPatrocinador posicion="mapa_top" />
```

---

## PARTE 3 — Recomendaciones de UX

1. **Máximo 2 anuncios por vista**: más de 2 afecta negativamente la conversión y el SEO.
2. **Nunca bloquear el mapa**: los banners deben estar fuera del contenedor del mapa.
3. **Lazy loading**: cargá los anuncios solo cuando la sección es visible (`IntersectionObserver`).
4. **Etiqueta "Patrocinado"**: siempre indicar visualmente que es contenido patrocinado.
5. **Mobile first**: priorizá formatos responsivos (`data-ad-format="auto"`) en pantallas pequeñas.
6. **No en el flujo de calificación**: nunca mostrés publicidad dentro del modal de encuesta.
