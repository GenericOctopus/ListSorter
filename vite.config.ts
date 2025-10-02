import { defineConfig } from 'vite';

export default defineConfig({
  ssr: {
    noExternal: [],
    external: ['pouchdb']
  },
  optimizeDeps: {
    exclude: ['pouchdb']
  }
});
