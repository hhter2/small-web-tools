import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const DOMAIN_BASELINE = {
  lines: 80,
  functions: 80,
  branches: 70,
  statements: 80,
};

const UI_BASELINE = {
  lines: 20,
  functions: 20,
  branches: 15,
  statements: 20,
};

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/tests/setup.js'],
    include: ['src/tests/**/*.test.{js,jsx}', 'functions/**/*.test.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: [
        'src/lib/**',
        'functions/_shared/**',
        'functions/api/**',
        'src/toolRegistry.js',
        'src/toolModes.js',
        'src/components/LanguageSwitcher.jsx',
        'src/components/ui/{Button,Card,FieldInput,FullscreenPreview,ToolHeader}.jsx',
      ],
      thresholds: {
        lines: 60,
        functions: 60,
        branches: 50,
        statements: 60,
        'src/lib/**': DOMAIN_BASELINE,
        'functions/_shared/**': DOMAIN_BASELINE,
        'functions/api/**': DOMAIN_BASELINE,
        'src/toolRegistry.js': UI_BASELINE,
        'src/toolModes.js': UI_BASELINE,
        'src/components/LanguageSwitcher.jsx': UI_BASELINE,
        'src/components/ui/**': UI_BASELINE,
      },
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify('test'),
    __SHOW_CHANNEL_ALERT__: false,
    __APP_CHANNEL__: JSON.stringify(''),
  },
});
