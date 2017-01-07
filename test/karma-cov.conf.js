var path = require('path');

module.exports = function (config) {
  config.set({
    basePath: '.',
    browsers: ['Firefox'],
    frameworks: ['mocha'],
    client: {
      mocha: {
        timeout : 10000, // 10 seconds - upped from 2 seconds
        retries: 3 // Allow for slow server on CI.
      }
    },
    reporters: ['mocha', 'coverage', 'remap-coverage'],
    files: [
      'node_modules/es6-promise/dist/es6-promise.js',
      'build/injector.js',
      'build/coverage.js'
    ],
    preprocessors: {
      'build/coverage.js': ['sourcemap']
    },
    coverageReporter: {
      type: 'in-memory'
    },
    remapCoverageReporter: {
      'text-summary': null, // to show summary in console
      json: 'coverage/remapped.json',
      html: 'coverage/html'
    },
    port: 9876,
    colors: true,
    singleRun: true,
    logLevel: config.LOG_INFO
  });
};
