import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import manifest from './manifest.config'

export default defineConfig({
  plugins: [
    react(),       // React must be first for Fast Refresh
    tailwindcss(),
    crx({ manifest }),
  ],

  resolve: {
    alias: {
      '@': '/src',
    },
  },

  build: {
    // Keep individual asset chunks ≤ 2 MB before Rollup emits a warning.
    // jspdf is lazy-loaded so it stays in its own split chunk.
    chunkSizeWarningLimit: 600,

    rollupOptions: {
      input: {
        // Explicitly list sidepanel.html so CRXJS maps it correctly.
        // The background entry is handled automatically by CRXJS via the
        // manifest service_worker field — do NOT add it here or you get
        // a double-bundle and the service-worker-loader path breaks.
        sidepanel: 'sidepanel.html',
      },

      output: {
        // Split large vendor libs into predictable named chunks so the
        // service-worker-loader never inadvertently pulls them in.
        manualChunks(id) {
          if (id.includes('node_modules/jspdf') || id.includes('node_modules/html2canvas')) {
            return 'pdf-libs';
          }
          if (id.includes('node_modules/react-dom')) {
            return 'react-dom';
          }
          if (id.includes('node_modules/react')) {
            return 'react-vendor';
          }
        },
      },
    },
  },

  server: {
    port: 5173,
    strictPort: true,
    hmr: {
      host: 'localhost',
      protocol: 'ws',
      overlay: false,
    },
  },
})