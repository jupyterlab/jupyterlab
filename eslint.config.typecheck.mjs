import baseConfig from './eslint.config.mjs';

export default [
  ...baseConfig,
  {
    rules: {
      '@typescript-eslint/no-floating-promises': [
        'error',
        { ignoreVoid: true }
      ],
      'jest/no-done-callback': 'off'
    }
  }
];
