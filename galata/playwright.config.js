// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

var baseConfig = require('@jupyterlab/galata/lib/playwright-config');

module.exports = {
  ...baseConfig,
  projects: [
    {
      name: 'galata',
      testMatch: 'test/galata/**'
    },
    {
      name: 'jupyterlab',
      testMatch: 'test/jupyterlab/**'
    }
  ],
  // Switch to 'always' to keep raw assets for all tests
  preserveOutput: 'failures-only', // Breaks HTML report if use.video == 'on'
  // Try one retry as some tests are flaky
  retries: process.env.CI ? 1 : 0
};
