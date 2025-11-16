import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    allowedHosts: [
      'delaware-kings-pencil-aquarium.trycloudflare.com',
    ],
    // 如果 HMR 在隧道下异常，可取消注释并设置为你的隧道域名
    // hmr: {
    //   host: 'delaware-kings-pencil-aquarium.trycloudflare.com',
    //   protocol: 'wss',
    //   clientPort: 443,
    // },
  },
})
