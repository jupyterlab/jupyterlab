/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import baseConfig from './eslint.config.mjs';
import tseslint from 'typescript-eslint';

const strictBooleanExpressionsRule =
  tseslint.plugin.rules['strict-boolean-expressions'];

// The upstream rule cannot be configured to report only nullable numbers: even
// with every allow* option enabled, it still reports always-truthy objects and
// other non-number conditions. Filter its reports for the staged rollout.
const strictBooleanNullableNumberRule = {
  ...strictBooleanExpressionsRule,
  create(context) {
    const filteredContext = Object.create(context);
    Object.defineProperty(filteredContext, 'report', {
      value: (...args) => {
        const descriptor = args[0];
        if (
          descriptor &&
          typeof descriptor === 'object' &&
          descriptor.messageId === 'conditionErrorNullableNumber'
        ) {
          return context.report(...args);
        }
      }
    });

    return strictBooleanExpressionsRule.create(filteredContext);
  }
};

export default [
  ...baseConfig,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tseslint.parser
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      jupyterlab: {
        rules: {
          'strict-boolean-nullable-number': strictBooleanNullableNumberRule
        }
      }
    },
    rules: {
      '@typescript-eslint/no-floating-promises': [
        'error',
        { ignoreVoid: true }
      ],
      'jupyterlab/strict-boolean-nullable-number': [
        'warn',
        {
          allowAny: true,
          allowNullableBoolean: true,
          allowNullableEnum: true,
          allowNullableNumber: false,
          allowNullableObject: true,
          allowNullableString: true,
          allowNumber: true,
          allowString: true
        }
      ],
      'jest/no-done-callback': 'off'
    }
  }
];
