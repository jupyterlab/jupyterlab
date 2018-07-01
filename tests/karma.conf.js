var path = require('path');
var webpack = require('./webpack.config');

process.env.CHROME_BIN = require('puppeteer').executablePath();

module.exports = function (config) {
  config.set({
    basePath: '.',
    frameworks: ['mocha'],
    reporters: ['mocha'],
    client: {
      captureConsole: true,
    },
    files: [
      {pattern: path.resolve('./build/injector.js'), watched: false},
      {pattern: process.env.KARMA_FILE_PATTERN, watched: false}
    ],
    preprocessors: {
      'build/injector.js': ['webpack'],
      'src/*.spec.ts': ['webpack', 'sourcemap']
    },
    mime: {
      'text/x-typescript': ['ts','tsx']
    },
    webpack: webpack,
    webpackMiddleware: {
      noInfo: true,
      stats: 'errors-only'
    },
    port: 9876,
    colors: true,
    singleRun: true,
    logLevel: config.LOG_INFO
  });
};
