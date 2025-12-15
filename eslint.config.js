import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default tseslint.config(
  // Ignore patterns
  {
    ignores: [
      'dist/**',
      'dist-electron/**',
      'node_modules/**',
      '*.config.js',
      '*.config.cjs',
      '*.config.mjs',
      '*.config.ts',
      'coverage/**',
      'build/**',
      '**/*.backup',
      '**/*.d.ts'
    ]
  },

  // Base JS/TS config
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // Global relaxed rules for existing codebase
  {
    rules: {
      // IMPORTANT: Enforce radix parameter for parseInt - this is the primary rule
      'radix': 'error',

      // Relaxed rules for existing codebase (warnings, not errors)
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
      }],
      '@typescript-eslint/no-empty-object-type': 'warn',
      '@typescript-eslint/no-this-alias': 'warn',
      '@typescript-eslint/no-namespace': 'warn',
      '@typescript-eslint/no-require-imports': 'warn',
      'no-console': 'off',
      'no-case-declarations': 'warn',
      'no-empty': 'warn',
      'no-useless-catch': 'warn',
      'prefer-const': 'warn'
    }
  },

  // Client (React) specific config
  {
    files: ['client/src/**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.es2022
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        }
      }
    },
    rules: {
      // React hooks rules
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true }
      ]
    }
  },

  // Server specific config
  {
    files: ['src/server/**/*.ts'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.es2022
      }
    }
  },

  // Electron specific config
  {
    files: ['src/electron/**/*.{js,cjs}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: {
        ...globals.node,
        ...globals.browser
      }
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off'
    }
  },

  // Test files config
  {
    files: ['**/*.test.{ts,tsx}', '**/__tests__/**/*.{ts,tsx}', 'tests/**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.jest,
        ...globals.node
      }
    },
    rules: {
      // Allow any in tests
      '@typescript-eslint/no-explicit-any': 'off',
      // Allow require() in tests for dynamic imports
      '@typescript-eslint/no-require-imports': 'off'
    }
  }
);
