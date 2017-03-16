module.exports = function (config) {
  config.set({
    basePath: '.',
    frameworks: ['mocha'],
    reporters: ['mocha'],
    client: {
      mocha: {
        timeout : 10000, // 10 seconds - upped from 2 seconds
        retries: 3 // Allow for slow server on CI.
      }
    },
    files: [
      '../node_modules/es6-promise/dist/es6-promise.js',
      './build/injector.js',
      './build/bundle.js'
    ],
    preprocessors: {
      'build/bundle.js': ['sourcemap']
    },
    port: 9876,
    colors: true,
    singleRun: true,
    logLevel: config.LOG_INFO
  });
};
