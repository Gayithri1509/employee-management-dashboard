import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // This sandboxed shell cannot delete files in the connected folder,
    // so we avoid asking Vite to empty dist/ before each build.
    // Old hashed build artifacts are left in place but are harmless —
    // index.html always references only the current build's files.
    emptyOutDir: false,
  },
})
