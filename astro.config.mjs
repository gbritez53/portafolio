import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import node from '@astrojs/node';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: process.env.PUBLIC_SITE_URL || undefined,
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  integrations: [react()],
  vite: { plugins: [tailwindcss()] },
  build: { inlineStylesheets: 'auto' },
});
