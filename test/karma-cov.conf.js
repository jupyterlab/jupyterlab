var path = require('path');

module.exports = function (config) {
  config.set({
    basePath: '..',
    browsers: ['Firefox'],
    frameworks: ['mocha'],
    reporters: ['mocha', 'coverage'],
    files: [
      'node_modules/es6-promise/dist/es6-promise.js',
      'test/build/coverage.js'
    ],
    coverageReporter: {
      reporters : [
        { 'type': 'text' },
        { 'type': 'lcov', dir: 'test/coverage' },
        { 'type': 'html', dir: 'test/coverage' }
      ]
    },
    port: 9876,
    colors: true,
    singleRun: true,
    logLevel: config.LOG_INFO
  });
};
