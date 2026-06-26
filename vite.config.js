import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath } from 'url';

export default defineConfig({
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __BUILD_VERSION__: JSON.stringify(
      process.env.CI_COMMIT_SHORT_SHA ||
        process.env.GITHUB_SHA?.slice(0, 7) ||
        'dev',
    ),
  },
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('lunar-javascript')) {
            return 'lunar';
          }
        },
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true,
        logLevel: 'debug',
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log(
              `[Proxy] ${req.method} ${req.url} -> ${options.target}${req.url}`,
            );
          });
        },
      },
    },
  },
});
