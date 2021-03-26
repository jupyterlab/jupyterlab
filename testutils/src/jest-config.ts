import path from 'path';

module.exports = function (baseDir: string) {
  return {
    preset: 'ts-jest/presets/js-with-babel',
    moduleNameMapper: {
      '\\.(css|less|sass|scss)$': 'identity-obj-proxy',
      '\\.(gif|ttf|eot)$': '@jupyterlab/testutils/lib/jest-file-mock.js'
    },
    transform: {
      '\\.svg$': 'jest-raw-loader',
      '^.+\\.md?$': 'markdown-loader-jest'
    },
    testTimeout: 10000,
    setupFiles: ['@jupyterlab/testutils/lib/jest-shim.js'],
    testPathIgnorePatterns: ['/lib/', '/node_modules/'],
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
    transformIgnorePatterns: [
      '/node_modules/(?![lib0]).+\\.js$',
      '/node_modules/(?![lib0]).+\\.cjs$'
    ],
    reporters: ['default', 'jest-junit', 'jest-summary-reporter'],
    coverageReporters: ['json', 'lcov', 'text', 'html'],
    coverageDirectory: path.join(baseDir, 'coverage'),
    testRegex: '/test/.*.spec.ts[x]?$',
    globals: {
      'ts-jest': {
        tsConfig: `./tsconfig.test.json`
      }
    }
  };
};
