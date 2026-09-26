/// <reference types="vitest" />
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), basicSsl()],
  server: {
    host: true,  // Expose on local network (0.0.0.0) — access via phone on same WiFi
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
