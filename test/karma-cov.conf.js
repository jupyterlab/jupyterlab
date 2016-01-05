var path = require('path');

module.exports = function (config) {
  config.set({
    basePath: '..',
    browsers: ['Firefox'],
    frameworks: ['mocha'],
    reporters: ['mocha', 'coverage'],
    preprocessors: { 'test/src/*.ts': ['webpack'] },
    files: ['test/src/*.ts'],
    webpack: {
      resolve: {
        extensions: ['', '.ts', '.js']
      },
      module: {
        loaders: [
          { test: /\.ts$/, loader: 'ts-loader' },
          { test: /\.css$/, loader: 'style-loader!css-loader' },
        ],
        preLoaders: [
          // instrument only testing sources with Istanbul
          {
            test: /\.js$/,
            include: path.resolve('lib/'),
            loader: 'istanbul-instrumenter'
          }
        ]
      }
    },
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
