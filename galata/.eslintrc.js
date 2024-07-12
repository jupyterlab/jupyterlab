module.exports = {
  extends: ['../.eslintrc.js'],
  parserOptions: {
    project: 'tsconfig.eslint.json'
  },
  rules: {
    'jest/no-done-callback': 'off'
  }
};
