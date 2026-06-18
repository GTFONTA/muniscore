import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        // Sitio público (entrada por defecto).
        main: resolve(__dirname, 'index.html'),
        // Panel de administración de la whitelist (bundle separado, /admin.html).
        admin: resolve(__dirname, 'admin.html'),
      },
    },
  },
})
