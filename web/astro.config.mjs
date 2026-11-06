import { defineConfig } from 'astro/config';

// SITE_URL і BASE_PATH задаються під час деплою (див. README). Локально — значення за замовчуванням.
export default defineConfig({
  site: process.env.SITE_URL || 'http://localhost:4321',
  base: process.env.BASE_PATH || '/',
  trailingSlash: 'ignore',
  build: { format: 'directory', inlineStylesheets: 'always' },
  devToolbar: { enabled: false },
});
