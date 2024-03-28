// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { defineConfig } from '@playwright/test';
import * as baseConfig from '@jupyterlab/galata/lib/playwright-config';

export default defineConfig({
  ...baseConfig,
  outputDir: process.env.CI
    ? `${process.env.DOCKER_VOLUME ?? ''}pw-test-results`
    : undefined,
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
    }
  ],
  // Switch to 'always' to keep raw assets for all tests
  preserveOutput: 'failures-only', // Breaks HTML report if use.video == 'on'
  reporter: process.env.CI
    ? [
        ['github'],
        [
          'blob',
          { outputDir: `${process.env.DOCKER_VOLUME ?? ''}pw-blob-report` }
        ]
      ]
    : [['list'], ['html', { open: 'on-failure' }]],
  // Try one retry as some tests are flaky
  retries: process.env.CI ? 1 : 0,
  // On CI only run on single worker to limit cross test interactions
  workers: process.env.CI ? 1 : undefined
});
