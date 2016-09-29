var path = require('path');

module.exports = function (config) {
  config.set({
    basePath: '..',
    browsers: ['Firefox'],
    frameworks: ['mocha'],
    reporters: ['mocha', 'coverage', 'remap-coverage'],
    files: [
      'node_modules/es6-promise/dist/es6-promise.js',
      'test/build/coverage.js'
    ],
    preprocessors: {
      'test/build/coverage.js': ['sourcemap']
    },
    coverageReporter: {
      type: 'in-memory'
    },
    remapCoverageReporter: {
      'text-summary': null, // to show summary in console
      json: 'test/coverage/remapped.json',
      html: 'test/coverage/html'
    },
    port: 9876,
    colors: true,
    singleRun: true,
    logLevel: config.LOG_INFO
  });
};
