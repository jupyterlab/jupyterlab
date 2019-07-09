var path = require('path');
var webpack = require('./webpack.config');

process.env.CHROME_BIN = require('puppeteer').executablePath();

module.exports = function(config) {
  config.set({
    basePath: '.',
    frameworks: ['mocha'],
    reporters: ['mocha'],
    client: {
      captureConsole: true,
      mocha: {
        timeout: 30000, // 30 seconds - upped from 2 seconds
        retries: 3 // Allow for slow server on CI.
      }
    },
    files: [
      { pattern: path.resolve('./build/injector.js'), watched: false },
      { pattern: process.env.KARMA_FILE_PATTERN, watched: false }
    ],
    preprocessors: {
      'build/injector.js': ['webpack'],
      'src/*.spec.{ts,tsx}': ['webpack', 'sourcemap']
    },
    mime: {
      'text/x-typescript': ['ts', 'tsx']
    },
    webpack: webpack,
    webpackMiddleware: {
      noInfo: true,
      stats: 'errors-only'
    },
    browserNoActivityTimeout: 61000, // 61 seconds - upped from 10 seconds
    browserDisconnectTimeout: 61000, // 61 seconds - upped from 2 seconds
    browserDisconnectTolerance: 2,
    port: 9876,
    colors: true,
    singleRun: true,
    logLevel: config.LOG_INFO
  });
};
