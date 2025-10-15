import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({
  base: './', // 👈 correto para subpasta
  plugins: [react()],
})