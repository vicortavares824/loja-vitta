import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        'src/components/reactbits/**'
      ]
    },
    projects: [
      {
        // Frontend: jsdom + DOM setup
        plugins: [react()],
        test: {
          name: 'src',
          globals: true,
          environment: 'jsdom',
          setupFiles: ['./src/tests/setup.ts'],
          include: ['src/**/*.{test,spec}.{ts,tsx}'],
          exclude: ['e2e/**', 'node_modules/**']
        }
      },
      {
        // Backend (Vercel Functions): node, sem setup do DOM
        test: {
          name: 'api',
          globals: true,
          environment: 'node',
          include: ['api/_tests/**/*.test.ts'],
          exclude: ['node_modules/**']
        }
      }
    ]
  }
});
