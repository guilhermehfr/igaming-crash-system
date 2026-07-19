import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const proxyTarget = process.env.VITE_PROXY_TARGET ?? 'http://localhost:8000'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      "/auth": proxyTarget,
      "/games": proxyTarget,
      "/wallets": proxyTarget,
      "/socket.io": {
        target: proxyTarget,
        ws: true,
      },
    },
  },
})
