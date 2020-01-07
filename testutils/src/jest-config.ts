import path = require('path');

module.exports = function(name: string, baseDir: string) {
  return {
    preset: 'ts-jest/presets/js-with-babel',
    moduleNameMapper: {
      '\\.(css|less|sass|scss)$': 'identity-obj-proxy',
      '\\.(gif|ttf|eot)$': '@jupyterlab/testutils/lib/jest-file-mock.js'
    },
    transform: {
      '\\.svg$': 'jest-raw-loader'
    },
    setupFilesAfterEnv: ['@jupyterlab/testutils/lib/jest-script.js'],
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
    testRegex: `tests\/test-${name}\/src\/.*\.spec\.tsx?$`,
    globals: {
      'ts-jest': {
        tsConfig: `./tsconfig.json`
      }
    }
  };
};
