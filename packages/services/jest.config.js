module.exports = {
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },
  setupTestFrameworkScriptFile: '@jupyterlab/testutils/lib/jestScript.js',
  testRegex: '(/tests/.*|(\\.|/)(test|spec))\\.tsx?$',
  testPathIgnorePatterns: ['/lib/', '/node_modules/'],
  collectCoverage: true,
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  globals: {
    'ts-jest': {
      tsConfigFile: `test/tsconfig.json`
    }
  }
};
