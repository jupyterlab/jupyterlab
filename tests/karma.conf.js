var path = require('path');
var webpack = require('./webpack.config');

module.exports = function (config) {
  config.set({
    basePath: '.',
    frameworks: ['mocha'],
    reporters: ['mocha', 'saucelabs'],
    client: {
      mocha: {
        timeout : 10000, // 10 seconds - upped from 2 seconds
        retries: 3 // Allow for slow server on CI.
      }
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
    browserNoActivityTimeout: 31000, // 31 seconds - upped from 10 seconds
    browserDisconnectTimeout: 31000, // 31 seconds - upped from 2 seconds
    browserDisconnectTolerance: 2,
    port: 9876,
    colors: true,
    singleRun: true,
    sauceLabs: {
      testName: process.env.LERNA_PACKAGE_NAME,
      recordScreenshots: true,
      connectOptions: {
        '--no-ssl-bump-domains': 'all'
      }
    },
    customLaunchers: {
      SL_Chrome: {
        base: 'SauceLabs',
        browserName: 'chrome',
        version: 'latest',
        extendedDebugging : true
      },
      SL_Firefox: {
        base: 'SauceLabs',
        browserName: 'firefox',
        version: 'latest',
        extendedDebugging : true
      },
      SL_Safari: {
        base: 'SauceLabs',
        browserName: 'safari',
        version: 'latest'
      }
    },
    logLevel: config.LOG_INFO
  });

  if (process.env.TRAVIS) {
    config.sauceLabs.tunnelIdentifier = process.env.TRAVIS_JOB_NUMBER;
    config.sauceLabs.startConnect = false;
  }
};
