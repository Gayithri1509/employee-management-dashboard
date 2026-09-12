/// <reference types="vite/client" />

// Stage 2: typed access to the Vite-injected environment variables this app
// reads through import.meta.env. Only VITE_-prefixed variables are ever
// exposed to browser code by Vite — see docs/supabase-client-setup.md for
// what each one is and where it comes from.
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
