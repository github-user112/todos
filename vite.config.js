import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath } from 'url';

export default defineConfig({
  define: {
    __BUILD_TIME__: JSON.stringify(
      new Date().toLocaleString('zh-CN', {
        timeZone: 'Asia/Shanghai',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }),
    ),
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
