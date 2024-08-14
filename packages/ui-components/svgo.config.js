/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * @type {import('svgo').Config}
 */
module.exports = {
  multipass: true,
  plugins: [
    {
      name: 'preset-default',
      params: {
        overrides: {
          collapseGroups: false,
          removeUnknownsAndDefaults: {
            defaultAttrs: false
          },
          removeUselessStrokeAndFill: {
            removeNone: true
          },
          removeViewBox: false
        }
      }
    }
  ]
};
