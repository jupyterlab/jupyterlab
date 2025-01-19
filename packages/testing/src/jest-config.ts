/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import path from 'path';

const esModules = [
  '@codemirror',
  '@marijn',
  '@microsoft',
  '@jupyter/react-components',
  '@jupyter/web-components',
  '@jupyter/ydoc',
  'exenv-es6',
  'lib0',
  'nanoid',
  'vscode-ws-jsonrpc',
  'y-protocols',
  'y-websocket',
  'yjs'
].join('|');

module.exports = function (baseDir: string) {
  return {
    coverageReporters: ['json', 'lcov', 'text', 'html'],
    coverageDirectory: path.join(baseDir, 'coverage'),
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
    moduleNameMapper: {
      '\\.(css|less|sass|scss)$': 'identity-obj-proxy',
      '\\.(gif|ttf|eot)$': '@jupyterlab/testing/lib/jest-file-mock.js'
    },
    reporters: ['default', 'jest-junit', 'github-actions'],
    resolver: '@jupyterlab/testing/lib/jest-resolver.js',
    setupFiles: ['@jupyterlab/testing/lib/jest-shim.js'],
    testEnvironment: '@jupyterlab/testing/lib/jest-env.js',
    testPathIgnorePatterns: ['/lib/', '/node_modules/'],
    testRegex: '/test/.*.spec.ts[x]?$',
    testTimeout: 10000,
    transform: {
      '\\.svg$': '@jupyterlab/testing/lib/jest-raw-loader.js',
      // Extracted from https://github.com/kulshekhar/ts-jest/blob/v29.0.3/presets/index.js
      '^.+\\.tsx?$': [
        'ts-jest/legacy',
        {
          tsconfig: `./tsconfig.test.json`
        }
      ],
      '^.+\\.jsx?$': 'babel-jest'
    },
    transformIgnorePatterns: [`/node_modules/(?!${esModules}).+`]
  };
};
