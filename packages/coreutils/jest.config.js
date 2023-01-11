/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

const path = require('path');

module.exports = {
  testEnvironment: 'jsdom',
  testTimeout: 10000,
  testPathIgnorePatterns: ['/lib/', '/node_modules/'],
  transform: {
    // Extracted from https://github.com/kulshekhar/ts-jest/blob/v29.0.3/presets/index.js
    '^.+\\.tsx?$': [
      'ts-jest/legacy',
      {
        tsconfig: `./tsconfig.test.json`
      }
    ],
    '^.+\\.jsx?$': 'babel-jest'
  },
  moduleFileExtensions: [
    'ts',
    'tsx',
    'js',
    'jsx',
    'json',
    'node',
    'mjs',
    'cjs'
  ],
  reporters: ['default', 'jest-junit', 'github-actions'],
  coverageReporters: ['json', 'lcov', 'text', 'html'],
  coverageDirectory: path.join(__dirname, 'coverage'),
  testRegex: '/test/.*.spec.ts[x]?$'
};
