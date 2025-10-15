// admin-dashboard/vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './', // 🔑 assets e index funcionam em qualquer subcaminho
})