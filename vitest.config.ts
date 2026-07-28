import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    setupFiles: ['./tests/vitest.setup.ts'],
    fileParallelism: false, // shared SQLite file -- avoid cross-test-file races
  },
});
