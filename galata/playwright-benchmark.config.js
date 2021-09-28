// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

var baseConfig = require('./playwright.config');

module.exports = {
  ...baseConfig,
  projects: [
    {
      name: 'benchmark',
      testMatch: 'test/benchmark/**'
    }
  ],
  reporter: [
    [process.env.CI ? 'dot' : 'list'],
    [
      '@jupyterlab/galata/lib/benchmarkReporter',
      { outputFile: 'lab-benchmark.json' }
    ]
  ],
  use: { ...baseConfig.use, video: 'off' },
  preserveOutput: 'failures-only',
  workers: 1
};
