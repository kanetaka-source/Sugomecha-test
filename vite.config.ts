import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    // 画面(5173)からの /api 呼び出しを APIサーバー(3001)へ転送
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
