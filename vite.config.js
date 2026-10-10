import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  // 相对 base：本地 dev 与 GitHub Pages 子路径（/tresJS/）均可用
  base: './',
  plugins: [vue()],
  server: {
    host: true,
    port: 5173,
  },
})
