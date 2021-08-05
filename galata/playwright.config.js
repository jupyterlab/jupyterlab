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
  ]
};
