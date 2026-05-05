/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_SUPABASE_FAMILY_ID?: string;
  /** SHA-256 hash (lower-case hex) of the family password. When set, the
   *  app shows a password gate before the magic-link screen. */
  readonly VITE_GATE_PASSWORD_HASH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
