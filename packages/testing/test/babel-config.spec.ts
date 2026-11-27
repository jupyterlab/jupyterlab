// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { loadOptions } from '@babel/core';

/**
 * The plugins that Babel applies with the shared configuration, in one mode of Jest.
 */
function pluginsFor(esModuleMode: boolean): string[] {
  const options = loadOptions({
    babelrc: false,
    caller: {
      name: 'babel-jest',
      supportsDynamicImport: esModuleMode,
      supportsExportNamespaceFrom: esModuleMode,
      supportsStaticESM: esModuleMode
    },
    configFile: require.resolve('@jupyterlab/testing/lib/babel-config'),
    filename: 'example.js'
  }) as { plugins: { key: string }[] };
  return options.plugins.map(plugin => plugin.key);
}

describe('babel-config', () => {
  it('should convert modules in the default mode of Jest', () => {
    expect(pluginsFor(false)).toEqual([
      'transform-modules-commonjs',
      'transform-dynamic-import',
      'transform-export-namespace-from'
    ]);
  });

  it('should keep modules in the ES module mode of Jest', () => {
    expect(pluginsFor(true)).toEqual([]);
  });
});
