import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // Served from https://<user>.github.io/stellar-wallet-dapp/ on GitHub Pages
  base: process.env.GITHUB_ACTIONS ? '/stellar-wallet-dapp/' : '/',
  plugins: [react()],
})
