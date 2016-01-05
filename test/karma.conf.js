module.exports = function (config) {
  config.set({
    basePath: '..',
    frameworks: ['mocha'],
    reporters: ['mocha'],
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
        ]
      }
    },
    port: 9876,
    colors: true,
    singleRun: true,
    logLevel: config.LOG_INFO
  });
};
