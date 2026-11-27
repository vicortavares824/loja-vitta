import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
  ],
  // Permite abrir o servidor local por um túnel do Cloudflare (cloudflared tunnel --url ...).
  // Só afeta `vite dev` e `vite preview`; o build da Vercel não usa isto.
  server: { allowedHosts: ['.trycloudflare.com'] },
  preview: { allowedHosts: ['.trycloudflare.com'] },
})
