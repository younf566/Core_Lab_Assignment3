import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/Core_Lab_Assignment3/',
  build: {
    outDir: 'dist'
  },
  server: {
    port: 3000,
    open: true
  }
})
