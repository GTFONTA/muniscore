# Guía: Cómo agregar normativa urbanística por municipio

Esta guía explica cómo cargar y vincular los documentos normativos (PDFs, ordenanzas, etc.)
de cada municipio en Munilupa.

---

## Estructura en Supabase

Los documentos se almacenan en la tabla `documentos` con los siguientes campos:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | uuid | Clave primaria (automático) |
| `municipio_id` | int | ID del municipio en la tabla `municipios` |
| `nombre` | text | Nombre descriptivo del documento (ej: "Código de Planeamiento 2023") |
| `tipo` | text | Tipo de documento (ej: "Ordenanza", "Decreto", "Código") |
| `formato` | text | Extensión del archivo en mayúsculas (ej: "PDF", "DOC") |
| `anio` | int | Año de vigencia o publicación |
| `archivo_url` | text | URL pública del archivo |
| `vigente` | boolean | Si el documento sigue en vigor |

---

## Paso 1 — Subir el PDF a Supabase Storage

1. Abrí el panel de Supabase → **Storage**
2. Navegá al bucket `documentos` (crealo si no existe con acceso público)
3. Creá una carpeta con el nombre del municipio (ej: `san-isidro/`)
4. Subí el PDF con un nombre descriptivo (ej: `codigo-planeamiento-2023.pdf`)
5. Copiá la **URL pública** del archivo (botón "Get URL" en Supabase Storage)

   La URL tendrá este formato:
   ```
   https://[proyecto].supabase.co/storage/v1/object/public/documentos/san-isidro/codigo-planeamiento-2023.pdf
   ```

---

## Paso 2 — Encontrar el ID del municipio

En la tabla `municipios` de Supabase, buscá el municipio por nombre y copiá su `id`.

```sql
SELECT id, nombre FROM municipios WHERE nombre ILIKE '%San Isidro%';
```

---

## Paso 3 — Insertar el registro en la tabla `documentos`

En el editor SQL de Supabase ejecutá:

```sql
INSERT INTO documentos (municipio_id, nombre, tipo, formato, anio, archivo_url, vigente)
VALUES (
  5,                          -- ID del municipio
  'Código de Planeamiento Urbano',
  'Ordenanza',
  'PDF',
  2023,
  'https://[proyecto].supabase.co/storage/v1/object/public/documentos/san-isidro/codigo-planeamiento-2023.pdf',
  true
);
```

---

## Paso 4 — Verificar en la aplicación

1. Abrí la app en el navegador
2. Hacé click en el municipio en el mapa
3. En el panel lateral, seleccioná la pestaña **"Normativa"**
4. El documento debe aparecer con botón de descarga

---

## Cómo se muestra en la app

El componente `PanelMunicipio` en `src/App.jsx` carga los documentos con la función
`getDocumentos(municipioId)` definida en `src/lib/supabase.js`.

Cada documento se muestra como una tarjeta con:
- Ícono del formato (PDF, DOC, etc.)
- Nombre y tipo del documento
- Año de vigencia
- Botón de descarga directo al archivo

---

## Tipos de documentos sugeridos por municipio

| Tipo | Descripción |
|------|-------------|
| Código de Planeamiento | Normativa de uso del suelo, alturas, FOT, FOS |
| Ordenanza de Habilitaciones | Requisitos para apertura de locales y obras |
| Tasas municipales | Tarifario vigente de sellos y tasas |
| Formularios de obra | Planillas de solicitud de permiso de construcción |
| Reglamento de subdivisión | Normativa de loteo y subdivisión de parcelas |

---

## Permisos de la tabla en Supabase RLS

Asegurate de que las políticas de Row Level Security (RLS) permitan:

```sql
-- Lectura pública de documentos vigentes
CREATE POLICY "Documentos públicos" ON documentos
  FOR SELECT USING (vigente = true);

-- Solo admins pueden insertar/actualizar
CREATE POLICY "Solo admins modifican" ON documentos
  FOR ALL USING (auth.role() = 'service_role');
```
