import { defineConfig } from 'eslint/config';
import baseConfig from '../eslint.config.mjs';

export default defineConfig([
  ...baseConfig,
  {
    files: ['**/*.ts', '**/*.tsx'],

    languageOptions: {
      parserOptions: {
        project: 'tsconfig.eslint.json'
      }
    },

    rules: {
      'jest/no-done-callback': 'off'
    }
  }
]);
