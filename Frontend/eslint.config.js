// Frontend/eslint.config.js
// ESLint v9 flat config — uses TypeScript parser for .ts/.tsx files

import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';

export default [
  // ── Global ignores ─────────────────────────────────────────────────────────
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'public/**',          // sw.js is a plain-JS service worker, skip linting
    ],
  },

  // ── Base JS rules (applies everywhere as a baseline) ───────────────────────
  js.configs.recommended,

  // ── TypeScript source files (.ts / .tsx) ───────────────────────────────────
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
        // No project: true — avoids slow type-aware linting in CI
      },
      globals: {
        ...globals.browser,
        ...globals.es2022,
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      // ── React Hooks ─────────────────────────────────────────────────────────
      ...reactHooks.configs.recommended.rules,

      // Warn on non-component fast-refresh exports
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // ── Turn off base rules that TS plugin supersedes ───────────────────────
      'no-unused-vars': 'off',
      'no-undef': 'off',
      'no-redeclare': 'off',
      'no-dupe-class-members': 'off',

      // ── TS-aware replacements ───────────────────────────────────────────────
      '@typescript-eslint/no-unused-vars': ['warn', {
        vars: 'all',
        args: 'after-used',
        ignoreRestSiblings: true,
        varsIgnorePattern: '^_',
        argsIgnorePattern: '^_',
      }],
      '@typescript-eslint/no-explicit-any': 'warn',

      // ── Practical overrides ─────────────────────────────────────────────────
      'no-console': 'off',     // Console is used throughout for debug
      'no-debugger': 'error',
    },
  },

  // ── Plain JS/JSX in src (fallback) ─────────────────────────────────────────
  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.es2022 },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'no-unused-vars': ['warn', { varsIgnorePattern: '^_', argsIgnorePattern: '^_' }],
      'no-console': 'off',
    },
  },
];

