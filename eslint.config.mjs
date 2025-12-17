import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: [
      'dist/**',
      'dist-electron/**',
      'node_modules/**',
      'build/**',
      '**/*.js',
      '**/*.cjs',
      '**/*.mjs',
    ],
  },
  {
    files: ['src/**/*.ts', 'src/**/*.tsx', 'client/src/**/*.ts', 'client/src/**/*.tsx', 'shared/**/*.ts'],
    rules: {
      // Enforce radix parameter in parseInt to prevent octal interpretation
      // This is a critical security/correctness rule
      'radix': 'error',

      // Other recommended rules
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      // Prevent new 'any' types - part of type safety initiative (issue #42)
      '@typescript-eslint/no-explicit-any': 'error',
      'no-console': 'off', // Allow console for server-side logging
    },
  },
  {
    // Test files can have relaxed rules
    files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', 'tests/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  }
);
