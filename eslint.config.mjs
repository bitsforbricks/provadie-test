import globals from 'globals';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default [
  {
    ignores: ['node_modules', 'dist', '**/*.min.js', '.cache', '**/*.yaml'],
  },
  ...compat.extends('./eslint.base.config.js'),
  {
    languageOptions: {
      globals: {
        fetch: true,
        window: true,
        ...globals.node,
        ...globals.jest,
      },

      ecmaVersion: 2023,
      sourceType: 'module',
    },

    rules: {
      '@typescript-eslint/no-unnecessary-boolean-literal-compare': 0,
      '@typescript-eslint/no-unnecessary-condition': 0,
      '@typescript-eslint/consistent-type-definitions': 0,
      '@typescript-eslint/no-explicit-any': 0,
      '@typescript-eslint/no-unused-vars': 0,
      '@typescript-eslint/no-empty-object-type': 0,
    },
  },
];
