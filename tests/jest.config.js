const func = require('@jupyterlab/testutils/lib/jest-config');
const upstream = func('@jupyterlab/debugger', __dirname);

let local = {
  preset: 'ts-jest/presets/js-with-babel',
  transformIgnorePatterns: ['/node_modules/(?!(@jupyterlab/.*)/)'],
  globals: {
    'ts-jest': {
      tsConfig: './tsconfig.json'
    }
  },
  transform: {
    '\\.(ts|tsx)?$': 'ts-jest',
    '\\.svg$': 'jest-raw-loader'
  }
};

[
  'moduleFileExtensions',
  'moduleNameMapper',
  'reporters',
  'setupFilesAfterEnv',
  'setupFiles'
].forEach(option => {
  local[option] = upstream[option];
});

module.exports = local;
