import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({
  base: './',        // MUITO importante p/ rodar em subpasta
  plugins: [react()],
})