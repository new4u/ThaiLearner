import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        allowedHosts: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        proxy: {
          '/api/satipatthana-cache': {
            target: 'https://www.satipatthana.life',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api\/satipatthana-cache/, '/.netlify/functions/dhamma-cache'),
          },
          '/api/dhamma-proxy': {
            target: 'https://www.dhamma.cn',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api\/dhamma-proxy/, ''),
            headers: {
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
              'Accept': 'application/json, text/plain, */*',
            },
          },
        },
      },
      plugins: [react(), tailwindcss()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
