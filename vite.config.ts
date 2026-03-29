import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import manifest from './manifest.config'

export default defineConfig({
  plugins: [
    react(), // React must be first for Fast Refresh
    tailwindcss(),
    crx({ manifest }),
  ],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    // CRITICAL: Explicitly define the HMR host
    hmr: {
      host: 'localhost',
      protocol: 'ws',
    },
  },
})