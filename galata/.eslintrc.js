module.exports = {
  extends: ['../package.json'],
  parserOptions: {
    project: 'tsconfig.eslint.json'
  },
  rules: {
    'jest/no-done-callback': 'off'
  }
};
