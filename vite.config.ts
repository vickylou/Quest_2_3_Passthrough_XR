/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/Quest_2_3_Passthrough_XR/',
  plugins: [react()],
  server: { host: true },
  test: { environment: 'node' },
});
