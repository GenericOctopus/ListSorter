import { defineConfig } from 'vite';

export default defineConfig({
  define: {
    global: 'window',
  },
  ssr: {
    noExternal: [],
    external: ['pouchdb']
  },
});
