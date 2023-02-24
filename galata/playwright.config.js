// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

var baseConfig = require('@jupyterlab/galata/lib/playwright-config');

module.exports = {
  ...baseConfig,
  projects: [
    {
      name: 'documentation',
      // Try one retry as some tests are flaky
      retries: process.env.CI ? 2 : 0,
      testMatch: 'test/documentation/**',
      testIgnore: '**/.ipynb_checkpoints/**',
      timeout: 90000,
      use: {
        contextOptions: {
          permissions: ['clipboard-read', 'clipboard-write']
        },
        launchOptions: {
          // Force slow motion
          slowMo: 30
        }
      }
    },
    {
      name: 'galata',
      testMatch: 'test/galata/**',
      testIgnore: '**/.ipynb_checkpoints/**'
    },
    {
      name: 'jupyterlab',
      testMatch: 'test/jupyterlab/**',
      testIgnore: '**/.ipynb_checkpoints/**'
    }
  ],
  // Switch to 'always' to keep raw assets for all tests
  preserveOutput: 'failures-only', // Breaks HTML report if use.video == 'on'
  // Try one retry as some tests are flaky
  retries: process.env.CI ? 1 : 0
};
