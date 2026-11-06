import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';

const env = { ...loadEnv(process.env.NODE_ENV ?? 'production', process.cwd(), ''), ...process.env };

// SITE_URL і BASE_PATH задаються під час деплою (див. README). Локально — значення за замовчуванням.
export default defineConfig({
  site: env.SITE_URL || 'http://localhost:4321',
  base: env.BASE_PATH || '/',
  trailingSlash: 'ignore',
  build: { format: 'directory', inlineStylesheets: 'always' },
  devToolbar: { enabled: false },
});
