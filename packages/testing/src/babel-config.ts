/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

// Resolved from this package, so that projects using this configuration do not need to install the plugins.
const babelConfig = {
  plugins: [
    require.resolve('@babel/plugin-transform-modules-commonjs'),
    require.resolve('@babel/plugin-transform-dynamic-import'),
    require.resolve('@babel/plugin-transform-export-namespace-from')
  ]
};

export default babelConfig;
