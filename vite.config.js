import { defineConfig } from 'vite';

export default defineConfig({
  /* ── GitHub Pages: godfathxrpe.github.io/Dashboard/ ── */
  base: '/Dashboard/',

  /* ── Dev server ── */
  server: {
    open: true,
    port: 3000,
  },

  /* ── Build ── */
  build: {
    outDir: 'dist',
    /* Пока весь JS inline в index.html —
       Vite просто копирует файл как есть.
       Когда начнём выносить модули (Phase 2.3+),
       Vite будет бандлить main.js и его импорты. */
  },
});
