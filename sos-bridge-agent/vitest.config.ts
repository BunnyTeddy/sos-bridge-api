import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Test environment
    environment: 'node',
    
    // Global test timeout
    testTimeout: 30000,
    
    // Hook timeout
    hookTimeout: 30000,
    
    // Test file patterns
    include: ['src/__tests__/**/*.test.ts', 'src/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: [
        'src/__tests__/**',
        'src/**/*.test.ts',
        'src/index.ts',
        'src/telegram-main.ts',
      ],
    },
    
    // Setup files
    setupFiles: ['./src/__tests__/setup.ts'],
    
    // Global variables
    globals: true,
    
    // Reporter
    reporters: ['verbose'],
    
    // Pool configuration for parallel tests
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true, // Run tests sequentially to avoid rate limiting issues
      },
    },
  },
  
  // ESM support
  esbuild: {
    target: 'node20',
  },
});

