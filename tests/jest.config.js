const func = require('@jupyterlab/testutils/lib/jest-config');
const upstream = func('@jupyterlab/debugger', __dirname);

let local = {
  preset: 'ts-jest/presets/js-with-babel',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transformIgnorePatterns: ['/node_modules/(?!(@jupyterlab/.*)/)'],
  globals: {
    'ts-jest': {
      tsConfig: './tsconfig.json'
    }
  },
  transform: {
    '\\.(ts|tsx)?$': 'ts-jest'
  }
};

[
  'moduleNameMapper',
  'reporters',
  'setupFilesAfterEnv',
  'setupFiles',
  'moduleFileExtensions'
].forEach(option => {
  local[option] = upstream[option];
});

module.exports = local;
