# Munilupa — Gestión Municipal a la vista

Plataforma de evaluación colectiva de la gestión urbanística en los municipios del AMBA (Área Metropolitana de Buenos Aires).

## ¿Qué es Munilupa?

Munilupa permite a desarrolladores, constructores, arquitectos e inversores calificar de forma anónima la experiencia de tramitar obras y permisos en cada municipio del Gran Buenos Aires. El índice resultante es público y se actualiza en tiempo real.

## Stack tecnológico

- **Frontend:** React 19 + Vite 8
- **Mapas:** Leaflet 1.9 + react-leaflet 5
- **Backend / Auth / DB:** Supabase
- **Datos geoespaciales:** GeoJSON AMBA (134 municipios)

## Categorías de evaluación

| Categoría | Peso |
|-----------|------|
| Transparencia y ausencia de corrupción | 25% |
| Velocidad de aprobación de planos | 20% |
| Claridad y accesibilidad de normativas | 20% |
| Previsibilidad y consistencia | 15% |
| Atención al público | 10% |
| Razonabilidad de tasas e impuestos | 10% |

## Instalación y desarrollo local

```bash
# Clonar el repositorio
git clone <repo-url>
cd munilupa

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editá .env con tus credenciales de Supabase

# Iniciar servidor de desarrollo
npm run dev

# Build para producción
npm run build
```

## Variables de entorno requeridas

```
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

## Scripts disponibles

```bash
npm run dev       # Servidor Vite con HMR en localhost:5173
npm run build     # Compilar para producción (genera dist/)
npm run preview   # Previsualizar el build local
npm run lint      # Validar código con ESLint
```

## Estructura del proyecto

```
src/
├── App.jsx                  # Componente principal, diseño y vistas
├── main.jsx                 # Entry point React
├── index.css                # Estilos globales
├── components/
│   ├── MapaPoligonos.jsx    # Mapa interactivo Leaflet + GeoJSON
│   └── ModalCalificar.jsx   # Modal de verificación y selección
└── lib/
    └── supabase.js          # Cliente y funciones de base de datos
public/
└── municipios-amba.geojson  # Polígonos de los 134 municipios del AMBA
```

## Licencia

Proyecto privado — todos los derechos reservados.
