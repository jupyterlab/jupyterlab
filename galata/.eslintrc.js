module.exports = {
  extends: ['../.eslintrc.js'],
  parserOptions: {
    project: 'tsconfig.eslint.json'
  },
  rules: {
    'jest/no-done-callback': 'off',
    '@typescript-eslint/no-explicit-any': 'off'
  }
};
