// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { PlaywrightTestConfig } from '@playwright/test';

// Default Playwright configuration for JupyterLab
module.exports = {
  reporter: [
    [process.env.CI ? 'github' : 'list'],
    ['html', { open: process.env.CI ? 'never' : 'on-failure' }]
  ],
  reportSlowTests: null,
  timeout: 60000,
  use: {
    // Browser options
    // headless: false,
    // slowMo: 500,

    // Context options
    viewport: { width: 1024, height: 768 },

    // Artifacts
    trace: 'on-first-retry',
    video: 'retain-on-failure'
  }
} as PlaywrightTestConfig;
