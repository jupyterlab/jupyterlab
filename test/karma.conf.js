module.exports = function (config) {
  config.set({
    basePath: '..',
    frameworks: ['mocha'],
    reporters: ['mocha'],
    files: [
      'node_modules/es6-promise/dist/es6-promise.js',
      'test/build/bundle.js'
    ],
    port: 9876,
    colors: true,
    singleRun: true,
    logLevel: config.LOG_INFO
  });
};
