Sos el Arquitecto Senior del proyecto "Muniscore" (que vamos a renombrar 
a "Munilupa"). Tenés acceso completo a todos los archivos de este repositorio.

═══════════════════════════════════════════════
TAREA 0 — DIAGNÓSTICO PREVIO (NO toques archivos aún)
═══════════════════════════════════════════════
Analizá toda la estructura del proyecto e identificá el estado actual de 
cada archivo relevante. Luego mostrá un resumen ejecutivo antes de proceder 
con cualquier corrección.

═══════════════════════════════════════════════
TAREA 1 — RENOMBRAR: "Muniscore" → "Munilupa"
═══════════════════════════════════════════════
Buscá y reemplazá todas las ocurrencias del nombre "Muniscore" por "Munilupa" 
en TODOS los archivos del proyecto: títulos, metadata, variables, comentarios, 
README, package.json, index.html, App.jsx, CSS y cualquier otro archivo donde 
aparezca. El lema debe cambiar al texto: "Gestión Municipal a la vista".

═══════════════════════════════════════════════
TAREA 2 — MAPA: Reemplazar nodos por polígonos GeoJSON
═══════════════════════════════════════════════
En el componente MapaPoligonos.jsx, completá la implementación para que el 
mapa muestre las siluetas reales de los polígonos de los municipios del AMBA 
y CABA usando el archivo municipios-amba.geojson que ya existe en /public. 
Eliminá cualquier lógica de marcadores de nodo puntual. Asegurate de que:
- Cada polígono tenga el color correcto según su puntaje 
  (Rojo: 1-2 | Amarillo: 3 | Verde: 4-5 | Gris: sin datos)
- Al hacer hover se resalte el polígono
- Al hacer click se abra el panel de información del municipio

═══════════════════════════════════════════════
TAREA 3 — BOTÓN "Calificar Municipio": Flujo completo
═══════════════════════════════════════════════
El botón naranja "Calificar Municipio" (arriba a la derecha en el inicio) 
debe disparar el siguiente flujo en orden:
  PASO 1 → Verificación por email (enviar código o magic link vía Supabase Auth)
  PASO 2 → Panel desplegable para seleccionar el Municipio a calificar
  PASO 3 → Formulario de calificación con puntaje 1-5 por categorías ponderadas
  PASO 4 → Campo de texto opcional para añadir un comentario sobre el municipio
  PASO 5 → Confirmación y guardado en Supabase
Revisá ModalCalificar.jsx y adaptalo para implementar este flujo completo.

═══════════════════════════════════════════════
TAREA 4 — COMENTARIOS ANÓNIMOS en Blog y Noticias
═══════════════════════════════════════════════
Los comentarios ingresados en el proceso de calificación (Tarea 3, Paso 4) 
deben almacenarse y visualizarse de forma anónima en la sección "Blog y 
Noticias". Implementá:
- Vista de comentarios anónimos ordenados por fecha (más reciente primero)
- Filtro por Municipio (dropdown o selector)
- El nombre del usuario NUNCA debe mostrarse, solo el municipio y la fecha
- Creá la tabla "comentarios" en Supabase si no existe, con campos:
  id, municipio_id, texto, fecha_creacion, es_anonimo (boolean, siempre true)

═══════════════════════════════════════════════
TAREA 5 — BUSCADOR DE MUNICIPIOS en la página de inicio
═══════════════════════════════════════════════
Añadí un buscador de municipios visible en la página de inicio, por encima 
o integrado al mapa. Al tipear el nombre de un municipio:
- Mostrá sugerencias en tiempo real (autocompletado)
- Al seleccionar uno, el mapa debe centrarse y hacer zoom sobre ese polígono
- Mostrá el panel de información de ese municipio automáticamente
Usá los nombres del archivo municipios-amba.geojson como fuente de datos.

═══════════════════════════════════════════════
TAREA 6 — PÁGINA DE CONTACTO
═══════════════════════════════════════════════
Creá una nueva página/sección de "Contacto" accesible desde el menú de 
navegación con:
- Formulario con campos: Nombre, Email, Tipo de consulta 
  (opciones: Feedback, Error técnico, Publicidad/Patrocinio, Otro), Mensaje
- Envío por email usando Supabase Edge Functions o EmailJS (gratuito)
- Mensaje de confirmación al enviar
- Diseño consistente con el resto de la aplicación

═══════════════════════════════════════════════
TAREA 7 — ANCHO COMPLETO DE PANTALLA
═══════════════════════════════════════════════
La página no ocupa todo el ancho disponible. Revisá index.css, App.css y 
App.jsx en busca de max-width, margin: auto, padding o contenedores que 
limiten el ancho. Corregí para que todos los componentes usen el 100% del 
ancho de la pantalla (width: 100%, max-width: none donde corresponda).

═══════════════════════════════════════════════
TAREA 8 — RESPONSIVE MÓVIL: Logo y barra de navegación
═══════════════════════════════════════════════
En mobile (pantallas < 768px) el logo aparece recortado y parte de la barra 
de navegación (donde dice "Metodología") queda oculta. Corregí el CSS para:
- Logo: que escale correctamente con max-width y height: auto
- Navbar: implementá un menú hamburguesa (☰) para pantallas pequeñas que 
  colapse los links de navegación en un menú desplegable vertical
- Verificá en viewports de 320px, 375px y 768px

═══════════════════════════════════════════════
TAREA 9 — GUÍAS DOCUMENTALES (crear archivos Markdown)
═══════════════════════════════════════════════
Creá dos archivos de documentación en la raíz del proyecto:

A) GUIA-NORMATIVA.md
   Explicá paso a paso cómo agregar la normativa urbanística de cada 
   municipio a la plataforma: dónde subir los PDFs, cómo vincularlos 
   a cada municipio en Supabase, y cómo se muestran en la página.

B) GUIA-MONETIZACION.md
   Explicá cómo integrar Google AdSense en la aplicación React/Vite 
   (dónde pegar el script, qué componente crear, qué espacios publicitarios 
   son recomendados para no afectar la UX) y cómo gestionar patrocinadores 
   con banners propios en las secciones estratégicas de la app.

═══════════════════════════════════════════════
ORDEN DE EJECUCIÓN SUGERIDO:
═══════════════════════════════════════════════
1. ✅ Diagnóstico (Tarea 0) → mostrá resumen
2. ✅ Tarea 1 (renombrar) → cambio global, bajo riesgo
3. ✅ Tarea 7 (ancho pantalla) + ✅ Tarea 8 (responsive) → CSS puro
4. ✅ Tarea 2 (mapa GeoJSON) → núcleo visual
5. ✅ Tarea 5 (buscador) → depende del mapa
6. ✅ Tarea 3 (flujo calificar) → lógica de negocio
7. ✅ Tarea 4 (comentarios anónimos) → depende de Tarea 3
8. ✅ Tarea 6 (página de contacto) → nueva sección
9. ✅ Tarea 9 (guías documentales) → documentación final

Antes de modificar cualquier archivo, confirmá con un resumen de qué vas 
a cambiar y en qué archivo. Esperá mi aprobación para las tareas 3, 4 y 6 
ya que implican cambios en la base de datos de Supabase.