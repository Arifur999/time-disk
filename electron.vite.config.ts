import { resolve } from 'node:path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  main: {},
  preload: {},
  renderer: {
    plugins: [react(), tailwindcss()],
    build: {
      rollupOptions: {
        input: {
          planner: resolve(__dirname, 'src/renderer/planner.html'),
          widget: resolve(__dirname, 'src/renderer/widget.html')
        }
      }
    }
  }
})
