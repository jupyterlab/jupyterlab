import path = require('path');

module.exports = function(name: string, baseDir: string) {
  return {
    transform: {
      '^.+\\.tsx?$': 'ts-jest'
    },
    moduleNameMapper: {
      '\\.(css|less|sass|scss)$': 'identity-obj-proxy',
      '\\.(gif|ttf|eot|svg)$': '@jupyterlab/testutils/lib/jest-file-mock.js'
    },
    setupTestFrameworkScriptFile: '@jupyterlab/testutils/lib/jest-script.js',
    setupFiles: ['@jupyterlab/testutils/lib/jest-shim.js'],
    testPathIgnorePatterns: ['/dev_mode/', '/lib/', '/node_modules/'],
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    rootDir: path.resolve(path.join(baseDir, '..', '..')),
    reporters: ['default', 'jest-junit'],
    collectCoverageFrom: [
      `packages/${name}/src/**.{ts,tsx}`,
      `!packages/${name}/src/*.d.ts`
    ],
    coverageReporters: ['json', 'lcov', 'text', 'html'],
    coverageDirectory: path.join(baseDir, 'coverage'),
    testRegex: `tests\/test-${name}\/src\/.*\.spec\.ts$`,
    globals: {
      'ts-jest': {
        tsConfigFile: `tests/test-${name}/tsconfig.json`
      }
    }
  };
};
