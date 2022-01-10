// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

var baseConfig = require('@jupyterlab/galata/lib/playwright-config');

module.exports = {
  ...baseConfig,
  // Switch to 'always' to keep raw assets for all tests
  preserveOutput: 'failures-only' // Breaks HTML report if use.video == 'on'
};
