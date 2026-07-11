import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
        ecmaFeatures: { jsx: true },
        /* React 17+ new JSX transform — React does not need to be in
           scope for JSX. Suppresses no-undef on 'React' correctly. */
        jsxPragma: null,
      },
      /* Browser globals + React runtime globals (new JSX transform) */
      globals: {
        ...globals.browser,
        /* React 17+ JSX transform injects these automatically;
           they are valid globals even without `import React` */
        React: 'readonly',
        JSX: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,

      /* React 17+ new JSX transform: React doesn't need to be in scope */
      'no-undef': 'off',              // TypeScript handles this better
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],

      /* react-refresh: warn on files mixing components with other exports */
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      /* react-hooks/set-state-in-effect is an advisory rule;
         the carousel pattern is a known Radix/Embla idiom — downgrade
         to warn so CI is not blocked by upstream UI library patterns */
      'react-hooks/set-state-in-effect': 'warn',

      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    /* Exclude compiled bundle, build output, and node_modules */
    ignores: [
      'dist/**',
      'node_modules/**',
      'public/assets/**',
      '*.config.js',
      '*.config.ts',
    ],
  },
];
