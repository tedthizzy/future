import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { allowedHosts: ['macbook-air-7.taild8ef36.ts.net'], port: 5173, strictPort: true, proxy: { '/api': 'http://127.0.0.1:8000' } },
});
