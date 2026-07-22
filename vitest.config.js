import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/tests/setup.js'],
    include: ['src/tests/**/*.test.{js,jsx}', 'functions/**/*.test.{js}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/lib/**', 'functions/_shared/**'],
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify('test'),
    __SHOW_CHANNEL_ALERT__: false,
    __APP_CHANNEL__: JSON.stringify(''),
  },
});
