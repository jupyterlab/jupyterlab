module.exports = {
  env: {
    browser: true,
    es6: true,
    commonjs: true,
    node: true,
    'jest/globals': true
  },
  root: true,
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier/@typescript-eslint',
    'plugin:react/recommended',
    'plugin:jest/recommended'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.eslint.json'
  },
  plugins: ['@typescript-eslint', 'jest'],
  rules: {
    '@typescript-eslint/no-floating-promises': ['error', { ignoreVoid: true }],
    '@typescript-eslint/interface-name-prefix': [
      'error',
      { prefixWithI: 'always' }
    ],
    '@typescript-eslint/no-unused-vars': ['warn', { args: 'none' }],
    '@typescript-eslint/no-var-requires': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-namespace': 'off',
    '@typescript-eslint/no-use-before-define': 'off',
    '@typescript-eslint/quotes': [
      'error',
      'single',
      { avoidEscape: true, allowTemplateLiterals: false }
    ],
    'no-inner-declarations': 'off',
    'no-prototype-builtins': 'off',
    'no-control-regex': 'warn',
    'no-undef': 'warn',
    'no-case-declarations': 'warn',
    'no-useless-escape': 'off',
    'prefer-const': 'off',
    'jest/no-jest-import': 'off',
    'jest/no-export': 'warn',
    'jest/no-try-expect': 'warn'
  },
  settings: {
    react: {
      version: 'detect'
    }
  }
};
