var path = require('path');
var webpack = require('./webpack.config');

webpack.module.rules.push(
  // instrument only testing sources with Istanbul
  {
    test: /\.js$/,
    use: { loader: 'istanbul-instrumenter-loader' },
    include: process.env.KARMA_COVER_FOLDER
  }
);

module.exports = function (config) {
  config.set({
    basePath: '.',
    frameworks: ['mocha'],
    reporters: ['mocha', 'coverage-istanbul'],
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
    coverageIstanbulReporter: {
      reports: ['html', 'text-summary'],
      dir: path.join('.', 'coverage'),
      fixWebpackSourcePaths: true
    },
    browserNoActivityTimeout: 31000, // 31 seconds - upped from 10 seconds
    browserDisconnectTimeout: 31000, // 31 seconds - upped from 2 seconds
    browserDisconnectTolerance: 2,
    port: 9876,
    colors: true,
    singleRun: true,
    logLevel: config.LOG_INFO
  });
};
