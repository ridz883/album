import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Konfigurasi ini wajib ada agar Vercel tahu ini adalah aplikasi React
export default defineConfig({
  plugins: [react()],
})
