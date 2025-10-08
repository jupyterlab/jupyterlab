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
      testMatch: 'test/documentation/**/*.test.ts',
      testIgnore: '**/.ipynb_checkpoints/**',
      timeout: 90000,
      use: {
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
      testMatch: 'test/jupyterlab/**/*.test.ts',
      testIgnore: '**/.ipynb_checkpoints/**',
      use: {
        contextOptions: {
          permissions: ['clipboard-read', 'clipboard-write']
        }
      }
    },
    {
      name: 'jupyterlab-firefox',
      testMatch: 'test/jupyterlab/**/*.test.ts',
      testIgnore: '**/.ipynb_checkpoints/**',
      use: {
        contextOptions: {
          // https://github.com/microsoft/playwright/issues/13037
          permissions: []
        },
        browserName: 'firefox'
      },
      // We do not want to match exactly on Firefox
      ignoreSnapshots: true
    }
  ],
  // Switch to 'always' to keep raw assets for all tests
  preserveOutput: 'failures-only', // Breaks HTML report if use.video == 'on'
  // Try one retry as some tests are flaky
  retries: process.env.CI ? 1 : 0
};
