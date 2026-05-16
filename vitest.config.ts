import { defineVitestConfig } from '@saas-maker/test-config/vitest';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineVitestConfig({
  environment: 'jsdom',
  setupFiles: ['./vitest.setup.ts'],
  include: [
    '__tests__/**/*.test.{ts,tsx}',
    'src/**/__tests__/**/*.test.{ts,tsx}',
    'src/**/*.test.{ts,tsx}',
  ],
  exclude: ['e2e/**', '.claude/**', 'extension/**'],
  extend: {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  },
});
