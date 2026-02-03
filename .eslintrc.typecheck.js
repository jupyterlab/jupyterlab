module.exports = {
  extends: ['eslint.config.js'],
  parserOptions: {
    project: 'tsconfig.eslint.json'
  },
  rules: {
    '@typescript-eslint/no-floating-promises': ['error', { ignoreVoid: true }],
    'jest/no-done-callback': 'off'
  }
};
