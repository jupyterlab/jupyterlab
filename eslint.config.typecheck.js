const baseConfig = require('./eslint.config.js');

module.exports = [
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
