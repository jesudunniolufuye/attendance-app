import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Vite dev server (5173) and Apache (80) are different origins. Instead of
// fighting CORS, proxy /api/* to Apache so the React app can call the PHP
// endpoints with plain relative paths like fetch('/api/staff.php').
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost', // Apache (mod_php) serves PHP here on port 80
        changeOrigin: true,
      },
    },
  },
})
