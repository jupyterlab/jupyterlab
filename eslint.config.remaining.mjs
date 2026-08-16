/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 *
 * Minimal ESLint config for rules not yet supported by oxlint.
 * Run alongside oxlint; this file is intentionally kept small.
 * Rules covered here:
 *   - @typescript-eslint/switch-exhaustiveness-check  (type-aware, unconfigured in oxlint —
 *     see oxlint-migration-notes.md for how to enable via oxlint-tsgolint / --type-aware)
 *   - jupyter/plugin-activation-args  (requires TypeScript type info; gives false positives
 *     in oxlint's JS-plugin context which has no type checker access)
 *
 * Additional plugins are loaded with no rules enabled so that
 * // eslint-disable-next-line <plugin>/<rule> comments in source files do not
 * cause "Definition for rule not found" errors in this config.
 */

import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';
import jestPlugin from 'eslint-plugin-jest';
import regexpPlugin from 'eslint-plugin-regexp';
import jupyterPlugin from '@jupyter/eslint-plugin';
import baseConfig from './eslint.config.mjs';

const IGNORES = baseConfig[0];

export default defineConfig([
  IGNORES,
  {
    linterOptions: {
      reportUnusedDisableDirectives: 'off'
    }
  },
  {
    // Register plugins whose rules appear in eslint-disable comments but are
    // enforced by oxlint, not this config. No rules are enabled here.
    plugins: {
      jest: jestPlugin,
      regexp: regexpPlugin,
      jupyter: jupyterPlugin
    }
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: { '@typescript-eslint': tseslint.plugin },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: ['./tsconfig.eslint.json']
      }
    },
    rules: {
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      // plugin-activation-args requires TypeScript type information to resolve
      // token types; it gives false positives in oxlint's JS-plugin context.
      'jupyter/plugin-activation-args': 'error'
    }
  }
]);
