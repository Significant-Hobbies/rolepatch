import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    exclude: ['e2e/**', 'node_modules/**', '.claude/**', 'extension/**'],
  },
coverage: {
    provider: 'v8',
    reporter: ['json', 'text-summary'],
    exclude: ['node_modules', 'dist', '.next', 'coverage', '**/*.d.ts', '**/*.config.*', '**/test/**'],
  },
});
